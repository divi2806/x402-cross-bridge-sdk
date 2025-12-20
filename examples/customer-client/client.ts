import dotenv from 'dotenv';
import { createPaymentClient } from '@x402-crosschain/sdk';

dotenv.config();

const API_URL = process.env.API_URL || 'http://localhost:3000/premium-data';
const CUSTOMER_PRIVATE_KEY = process.env.CUSTOMER_PRIVATE_KEY as `0x${string}`;
const FROM_CHAIN_ID = parseInt(process.env.FROM_CHAIN_ID || '42161', 10); // Arbitrum
const FROM_TOKEN = process.env.FROM_TOKEN || '0x0000000000000000000000000000000000000000'; // Native ETH

if (!CUSTOMER_PRIVATE_KEY) {
  throw new Error('CUSTOMER_PRIVATE_KEY not set in .env');
}

console.log('='.repeat(70));
console.log('Customer Payment Client - x402 Cross-Chain');
console.log('='.repeat(70));
console.log(`API URL:         ${API_URL}`);
console.log(`Paying from:     Chain ${FROM_CHAIN_ID}`);
console.log(`Using token:     ${FROM_TOKEN === '0x0000000000000000000000000000000000000000' ? 'Native Token' : FROM_TOKEN}`);
console.log('='.repeat(70));

async function main() {
  try {
    console.log('');
    console.log('Creating payment client...');

    // Create x402 payment client with cross-chain preferences
    const client = createPaymentClient(CUSTOMER_PRIVATE_KEY, {
      preferredChainId: FROM_CHAIN_ID,
      preferredToken: FROM_TOKEN,
      preferredNetwork: getNetworkName(FROM_CHAIN_ID),
    });

    console.log('[OK] Client created with cross-chain support');
    console.log('');
    console.log('[STEP 1] Requesting protected resource...');
    console.log('   (Client will automatically handle 402 payment)');
    console.log('');

    // Make request - client automatically handles 402 payment flow
    const response = await client.get(API_URL);

    console.log('[SUCCESS] Payment and access successful!');
    console.log('');
    console.log('Response:');
    console.log(JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('='.repeat(70));
    console.log('SUCCESS! Cross-chain payment completed!');
    console.log('   Paid from:', getNetworkName(FROM_CHAIN_ID));
    console.log('   Settled on: Base (via Relay)');
    console.log('   Time: 2-3 seconds');
    console.log('='.repeat(70));

  } catch (error: any) {
    console.error('');
    console.error('[ERROR]', error.message || error);
    console.error('');
    console.error('Make sure:');
    console.error('  1. Merchant server is running (http://localhost:3000)');
    console.error('  2. Relay facilitator is running (http://localhost:3001)');
    console.error('  3. You have tokens on the source chain');
    console.error('  4. CUSTOMER_PRIVATE_KEY is set in .env');
  }
}

function getNetworkName(chainId: number): string {
  const map: Record<number, string> = {
    1: 'mainnet',
    8453: 'base',
    42161: 'arbitrum',
    10: 'optimism',
    137: 'polygon',
  };
  return map[chainId] || 'unknown';
}

main();
