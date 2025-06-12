// Why this exists: Verify that scanCodebase finds files and passes them to the analyzer correctly.
// What it does: Mocks globby and analyzeFiles to test pattern handling and result forwarding.
// How it works: Jest mocks return sample file lists and scores, then assertions confirm scanner behavior.

import { scanCodebase } from "../src/scanner";
import { analyzeFiles } from "../src/analyzer";
import { globby } from "globby";

// Mock dependencies so we don't hit the real file system
jest.mock("globby", () => ({
  globby: jest.fn(),
}));
jest.mock("../src/analyzer");

describe("scanner", () => {
  // We ensure each test starts with FILE_PATTERNS cleared,
  // so we can confirm fallback patterns or custom patterns
  afterEach(() => {
    jest.clearAllMocks();
    // biome-ignore lint/performance/noDelete: test cleanup
    delete process.env.FILE_PATTERNS;
  });

  it("uses default patterns including **/*.json when FILE_PATTERNS is not set", async () => {
    // Make sure FILE_PATTERNS is unset right now
    // biome-ignore lint/performance/noDelete: ensure var unset
    delete process.env.FILE_PATTERNS;

    (globby as jest.Mock).mockResolvedValue([
      "infra.tf",
      "template.json",
      "docker-compose.yml",
    ]);
    (analyzeFiles as jest.Mock).mockResolvedValue({ freedomScore: 85 });

    const results = await scanCodebase({ dir: "/test-project" });
    // We expect these patterns to be used if FILE_PATTERNS is undefined
    expect(globby).toHaveBeenCalledWith(
      [
        "**/*.tf",
        "**/*.yml",
        "**/*.yaml",
        "**/*.json",
        "**/Dockerfile",
        "**/package.json",
        "!node_modules/**",
        "!dist/**",
        "!build/**",
        "!vendor/**",
      ],
      { cwd: "/test-project", gitignore: true },
    );

    // We expect the files returned by globby to go to analyzeFiles
    expect(analyzeFiles).toHaveBeenCalledWith(
      ["infra.tf", "template.json", "docker-compose.yml"],
      "/test-project",
    );
    // Confirm results
    expect(results.freedomScore).toEqual(85);
  });

  it("uses patterns from FILE_PATTERNS if set in environment", async () => {
    // We'll force environment override
    process.env.FILE_PATTERNS = "**/*.yaml,**/*.json";

    (globby as jest.Mock).mockResolvedValue(["main.yaml", "cfn-template.json"]);
    (analyzeFiles as jest.Mock).mockResolvedValue({ freedomScore: 75 });

    const results = await scanCodebase({ dir: "/custom-env" });
    // If environment variable is set, we expect these patterns
    expect(globby).toHaveBeenCalledWith(["**/*.yaml", "**/*.json"], {
      cwd: "/custom-env",
      gitignore: true,
    });
    // We expect these returned files to be passed to analyzeFiles
    expect(analyzeFiles).toHaveBeenCalledWith(
      ["main.yaml", "cfn-template.json"],
      "/custom-env",
    );
    // Confirm results
    expect(results.freedomScore).toEqual(75);
  });
});
