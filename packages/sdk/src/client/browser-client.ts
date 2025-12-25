import axios, { AxiosInstance, AxiosError } from 'axios';
import type { WalletClient, Hex } from 'viem';
import { keccak256, toHex } from 'viem';
import type { PaymentRequirements, PaymentPayload, PaymentPreferences, X402Response } from '../types.js';
import { CHAIN_IDS, NETWORK_NAMES, USDC_ADDRESSES } from '../types.js';

// EIP-3009 TransferWithAuthorization types for USDC
const AUTHORIZATION_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

// ERC-2612 Permit types
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

/**
 * Create an x402-compatible payment client for BROWSER use with MetaMask/Coinbase Wallet
 * Signs ERC-2612 permits or EIP-3009 authorizations (gasless for customer)
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
        const merchantChainId = CHAIN_IDS[paymentRequirements.network as keyof typeof CHAIN_IDS] || 8453;
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

        // Get token to sign for
        const srcToken = preferences?.preferredToken || paymentRequirements.srcTokenAddress || paymentRequirements.asset;
        const srcAmount = paymentRequirements.srcAmountRequired || paymentRequirements.maxAmountRequired;

        // Create signed payment payload
        const paymentPayload = await createBrowserSignedPayment(
          walletClient,
          userAddress,
          userChainId,
          srcToken,
          srcAmount,
          paymentRequirements,
          x402Version
        );

        // Encode payment payload as base64
        const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

        // Retry request with payment header
        (originalRequest as any)._retry = true;
        originalRequest.headers!['X-PAYMENT'] = paymentHeader;

        // Add preference headers
        if (preferences?.preferredToken) {
          originalRequest.headers!['X-PREFERRED-TOKEN'] = preferences.preferredToken;
        }
        if (preferences?.preferredNetwork) {
          originalRequest.headers!['X-PREFERRED-NETWORK'] = preferences.preferredNetwork;
        }

        console.log('[Browser Payment] Retrying request with signed payment');
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
 * Create a signed payment payload using browser wallet
 */
async function createBrowserSignedPayment(
  walletClient: WalletClient,
  userAddress: string,
  chainId: number,
  tokenAddress: string,
  amount: string,
  paymentRequirements: PaymentRequirements,
  x402Version: number
): Promise<PaymentPayload> {
  // Determine if this is USDC (use EIP-3009) or other token (use ERC-2612)
  const isUsdc = Object.values(USDC_ADDRESSES).some(
    addr => addr.toLowerCase() === tokenAddress.toLowerCase()
  );

  // Get spender address (facilitator)
  const spender = paymentRequirements.extra?.facilitatorAddress || paymentRequirements.payTo;

  // Get token name and version for EIP-712 domain
  const tokenName = paymentRequirements.extra?.name || (isUsdc ? 'USD Coin' : 'Unknown Token');
  const tokenVersion = paymentRequirements.extra?.version || '2';

  const deadline = BigInt(Math.floor(Date.now() / 1000) + (paymentRequirements.maxTimeoutSeconds || 300));

  if (isUsdc) {
    // EIP-3009 TransferWithAuthorization for USDC
    console.log('[Browser Payment] Signing EIP-3009 authorization (USDC)...');

    // Generate random nonce
    const nonce = keccak256(toHex(Date.now().toString() + Math.random().toString()));

    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId: paymentRequirements.extra?.chainId || chainId,
      verifyingContract: (paymentRequirements.extra?.verifyingContract || tokenAddress) as `0x${string}`,
    };

    const message = {
      from: userAddress as `0x${string}`,
      to: spender as `0x${string}`,
      value: BigInt(amount),
      validAfter: BigInt(0),
      validBefore: deadline,
      nonce: nonce as Hex,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain,
      types: AUTHORIZATION_TYPES,
      primaryType: 'TransferWithAuthorization',
      message,
    });

    return {
      x402Version,
      scheme: 'exact',
      network: NETWORK_NAMES[chainId] || 'base',
      payload: {
        authorization: {
          from: userAddress,
          to: spender,
          value: amount,
          validAfter: '0',
          validBefore: deadline.toString(),
          nonce: nonce,
        },
        signature,
      },
    };
  } else {
    // ERC-2612 Permit for other tokens
    console.log('[Browser Payment] Signing ERC-2612 permit...');

    // For browser, we'll use nonce 0 (should query from contract in production)
    const nonce = BigInt(0);

    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId: paymentRequirements.extra?.chainId || chainId,
      verifyingContract: (paymentRequirements.extra?.verifyingContract || tokenAddress) as `0x${string}`,
    };

    const message = {
      owner: userAddress as `0x${string}`,
      spender: spender as `0x${string}`,
      value: BigInt(amount),
      nonce,
      deadline,
    };

    const signature = await walletClient.signTypedData({
      account: walletClient.account!,
      domain,
      types: PERMIT_TYPES,
      primaryType: 'Permit',
      message,
    });

    return {
      x402Version,
      scheme: 'exact',
      network: NETWORK_NAMES[chainId] || 'base',
      payload: {
        permit: {
          owner: userAddress,
          spender,
          value: amount,
          nonce: nonce.toString(),
          deadline: deadline.toString(),
        },
        signature,
      },
    };
  }
}
