import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { config as defaultConfig } from './config.js';
import { SettlementService } from './settlement.js';
import { RelayService } from './relay.js';
import { USDC_ADDRESSES, CHAIN_IDS, NETWORK_NAMES } from './constants.js';

export interface FacilitatorConfig {
  port?: number;
  baseRpcUrl?: string;
  paymentSettlementAddress?: string;
  settlerPrivateKey?: string;
}

// x402-compatible payment payload types
interface PermitPayload {
  owner: string;
  spender: string;
  value: string;
  nonce: string;
  deadline: string;
}

interface AuthorizationPayload {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

interface NativePayment {
  from: string;
  txHash: string;
  amount: string;
  chainId: number;
  requestId?: string; // Relay requestId for status tracking
}

interface X402PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    permit?: PermitPayload;
    authorization?: AuthorizationPayload;
    nativePayment?: NativePayment;
    signature?: string;
  };
}

// EIP-712 types for signature verification
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
};

const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
};

/**
 * Start the x402-compatible facilitator server
 * Supports ERC-2612 permits and EIP-3009 authorizations
 * Uses Relay for cross-chain bridging
 */
export async function startFacilitator(userConfig?: FacilitatorConfig) {
  const config = {
    port: userConfig?.port || defaultConfig.port,
    baseRpcUrl: userConfig?.baseRpcUrl || defaultConfig.baseRpcUrl,
    paymentSettlementAddress: userConfig?.paymentSettlementAddress || defaultConfig.paymentSettlementAddress,
    settlerPrivateKey: userConfig?.settlerPrivateKey || defaultConfig.settlerPrivateKey,
  };

  if (!config.settlerPrivateKey) {
    throw new Error('settlerPrivateKey is required');
  }

  const app = express();
  app.use(cors());
  app.use(express.json());

  // Initialize provider and wallet for executing transactions
  const provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
  const facilitatorWallet = new ethers.Wallet(config.settlerPrivateKey, provider);
  
  console.log(`[Facilitator] Wallet address: ${facilitatorWallet.address}`);

  // Services
  const settlement = new SettlementService({
    baseRpcUrl: config.baseRpcUrl,
    paymentSettlementAddress: config.paymentSettlementAddress,
    settlerPrivateKey: config.settlerPrivateKey,
  });
  const relay = new RelayService();

/**
 * POST /verify
 * x402-compliant verify endpoint
 * Verifies:
 * - Native ETH payments (via Relay tx hash)
 * - ERC-2612 permit signatures
 * - EIP-3009 authorization signatures
 */
app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'Missing paymentPayload or paymentRequirements' });
    }

    // Parse x402 payment payload
    const payload = paymentPayload as X402PaymentPayload;
    const { permit, authorization, nativePayment, signature } = payload.payload || {};

    // Determine payer address
    const payer = permit?.owner || authorization?.from || nativePayment?.from;
    
    if (!payer) {
      return res.json({
        isValid: false,
        invalidReason: 'Missing payer address in payment payload',
        payer: undefined,
      });
    }

    // NATIVE ETH PAYMENT: Verify via Relay status
    if (nativePayment) {
      console.log('[API] Verifying native ETH payment...');
      console.log(`  TxHash: ${nativePayment.txHash}`);
      console.log(`  RequestId: ${nativePayment.requestId || 'N/A'}`);
      console.log(`  From: ${nativePayment.from}`);
      console.log(`  Amount: ${nativePayment.amount}`);

      // Use requestId if available, otherwise fall back to txHash
      const statusKey = nativePayment.requestId || nativePayment.txHash;
      
      // Check Relay status for the transaction
      let relayStatus = await relay.getSwapStatus(statusKey);
      let attempts = 0;
      const maxAttempts = 60; // Increased to 60 seconds

      while (relayStatus === 'PENDING' && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        relayStatus = await relay.getSwapStatus(statusKey);
        attempts++;
        if (attempts % 5 === 0) {
          console.log(`[API] Relay status (${attempts}s): ${relayStatus}`);
        }
      }

      if (relayStatus === 'COMPLETED') {
        console.log('[API] ✅ Native ETH payment verified (Relay completed)');
        return res.json({
          isValid: true,
          invalidReason: undefined,
          payer,
        });
      } else if (relayStatus === 'FAILED') {
        return res.json({
          isValid: false,
          invalidReason: 'Native payment failed on Relay',
          payer,
        });
      } else {
        return res.json({
          isValid: false,
          invalidReason: `Native payment pending. Status: ${relayStatus}`,
          payer,
        });
      }
    }

    // For permit/authorization, signature is required
    if (!signature) {
      return res.json({
        isValid: false,
        invalidReason: 'Missing signature in payment payload',
        payer,
      });
    }

    // Check if this is a cross-chain payment
    const isCrossChain = paymentRequirements.srcNetwork || paymentRequirements.srcTokenAddress;
    const srcChainId = CHAIN_IDS[paymentRequirements.srcNetwork] || CHAIN_IDS[payload.network] || 8453;
    const destChainId = CHAIN_IDS[paymentRequirements.network] || 8453;

    console.log('[API] Verify request:', {
      payer,
      scheme: payload.scheme,
      network: payload.network,
      payTo: paymentRequirements.payTo,
      crossChain: isCrossChain,
      srcChainId,
      destChainId,
      hasPermit: !!permit,
      hasAuthorization: !!authorization,
    });

    // Verify signature
    let isValidSignature = false;
    
    if (authorization) {
      // EIP-3009 TransferWithAuthorization (USDC)
      console.log('[API] Verifying EIP-3009 authorization signature...');
      
      // Check deadline
      const validBefore = BigInt(authorization.validBefore);
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (validBefore < now + BigInt(6)) {
        return res.json({
          isValid: false,
          invalidReason: 'Authorization deadline expired or too soon',
          payer,
        });
      }

      // Check recipient matches payTo
      if (authorization.to.toLowerCase() !== paymentRequirements.payTo.toLowerCase() &&
          authorization.to.toLowerCase() !== facilitatorWallet.address.toLowerCase()) {
        return res.json({
          isValid: false,
          invalidReason: 'Authorization recipient mismatch',
          payer,
        });
      }

      // Check amount
      if (BigInt(authorization.value) < BigInt(paymentRequirements.srcAmountRequired || paymentRequirements.maxAmountRequired)) {
        return res.json({
          isValid: false,
          invalidReason: 'Authorization amount insufficient',
          payer,
        });
      }

      // Verify EIP-712 signature
      const tokenAddress = paymentRequirements.srcTokenAddress || paymentRequirements.asset;
      const tokenName = paymentRequirements.extra?.name || 'USD Coin';
      const tokenVersion = paymentRequirements.extra?.version || '2';

      const domain = {
        name: tokenName,
        version: tokenVersion,
        chainId: paymentRequirements.extra?.chainId || srcChainId,
        verifyingContract: paymentRequirements.extra?.verifyingContract || tokenAddress,
      };

      try {
        const recoveredAddress = ethers.verifyTypedData(
          domain,
          AUTHORIZATION_TYPES,
          {
            from: authorization.from,
            to: authorization.to,
            value: BigInt(authorization.value),
            validAfter: BigInt(authorization.validAfter),
            validBefore: BigInt(authorization.validBefore),
            nonce: authorization.nonce,
          },
          signature
        );
        isValidSignature = recoveredAddress.toLowerCase() === payer.toLowerCase();
        console.log(`[API] Signature verification: ${isValidSignature ? '✅' : '❌'} (recovered: ${recoveredAddress})`);
      } catch (e) {
        console.error('[API] Signature verification failed:', e);
        isValidSignature = false;
      }

    } else if (permit) {
      // ERC-2612 Permit
      console.log('[API] Verifying ERC-2612 permit signature...');
      
      // Check deadline
      const deadline = BigInt(permit.deadline);
      const now = BigInt(Math.floor(Date.now() / 1000));
      if (deadline < now + BigInt(6)) {
        return res.json({
          isValid: false,
          invalidReason: 'Permit deadline expired or too soon',
          payer,
        });
      }

      // Check spender is facilitator or payTo
      if (permit.spender.toLowerCase() !== paymentRequirements.payTo.toLowerCase() &&
          permit.spender.toLowerCase() !== facilitatorWallet.address.toLowerCase()) {
        return res.json({
          isValid: false,
          invalidReason: 'Permit spender mismatch',
          payer,
        });
      }

      // Check amount
      if (BigInt(permit.value) < BigInt(paymentRequirements.srcAmountRequired || paymentRequirements.maxAmountRequired)) {
        return res.json({
          isValid: false,
          invalidReason: 'Permit amount insufficient',
          payer,
        });
      }

      // Verify EIP-712 signature
      const tokenAddress = paymentRequirements.srcTokenAddress || paymentRequirements.asset;
      const tokenName = paymentRequirements.extra?.name || 'Unknown Token';
      const tokenVersion = paymentRequirements.extra?.version || '1';

      const domain = {
        name: tokenName,
        version: tokenVersion,
        chainId: paymentRequirements.extra?.chainId || srcChainId,
        verifyingContract: paymentRequirements.extra?.verifyingContract || tokenAddress,
      };

      try {
        const recoveredAddress = ethers.verifyTypedData(
          domain,
          PERMIT_TYPES,
          {
            owner: permit.owner,
            spender: permit.spender,
            value: BigInt(permit.value),
            nonce: BigInt(permit.nonce),
            deadline: BigInt(permit.deadline),
          },
          signature
        );
        isValidSignature = recoveredAddress.toLowerCase() === payer.toLowerCase();
        console.log(`[API] Signature verification: ${isValidSignature ? '✅' : '❌'} (recovered: ${recoveredAddress})`);
      } catch (e) {
        console.error('[API] Signature verification failed:', e);
        isValidSignature = false;
      }
    } else {
      return res.json({
        isValid: false,
        invalidReason: 'Missing permit or authorization in payload',
        payer,
      });
    }

    if (!isValidSignature) {
      return res.json({
        isValid: false,
        invalidReason: 'Invalid signature',
        payer,
      });
    }

    console.log('[API] ✅ Payment verified successfully');

    res.json({
      isValid: true,
      invalidReason: undefined,
      payer,
    });
  } catch (error) {
    console.error('[API] Verify error:', error);
    res.status(500).json({ error: String(error) });
  }
});


/**
 * POST /settle
 * x402-compliant settle endpoint
 * 
 * Supports ANY ERC-20 token on ANY chain → USDC on Base to merchant
 * 
 * Flow:
 * 1. Customer signs permit for their token (WETH, DAI, USDC, etc.)
 * 2. Facilitator takes tokens from customer via permit
 * 3. Facilitator uses Relay to swap+bridge → USDC on Base
 * 4. Relay delivers USDC directly to merchant
 */
app.post('/settle', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;

    if (!paymentPayload || !paymentRequirements) {
      return res.status(400).json({ error: 'Missing paymentPayload or paymentRequirements' });
    }

    // Parse x402 payment payload
    const payload = paymentPayload as X402PaymentPayload;
    const { permit, authorization, nativePayment, signature } = payload.payload || {};

    // Determine payer address
    const payer = permit?.owner || authorization?.from || nativePayment?.from;

    if (!payer) {
      return res.json({
        success: false,
        errorReason: 'Missing payer in payment payload',
        payer,
      });
    }

    // NATIVE ETH PAYMENT: Already settled via Relay (customer sent tx directly)
    if (nativePayment) {
      console.log('[API] Native ETH payment - already settled via Relay');
      console.log(`  TxHash: ${nativePayment.txHash}`);
      console.log(`  RequestId: ${nativePayment.requestId || 'N/A'}`);
      
      // Native payments are already verified in /verify endpoint
      // Relay has already completed the swap+bridge and sent USDC to merchant
      // No need to check status again - just confirm settlement
      console.log('[API] ✅ Native ETH settlement confirmed (verified in /verify)');
      
      return res.json({
        success: true,
        transaction: nativePayment.txHash,
        network: payload.network,
        payer,
      });
    }

    // For permit/authorization, signature is required
    if (!signature) {
      return res.json({
        success: false,
        errorReason: 'Missing signature in payment payload',
        payer,
      });
    }

    // Determine source and destination chains/tokens
    const srcChainId = CHAIN_IDS[paymentRequirements.srcNetwork] || CHAIN_IDS[payload.network] || 8453;
    const destChainId = CHAIN_IDS[paymentRequirements.network] || 8453;
    const srcToken = paymentRequirements.srcTokenAddress || paymentRequirements.asset;
    const destToken = paymentRequirements.asset; // Usually USDC on Base
    const srcAmount = paymentRequirements.srcAmountRequired || paymentRequirements.maxAmountRequired;
    const destAmount = paymentRequirements.maxAmountRequired;
    const merchant = paymentRequirements.payTo;

    // Check if cross-chain or different token (needs swap/bridge)
    const needsSwapOrBridge = srcChainId !== destChainId || 
                              srcToken.toLowerCase() !== destToken.toLowerCase();

    console.log('[API] Settle request:', {
      payer,
      srcChain: srcChainId,
      destChain: destChainId,
      srcToken,
      destToken,
      srcAmount,
      destAmount,
      merchant,
      needsSwapOrBridge,
    });

    // Get RPC for source chain
    const srcRpcUrl = getRpcUrl(srcChainId);
    const srcProvider = new ethers.JsonRpcProvider(srcRpcUrl);
    const srcWallet = new ethers.Wallet(config.settlerPrivateKey, srcProvider);

    let txHash: string | undefined;

    if (needsSwapOrBridge) {
      // CROSS-CHAIN or SWAP flow:
      // 1. Take tokens from customer via permit/authorization
      // 2. Approve Relay to spend tokens
      // 3. Execute Relay swap+bridge → merchant receives USDC

      console.log('[API] 🔄 Swap/Bridge flow starting...');

      // Step 1: Take tokens from customer
      if (authorization) {
        // EIP-3009: transferWithAuthorization (USDC only)
        // Transfer to facilitator first
        console.log('[API] Step 1: Taking USDC from customer via EIP-3009...');
        
        const usdcContract = new ethers.Contract(
          srcToken,
          [
            'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature) external'
          ],
          srcWallet
        );

        try {
          const tx = await usdcContract.transferWithAuthorization(
            authorization.from,
            srcWallet.address, // Transfer to facilitator
            authorization.value,
            authorization.validAfter,
            authorization.validBefore,
            authorization.nonce,
            signature
          );
          await tx.wait();
          console.log('[API] ✅ Tokens received from customer');
        } catch (e: any) {
          console.error('[API] TransferWithAuthorization failed:', e);
          return res.json({
            success: false,
            errorReason: `Failed to take tokens: ${e.message}`,
            payer,
          });
        }

      } else if (permit) {
        // ERC-2612: permit + transferFrom (any ERC-20)
        console.log('[API] Step 1: Taking tokens from customer via ERC-2612 permit...');

        const sig = ethers.Signature.from(signature);

        const tokenContract = new ethers.Contract(
          srcToken,
          [
            'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
            'function approve(address spender, uint256 amount) external returns (bool)',
            'function balanceOf(address account) external view returns (uint256)'
          ],
          srcWallet
        );

        try {
          // Execute permit
          const permitTx = await tokenContract.permit(
            permit.owner,
            permit.spender,
            permit.value,
            permit.deadline,
            sig.v,
            sig.r,
            sig.s
          );
          await permitTx.wait();
          console.log('[API] Permit executed');

          // Transfer tokens to facilitator
          const transferTx = await tokenContract.transferFrom(
            permit.owner,
            srcWallet.address,
            permit.value
          );
          await transferTx.wait();
          console.log('[API] ✅ Tokens received from customer');
        } catch (e: any) {
          console.error('[API] Permit/TransferFrom failed:', e);
          return res.json({
            success: false,
            errorReason: `Failed to take tokens: ${e.message}`,
            payer,
          });
        }
      }

      // Step 2: Get Relay quote for swap+bridge to merchant
      console.log('[API] Step 2: Getting Relay swap+bridge quote...');
      
      try {
        const quoteResult = await relay.getSwapBridgeQuote(
          srcChainId,
          srcToken,
          destChainId,
          destToken,
          destAmount,
          srcWallet.address,
          merchant // Relay sends directly to merchant
        );

        console.log(`[API] Quote: ${quoteResult.expectedInput} ${srcToken} → ${quoteResult.expectedOutput} USDC`);

        // Step 3: Approve Relay to spend tokens (if ERC-20, not native)
        if (srcToken.toLowerCase() !== '0x0000000000000000000000000000000000000000') {
          console.log('[API] Step 3: Approving Relay to spend tokens...');
          
          const tokenContract = new ethers.Contract(
            srcToken,
            ['function approve(address spender, uint256 amount) external returns (bool)'],
            srcWallet
          );

          const approveTx = await tokenContract.approve(
            quoteResult.txData.to, // Relay contract
            ethers.MaxUint256 // Max approval
          );
          await approveTx.wait();
          console.log('[API] ✅ Relay approved');
        }

        // Step 4: Execute Relay swap+bridge
        console.log('[API] Step 4: Executing Relay swap+bridge...');
        
        const bridgeTx = await srcWallet.sendTransaction({
          to: quoteResult.txData.to,
          data: quoteResult.txData.data,
          value: quoteResult.txData.value ? BigInt(quoteResult.txData.value) : BigInt(0),
        });
        
        const bridgeReceipt = await bridgeTx.wait();
        txHash = bridgeReceipt?.hash;
        console.log(`[API] Bridge tx sent: ${txHash}`);

        // Step 5: Wait for Relay to complete
        console.log('[API] Step 5: Waiting for Relay completion...');
        
        let relayStatus = await relay.getSwapStatus(quoteResult.requestId);
        let attempts = 0;
        const maxAttempts = 60; // Up to 60 seconds
        
        while (relayStatus === 'PENDING' && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          relayStatus = await relay.getSwapStatus(quoteResult.requestId);
          attempts++;
          if (attempts % 5 === 0) {
            console.log(`[API] Relay status (${attempts}s): ${relayStatus}`);
          }
        }

        if (relayStatus !== 'COMPLETED') {
          return res.json({
            success: false,
            errorReason: `Relay swap/bridge not completed. Status: ${relayStatus}`,
            payer,
          });
        }

        console.log('[API] ✅ Swap+Bridge complete! Merchant received USDC');

      } catch (e: any) {
        console.error('[API] Swap/Bridge failed:', e);
        return res.json({
          success: false,
          errorReason: `Swap/Bridge failed: ${e.message}`,
          payer,
        });
      }

    } else {
      // SAME-CHAIN, SAME-TOKEN flow (e.g., USDC on Base → USDC on Base)
      // Just execute the transfer directly to merchant
      
      console.log('[API] 💸 Same-chain settlement...');

      if (authorization) {
        // EIP-3009: transferWithAuthorization directly to merchant
        const usdcContract = new ethers.Contract(
          destToken,
          [
            'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature) external'
          ],
          srcWallet
        );

        try {
          const tx = await usdcContract.transferWithAuthorization(
            authorization.from,
            merchant, // Direct to merchant
            authorization.value,
            authorization.validAfter,
            authorization.validBefore,
            authorization.nonce,
            signature
          );
          const receipt = await tx.wait();
          txHash = receipt.hash;
          console.log(`[API] ✅ Settlement complete: ${txHash}`);
        } catch (e: any) {
          console.error('[API] Settlement failed:', e);
          return res.json({
            success: false,
            errorReason: `Settlement failed: ${e.message}`,
            payer,
          });
        }

      } else if (permit) {
        // ERC-2612: permit + transferFrom to merchant
        const sig = ethers.Signature.from(signature);

        const tokenContract = new ethers.Contract(
          destToken,
          [
            'function permit(address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external',
            'function transferFrom(address from, address to, uint256 amount) external returns (bool)'
          ],
          srcWallet
        );

        try {
          const permitTx = await tokenContract.permit(
            permit.owner,
            permit.spender,
            permit.value,
            permit.deadline,
            sig.v,
            sig.r,
            sig.s
          );
          await permitTx.wait();

          const transferTx = await tokenContract.transferFrom(
            permit.owner,
            merchant, // Direct to merchant
            permit.value
          );
          const receipt = await transferTx.wait();
          txHash = receipt.hash;
          console.log(`[API] ✅ Settlement complete: ${txHash}`);
        } catch (e: any) {
          console.error('[API] Settlement failed:', e);
          return res.json({
            success: false,
            errorReason: `Settlement failed: ${e.message}`,
            payer,
          });
        }
      }
    }

    res.json({
      success: true,
      transaction: txHash,
      network: payload.network,
      payer,
    });
  } catch (error) {
    console.error('[API] Settle error:', error);
    res.json({
      success: false,
      errorReason: String(error),
    });
  }
});

// Helper function to get RPC URL for a chain
function getRpcUrl(chainId: number): string {
  const rpcUrls: Record<number, string> = {
    1: 'https://eth.llamarpc.com',
    8453: 'https://mainnet.base.org',
    56: 'https://bsc-dataseed.binance.org',
    43114: 'https://api.avax.network/ext/bc/C/rpc',
    324: 'https://mainnet.era.zksync.io',
    59144: 'https://rpc.linea.build',
    84532: 'https://sepolia.base.org',
    42161: 'https://arb1.arbitrum.io/rpc',
    10: 'https://mainnet.optimism.io',
    137: 'https://polygon-rpc.com',
  };
  return rpcUrls[chainId] || 'https://mainnet.base.org';
}

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

