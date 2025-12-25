// Export clients
export { createPaymentClient } from './client/payment-client.js'; // For Node.js (private keys)
export { createBrowserPaymentClient } from './client/browser-client.js'; // For Browser (MetaMask/wallets)

// Export middleware
export { paymentMiddleware } from './middleware/payment-middleware.js';

// Export types
export type {
  PaymentRequirements,
  PaymentPayload,
  PermitPayload,
  AuthorizationPayload,
  VerifyResponse,
  SettleResponse,
  X402Response,
  PaymentPreferences,
  Network,
} from './types.js';

// Export constants
export { CHAIN_IDS, NETWORK_NAMES, USDC_ADDRESSES, WETH_ADDRESSES } from './types.js';

export type { MiddlewareConfig } from './middleware/payment-middleware.js';
