import { globby } from 'globby';
import { analyzeFiles, ScanResults } from './analyzer';
import dotenv from 'dotenv';
import chalk from 'chalk';

/**
 * Scans the codebase for relevant files and analyzes them for CLV scoring.
 * @param rootDir - The root directory of the codebase.
 * @returns A promise resolving to the scan results.
 * @throws Error if scanning fails or no files are found.
 */
export async function scanCodebase(rootDir: string): Promise<ScanResults> {
  dotenv.config();

  console.log('🔍 Scanning your codebase for traps...');

  const patterns = process.env.FILE_PATTERNS?.split(',').map((p) => p.trim()) ?? [
    '**/*.tf',
    '**/*.yml',
    '**/*.yaml',
    '**/Dockerfile',
    '**/package.json',
    '!node_modules/**',
    '!dist/**',
    '!build/**',
    '!vendor/**',
  ];

  try {
    const files = await globby(patterns, { cwd: rootDir, gitignore: true });
    if (!files.length) {
      throw new Error('No infrastructure files found. The cloud hides, but we’ll find it. Check your .env FILE_PATTERNS.');
    }
    if (process.env.DEBUG === 'true') {
      console.log(chalk.dim(`Found ${files.length} files: ${files.join(', ')}`));
    }
    return await analyzeFiles(files, rootDir);
  } catch (err) {
    throw new Error(`Scanning failed: ${(err as Error).message}`);
  }
}