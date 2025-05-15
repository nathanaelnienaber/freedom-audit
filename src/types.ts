/**
 * Represents a vendor-specific or portable service.
 */
export interface VendorService {
  /** Service name (e.g., aws_lambda_function) */
  name: string;
  /** Lock-in score (0–1, higher is worse) */
  lockInScore: number;
  /** Category (e.g., compute, storage) */
  category: string;
  /** Deplatforming risk score (0–1, higher is worse) */
  deplatformRisk: number;
}

/**
 * Represents the results of a codebase scan.
 */
export interface ScanResults {
  /** Cloud Lock-in Vulnerability (CLV) score (0–100) */
  clvScore: number;
  /** Vendor lock-in score (0–100) */
  lockInScore: number;
  /** Deplatforming risk score (0–100) */
  deplatformingRiskScore: number;
  /** Portability score (0–1) */
  portabilityScore: number;
  /** Detected vendor services */
  vendorServices: string[];
  /** Detected cloud providers */
  providers: string[];
  /** Risk label (VULNERABLE, AT RISK, CAUTIOUS) */
  riskLabel: "VULNERABLE" | "AT RISK" | "CAUTIOUS";
  /** Deplatforming risk level (HIGH, Moderate, Low) */
  deplatformingRisk: "HIGH" | "Moderate" | "Low";
  /** Recommendations to reduce lock-in */
  recommendations: string[];
  /** Real-world deplatforming examples */
  deplatformingExamples: string[];
}
