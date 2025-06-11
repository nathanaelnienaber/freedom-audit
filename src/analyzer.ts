// tmrw audit - Codebase Analyzer
// Why this exists: To identify and quantify lock-in, deplatforming, and proprietary format risks in a codebase, empowering users to achieve an unchained infrastructure.
// What it does: Parses Terraform (.tf), YAML (.yml/.yaml), CloudFormation JSON, and package.json files to detect cloud service dependencies, calculate the Freedom Score, and assess lock-in, deplatforming, and portability risks.
// How it works: Reads files, identifies providers and services using vendor-services.json, computes scores based on lock-in, deplatforming risk, and portability, and returns actionable results.
// Part of the TMRW Manifesto for user-owned, unchained infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import fs from "fs-extra";
import path from "path";
import hcl from "hcl2-parser";
import yaml from "js-yaml";
import chalk from "chalk";
import { ScanResults, VendorService } from "./types";
export { ScanResults, VendorService } from "./types";

// Load vendor services data for scoring and portability checks
const vendorServices: Record<string, VendorService[]> = require("../data/vendor-services.json");

// Define the structure for data returned by parsing functions
type ParsedData = {
  providers: string[];        // List of detected cloud providers (e.g., "aws", "azure")
  services: string[];         // List of detected services (e.g., "aws_lambda_function", "docker")
  highRiskIncrement: number;  // Incremental risk score for specific high-risk services
};

/**
 * Parses a Terraform (.tf) file to extract provider and service information.
 * @param filePath - Path to the Terraform file.
 * @returns An object containing providers, services, and a high-risk increment (0 for Terraform).
 */
async function parseTerraformFile(filePath: string): Promise<ParsedData> {
  const content = await fs.readFile(filePath, "utf8");
  let parsed: any;
  try {
    parsed = hcl.parse(content);
  } catch (err) {
    if (process.env.DEBUG === "true") {
      console.warn(chalk.yellow(`Skipping invalid Terraform file: ${filePath}`));
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  // Extract providers from "provider" blocks (e.g., "aws", "azure")
  const providers = parsed.body
    .filter((b: any) => b.provider)
    .map((b: any) => b.provider);

  // Extract services from "resource" blocks (e.g., "aws_lambda_function")
  const services = parsed.body
    .filter((b: any) => b.resource)
    .map((b: any) => b.resource.type);

  return { providers, services, highRiskIncrement: 0 };
}

/**
 * Parses a YAML (.yml/.yaml) file to detect providers, services, and portable standards.
 * Handles serverless frameworks, docker-compose, and Helm charts.
 * @param filePath - Path to the YAML file.
 * @returns An object containing providers, services, and a high-risk increment for serverless functions.
 */
async function parseYamlFile(filePath: string): Promise<ParsedData> {
  const content = await fs.readFile(filePath, "utf8");
  let config: any;
  try {
    config = yaml.load(content);
  } catch (err) {
    if (process.env.DEBUG === "true") {
      console.warn(chalk.yellow(`Skipping invalid YAML file: ${filePath}`));
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  let providers: string[] = [];
  let services: string[] = [];
  let highRiskIncrement = 0;

  // Detect serverless framework usage (e.g., AWS Serverless Framework)
  if (config.provider?.name) {
    providers.push(config.provider.name);
    const functions = config.functions || [];
    services = functions.map(() => `${config.provider.name}_function`);
    highRiskIncrement = functions.length * 0.2; // Each function adds 0.2 to high-risk score
  }

  // Detect docker-compose files (assumed portable)
  if (path.basename(filePath).includes("docker-compose")) {
    const serviceCount = Object.keys(config.services || {}).length;
    services = Array(serviceCount).fill("docker"); // One "docker" service per defined service
  }

  // Detect Helm charts based on specific keys
  if (config.apiVersion && typeof config.apiVersion === "string" && config.apiVersion.includes("helm.sh")) {
    services.push("helm"); // Helm is considered portable
  }
  if (config.kind && config.kind === "Chart") {
    services.push("helm");
  }

  return { providers, services, highRiskIncrement };
}

/**
 * Parses a CloudFormation JSON file to identify AWS services.
 * @param filePath - Path to the JSON file.
 * @returns An object containing providers and services if it's a valid CloudFormation template.
 */
async function parseCloudFormationFile(filePath: string): Promise<ParsedData> {
  let cfTemplate: any;
  try {
    cfTemplate = await fs.readJson(filePath);
  } catch (err) {
    if (process.env.DEBUG === "true") {
      console.warn(chalk.yellow(`Skipping invalid JSON file: ${filePath}`));
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  // Verify it's a CloudFormation template by checking for "Resources"
  if (!cfTemplate.Resources || typeof cfTemplate.Resources !== "object") {
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  let providers: string[] = [];
  let services: string[] = [];

  // Parse each resource to detect AWS services
  for (const resourceKey of Object.keys(cfTemplate.Resources)) {
    const resourceObj = cfTemplate.Resources[resourceKey];
    if (resourceObj.Type && typeof resourceObj.Type === "string") {
      const typePath = resourceObj.Type.split("::");
      if (typePath[0] === "AWS") {
        providers.push("aws");
        const guessedName = typePath.join("_").toLowerCase(); // e.g., "AWS::Lambda::Function" -> "aws_lambda_function"
        services.push(guessedName);
      }
    }
  }

  return { providers, services, highRiskIncrement: 0 };
}

/**
 * Parses a package.json file to detect cloud provider dependencies.
 * @param filePath - Path to the package.json file.
 * @returns An object containing providers, services, and a high-risk increment for cloud dependencies.
 */
async function parsePackageJsonFile(filePath: string): Promise<ParsedData> {
  const pkg = await fs.readJson(filePath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  let providers: string[] = [];
  let services: string[] = [];
  let highRiskIncrement = 0;

  // Check for AWS dependencies
  if (deps["aws-sdk"] || deps["@aws-sdk/client-s3"]) {
    providers.push("aws");
    services.push("aws_sdk");
    highRiskIncrement += 0.1; // Arbitrary risk increment per cloud dependency
  }

  // Check for Azure dependencies
  if (deps["@azure/storage-blob"]) {
    providers.push("azure");
    services.push("azure_blob");
    highRiskIncrement += 0.1;
  }

  // Additional dependency checks can be added here
  return { providers, services, highRiskIncrement };
}

/**
 * Analyzes a list of files to compute the Freedom Score and assess cloud-related risks.
 * @param files - Array of file paths relative to the root directory.
 * @param rootDir - Root directory of the codebase.
 * @returns A promise resolving to the ScanResults object with scores and risk assessments.
 */
export async function analyzeFiles(files: string[], rootDir: string): Promise<ScanResults> {
  let vendorServicesFound: string[] = []; // All detected services
  let providers = new Set<string>();      // Unique set of providers
  let highRiskServices = 0;               // Accumulated high-risk score

  // Process each file based on its type
  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      let parsedData: ParsedData;
      if (file.endsWith(".tf")) {
        parsedData = await parseTerraformFile(filePath);
      } else if (file.endsWith(".yml") || file.endsWith(".yaml")) {
        parsedData = await parseYamlFile(filePath);
      } else if (file.endsWith(".json")) {
        parsedData = await parseCloudFormationFile(filePath);
      } else if (file.endsWith("package.json")) {
        parsedData = await parsePackageJsonFile(filePath);
      } else {
        continue; // Skip unsupported file types
      }

      // Aggregate providers and services
      parsedData.providers.forEach((p) => providers.add(p));
      vendorServicesFound.push(...parsedData.services);
      highRiskServices += parsedData.highRiskIncrement;
    } catch (err) {
      if (process.env.DEBUG === "true") {
        console.warn(chalk.yellow(`Error processing ${file}: ${(err as Error).message}`));
      }
    }
  }

  const totalServices = vendorServicesFound.length;
  let lockInScore = 0;
  let openStandardsCount = 0;

  // Evaluate each service for lock-in, portability, and risk
  vendorServicesFound.forEach((service) => {
    const vendorService = Object.values(vendorServices)
      .flat()
      .find((s) => s.name === service);
    if (vendorService) {
      lockInScore += vendorService.lockInScore; // Sum lock-in scores
      if (vendorService.deplatformRisk > 0.3) {
        highRiskServices += 1; // Increment for services with high deplatforming risk
      }
      if (vendorServices.portable.some((s) => s.name === service)) {
        openStandardsCount += 1; // Count portable services (e.g., "docker", "helm")
      }
    }
  });

  // Normalize lock-in score to a 0-100 scale
  lockInScore = totalServices ? (lockInScore / totalServices) * 100 : 0;

  // Calculate deplatforming risk score
  // - Single provider penalty: 50 if only one provider is detected
  // - High-risk penalty: 20 points per high-risk service or fraction thereof
  // - Redundancy penalty: 30 if only one provider (no redundancy)
  const singleProviderPenalty = providers.size === 1 ? 50 : 0;
  const highRiskPenalty = highRiskServices * 20;
  const redundancyPenalty = providers.size === 1 ? 30 : 0;
  const deplatformingRiskScore = Math.min(
    100,
    singleProviderPenalty + highRiskPenalty + redundancyPenalty,
  );

  // Calculate portability score as the fraction of services using open standards
  const portabilityScore = totalServices ? openStandardsCount / totalServices : 0;

  // Calculate Freedom Score: 100 minus weighted penalties
  // - Lock-in penalty: 50% of lockInScore
  // - Deplatforming penalty: 30% of deplatformingRiskScore
  // - Proprietary format penalty: 20% of (1 - portabilityScore)
  const freedomScore = Math.round(
    100 -
      lockInScore * 0.5 -
      deplatformingRiskScore * 0.3 -
      (1 - portabilityScore) * 20,
  );

  return {
    freedomScore,
    lockInScore,
    deplatformingRiskScore,
    portabilityScore,
    vendorServices: vendorServicesFound,
    providers: Array.from(providers),
    riskLabel: freedomScore < 50 ? "VULNERABLE" : freedomScore <= 75 ? "AT RISK" : "CAUTIOUS",
    deplatformingRisk:
      deplatformingRiskScore > 70 ? "HIGH" : deplatformingRiskScore > 30 ? "Moderate" : "Low",
    recommendations: [
      "Ditch proprietary services like Lambda for Dockerized functions. Run them anywhere.",
      "Replace vendor-locked storage like S3 with MinIO or self-hosted solutions. Own your data.",
      "Spread your infra across multiple providers or go local. Don’t trust one cloud’s mercy.",
      "Deploy the Sovereign Stack: tmrw.it/stack",
    ],
    deplatformingExamples: require("../data/deplatforming.json"),
  };
}