/**
 * x402-compatible types for the Relay facilitator
 */

// x402 Quote Request (from standard x402 SDKs)
export interface X402QuoteRequest {
  merchantAddress: string;
  tokenAddress: string;
  chainId: number;
  amount: string;
  userAddress: string;
  userTokenAddress: string;
  userChainId: number;
}

// x402 Transaction Data
export interface TxData {
  to: string;
  data: string;
  value: string;
  chainId: number;
}

// x402 Quote Response
export interface X402QuoteResponse {
  paymentId: string;
  txData: TxData;
  expectedOutput: string;
  estimatedTime: string;
}

// x402 Verify Response
export interface X402VerifyResponse {
  settled: boolean;
}

// x402 Settle Request
export interface X402SettleRequest {
  paymentId: string;
}

// x402 Settle Response
export interface X402SettleResponse {
  success: boolean;
  message?: string;
}

// Internal types
export interface PendingPayment {
  swapId: string;
  txHash?: string;
  destToken: string;
  amount: string;
  payerAddress: string;
  payeeAddress: string;
  settled: boolean;
  createdAt: number;
}

export type SwapStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

