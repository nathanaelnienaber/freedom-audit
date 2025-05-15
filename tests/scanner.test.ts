import { describe, it, expect, jest } from '@jest/globals';
import { scanCodebase } from '../src/scanner';
import * as globby from 'globby';
import * as fs from 'fs-extra';
import * as hcl from 'hcl2-parser';

jest.mock('globby', () => ({
  globby: jest.fn()
}));
jest.mock('fs-extra', () => ({
  readFile: jest.fn(),
  readJson: jest.fn()
}));
jest.mock('hcl2-parser');

describe('scanCodebase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scans codebase and returns CLV results', async () => {
    jest.spyOn(globby, 'globby').mockResolvedValue(['main.tf', 'package.json']);
    jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('provider "aws" {}'));
    jest.spyOn(hcl, 'parse').mockReturnValue({
      body: [
        { provider: 'aws' },
        { resource: { type: 'aws_lambda_function' } }
      ]
    });
    jest.spyOn(fs, 'readJson').mockImplementation((path: string) => {
      if (path.includes('vendor-services.json')) {
        return Promise.resolve({
          aws: [{ name: 'aws_lambda_function', lockInScore: 0.8, category: 'compute', deplatformRisk: 0.2 }],
          portable: [{ name: 'docker', lockInScore: 0.1, category: 'compute', deplatformRisk: 0.0 }]
        });
      }
      if (path.includes('deplatforming.json')) {
        return Promise.resolve(['Parler (2021): AWS pulled the plug.']);
      }
      return Promise.resolve({ dependencies: { 'aws-sdk': '^2.0.0' } });
    });
    const results = await scanCodebase('/test');
    expect(results.clvScore).toBeDefined();
    expect(results.deplatformingExamples).toBeInstanceOf(Array);
  });

  it('throws error for empty codebase', async () => {
    jest.spyOn(globby, 'globby').mockResolvedValue([]);
    await expect(scanCodebase('/test')).rejects.toThrow('No infrastructure files found');
  });

  it('respects .env file patterns', async () => {
    process.env.FILE_PATTERNS = '**/main.tf';
    jest.spyOn(globby, 'globby').mockResolvedValue(['main.tf']);
    jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('provider "aws" {}'));
    jest.spyOn(hcl, 'parse').mockReturnValue({
      body: [
        { provider: 'aws' },
        { resource: { type: 'aws_lambda_function' } }
      ]
    });
    jest.spyOn(fs, 'readJson').mockImplementation((path: string) => {
      if (path.includes('vendor-services.json')) {
        return Promise.resolve({
          aws: [{ name: 'aws_lambda_function', lockInScore: 0.8, category: 'compute', deplatformRisk: 0.2 }],
          portable: [{ name: 'docker', lockInScore: 0.1, category: 'compute', deplatformRisk: 0.0 }]
        });
      }
      if (path.includes('deplatforming.json')) {
        return Promise.resolve(['Parler (2021): AWS pulled the plug.']);
      }
      return Promise.resolve({});
    });
    const results = await scanCodebase('/test');
    expect(results.clvScore).toBeDefined();
    delete process.env.FILE_PATTERNS;
  });

  it('logs files in debug mode', async () => {
    process.env.DEBUG = 'true';
    jest.spyOn(globby, 'globby').mockResolvedValue(['main.tf']);
    jest.spyOn(fs, 'readFile').mockResolvedValue(Buffer.from('provider "aws" {}'));
    jest.spyOn(hcl, 'parse').mockReturnValue({
      body: [
        { provider: 'aws' },
        { resource: { type: 'aws_lambda_function' } }
      ]
    });
    jest.spyOn(fs, 'readJson').mockImplementation((path: string) => {
      if (path.includes('vendor-services.json')) {
        return Promise.resolve({
          aws: [{ name: 'aws_lambda_function', lockInScore: 0.8, category: 'compute', deplatformRisk: 0.2 }],
          portable: [{ name: 'docker', lockInScore: 0.1, category: 'compute', deplatformRisk: 0.0 }]
        });
      }
      if (path.includes('deplatforming.json')) {
        return Promise.resolve(['Parler (2021): AWS pulled the plug.']);
      }
      return Promise.resolve({});
    });
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await scanCodebase('/test');
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found 1 files: main.tf')
    );
    consoleLogSpy.mockRestore();
    delete process.env.DEBUG;
  });
});