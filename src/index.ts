#!/usr/bin/env node
import { program } from "commander";
import { scanCodebase } from "./scanner";
import { generateReport, displayReport } from "./report";
import { ScanResults } from "./types";
import dotenv from "dotenv";

dotenv.config();

program
  .command("audit")
  .description("Scan codebase for cloud lock-in vulnerabilities")
  .action(async () => {
    try {
      const results: ScanResults = await scanCodebase(process.cwd());
      console.log("AUDIT COMPLETE: YOUR INFRA’S FATE EXPOSED");
      console.log(
        `Feedom Score: ${results.freedomScore}/100 (${results.riskLabel})`,
      );
      console.log(`Vendor Lock-In: ${results.lockInScore.toFixed(1)}%`);
      console.log(`Deplatforming Risk: ${results.deplatformingRisk}`);
      console.log(
        "Recommendations:\n- " + results.recommendations.join("\n- "),
      );
      const reportPath = await generateReport(results);
      console.log(`Report saved to: ${reportPath}`);
    } catch (err) {
      console.error("Error:", (err as Error).message);
      process.exit(1);
    }
  });

program
  .command("report [file]")
  .description("View a saved report")
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
  .description("Learn how to deploy the Sovereign Stack")
  .action(() => {
    console.log("Deploy the Sovereign Stack: https://tmrw.it/stack");
    console.log(
      "Follow the Escape Manifesto to build user-owned infrastructure.",
    );
  });

program.parse(process.argv);
