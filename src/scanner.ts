// tmrw audit - File Scanner
// Why this exists: We need to find infrastructure files before we can analyze them.
// What it does: Searches for Terraform, YAML, JSON and package.json files based on glob patterns.
// How it works: globby matches the patterns (from .env or defaults), skipping build folders, then sends the list to the analyzer.
// Part of the TMRW Manifesto for user-owned, unchained infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

import { globby } from "globby";
import { analyzeFiles, type ScanResults } from "./analyzer";
import chalk from "chalk";
import dotenv from "dotenv";

// Load environment variables only if not running in a Jest test environment
if (!process.env.JEST_WORKER_ID) {
  dotenv.config();
}

interface ScanOptions {
  /** Directory to scan (defaults to current working directory) */
  dir?: string;
  /** Custom file patterns to scan (overrides FILE_PATTERNS from .env) */
  filePatterns?: string[];
  /** Enable verbose logging for scanning details */
  verbose?: boolean;
}

/**
 * Scans the codebase for relevant files and analyzes them for cloud vendor lock-in risks.
 * @param options - Configuration options for the scan, including directory, file patterns, and verbosity.
 * @returns A promise resolving to the scan results, including Freedom Score, risks, and recommendations.
 * @throws Error if scanning fails, no files are found, or patterns are invalid.
 */
export async function scanCodebase(options: ScanOptions = {}): Promise<ScanResults> {
  const rootDir = options.dir || process.cwd();
  const verbose = options.verbose || process.env.VERBOSE === "true";
  const defaultPatterns = [
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
  ];
  const patterns = options.filePatterns?.map(p => p.trim()) ||
                   process.env.FILE_PATTERNS?.split(",").map(p => p.trim()) ||
                   defaultPatterns;

  if (verbose) {
    console.log(chalk.dim(`Scanning directory: ${rootDir}`));
    console.log(chalk.dim(`Using patterns: ${patterns.join(", ")}`));
  }

  try {
    const files = await globby(patterns, { cwd: rootDir, gitignore: true });
    if (!files.length) {
      throw new Error(
        `No infrastructure files found in ${rootDir}. Ensure files match patterns (${patterns.join(", ")}) or check your .env FILE_PATTERNS.`
      );
    }
    if (verbose || process.env.DEBUG === "true") {
      console.log(chalk.dim(`Found ${files.length} files: ${files.join(", ")}`));
      if (process.env.DEBUG === "true") {
        console.log(chalk.dim(`Excluded directories: node_modules, dist, build, vendor`));
      }
    }
    return await analyzeFiles(files, rootDir);
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid glob pattern")) {
      throw new Error(`Invalid file pattern in ${patterns.join(", ")}. Please check your patterns.`);
    }
    throw new Error(`Scanning failed: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}