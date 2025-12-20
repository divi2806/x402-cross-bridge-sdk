import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { config as defaultConfig } from './config.js';
import { SettlementService } from './settlement.js';
import { RelayService } from './relay.js';
import { POLL_INTERVAL, USDC_ADDRESSES } from './constants.js';
import type { PendingPayment } from './types.js';

export interface FacilitatorConfig {
  port?: number;
  baseRpcUrl?: string;
  paymentSettlementAddress?: string;
  settlerPrivateKey?: string;
}

/**
 * Start the x402 facilitator server
 * 
 * @example
 * ```ts
 * import { startFacilitator } from '@x402-crosschain/facilitator';
 * 
 * await startFacilitator({
 *   port: 3001,
 *   baseRpcUrl: 'https://mainnet.base.org',
 *   paymentSettlementAddress: '0xYourContractAddress',
 *   settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY,
 * });
 * ```
 */
export async function startFacilitator(userConfig?: FacilitatorConfig) {
  // Merge user config with defaults
  const config = {
    port: userConfig?.port || defaultConfig.port,
    baseRpcUrl: userConfig?.baseRpcUrl || defaultConfig.baseRpcUrl,
    paymentSettlementAddress: userConfig?.paymentSettlementAddress || defaultConfig.paymentSettlementAddress,
    settlerPrivateKey: userConfig?.settlerPrivateKey || defaultConfig.settlerPrivateKey,
  };

  // Validate required config
  if (!config.paymentSettlementAddress) {
    throw new Error('paymentSettlementAddress is required');
  }
  if (!config.settlerPrivateKey) {
    throw new Error('settlerPrivateKey is required');
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Services
  const settlement = new SettlementService({
    baseRpcUrl: config.baseRpcUrl,
    paymentSettlementAddress: config.paymentSettlementAddress,
    settlerPrivateKey: config.settlerPrivateKey,
  });
  const relay = new RelayService(); // Relay for instant bridging (2-3s instead of 12-15min)

/**
 * POST /verify
 * x402-compliant verify endpoint
 * Verifies payment payload against payment requirements
 * Supports cross-chain via srcTokenAddress and srcNetwork fields (AnySpend-style)
 */
app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'Missing paymentPayload or paymentRequirements' });
    }

    // Check if this is a cross-chain payment (has source network/token from preference headers)
    const isCrossChain = paymentRequirements.srcNetwork || paymentRequirements.srcTokenAddress;

    console.log('[API] Verify request:', {
      from: paymentPayload.data?.from,
      txHash: paymentPayload.data?.transactionHash,
      payTo: paymentRequirements.payTo,
      crossChain: isCrossChain,
      srcNetwork: paymentRequirements.srcNetwork,
      destNetwork: paymentRequirements.network,
    });

    // Extract transaction hash and request ID from payment payload
    const txHash = paymentPayload.data?.transactionHash;
    const requestId = paymentPayload.data?.requestId; // Relay request ID
    
    if (!txHash) {
      return res.json({
        isValid: false,
        invalidReason: 'Missing transaction hash in payment payload',
      });
    }

    if (isCrossChain) {
      // Cross-chain payment: Check Relay bridge status using requestId
      console.log('[API] Cross-chain payment - checking Relay status');
      console.log('[API] Request ID:', requestId);
      const relayStatus = await relay.getSwapStatus(requestId || txHash);

      if (relayStatus !== 'COMPLETED') {
        return res.json({
          isValid: false,
          invalidReason: `Bridge not completed. Status: ${relayStatus}`,
        });
      }

      console.log('[API] Relay bridge completed');
    } else {
      // Same-chain payment: Just verify the transaction exists and matches requirements
      console.log('[API] Same-chain payment - basic verification');
      // TODO: Add same-chain transaction verification if needed
    }

    // Generate paymentId from payload
    const paymentId = ethers.id(
      `${txHash}_${paymentPayload.data.from}_${paymentRequirements.payTo}`
    );

    // Check if already settled on-chain
    const isSettled = await settlement.isSettled(paymentId);

    console.log('[API] Verify result:', { txHash, isSettled, isCrossChain });

    res.json({
      isValid: true,
      invalidReason: undefined,
    });
  } catch (error) {
    console.error('[API] Verify error:', error);
    res.status(500).json({ error: String(error) });
  }
});


/**
 * POST /settle
 * x402-compliant settle endpoint
 * Settles payment on-chain after verifying Relay bridge completion
 * Supports cross-chain via srcTokenAddress and srcNetwork fields (AnySpend-style)
 */
app.post('/settle', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'Missing paymentPayload or paymentRequirements' });
    }

    // Check if this is a cross-chain payment
    const isCrossChain = paymentRequirements.srcNetwork || paymentRequirements.srcTokenAddress;

    console.log('[API] Settle request:', {
      from: paymentPayload.data?.from,
      txHash: paymentPayload.data?.transactionHash,
      payTo: paymentRequirements.payTo,
      crossChain: isCrossChain,
      srcNetwork: paymentRequirements.srcNetwork,
      destNetwork: paymentRequirements.network,
    });

    // Extract details from payment payload
    const txHash = paymentPayload.data?.transactionHash;
    const requestId = paymentPayload.data?.requestId; // Relay request ID
    const payer = paymentPayload.data?.from;

    if (!txHash || !payer) {
      return res.json({
        success: false,
        errorReason: 'Missing transaction hash or payer address',
      });
    }

    // Generate paymentId from payload
    const paymentId = ethers.id(
      `${txHash}_${payer}_${paymentRequirements.payTo}`
    );

    // Check if already settled
    const alreadySettled = await settlement.isSettled(paymentId);
    if (alreadySettled) {
      console.log('[API] Already settled:', paymentId);
      return res.json({ success: true });
    }

    if (isCrossChain) {
      // Cross-chain payment: Wait for Relay bridge completion (fast: 2-3s)
      console.log('[API] Cross-chain payment - waiting for Relay bridge');
      console.log('[API] Request ID:', requestId);
      let relayStatus = await relay.getSwapStatus(requestId || txHash);
      
      // Poll for completion if pending
      let attempts = 0;
      while (relayStatus === 'PENDING' && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        relayStatus = await relay.getSwapStatus(requestId || txHash);
        attempts++;
      }

      if (relayStatus !== 'COMPLETED') {
        return res.json({
          success: false,
          errorReason: `Bridge not completed. Status: ${relayStatus}`,
        });
      }

      console.log('[API] Relay bridge completed successfully');
    } else {
      // Same-chain payment: No bridge needed
      console.log('[API] Same-chain payment - no bridge verification needed');
    }

    // Register requirement if not already registered
    try {
      await settlement.registerRequirement(
        paymentId,
        paymentRequirements.asset,
        paymentRequirements.maxAmountRequired,
        paymentRequirements.payTo
      );
    } catch (error) {
      // Might already be registered, that's okay
      console.log('[API] Requirement registration (may already exist):', error);
    }

    // Settle payment on-chain
    await settlement.settlePayment(
      paymentId,
      payer,
      paymentRequirements.maxAmountRequired,
      paymentRequirements.asset
    );

    console.log('[API] Settlement successful:', paymentId);
    res.json({ success: true });
  } catch (error) {
    console.error('[API] Settle error:', error);
    res.json({
      success: false,
      errorReason: String(error),
    });
  }
});

/**
 * GET /health
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'x402-relay-facilitator',
    bridgeProvider: 'Relay Network',
    timestamp: new Date().toISOString(),
  });
});


// No poller needed - x402 flow handles verification and settlement on-demand

  // Start server
  return new Promise<void>((resolve) => {
    const server = app.listen(config.port, () => {
      console.log('='.repeat(70));
      console.log('x402 Relay Facilitator Started [COMPLIANT]');
      console.log('='.repeat(70));
      console.log(`Port:           ${config.port}`);
      console.log(`Base RPC:       ${config.baseRpcUrl}`);
      console.log(`Contract:       ${config.paymentSettlementAddress}`);
      console.log(`Bridge:         Relay Network (2-3s instant settlement)`);
      console.log('='.repeat(70));
      console.log('x402 Spec Endpoints:');
      console.log(`  POST http://localhost:${config.port}/verify`);
      console.log(`  POST http://localhost:${config.port}/settle`);
      console.log(`  GET  http://localhost:${config.port}/health`);
      console.log('='.repeat(70));
      console.log('Works with ALL x402 clients:');
      console.log('  - x402-express (merchant middleware)');
      console.log('  - x402-axios (customer payment client)');
      console.log('  - x402-fetch (lightweight client)');
      console.log('  - Any standard x402 SDK');
      console.log('='.repeat(70));
      resolve();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n[Server] Shutting down gracefully...');
      server.close(() => {
        process.exit(0);
      });
    });
  });
}

// If run directly (not imported), start with default config from env
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('index.js')) {
  startFacilitator().catch((error) => {
    console.error('Failed to start facilitator:', error);
    process.exit(1);
  });
}

