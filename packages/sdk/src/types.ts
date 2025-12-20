// Core x402 types
export interface PaymentRequirements {
  scheme: string;
  asset: string;
  maxAmountRequired: string;
  network: string;
  payTo: string;
  maxTimeoutSeconds?: number;
  description?: string;
  mimeType?: string;
  resource?: string;
  // Cross-chain extensions (AnySpend-style)
  srcTokenAddress?: string;
  srcNetwork?: string;
}

export interface PaymentPayload {
  x402Version: number;
  networkId: number;
  scheme: string;
  data: {
    transactionHash?: string;
    from?: string;
    to?: string;
    value?: string;
    [key: string]: any;
  };
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  payer?: string;
}

export interface SettleResponse {
  success: boolean;
  errorReason?: string;
  transactionHash?: string;
}

export interface X402Response {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

export interface PaymentPreferences {
  preferredToken?: string;
  preferredNetwork?: string;
  preferredChainId?: number;
}
