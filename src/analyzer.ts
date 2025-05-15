import fs from 'fs-extra';
import path from 'path';
import hcl from 'hcl2-parser';
import yaml from 'js-yaml';
import chalk from 'chalk';
import { ScanResults, VendorService } from './types';
export { ScanResults, VendorService } from './types';

const vendorServices: Record<string, VendorService[]> = require('./vendor-services.json');

export async function analyzeFiles(files: string[], rootDir: string): Promise<ScanResults> {
  let vendorServicesFound: string[] = [];
  let totalServices = 0;
  let providers = new Set<string>();
  let openStandardsCount = 0;
  let highRiskServices = 0;

  for (const file of files) {
    const filePath = path.join(rootDir, file);
    try {
      if (file.endsWith('.tf')) {
        const content = await fs.readFile(filePath, 'utf8');
        let parsed: any;
        try {
          parsed = hcl.parse(content);
        } catch (err) {
          if (process.env.DEBUG === 'true') {
            console.warn(chalk.yellow(`Skipping invalid Terraform file: ${file}`));
          }
          continue;
        }
        const providerBlocks: { provider: string }[] = parsed.body.filter((b: any) => b.provider);
        providerBlocks.forEach((b: { provider: string }) => providers.add(b.provider));
        const resources = parsed.body.filter((b: any) => b.resource).map((b: any) => b.resource.type);
        vendorServicesFound.push(...resources);
        totalServices += resources.length;
        resources.forEach((res: string) => {
          const service = Object.values(vendorServices)
            .flat()
            .find((s) => s.name === res);
          if (service) {
            if (vendorServices.portable.some((s) => s.name === res)) {
              openStandardsCount++;
            }
            if (service.deplatformRisk > 0.3) {
              highRiskServices++;
            }
          }
        });
      } else if (file.endsWith('.yml') || file.endsWith('.yaml')) {
        const content = await fs.readFile(filePath, 'utf8');
        let config: any;
        try {
          config = yaml.load(content);
        } catch (err) {
          if (process.env.DEBUG === 'true') {
            console.warn(chalk.yellow(`Skipping invalid YAML file: ${file}`));
          }
          continue;
        }
        if (config.provider?.name) {
          providers.add(config.provider.name);
          const functions = (config.functions || []).map(() => `${config.provider.name}_function`);
          vendorServicesFound.push(...functions);
          totalServices += functions.length;
          highRiskServices += functions.length * 0.2;
        }
        if (file.includes('docker-compose')) {
          openStandardsCount += Object.keys(config.services || {}).length;
          vendorServicesFound.push('docker');
          totalServices += Object.keys(config.services || {}).length;
        }
      } else if (file.endsWith('package.json')) {
        const pkg = await fs.readJson(filePath);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['aws-sdk'] || deps['@aws-sdk/client-s3']) {
          providers.add('aws');
          vendorServicesFound.push('aws_sdk');
          totalServices++;
          highRiskServices += 0.1;
        }
        if (deps['@azure/storage-blob']) {
          providers.add('azure');
          vendorServicesFound.push('azure_blob');
          totalServices++;
          highRiskServices += 0.1;
        }
      }
    } catch (err) {
      if (process.env.DEBUG === 'true') {
        console.warn(chalk.yellow(`Error processing ${file}: ${(err as Error).message}`));
      }
    }
  }

  let lockInScore = 0;
  vendorServicesFound.forEach((service) => {
    const vendorService = Object.values(vendorServices)
      .flat()
      .find((s) => s.name === service);
    if (vendorService) lockInScore += vendorService.lockInScore;
  });
  lockInScore = totalServices ? (lockInScore / totalServices) * 100 : 0;

  const singleProviderPenalty = providers.size === 1 ? 50 : 0;
  const highRiskPenalty = highRiskServices * 20;
  const redundancyPenalty = providers.size === 1 ? 30 : 0;
  const deplatformingRiskScore = Math.min(100, singleProviderPenalty + highRiskPenalty + redundancyPenalty);

  const portabilityScore = totalServices ? openStandardsCount / totalServices : 0;
  const clvScore = Math.round(100 - lockInScore * 0.5 - deplatformingRiskScore * 0.3 - (1 - portabilityScore) * 20);

  return {
    clvScore,
    lockInScore,
    deplatformingRiskScore,
    portabilityScore,
    vendorServices: vendorServicesFound,
    providers: Array.from(providers),
    riskLabel: clvScore < 50 ? 'VULNERABLE' : clvScore <= 75 ? 'AT RISK' : 'CAUTIOUS',
    deplatformingRisk: deplatformingRiskScore > 70 ? 'HIGH' : deplatformingRiskScore > 30 ? 'Moderate' : 'Low',
    recommendations: [
      'Ditch proprietary services like Lambda for Dockerized functions. Run them anywhere.',
      'Replace vendor-locked storage like S3 with MinIO or self-hosted solutions. Own your data.',
      'Spread your infra across multiple providers or go local. Don’t trust one cloud’s mercy.',
      'Deploy the Sovereign Stack: tmrw.it/stack',
    ],
    deplatformingExamples: require('./deplatforming.json'),
  };
}