// tmrw audit - Report Generator
// Why this exists: To deliver clear, actionable insights from audit results, helping users understand and reduce cloud dependency risks.
// What it does: Generates JSON reports and displays formatted audit results, including Freedom Score, risks, and recommendations.
// How it works: Saves scan results as JSON with timestamps and displays them with formatted console output, highlighting scores, risks, and escape plans.
// Part of the TMRW Manifesto for user-owned, unchained  infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import fs from "fs-extra";
import chalk from "chalk";
import type { ScanResults } from "./types";

/**
 * Generates a JSON report from scan results.
 * @param results - The scan results to save.
 * @param outputPath - Path to save the report (default: ./tmrw-audit-report.json).
 * @returns A promise resolving to the report path.
 * @throws Error if saving fails.
 */
export async function generateReport(
  results: ScanResults,
  outputPath = "./tmrw-audit-report.json",
): Promise<string> {
  try {
    const report = {
      timestamp: new Date().toISOString(),
      ...results,
    };
    await fs.writeJson(outputPath, report, { spaces: 2 });
    return outputPath;
  } catch (err) {
    throw new Error(`Failed to save report: ${(err as Error).message}`);
  }
}

/**
 * Displays a saved JSON report with improved formatting.
 * @param file - Path to the report file (default: ./tmrw-audit-report.json).
 * @throws Error if reading or displaying fails.
 */
export async function displayReport(
  file = "./tmrw-audit-report.json",
): Promise<void> {
  try {
    const report: ScanResults & { timestamp: string } = await fs.readJson(file);
    console.log(chalk.red("\n📊 AUDIT REPORT: YOUR INFRA'S WEAKNESS\n"));
    console.log(`Timestamp: ${report.timestamp}`);

    // Color for risk label based on severity
    const riskColor = report.riskLabel === "VULNERABLE" ? chalk.red :
      report.riskLabel === "AT RISK" ? chalk.yellow :
      chalk.green;
    console.log(chalk.bold(`Freedom Score: ${report.freedomScore}/100 (${riskColor(report.riskLabel)})`));

    console.log(`Vendor Lock-In: ${report.lockInScore}%`);

    // Color for deplatforming risk based on level
    const deplatformColor = report.deplatformingRisk === "HIGH" ? chalk.red :
      report.deplatformingRisk === "Moderate" ? chalk.yellow :
      chalk.green;
    console.log(`Deplatforming Risk: ${deplatformColor(report.deplatformingRisk)}`);

    // Separator
    console.log(chalk.dim("—".repeat(50)));

    // Freedom Score Calculation
    console.log(chalk.dim("Freedom Score Calculation:"));
    console.log(`Base Score: 100`);
    console.log(chalk.red(`- Vendor Lock-In Penalty: ${(report.lockInScore * 0.5).toFixed(1)}`));
    console.log(chalk.red(`- Deplatforming Risk Penalty: ${(report.deplatformingRiskScore * 0.3).toFixed(1)}`));
    console.log(chalk.red(`- Proprietary Format Penalty: ${((1 - report.portabilityScore) * 20).toFixed(1)}`));
    console.log(chalk.bold(`= Freedom Score: ${report.freedomScore}`));

    // Separator
    console.log(chalk.dim("—".repeat(50)));

    // Real-World Wake-Up Calls
    console.log(chalk.bold("Real-World Wake-Up Calls:"));
    report.deplatformingExamples.forEach((ex) => console.log(chalk.yellow(`- ${ex}`)));

    // Separator
    console.log(chalk.dim("—".repeat(50)));

    // Escape Plan
    console.log(chalk.bold("Escape Plan:"));
    report.recommendations.forEach((rec) => console.log(`- ${rec}`));
  } catch (err) {
    throw new Error(`Failed to display report: ${(err as Error).message}`);
  }
}
