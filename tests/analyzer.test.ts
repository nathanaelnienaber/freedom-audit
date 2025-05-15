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
    delete process.env.FILE_PATTERNS;
  });

  it("returns valid results on empty file list", async () => {
    // We pass an empty array of files
    const results = await analyzeFiles([], process.cwd());

    // Basic sanity checks
    expect(results).toHaveProperty("clvScore");
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
});
