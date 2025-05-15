import { describe, it, expect, jest } from '@jest/globals';
import { analyzeFiles } from '../src/analyzer';
import * as fs from 'fs-extra';
import * as hcl from 'hcl2-parser';
import * as yaml from 'js-yaml';
import { ScanResults } from '../src/types';

jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  readJson: jest.fn()
}));
jest.mock('hcl2-parser');
jest.mock('js-yaml');

describe('analyzeFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ScanResults for empty file list', async () => {
    const files: string[] = [];
    const rootDir = '/test';
    const results: ScanResults = await analyzeFiles(files, rootDir);
    expect(results.clvScore).toBe(100);
    expect(results.vendorServices).toEqual([]);
    expect(results.providers).toEqual([]);
    expect(results.deplatformingRisk).toBe('Low');
  });

  it('detects AWS Lambda in Terraform files', async () => {
    const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(`
      provider "aws" {}
      resource "aws_lambda_function" "test" {}
    `));
    jest.spyOn(hcl, 'parse').mockReturnValue({
      body: [
        { provider: 'aws' },
        { resource: { type: 'aws_lambda_function' } }
      ]
    });
    const files = ['main.tf'];
    const rootDir = '/test';
    const results: ScanResults = await analyzeFiles(files, rootDir);
    expect(mockReadFile).toHaveBeenCalled();
    expect(results.vendorServices).toContain('aws_lambda_function');
    expect(results.providers).toContain('aws');
    expect(results.clvScore).toBeLessThan(100);
  });

  it('detects Docker in docker-compose.yml', async () => {
    const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from(`
      services:
        app:
          image: node:latest
    `));
    jest.spyOn(yaml, 'load').mockReturnValue({
      services: { app: { image: 'node:latest' } }
    });
    const files = ['docker-compose.yml'];
    const rootDir = '/test';
    const results: ScanResults = await analyzeFiles(files, rootDir);
    expect(mockReadFile).toHaveBeenCalled();
    expect(results.vendorServices).toContain('docker');
    expect(results.portabilityScore).toBeGreaterThan(0);
  });

  it('detects AWS SDK in package.json', async () => {
    const mockReadJson = jest.spyOn(fs, 'readJson').mockResolvedValue({
      dependencies: { 'aws-sdk': '^2.0.0' }
    });
    const files = ['package.json'];
    const rootDir = '/test';
    const results: ScanResults = await analyzeFiles(files, rootDir);
    expect(mockReadJson).toHaveBeenCalled();
    expect(results.vendorServices).toContain('aws_sdk');
    expect(results.providers).toContain('aws');
  });

  it('handles invalid Terraform files gracefully', async () => {
    const mockReadFile = jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('invalid HCL'));
    jest.spyOn(hcl, 'parse').mockImplementation(() => {
      throw new Error('Invalid HCL');
    });
    process.env.DEBUG = 'true';
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const files = ['invalid.tf'];
    const rootDir = '/test';
    const results: ScanResults = await analyzeFiles(files, rootDir);
    expect(mockReadFile).toHaveBeenCalled();
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping invalid Terraform file: invalid.tf')
    );
    expect(results.clvScore).toBe(100);
    consoleWarnSpy.mockRestore();
    delete process.env.DEBUG;
  });
});