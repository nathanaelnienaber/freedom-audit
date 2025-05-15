import fs from 'fs-extra';
import chalk from 'chalk';
import { ScanResults } from './types';

/**
 * Generates a JSON report from scan results.
 * @param results - The scan results to save.
 * @param outputPath - Path to save the report (default: ./tmrw-audit-report.json).
 * @returns A promise resolving to the report path.
 * @throws Error if saving fails.
 */
export async function generateReport(results: ScanResults, outputPath = './tmrw-audit-report.json'): Promise<string> {
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
 * Displays a saved JSON report.
 * @param file - Path to the report

 file (default: ./tmrw-audit-report.json).
 * @throws Error if reading or displaying fails.
 */
export async function displayReport(file = './tmrw-audit-report.json'): Promise<void> {
  try {
    const report: ScanResults & { timestamp: string } = await fs.readJson(file);
    console.log(chalk.red('\n📊 AUDIT REPORT: YOUR INFRA\'S WEAKNESS\n'));
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(chalk.bold(`Cloud Lock-in Vulnerability (CLV) Score: ${report.clvScore}/100 (${report.riskLabel})`));
    console.log(`Vendor Lock-In: ${report.lockInScore}%`);
    console.log(`Deplatforming Risk: ${report.deplatformingRisk}`);
    console.log(chalk.dim('CLV Score Breakdown:'));
    console.log(`- Vendor Lock-In Penalty: ${(report.lockInScore * 0.5).toFixed(1)}`);
    console.log(`- Deplatforming Risk Penalty: ${(report.deplatformingRiskScore * 0.3).toFixed(1)}`);
    console.log(`- Proprietary Format Penalty: ${((1 - report.portabilityScore) * 20).toFixed(1)}`);
    console.log(chalk.bold('\nReal-World Wake-Up Calls:'));
    report.deplatformingExamples.forEach((ex) => console.log(chalk.yellow(`- ${ex}`)));
    console.log(chalk.bold('\nEscape Plan:'));
    report.recommendations.forEach((rec) => console.log(`- ${rec}`));
  } catch (err) {
    throw new Error(`Failed to display report: ${(err as Error).message}`);
  }
}