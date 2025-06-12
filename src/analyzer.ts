// tmrw audit - Codebase Analyzer
// Why this exists: We need a quick look at which cloud services a project relies on.
// What it does: Reads Terraform, YAML, CloudFormation JSON and package.json files to find providers and services.
// How it works: Each parser grabs service names and then we score them to measure lock-in and risk.
// Part of the TMRW Manifesto for user-owned, unchained infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import path from "node:path";
import chalk from "chalk";
import type { ScanResults, VendorService } from "./types";
export { ScanResults, VendorService } from "./types";
import type { ParsedData } from "./parsers";
import {
  parseTerraformFile,
  parseYamlFile,
  parseCloudFormationFile,
  parsePackageJsonFile,
} from "./parsers";

// Load vendor services data for scoring and portability checks
const vendorServices: Record<
  string,
  VendorService[]
> = require("../data/vendor-services.json");

/**
 * Analyzes a list of files to compute the Freedom Score and assess cloud-related risks.
 * @param files - Array of file paths relative to the root directory.
 * @param rootDir - Root directory of the codebase.
 * @returns A promise resolving to the ScanResults object with scores and risk assessments.
 */
export async function analyzeFiles(
  files: string[],
  rootDir: string,
): Promise<ScanResults> {
  const vendorServicesFound: string[] = [];
  const providers = new Set<string>();
  let highRiskServices = 0;

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
        continue;
      }
      for (const p of parsedData.providers) {
        providers.add(p);
      }
      vendorServicesFound.push(...parsedData.services);
      highRiskServices += parsedData.highRiskIncrement;
    } catch (err) {
      if (process.env.DEBUG === "true") {
        console.warn(
          chalk.yellow(`Error processing ${file}: ${(err as Error).message}`),
        );
      }
    }
  }

  const totalServices = vendorServicesFound.length;
  let lockInScore = 0;
  let openStandardsCount = 0;

  for (const service of vendorServicesFound) {
    const vendorService = Object.values(vendorServices)
      .flat()
      .find((s) => s.name === service);
    if (vendorService) {
      lockInScore += vendorService.lockInScore;
      if (vendorService.deplatformRisk > 0.3) {
        highRiskServices += 1;
      }
      if (vendorServices.portable.some((s) => s.name === service)) {
        openStandardsCount += 1;
      }
    }
  }

  lockInScore = totalServices ? (lockInScore / totalServices) * 100 : 0;

  const singleProviderPenalty = providers.size === 1 ? 50 : 0;
  const highRiskPenalty = highRiskServices * 20;
  const redundancyPenalty = providers.size === 1 ? 30 : 0;
  const deplatformingRiskScore = Math.min(
    100,
    singleProviderPenalty + highRiskPenalty + redundancyPenalty,
  );

  const portabilityScore = totalServices
    ? openStandardsCount / totalServices
    : 0;

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
    riskLabel:
      freedomScore < 50
        ? "VULNERABLE"
        : freedomScore <= 75
          ? "AT RISK"
          : "CAUTIOUS",
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
