/**
 * analyzer.ts
 *
 * WHY THIS FILE EXISTS:
 * This file is responsible for analyzing various IaC and config files in the codebase.
 * It detects services, calculates lock-in scores, and measures deplatforming risk.
 *
 * TEAM-FRIENDLY COMMENTS:
 * - We've added logic to detect CloudFormation JSON files and Helm YAML charts.
 * - Keep changes minimal and clear. Follow a simple approach to avoid overcomplicating the parser.
 */

import fs from "fs-extra";
import path from "path";
import hcl from "hcl2-parser";
import yaml from "js-yaml";
import chalk from "chalk";
import { ScanResults, VendorService } from "./types";
export { ScanResults, VendorService } from "./types";

// We require vendor-services.json so we can look up lockInScore, deplatformRisk, etc.
const vendorServices: Record<
  string,
  VendorService[]
> = require("../data/vendor-services.json");

export async function analyzeFiles(
  files: string[],
  rootDir: string,
): Promise<ScanResults> {
  // Tracking data for summary
  let vendorServicesFound: string[] = [];
  let totalServices = 0;
  let providers = new Set<string>();
  let openStandardsCount = 0;
  let highRiskServices = 0;

  for (const file of files) {
    const filePath = path.join(rootDir, file);

    try {
      // 1. Terraform: .tf files
      if (file.endsWith(".tf")) {
        const content = await fs.readFile(filePath, "utf8");
        let parsed: any;
        try {
          parsed = hcl.parse(content);
        } catch (err) {
          // If it's invalid Terraform, skip. Debug mode logs a warning.
          if (process.env.DEBUG === "true") {
            console.warn(
              chalk.yellow(`Skipping invalid Terraform file: ${file}`),
            );
          }
          continue;
        }
        // Collect providers from "provider" blocks
        const providerBlocks: { provider: string }[] = parsed.body.filter(
          (b: any) => b.provider,
        );
        providerBlocks.forEach((b: { provider: string }) =>
          providers.add(b.provider),
        );

        // Collect resources from "resource" blocks
        const resources = parsed.body
          .filter((b: any) => b.resource)
          .map((b: any) => b.resource.type);
        vendorServicesFound.push(...resources);
        totalServices += resources.length;

        // Evaluate each resource for lockInScore and deplatformRisk
        resources.forEach((res: string) => {
          const service = Object.values(vendorServices)
            .flat()
            .find((s) => s.name === res);
          if (service) {
            if (vendorServices.portable.some((s) => s.name === res)) {
              openStandardsCount++;
            }
            if (service.deplatformRisk > 0.3) {
              highRiskServices++;
            }
          }
        });

        // 2. YAML files (serverless, docker-compose, Helm, etc.)
      } else if (file.endsWith(".yml") || file.endsWith(".yaml")) {
        const content = await fs.readFile(filePath, "utf8");
        let config: any;
        try {
          config = yaml.load(content);
        } catch (err) {
          if (process.env.DEBUG === "true") {
            console.warn(chalk.yellow(`Skipping invalid YAML file: ${file}`));
          }
          continue;
        }

        // Detect generic provider patterns (e.g., serverless framework)
        if (config.provider?.name) {
          providers.add(config.provider.name);
          const functions = (config.functions || []).map(
            () => `${config.provider.name}_function`,
          );
          vendorServicesFound.push(...functions);
          totalServices += functions.length;
          // Arbitrary high risk increment for each function
          highRiskServices += functions.length * 0.2;
        }

        // Detect docker-compose usage (portable)
        if (file.includes("docker-compose")) {
          const serviceCount = Object.keys(config.services || {}).length;
          openStandardsCount += serviceCount;
          vendorServicesFound.push("docker");
          totalServices += serviceCount;
        }

        // Detect Helm charts (simple approach checking for 'apiVersion' or 'kind' references)
        if (
          config.apiVersion &&
          typeof config.apiVersion === "string" &&
          config.apiVersion.includes("helm.sh")
        ) {
          // If it's likely Helm, treat as portable or partially portable
          openStandardsCount++;
          // You might add more logic to parse the Helm template for resources,
          // but we'll keep it simple for now.
        }
        if (config.kind && config.kind === "Chart") {
          // Another sign it's Helm
          openStandardsCount++;
        }

        // 3. CloudFormation JSON
      } else if (file.endsWith(".json")) {
        // Basic check for CloudFormation template: has "Resources" object with "Type" fields
        let cfTemplate: any;
        try {
          cfTemplate = await fs.readJson(filePath);
        } catch (err) {
          // If parsing fails, skip
          if (process.env.DEBUG === "true") {
            console.warn(chalk.yellow(`Skipping invalid JSON file: ${file}`));
          }
          continue;
        }

        if (cfTemplate.Resources && typeof cfTemplate.Resources === "object") {
          // For each resource, detect AWS or other provider usage
          for (const resourceKey of Object.keys(cfTemplate.Resources)) {
            const resourceObj = cfTemplate.Resources[resourceKey];
            if (resourceObj.Type && typeof resourceObj.Type === "string") {
              // E.g., AWS::Lambda::Function => aws_lambda_function
              // Quick mapping approach (replace 'AWS::' with 'aws_' as a naive guess)
              const typePath = resourceObj.Type.split("::");
              if (typePath[0] === "AWS") {
                providers.add("aws");

                // Convert "AWS::Lambda::Function" -> "aws_lambda_function"
                const guessedName = typePath.join("_").toLowerCase();
                vendorServicesFound.push(guessedName);
                totalServices++;

                // Optionally: detect high risk if it's a function or something else
                if (
                  guessedName.includes("lambda") ||
                  guessedName.includes("ddb")
                ) {
                  highRiskServices++;
                }
              }
            }
          }
        }

        // 4. package.json
      } else if (file.endsWith("package.json")) {
        const pkg = await fs.readJson(filePath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };

        // Example: if a user depends on aws-sdk
        if (deps["aws-sdk"] || deps["@aws-sdk/client-s3"]) {
          providers.add("aws");
          vendorServicesFound.push("aws_sdk");
          totalServices++;
          highRiskServices += 0.1;
        }
        if (deps["@azure/storage-blob"]) {
          providers.add("azure");
          vendorServicesFound.push("azure_blob");
          totalServices++;
          highRiskServices += 0.1;
        }
      }
    } catch (err) {
      // If we hit any error reading or parsing a file, log in debug mode only.
      if (process.env.DEBUG === "true") {
        console.warn(
          chalk.yellow(`Error processing ${file}: ${(err as Error).message}`),
        );
      }
    }
  } // end for-of files

  // Summarize lock-in scores based on discovered services
  let lockInScore = 0;
  vendorServicesFound.forEach((service) => {
    const vendorService = Object.values(vendorServices)
      .flat()
      .find((s) => s.name === service);
    if (vendorService) {
      lockInScore += vendorService.lockInScore;
    }
  });
  lockInScore = totalServices ? (lockInScore / totalServices) * 100 : 0;

  // Single-provider penalty if we only found one provider
  const singleProviderPenalty = providers.size === 1 ? 50 : 0;
  // Each high-risk service adds 20 points
  const highRiskPenalty = highRiskServices * 20;
  // Another penalty for not having multiple redundancy
  const redundancyPenalty = providers.size === 1 ? 30 : 0;
  const deplatformingRiskScore = Math.min(
    100,
    singleProviderPenalty + highRiskPenalty + redundancyPenalty,
  );

  // Portability score: fraction of discovered resources flagged as "openStandardsCount"
  const portabilityScore = totalServices
    ? openStandardsCount / totalServices
    : 0;

  // Example CLV formula
  const clvScore = Math.round(
    100 -
      lockInScore * 0.5 -
      deplatformingRiskScore * 0.3 -
      (1 - portabilityScore) * 20,
  );

  // Return our computed scan results
  return {
    clvScore,
    lockInScore,
    deplatformingRiskScore,
    portabilityScore,
    vendorServices: vendorServicesFound,
    providers: Array.from(providers),
    riskLabel:
      clvScore < 50 ? "VULNERABLE" : clvScore <= 75 ? "AT RISK" : "CAUTIOUS",
    deplatformingRisk:
      deplatformingRiskScore > 70
        ? "HIGH"
        : deplatformingRiskScore > 30
          ? "Moderate"
          : "Low",
    recommendations: [
      "Ditch proprietary services like Lambda for Dockerized functions. Run them anywhere.",
      "Replace vendor-locked storage like S3 with MinIO or self-hosted solutions. Own your data.",
      "Spread your infra across multiple providers or go local. Don’t trust one cloud’s mercy.",
      "Deploy the Sovereign Stack: tmrw.it/stack",
    ],
    deplatformingExamples: require("../data/deplatforming.json"),
  };
}
