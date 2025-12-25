import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import type { PaymentRequirements, PaymentPayload, VerifyResponse, SettleResponse } from '../types.js';
import { USDC_ADDRESSES, CHAIN_IDS } from '../types.js';

export interface MiddlewareConfig {
  payTo: string;
  price: string; // e.g., '$0.01'
  network: string; // e.g., 'base'
  facilitatorUrl: string;
  description?: string;
  // EIP-712 domain info for signing
  tokenName?: string;
  tokenVersion?: string;
}

/**
 * x402-compatible payment middleware for Express
 * Protects routes with payment requirements
 * Supports cross-chain payments via preference headers (AnySpend-style)
 * Compatible with standard x402 clients (x402-axios, x402-fetch)
 */
export function paymentMiddleware(config: MiddlewareConfig) {
  const chainId = CHAIN_IDS[config.network as keyof typeof CHAIN_IDS] || 8453;
  const usdcAddress = USDC_ADDRESSES[chainId] || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for payment header
      const paymentHeader = req.headers['x-payment'] as string;

      // Get preference headers for cross-chain
      const preferredToken = req.headers['x-preferred-token'] as string;
      const preferredNetwork = req.headers['x-preferred-network'] as string;

      if (!paymentHeader) {
        // No payment provided, return 402 with payment requirements
        const paymentRequirements: PaymentRequirements = {
          scheme: 'exact',
          asset: usdcAddress,
          maxAmountRequired: parsePrice(config.price),
          network: config.network,
          payTo: config.payTo,
          maxTimeoutSeconds: 120,
          description: config.description || 'Payment required for access',
          resource: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
          // EIP-712 domain info for USDC
          extra: {
            name: config.tokenName || 'USD Coin',
            version: config.tokenVersion || '2',
            chainId: chainId,
            verifyingContract: usdcAddress,
          },
        };

        // Add cross-chain info if preference headers present
        if (preferredToken || preferredNetwork) {
          paymentRequirements.srcTokenAddress = preferredToken;
          paymentRequirements.srcNetwork = preferredNetwork;
        }

        return res.status(402).json({
          x402Version: 1,
          accepts: [paymentRequirements],
          error: 'X-PAYMENT header is required',
        });
      }

      // Decode payment payload (x402 standard format)
      const paymentPayload: PaymentPayload = JSON.parse(
        Buffer.from(paymentHeader, 'base64').toString('utf-8')
      );

      // Get payer from payload
      const payer = paymentPayload.payload?.permit?.owner || 
                    paymentPayload.payload?.authorization?.from;

      // Build payment requirements
      const paymentRequirements: PaymentRequirements = {
        scheme: 'exact',
        asset: usdcAddress,
        maxAmountRequired: parsePrice(config.price),
        network: config.network,
        payTo: config.payTo,
        extra: {
          name: config.tokenName || 'USD Coin',
          version: config.tokenVersion || '2',
          chainId: chainId,
          verifyingContract: usdcAddress,
        },
      };

      // Add cross-chain support
      if (preferredToken || preferredNetwork) {
        console.log('[Middleware] Cross-chain payment detected:', {
          srcToken: preferredToken,
          srcNetwork: preferredNetwork,
          destNetwork: config.network,
        });
        paymentRequirements.srcTokenAddress = preferredToken;
        paymentRequirements.srcNetwork = preferredNetwork;
      }

      // Verify payment with facilitator
      console.log('[Middleware] Verifying payment...');
      const verifyResponse = await axios.post<VerifyResponse>(
        `${config.facilitatorUrl}/verify`,
        {
          paymentPayload,
          paymentRequirements,
        }
      );

      if (!verifyResponse.data.isValid) {
        return res.status(402).json({
          x402Version: 1,
          accepts: [paymentRequirements],
          error: verifyResponse.data.invalidReason || 'Payment verification failed',
          payer: verifyResponse.data.payer,
        });
      }

      console.log('[Middleware] Payment verified, processing request...');

      // Store payment info in request for access in route handler
      (req as any).payment = {
        verified: true,
        payer: payer,
        amount: paymentRequirements.maxAmountRequired,
      };

      // Execute the protected route
      await new Promise<void>((resolve) => {
        const originalSend = res.send.bind(res);
        const originalJson = res.json.bind(res);
        
        let settled = false;

        const settlePayment = async () => {
          if (settled) return;
          settled = true;

          try {
            console.log('[Middleware] Settling payment...');
            const settleResponse = await axios.post<SettleResponse>(
              `${config.facilitatorUrl}/settle`,
              {
                paymentPayload,
                paymentRequirements,
              }
            );

            if (settleResponse.data.success) {
              console.log('[Middleware] Payment settled successfully');
            } else {
              console.error('[Middleware] Settlement failed:', settleResponse.data.errorReason);
            }
          } catch (error) {
            console.error('[Middleware] Settlement error:', error);
          }
          resolve();
        };

        res.send = function (body: any) {
          settlePayment().then(() => originalSend(body));
          return this;
        };

        res.json = function (body: any) {
          settlePayment().then(() => originalJson(body));
          return this;
        };

        next();
      });
    } catch (error) {
      console.error('[Middleware] Error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

/**
 * Parse price string (e.g., '$0.01') to wei amount (USDC has 6 decimals)
 */
function parsePrice(price: string): string {
  const numericPrice = parseFloat(price.replace('$', ''));
  const usdcAmount = Math.floor(numericPrice * 1_000_000); // USDC has 6 decimals
  return usdcAmount.toString();
}

