// tmrw audit - Parsing Helpers
// Why this exists: We split parsing logic into its own module.
// What it does: Provides functions that detect providers and services in common infra files.
// How it works: Each helper reads a file type, extracts names and returns them for scoring.
// Part of the TMRW Manifesto for user-owned, unchained infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import fs from "fs-extra";
import path from "node:path";
import hcl from "hcl2-parser";
import yaml from "js-yaml";
import chalk from "chalk";

/** Parsed data returned by each parser */
export interface ParsedData {
  /** Detected cloud providers (e.g., aws, azure) */
  providers: string[];
  /** Detected service names (e.g., aws_lambda_function, docker) */
  services: string[];
  /** Risk increment for high-risk services */
  highRiskIncrement: number;
}

/** Parse a Terraform (.tf) file */
export async function parseTerraformFile(
  filePath: string,
): Promise<ParsedData> {
  const content = await fs.readFile(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = hcl.parse(content);
  } catch {
    if (process.env.DEBUG === "true") {
      console.warn(
        chalk.yellow(`Skipping invalid Terraform file: ${filePath}`),
      );
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  const body = (parsed as { body: Array<Record<string, unknown>> }).body ?? [];
  const providers = body
    .filter((b) => "provider" in b)
    .map((b) => (b as { provider: string }).provider);
  const services = body
    .filter((b) => "resource" in b)
    .map((b) => (b as { resource: { type: string } }).resource.type);
  return { providers, services, highRiskIncrement: 0 };
}

/** Parse a YAML (.yml/.yaml) file */
export async function parseYamlFile(filePath: string): Promise<ParsedData> {
  const content = await fs.readFile(filePath, "utf8");
  let config: unknown;
  try {
    config = yaml.load(content);
  } catch {
    if (process.env.DEBUG === "true") {
      console.warn(chalk.yellow(`Skipping invalid YAML file: ${filePath}`));
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  const providers: string[] = [];
  let services: string[] = [];
  let highRiskIncrement = 0;

  const cfg = config as {
    provider?: { name?: string };
    functions?: unknown;
    services?: unknown;
    apiVersion?: string;
    kind?: string;
  };

  if (cfg.provider?.name) {
    providers.push(cfg.provider.name);
    const fnObj = cfg.functions || {};
    const functionCount = Array.isArray(fnObj)
      ? fnObj.length
      : Object.keys(fnObj).length;
    const serviceNameMap: Record<string, string> = {
      aws: "aws_lambda_function",
      azure: "azurerm_function_app",
      gcp: "google_cloud_functions",
      ibm: "ibm_cloud_function",
      oracle: "oci_functions_function",
    };
    const serviceName =
      serviceNameMap[cfg.provider.name] || `${cfg.provider.name}_function`;
    services.push(...Array(functionCount).fill(serviceName));
    highRiskIncrement = functionCount * 0.2;
  }

  if (path.basename(filePath).includes("docker-compose")) {
    const serviceCount = Object.keys(cfg.services || {}).length;
    services = Array(serviceCount).fill("docker");
  }

  if (
    cfg.apiVersion &&
    typeof cfg.apiVersion === "string" &&
    cfg.apiVersion.includes("helm.sh")
  ) {
    services.push("helm");
  }
  if (cfg.kind && cfg.kind === "Chart") {
    services.push("helm");
  }

  return { providers, services, highRiskIncrement };
}

/** Parse a CloudFormation JSON file */
export async function parseCloudFormationFile(
  filePath: string,
): Promise<ParsedData> {
  let cfTemplate: unknown;
  try {
    cfTemplate = await fs.readJson(filePath);
  } catch {
    if (process.env.DEBUG === "true") {
      console.warn(chalk.yellow(`Skipping invalid JSON file: ${filePath}`));
    }
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  const template = cfTemplate as {
    Resources?: Record<string, { Type?: string }>;
  };
  if (!template.Resources || typeof template.Resources !== "object") {
    return { providers: [], services: [], highRiskIncrement: 0 };
  }

  const providers: string[] = [];
  const services: string[] = [];

  for (const key of Object.keys(template.Resources)) {
    const resourceObj = template.Resources[key];
    if (resourceObj.Type && typeof resourceObj.Type === "string") {
      const typePath = resourceObj.Type.split("::");
      if (typePath[0] === "AWS") {
        providers.push("aws");
        services.push(typePath.join("_").toLowerCase());
      }
    }
  }

  return { providers, services, highRiskIncrement: 0 };
}

/** Parse a package.json file */
export async function parsePackageJsonFile(
  filePath: string,
): Promise<ParsedData> {
  const pkg = await fs.readJson(filePath);
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const providers: string[] = [];
  const services: string[] = [];
  let highRiskIncrement = 0;

  if (deps["aws-sdk"] || deps["@aws-sdk/client-s3"]) {
    providers.push("aws");
    services.push("aws_sdk");
    highRiskIncrement += 0.1;
  }

  if (deps["@azure/storage-blob"]) {
    providers.push("azure");
    services.push("azure_blob");
    highRiskIncrement += 0.1;
  }

  return { providers, services, highRiskIncrement };
}
