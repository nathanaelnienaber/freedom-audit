// Why this exists: Ensure analyzer.ts correctly detects cloud resources and calculates scores.
// What it does: Runs the analyzer on sample files and checks the returned structure and values.
// How it works: Uses Jest to call analyzeFiles with temporary data and asserts key properties.

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

  it("parses fixture YAML for functions", async () => {
    const path = require("node:path");
    const fixtureDir = path.join(__dirname, "fixtures");
    const results = await analyzeFiles(["serverless.yml"], fixtureDir);

    expect(results.vendorServices).toContain("aws_lambda_function");
  });

  it("parses multiple fixture files", async () => {
    const path = require("node:path");
    const fixtureDir = path.join(__dirname, "fixtures");
    const files = [
      "main.tf",
      "serverless.yml",
      "cfn-template.json",
      "package.json",
    ];
    const results = await analyzeFiles(files, fixtureDir);

    expect(results.providers).toContain("aws");
    expect(results.vendorServices).toContain("aws_lambda_function");
    expect(results.vendorServices).toContain("aws_s3_bucket");
  });
});
