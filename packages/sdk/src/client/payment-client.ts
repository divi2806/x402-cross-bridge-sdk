import axios, { AxiosInstance, AxiosError } from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, http, type Address } from 'viem';
import { arbitrum, base, optimism, polygon, mainnet } from 'viem/chains';
import type { PaymentRequirements, PaymentPayload, PaymentPreferences, X402Response } from '../types.js';

// Chain mapping
const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  8453: base,
  42161: arbitrum,
  10: optimism,
  137: polygon,
};

const RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
};

/**
 * Create an x402 payment client with cross-chain support
 * Uses Relay for automatic bridging when customer is on different chain than merchant requires
 */
export function createPaymentClient(
  privateKey: `0x${string}`,
  preferences?: PaymentPreferences
): AxiosInstance {
  const account = privateKeyToAccount(privateKey);
  const client = axios.create();

  // Add request interceptor to include preference headers
  client.interceptors.request.use((config) => {
    if (preferences?.preferredToken) {
      config.headers['X-PREFERRED-TOKEN'] = preferences.preferredToken;
    }
    if (preferences?.preferredNetwork) {
      config.headers['X-PREFERRED-NETWORK'] = preferences.preferredNetwork;
    }
    return config;
  });

  // Add response interceptor to handle 402 Payment Required
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      if (!error.response || error.response.status !== 402) {
        return Promise.reject(error);
      }

      const originalRequest = error.config;
      if (!originalRequest || (originalRequest as any)._retry) {
        return Promise.reject(error);
      }

      try {
        const x402Response = error.response.data as X402Response;
        const { x402Version, accepts } = x402Response;

        if (!accepts || accepts.length === 0) {
          throw new Error('No payment requirements provided');
        }

        // Select first payment requirement
        // TODO: Add smart selection based on user's chain/token
        const paymentRequirements = accepts[0];

        console.log('[Payment Client] Payment required:', {
          amount: paymentRequirements.maxAmountRequired,
          token: paymentRequirements.asset,
          network: paymentRequirements.network,
          payTo: paymentRequirements.payTo,
        });

        // Detect if cross-chain payment is needed
        const customerChainId = preferences?.preferredChainId || 42161; // Default to Arbitrum
        const merchantChainId = getChainIdFromNetwork(paymentRequirements.network);
        const isCrossChain = customerChainId !== merchantChainId;

        if (isCrossChain) {
          console.log('[Payment Client] Cross-chain payment detected');
          console.log(`  Customer chain: ${customerChainId}`);
          console.log(`  Merchant chain: ${merchantChainId}`);
        }

        // Get Relay quote for cross-chain bridge if needed
        let txHash: string;
        let requestId: string;
        if (isCrossChain) {
          const result = await executeCrossChainPayment(
            account.address,
            privateKey,
            customerChainId,
            preferences?.preferredToken || '0x0000000000000000000000000000000000000000',
            paymentRequirements
          );
          txHash = result.txHash;
          requestId = result.requestId;
        } else {
          // Same-chain payment (not yet implemented)
          throw new Error('Same-chain payments not yet implemented. Use cross-chain for now.');
        }

        // Create payment payload
        const paymentPayload: PaymentPayload = {
          x402Version,
          networkId: customerChainId,
          scheme: 'exact',
          data: {
            transactionHash: txHash,
            requestId: requestId, // Relay request ID for status checking
            from: account.address,
            to: paymentRequirements.payTo,
            value: paymentRequirements.maxAmountRequired,
          },
        };

        // Encode payment payload as base64
        const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

        // Retry request with payment header
        (originalRequest as any)._retry = true;
        originalRequest.headers!['X-PAYMENT'] = paymentHeader;

        // Add preference headers for cross-chain verification
        if (isCrossChain) {
          originalRequest.headers!['X-PREFERRED-TOKEN'] = preferences?.preferredToken || '0x0000000000000000000000000000000000000000';
          originalRequest.headers!['X-PREFERRED-NETWORK'] = getNetworkName(customerChainId);
          
          // Add to payment requirements for facilitator
          paymentRequirements.srcTokenAddress = preferences?.preferredToken || '0x0000000000000000000000000000000000000000';
          paymentRequirements.srcNetwork = getNetworkName(customerChainId);
        }

        console.log('[Payment Client] Retrying request with payment header');
        return client.request(originalRequest);
      } catch (err) {
        console.error('[Payment Client] Payment failed:', err);
        return Promise.reject(err);
      }
    }
  );

  return client;
}

/**
 * Execute cross-chain payment via Relay
 */
async function executeCrossChainPayment(
  userAddress: Address,
  privateKey: `0x${string}`,
  fromChainId: number,
  fromToken: string,
  paymentRequirements: PaymentRequirements
): Promise<{ txHash: string; requestId: string }> {
  console.log('[Cross-Chain] Getting Relay quote...');

  // Get Relay quote
  const quoteResponse = await axios.post('https://api.relay.link/quote', {
    user: userAddress,
    originChainId: fromChainId,
    destinationChainId: getChainIdFromNetwork(paymentRequirements.network),
    originCurrency: fromToken,
    destinationCurrency: paymentRequirements.asset,
    amount: paymentRequirements.maxAmountRequired,
    tradeType: 'EXACT_OUTPUT',
    recipient: userAddress,
  });

  const quote = quoteResponse.data;
  const requestId = quote.steps[0].requestId; // Relay's request ID
  const txData = quote.steps[0].items[0].data;

  console.log('[Cross-Chain] Quote received, sending transaction...');
  console.log('[Cross-Chain] Relay Request ID:', requestId);

  // Create wallet client
  const chain = CHAIN_MAP[fromChainId];
  const walletClient = createWalletClient({
    account: privateKeyToAccount(privateKey),
    chain,
    transport: http(RPC_URLS[fromChainId]),
  });

  // Send transaction
  const hash = await walletClient.sendTransaction({
    to: txData.to as Address,
    data: txData.data as `0x${string}`,
    value: BigInt(txData.value || '0'),
    chain,
  });

  console.log('[Cross-Chain] Transaction sent:', hash);
  
  // IMPORTANT: Notify Relay to index the transaction immediately
  // This accelerates indexing and ensures Relay detects the deposit
  try {
    await axios.post('https://api.relay.link/transactions/index', {
      txHash: hash,
      chainId: fromChainId,
    });
    console.log('[Cross-Chain] Transaction indexed with Relay');
  } catch (indexError) {
    console.warn('[Cross-Chain] Failed to index transaction, Relay will index it eventually:', indexError);
  }
  
  console.log('[Cross-Chain] Relay will bridge in 2-3 seconds...');

  return { txHash: hash, requestId };
}

/**
 * Get chain ID from network name
 */
function getChainIdFromNetwork(network: string): number {
  const map: Record<string, number> = {
    'mainnet': 1,
    'base': 8453,
    'arbitrum': 42161,
    'optimism': 10,
    'polygon': 137,
  };
  return map[network] || 8453; // Default to Base
}

/**
 * Get network name from chain ID
 */
function getNetworkName(chainId: number): string {
  const map: Record<number, string> = {
    1: 'mainnet',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    137: 'polygon',
  };
  return map[chainId] || 'base';
}

