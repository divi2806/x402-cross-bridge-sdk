import axios, { AxiosInstance, AxiosError } from 'axios';
import type { WalletClient } from 'viem';
import type { PaymentRequirements, PaymentPayload, PaymentPreferences, X402Response } from '../types.js';

/**
 * Create an x402 payment client for BROWSER use with MetaMask/Coinbase Wallet
 * Automatically handles cross-chain payments via Relay
 */
export function createBrowserPaymentClient(
  walletClient: WalletClient,
  preferences?: PaymentPreferences
): AxiosInstance {
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

        const paymentRequirements = accepts[0];

        console.log('[Browser Payment] Payment required:', {
          amount: paymentRequirements.maxAmountRequired,
          token: paymentRequirements.asset,
          network: paymentRequirements.network,
          payTo: paymentRequirements.payTo,
        });

        // Get user's current chain
        const userChainId = await walletClient.getChainId();
        const merchantChainId = getChainIdFromNetwork(paymentRequirements.network);
        const isCrossChain = userChainId !== merchantChainId;

        if (isCrossChain) {
          console.log('[Browser Payment] Cross-chain payment detected');
          console.log(`  Your chain: ${userChainId}`);
          console.log(`  Merchant chain: ${merchantChainId}`);
        }

        // Get user address
        const userAddress = walletClient.account?.address;
        if (!userAddress) {
          throw new Error('No wallet address found');
        }

        // Execute cross-chain payment
        let txHash: string;
        if (isCrossChain) {
          txHash = await executeBrowserCrossChainPayment(
            walletClient,
            userAddress,
            userChainId,
            preferences?.preferredToken || '0x0000000000000000000000000000000000000000',
            paymentRequirements
          );
        } else {
          throw new Error('Same-chain payments not yet implemented. Use cross-chain for now.');
        }

        // Create payment payload
        const paymentPayload: PaymentPayload = {
          x402Version,
          networkId: userChainId,
          scheme: 'exact',
          data: {
            transactionHash: txHash,
            from: userAddress,
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
          originalRequest.headers!['X-PREFERRED-NETWORK'] = getNetworkName(userChainId);
          
          paymentRequirements.srcTokenAddress = preferences?.preferredToken || '0x0000000000000000000000000000000000000000';
          paymentRequirements.srcNetwork = getNetworkName(userChainId);
        }

        console.log('[Browser Payment] Retrying request with payment');
        return client.request(originalRequest);
      } catch (err: any) {
        console.error('[Browser Payment] Payment failed:', err);
        return Promise.reject(err);
      }
    }
  );

  return client;
}

/**
 * Execute cross-chain payment via Relay using browser wallet
 */
async function executeBrowserCrossChainPayment(
  walletClient: WalletClient,
  userAddress: string,
  fromChainId: number,
  fromToken: string,
  paymentRequirements: PaymentRequirements
): Promise<string> {
  console.log('[Cross-Chain] Getting Relay quote...');

  // Get Relay quote
  const quoteResponse = await fetch('https://api.relay.link/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user: userAddress,
      originChainId: fromChainId,
      destinationChainId: getChainIdFromNetwork(paymentRequirements.network),
      originCurrency: fromToken,
      destinationCurrency: paymentRequirements.asset,
      amount: paymentRequirements.maxAmountRequired,
      tradeType: 'EXACT_OUTPUT',
      recipient: userAddress,
    }),
  });

  const quote = await quoteResponse.json() as any;
  const txData = quote.steps[0].items[0].data;

  console.log('[Cross-Chain] Quote received');
  console.log('[Cross-Chain] Please approve transaction in your wallet...');

  // Send transaction using user's wallet
  const hash = await walletClient.sendTransaction({
    to: txData.to as `0x${string}`,
    data: txData.data as `0x${string}`,
    value: BigInt(txData.value || '0'),
    account: walletClient.account!,
    chain: walletClient.chain,
  });

  console.log('[Cross-Chain] Transaction sent:', hash);
  console.log('[Cross-Chain] Relay will bridge in 2-3 seconds...');

  return hash;
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
  return map[network] || 8453;
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

