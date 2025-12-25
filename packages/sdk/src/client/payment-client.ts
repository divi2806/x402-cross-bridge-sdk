import axios, { AxiosInstance, AxiosError } from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import { createWalletClient, createPublicClient, http, type Address, type Hex, keccak256, toHex } from 'viem';
import { arbitrum, base, optimism, polygon, mainnet, baseSepolia } from 'viem/chains';
import type { 
  PaymentRequirements, 
  PaymentPayload, 
  PaymentPreferences, 
  X402Response,
  Network,
} from '../types.js';
import { CHAIN_IDS, NETWORK_NAMES, USDC_ADDRESSES } from '../types.js';

// Chain mapping
const CHAIN_MAP: Record<number, any> = {
  1: mainnet,
  8453: base,
  84532: baseSepolia,
  42161: arbitrum,
  10: optimism,
  137: polygon,
};

const RPC_URLS: Record<number, string> = {
  1: 'https://eth.llamarpc.com',
  8453: 'https://mainnet.base.org',
  84532: 'https://sepolia.base.org',
  42161: 'https://arb1.arbitrum.io/rpc',
  10: 'https://mainnet.optimism.io',
  137: 'https://polygon-rpc.com',
  56: 'https://bsc-dataseed.binance.org',
  43114: 'https://api.avax.network/ext/bc/C/rpc',
  324: 'https://mainnet.era.zksync.io',
  59144: 'https://rpc.linea.build',
};

// ERC-2612 Permit types for EIP-712 signing
const PERMIT_TYPES = {
  Permit: [
    { name: 'owner', type: 'address' },
    { name: 'spender', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
  ],
} as const;

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

/**
 * Create an x402-compatible payment client
 * Signs ERC-2612 permits or EIP-3009 authorizations (gasless for customer)
 * Facilitator executes the bridge and transfer
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
        const paymentRequirements = accepts[0];

        console.log('[Payment Client] Payment required:', {
          amount: paymentRequirements.maxAmountRequired,
          token: paymentRequirements.asset,
          network: paymentRequirements.network,
          payTo: paymentRequirements.payTo,
        });

        // Determine which chain/token to pay with
        const customerChainId = preferences?.preferredChainId || CHAIN_IDS[paymentRequirements.network as Network] || 8453;
        const merchantChainId = CHAIN_IDS[paymentRequirements.network as Network] || 8453;
        const isCrossChain = customerChainId !== merchantChainId;

        // Get the token to sign permit for
        const srcToken = preferences?.preferredToken || paymentRequirements.srcTokenAddress || paymentRequirements.asset;
        const srcAmount = paymentRequirements.srcAmountRequired || paymentRequirements.maxAmountRequired;

        console.log('[Payment Client] Creating payment signature...');
        console.log(`  Source chain: ${customerChainId}`);
        console.log(`  Source token: ${srcToken}`);
        console.log(`  Amount: ${srcAmount}`);
        if (isCrossChain) {
          console.log(`  Cross-chain to: ${merchantChainId}`);
        }

        // Create signed payment payload
        const paymentPayload = await createSignedPayment(
          privateKey,
          customerChainId,
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

        // Add preference headers for cross-chain verification
        if (preferences?.preferredToken) {
          originalRequest.headers!['X-PREFERRED-TOKEN'] = preferences.preferredToken;
        }
        if (preferences?.preferredNetwork) {
          originalRequest.headers!['X-PREFERRED-NETWORK'] = preferences.preferredNetwork;
        }

        console.log('[Payment Client] Retrying request with signed payment');
        return client.request(originalRequest);
      } catch (err) {
        console.error('[Payment Client] Payment failed:', err);
        return Promise.reject(err);
      }
    }
  );

  return client;
}

// Native ETH address
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';

/**
 * Create a signed payment payload
 * - Native ETH: Customer sends transaction directly (not gasless)
 * - USDC: EIP-3009 TransferWithAuthorization (gasless)
 * - Other ERC-20: ERC-2612 Permit (gasless)
 */
async function createSignedPayment(
  privateKey: `0x${string}`,
  chainId: number,
  tokenAddress: string,
  amount: string,
  paymentRequirements: PaymentRequirements,
  x402Version: number
): Promise<PaymentPayload> {
  const account = privateKeyToAccount(privateKey);
  const chain = CHAIN_MAP[chainId];
  
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  // Create wallet client for signing/sending
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC_URLS[chainId]),
  });

  // Create public client for reading contract state
  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URLS[chainId]),
  });

  // Check if this is native ETH
  const isNativeToken = tokenAddress.toLowerCase() === NATIVE_TOKEN.toLowerCase();

  // Determine if this is USDC (use EIP-3009) or other token (use ERC-2612)
  const isUsdc = Object.values(USDC_ADDRESSES).some(
    addr => addr.toLowerCase() === tokenAddress.toLowerCase()
  );

  // NATIVE ETH: Customer must send a transaction (not gasless)
  if (isNativeToken) {
    console.log('[Payment Client] Native ETH payment - sending transaction...');
    
    // Get Relay quote for native ETH → USDC on destination
    const destChainId = CHAIN_IDS[paymentRequirements.network as Network] || 8453;
    const destToken = paymentRequirements.asset;
    const destAmount = paymentRequirements.maxAmountRequired;
    const merchant = paymentRequirements.payTo;

    // Get quote from Relay v2 API
    const quoteResponse = await fetch('https://api.relay.link/quote/v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user: account.address,
        originChainId: chainId,
        destinationChainId: destChainId,
        originCurrency: NATIVE_TOKEN,
        destinationCurrency: destToken,
        amount: destAmount,
        tradeType: 'EXACT_OUTPUT',
        recipient: merchant, // Relay sends directly to merchant
      }),
    });

    if (!quoteResponse.ok) {
      const errorText = await quoteResponse.text();
      throw new Error(`Relay quote failed: ${errorText}`);
    }

    const quote = await quoteResponse.json() as any;
    
    // Extract transaction data from Relay response
    // Structure: steps[0].items[0].data contains { from, to, data, value, chainId }
    const step = quote.steps?.[0];
    const item = step?.items?.[0];
    const txData = item?.data;
    const requestId = step?.requestId;

    if (!txData || !txData.to || !txData.data) {
      console.error('[Payment Client] Invalid Relay response:', JSON.stringify(quote, null, 2));
      throw new Error('Invalid Relay quote response - missing transaction data');
    }

    const inputAmount = quote.details?.currencyIn?.amount || 'unknown';
    const outputAmount = quote.details?.currencyOut?.amount || destAmount;
    console.log(`[Payment Client] Relay quote: ${inputAmount} wei ETH → ${outputAmount} USDC`);
    console.log(`[Payment Client] Relay Request ID: ${requestId}`);
    console.log('[Payment Client] Sending transaction...');

    // Send the transaction with proper data
    const txHash = await walletClient.sendTransaction({
      to: txData.to as Address,
      data: txData.data as Hex,
      value: BigInt(txData.value || '0'),
      chain,
    });

    console.log(`[Payment Client] Transaction sent: ${txHash}`);
    
    // Call Relay's transactions/index to accelerate indexing
    try {
      await fetch('https://api.relay.link/transactions/index', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash, chainId }),
      });
      console.log('[Payment Client] Triggered Relay indexing');
    } catch (e) {
      // Non-fatal, indexing will happen eventually
    }

    console.log('[Payment Client] Relay will swap+bridge in 2-3 seconds...');

    // Return native payment payload with requestId for status tracking
    return {
      x402Version,
      scheme: 'exact',
      network: NETWORK_NAMES[chainId] || 'base',
      payload: {
        nativePayment: {
          from: account.address,
          txHash: txHash,
          amount: txData.value,
          chainId: chainId,
          requestId: requestId, // Include requestId for status tracking
        },
      },
    };
  }

  // Get spender address (facilitator)
  const spender = paymentRequirements.extra?.facilitatorAddress || paymentRequirements.payTo;

  // Get token name and version for EIP-712 domain
  const tokenName = paymentRequirements.extra?.name || (isUsdc ? 'USD Coin' : 'Unknown Token');
  const tokenVersion = paymentRequirements.extra?.version || '2';

  const deadline = BigInt(Math.floor(Date.now() / 1000) + (paymentRequirements.maxTimeoutSeconds || 300));

  if (isUsdc) {
    // EIP-3009 TransferWithAuthorization for USDC
    console.log('[Payment Client] Signing EIP-3009 authorization (USDC)...');

    // Generate random nonce
    const nonce = keccak256(toHex(Date.now().toString() + Math.random().toString()));

    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId: paymentRequirements.extra?.chainId || chainId,
      verifyingContract: (paymentRequirements.extra?.verifyingContract || tokenAddress) as Address,
    };

    const message = {
      from: account.address,
      to: spender as Address,
      value: BigInt(amount),
      validAfter: BigInt(0),
      validBefore: deadline,
      nonce: nonce as Hex,
    };

    const signature = await walletClient.signTypedData({
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
          from: account.address,
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
    console.log('[Payment Client] Signing ERC-2612 permit...');

    // Get current nonce from token contract
    let nonce = BigInt(0);
    try {
      nonce = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: [
          {
            inputs: [{ name: 'owner', type: 'address' }],
            name: 'nonces',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'nonces',
        args: [account.address],
      }) as bigint;
    } catch (e) {
      console.warn('[Payment Client] Could not read nonce, using 0');
    }

    const domain = {
      name: tokenName,
      version: tokenVersion,
      chainId: paymentRequirements.extra?.chainId || chainId,
      verifyingContract: (paymentRequirements.extra?.verifyingContract || tokenAddress) as Address,
    };

    const message = {
      owner: account.address,
      spender: spender as Address,
      value: BigInt(amount),
      nonce,
      deadline,
    };

    const signature = await walletClient.signTypedData({
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
          owner: account.address,
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

