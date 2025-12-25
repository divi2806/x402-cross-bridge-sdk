import dotenv from 'dotenv';
import { createPaymentClient } from '@x402-crosschain/sdk';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/premium-data';
const CUSTOMER_PRIVATE_KEY = process.env.CUSTOMER_PRIVATE_KEY as `0x${string}`;

// Default: Pay with native ETH on Arbitrum → Merchant receives USDC on Base
const FROM_CHAIN_ID = parseInt(process.env.FROM_CHAIN_ID || '42161', 10); // Arbitrum
const FROM_TOKEN = process.env.FROM_TOKEN || '0x0000000000000000000000000000000000000000'; // Native ETH

// Token addresses for reference:
// Native ETH:       0x0000000000000000000000000000000000000000 (any chain)
// WETH on Arbitrum: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1
// USDC on Arbitrum: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
// USDC on Base:     0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
// DAI on Arbitrum:  0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1

if (!CUSTOMER_PRIVATE_KEY) {
  throw new Error('CUSTOMER_PRIVATE_KEY not set in .env');
}

const isNativeToken = FROM_TOKEN.toLowerCase() === '0x0000000000000000000000000000000000000000';

console.log('='.repeat(70));
console.log('x402 Payment Client - Any Token → USDC');
console.log('='.repeat(70));
console.log(`API URL:         ${API_URL}`);
console.log(`Paying from:     Chain ${FROM_CHAIN_ID} (${getNetworkName(FROM_CHAIN_ID)})`);
console.log(`Using token:     ${FROM_TOKEN} (${getTokenName(FROM_TOKEN)})`);
console.log('='.repeat(70));
console.log('');
if (isNativeToken) {
  console.log('Flow (Native ETH):');
  console.log('  1. Customer sends ETH tx to Relay (pays gas)');
  console.log('  2. Relay swaps ETH → USDC + bridges to Base');
  console.log('  3. Merchant receives USDC directly');
} else {
  console.log('Flow (ERC-20):');
  console.log('  1. Customer signs permit (gasless)');
  console.log('  2. Facilitator takes tokens via permit');
  console.log('  3. Relay swaps + bridges → USDC on Base');
  console.log('  4. Merchant receives USDC');
}
console.log('='.repeat(70));

async function main() {
  try {
    console.log('');
    console.log('Creating x402 payment client...');

    // Create x402-compatible payment client
    // Client signs permits/authorizations - facilitator executes transfers
    const client = createPaymentClient(CUSTOMER_PRIVATE_KEY, {
      preferredChainId: FROM_CHAIN_ID,
      preferredToken: FROM_TOKEN,
      preferredNetwork: getNetworkName(FROM_CHAIN_ID),
    });

    console.log('[OK] Client created (x402-compatible)');
    console.log('');
    console.log('[STEP 1] Requesting protected resource...');
    console.log('   (Client will sign EIP-3009 authorization for USDC)');
    console.log('   (Facilitator will execute the transfer)');
    console.log('');

    // Make request - client automatically handles 402 payment flow
    // 1. Server returns 402 with payment requirements
    // 2. Client signs EIP-3009 authorization (gasless)
    // 3. Client retries with X-PAYMENT header
    // 4. Facilitator verifies signature and executes transfer
    const response = await client.get(API_URL);

    console.log('[SUCCESS] Payment and access successful!');
    console.log('');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('='.repeat(70));
    console.log('SUCCESS! x402 payment completed!');
    console.log('   Payment method: EIP-3009 TransferWithAuthorization');
    console.log('   Customer gas cost: $0 (gasless signature)');
    console.log('   Facilitator executed the transfer');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('');
    console.error('[ERROR]', error.message || error);
    if (error.response?.data) {
      console.error('Server response:', JSON.stringify(error.response.data, null, 2));
    }
    console.error('');
    console.error('Make sure:');
    console.error('  1. Merchant server is running (http://localhost:3000)');
    console.error('  2. Facilitator is running (http://localhost:3001)');
    console.error('  3. You have USDC on the source chain');
    console.error('  4. CUSTOMER_PRIVATE_KEY is set in .env');
  }
}

function getNetworkName(chainId: number): string {
  const map: Record<number, string> = {
    1: 'mainnet',
    8453: 'base',
    84532: 'base-sepolia',
    42161: 'arbitrum',
    10: 'optimism',
    137: 'polygon',
  };
  return map[chainId] || 'unknown';
}

function getTokenName(address: string): string {
  const map: Record<string, string> = {
    '0x0000000000000000000000000000000000000000': 'Native ETH',
    '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1': 'DAI',
    '0x4200000000000000000000000000000000000006': 'WETH',
  };
  return map[address.toLowerCase()] || 'ERC-20';
}

main();
