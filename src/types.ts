// tmrw audit - Type Definitions
// Why this exists: To ensure type safety and consistency across the tmrw audit tool’s modules for reliable data handling.
// What it does: Defines TypeScript interfaces (VendorService, ScanResults) for services, scores, and audit results.
// How it works: Provides structured types for vendor services and scan results, used by scanner, analyzer, and report modules to enforce data integrity.
// Part of the TMRW Manifesto for user-owned, unchained  infrastructure.
// Copyright (c) 2025 tmrw.it | MIT License

/**
 * Represents a vendor-specific or portable service used in the codebase.
 * This interface helps identify cloud services and assess their impact on vendor lock-in and deplatforming risks.
 */
export interface VendorService {
  /**
   * The name of the service, typically in a format like 'aws_lambda_function' or 'docker'.
   * Used to match against detected services in the codebase.
   */
  name: string;
  /**
   * A score between 0 and 1 indicating the degree of vendor lock-in for this service.
   * Higher values represent greater lock-in, making it harder to migrate to another provider.
   */
  lockInScore: number;
  /**
   * The category of the service, such as 'compute', 'storage', or 'networking'.
   * Helps in grouping and analyzing services by their functional area.
   */
  category: string;
  /**
   * A score between 0 and 1 indicating the risk of deplatforming for this service.
   * Higher values suggest a greater risk of the service being discontinued or restricted by the vendor.
   */
  deplatformRisk: number;
}

/**
 * Represents the results of a codebase scan, providing insights into cloud dependencies and risks.
 * This interface aggregates data from the analysis to calculate scores and provide recommendations.
 */
export interface ScanResults {
  /**
   * The Freedom Score, ranging from 0 to 100, where higher values indicate lower vendor lock-in and deplatforming risks.
   * Previously referred to as Cloud Lock-in Vulnerability (CLV) score, this is a key metric for assessing infrastructure sovereignty.
   */
  freedomScore: number;
  /**
   * The Vendor Lock-In Score, ranging from 0 to 100, where higher values indicate greater dependency on specific vendors.
   * Calculated based on the lockInScore of detected services.
   */
  lockInScore: number;
  /**
   * The Deplatforming Risk Score, ranging from 0 to 100, where higher values indicate a greater risk of service disruption.
   * Factors in the number of high-risk services and provider concentration.
   */
  deplatformingRiskScore: number;
  /**
   * The Portability Score, ranging from 0 to 1, indicating the proportion of services that are portable or use open standards.
   * A higher score suggests easier migration to alternative providers or self-hosting.
   */
  portabilityScore: number;
  /**
   * An array of detected vendor services found in the codebase.
   * Each entry corresponds to a service name, such as 'aws_lambda_function'.
   */
  vendorServices: string[];
  /**
   * An array of detected cloud providers used in the codebase, such as 'aws', 'azure', or 'docker'.
   * Helps identify provider diversity or concentration.
   */
  providers: string[];
  /**
   * A label categorizing the overall risk level based on the Freedom Score.
   * Possible values: 'VULNERABLE', 'AT RISK', 'CAUTIOUS'.
   */
  riskLabel: "VULNERABLE" | "AT RISK" | "CAUTIOUS";
  /**
   * A label indicating the level of deplatforming risk.
   * Possible values: 'HIGH', 'Moderate', 'Low'.
   */
  deplatformingRisk: "HIGH" | "Moderate" | "Low";
  /**
   * An array of actionable recommendations to reduce vendor lock-in and improve infrastructure sovereignty.
   * These are generated based on the audit results to guide users toward better practices.
   */
  recommendations: string[];
  /**
   * An array of real-world examples of deplatforming incidents.
   * Serves as a cautionary reference to highlight the importance of reducing dependency risks.
   */
  deplatformingExamples: string[];
}