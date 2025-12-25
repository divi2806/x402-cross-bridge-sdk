// Core x402 types - Compatible with standard x402 protocol

/**
 * Payment requirements returned by server in 402 response
 * Compatible with x402-express, x402-axios, x402-fetch
 */
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
  outputSchema?: any;
  // Cross-chain extensions (AnySpend-style)
  srcTokenAddress?: string;
  srcNetwork?: string;
  srcAmountRequired?: string;
  // EIP-712 domain info for permit/authorization signing
  extra?: {
    name?: string;
    version?: string;
    chainId?: number;
    verifyingContract?: string;
    facilitatorAddress?: string;
    signatureType?: 'permit' | 'authorization';
  };
}

/**
 * ERC-2612 Permit payload - for non-USDC ERC-20 tokens
 */
export interface PermitPayload {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
}

/**
 * EIP-3009 Authorization payload - for USDC
 */
export interface AuthorizationPayload {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

/**
 * x402 Payment Payload - standard format compatible with all x402 clients
 * Supports both ERC-2612 permit and EIP-3009 authorization schemes
 */
export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    // ERC-2612 Permit (for non-USDC ERC-20 tokens)
    permit?: PermitPayload;
    // EIP-3009 Authorization (for USDC)
    authorization?: AuthorizationPayload;
    // Native ETH payment (customer sends tx, not gasless)
    nativePayment?: {
      from: string;
      txHash: string;
      amount: string;
      chainId: number;
      requestId?: string; // Relay requestId for status tracking
    };
    // Signature (not needed for native payments)
    signature?: string;
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
  transaction?: string;
  network?: string;
  payer?: string;
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

// Network configuration
export type Network = 'base' | 'base-sepolia' | 'arbitrum' | 'optimism' | 'mainnet' | 'polygon' | 'bsc' | 'avalanche' | 'zksync' | 'linea';

export const CHAIN_IDS: Record<string, number> = {
  'mainnet': 1,
  'base': 8453,
  'base-sepolia': 84532,
  'arbitrum': 42161,
  'optimism': 10,
  'polygon': 137,
  'bsc': 56,
  'avalanche': 43114,
  'zksync': 324,
  'linea': 59144,
};

export const NETWORK_NAMES: Record<number, string> = {
  1: 'mainnet',
  8453: 'base',
  84532: 'base-sepolia',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
  56: 'bsc',
  43114: 'avalanche',
  324: 'zksync',
  59144: 'linea',
};

// USDC addresses per chain
export const USDC_ADDRESSES: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
};

// WETH addresses per chain (for cross-chain payments)
export const WETH_ADDRESSES: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  8453: '0x4200000000000000000000000000000000000006',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
};
