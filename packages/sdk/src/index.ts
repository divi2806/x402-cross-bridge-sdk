// Export clients
export { createPaymentClient } from './client/payment-client.js'; // For Node.js (private keys)
export { createBrowserPaymentClient } from './client/browser-client.js'; // For Browser (MetaMask/wallets)

// Export middleware
export { paymentMiddleware } from './middleware/payment-middleware.js';

// Export types
export type {
  PaymentRequirements,
  PaymentPayload,
  VerifyResponse,
  SettleResponse,
  X402Response,
  PaymentPreferences,
} from './types.js';

export type { MiddlewareConfig } from './middleware/payment-middleware.js';
