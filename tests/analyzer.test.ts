/**
 * analyzer.test.ts
 *
 * WHY THIS FILE EXISTS:
 * This test verifies that analyzer.ts properly detects cloud resources and calculates risk scores.
 *
 * TEAM-FRIENDLY COMMENTS:
 *  - We ensure there's at least one 'it(...)' block so Jest doesn't complain about no tests.
 *  - This test calls the real 'analyzeFiles' from '../src/analyzer'.
 */

import { analyzeFiles } from "../src/analyzer";

describe("analyzer", () => {
  // Optionally, we can ensure no environment override is set here, in case it affects anything.
  beforeAll(() => {
    // biome-ignore lint/performance/noDelete: test setup
    delete process.env.FILE_PATTERNS;
  });

  it("returns valid results on empty file list", async () => {
    // We pass an empty array of files
    const results = await analyzeFiles([], process.cwd());

    // Basic sanity checks
    expect(results).toHaveProperty("freedomScore");
    expect(results).toHaveProperty("lockInScore");
    expect(results).toHaveProperty("deplatformingRiskScore");
    expect(results).toHaveProperty("portabilityScore");
    expect(results).toHaveProperty("vendorServices");
    expect(results).toHaveProperty("providers");
    expect(results).toHaveProperty("riskLabel");
    expect(results).toHaveProperty("deplatformingRisk");
    expect(results).toHaveProperty("recommendations");
    expect(results).toHaveProperty("deplatformingExamples");
  });

  it("parses serverless YAML with function objects", async () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const tmpDir = fs.mkdtempSync(path.join(process.cwd(), "srvless-"));
    const yamlPath = path.join(tmpDir, "serverless.yml");
    fs.writeFileSync(
      yamlPath,
      "provider:\n  name: aws\nfunctions:\n  hello:\n    handler: index.handler\n"
    );

    const results = await analyzeFiles(["serverless.yml"], tmpDir);

    expect(results.vendorServices).toContain("aws_lambda_function");

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});
