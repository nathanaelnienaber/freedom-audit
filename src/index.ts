// tmrw audit - CLI and API Entry Point
// Why this exists: To provide a user-friendly CLI and programmatic API for auditing codebases and guiding users toward sovereign infrastructure.
// What it does: Defines CLI commands (audit, report, escape) and exports API functions to scan codebases, generate reports, and promote the Sovereign Stack.
// How it works: Uses commander for CLI commands and exposes functions for programmatic use, orchestrating scanning, analysis, and reporting via scanner, analyzer, and report modules.
// Part of the TMRW Manifesto for user-owned, unkillable infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import { program } from "commander";
import { scanCodebase } from "./scanner";
import { generateReport, displayReport } from "./report";
import { ScanResults } from "./types";
import dotenv from "dotenv";
import chalk from "chalk";

interface AuditOptions {
  /** Directory to scan (defaults to current working directory) */
  dir?: string;
  /** Output path for the report (defaults to ./tmrw-audit-report.json) */
  output?: string;
  /** Custom file patterns to scan (overrides FILE_PATTERNS from .env) */
  filePatterns?: string[];
  /** Enable verbose logging for scanning details */
  verbose?: boolean;
}

/**
 * Runs a codebase audit programmatically, returning scan results.
 * @param options - Configuration options for the audit.
 * @returns A promise resolving to the scan results, including Freedom Score, risks, and recommendations.
 * @throws Error if the scan fails or no files are found.
 */
export async function runAudit(options: AuditOptions = {}): Promise<ScanResults> {
  const dir = options.dir || process.cwd();
  return await scanCodebase({
    dir,
    filePatterns: options.filePatterns,
    verbose: options.verbose,
  });
}

/**
 * Retrieves and displays a saved audit report programmatically.
 * @param file - Path to the report file (defaults to ./tmrw-audit-report.json).
 * @throws Error if reading or displaying the report fails.
 */
export async function getReport(file: string = "./tmrw-audit-report.json"): Promise<void> {
  await displayReport(file);
}

// Load environment variables for CLI usage
dotenv.config();

// CLI setup
program
  .command("audit")
  .description(
    "Scan your codebase to calculate your Freedom Score and identify cloud vendor lock-in risks. This command analyzes your infrastructure files (e.g., Terraform, YAML, package.json) and provides actionable recommendations to reduce dependency on specific cloud providers."
  )
  .option("-o, --output <path>", "Specify the output path for the report", "./tmrw-audit-report.json")
  .option("-p, --patterns <patterns>", "Comma-separated file patterns to scan (e.g., *.tf,*.yml)")
  .option("-v, --verbose", "Enable verbose logging for scanning details")
  .action(async (cmd) => {
    try {
      const results = await runAudit({
        output: cmd.output,
        filePatterns: cmd.patterns ? cmd.patterns.split(",").map((p: string) => p.trim()) : undefined,
        verbose: cmd.verbose,
      });
      console.log(chalk.red.bold("AUDIT COMPLETE: YOUR INFRA’S FATE EXPOSED"));
      const riskColor = results.riskLabel === "VULNERABLE" ? chalk.red :
                        results.riskLabel === "AT RISK" ? chalk.yellow :
                        chalk.green;
      console.log(`Freedom Score: ${riskColor(`${results.freedomScore}/100 (${results.riskLabel})`)}`);
      console.log(`Vendor Lock-In: ${results.lockInScore.toFixed(1)}%`);
      console.log(`Deplatforming Risk: ${results.deplatformingRisk}`);
      console.log(chalk.bold("Recommendations:"));
      results.recommendations.forEach(rec => console.log(chalk.cyan(`- ${rec}`)));
      const reportPath = await generateReport(results, cmd.output);
      console.log(`Report saved to: ${reportPath}`);
      console.log(chalk.dim("For a detailed breakdown, run `tmrw report`"));
    } catch (err) {
      console.error("Error:", (err as Error).message);
      process.exit(1);
    }
  });

program
  .command("report [file]")
  .description(
    "Display a previously saved audit report. Use this command to review your Freedom Score, vendor lock-in details, deplatforming risks, and recommendations without rescanning the codebase. Optionally, specify a report file path (default: ./tmrw-audit-report.json)."
  )
  .action(async (file) => {
    try {
      await displayReport(file);
    } catch (err) {
      console.error("Error:", (err as Error).message);
      process.exit(1);
    }
  });

program
  .command("escape")
  .description(
    "Get instructions on deploying the Sovereign Stack, a set of tools and practices for building resilient, user-owned infrastructure. This command provides a link to the Sovereign Stack deployment guide and the Escape Plan."
  )
  .action(() => {
    console.log(chalk.cyan("Deploy the Sovereign Stack: https://tmrw.it/stack"));
    console.log(chalk.cyan("Follow the Escape Plan to build user-owned infrastructure."));
  });

program.parse(process.argv);