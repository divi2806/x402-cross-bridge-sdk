import express from 'express';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@x402-crosschain/sdk';
import { startFacilitator } from '@x402-crosschain/facilitator';

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT || 3000;
const FACILITATOR_PORT = process.env.FACILITATOR_PORT || 3001;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x0000000000000000000000000000000000000000';

console.log('='.repeat(60));
console.log('🏪 Merchant API - Self-Hosted Facilitator');
console.log('='.repeat(60));

async function main() {
  // Start local facilitator
  console.log('Step 1: Starting local cross-chain facilitator...\n');
  
  await startFacilitator({
    port: Number(FACILITATOR_PORT),
    settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY,
    baseRpcUrl: process.env.BASE_RPC_URL,
    paymentSettlementAddress: process.env.PAYMENT_SETTLEMENT_ADDRESS,
  });

  console.log(`✅ Facilitator running on http://localhost:${FACILITATOR_PORT}`);
  console.log('');
  console.log('This facilitator:');
  console.log('  • Handles cross-chain payments automatically');
  console.log('  • Uses optimal routing internally');
  console.log('  • Settles payments on Base');
  console.log('  • You control the infrastructure');
  console.log('');
  console.log('='.repeat(60));

  // Start API server
  console.log('Step 2: Starting merchant API server...\n');

  const app = express();

  // Apply payment middleware
  app.use(
    '/premium-data',
    paymentMiddleware({
      payTo: MERCHANT_ADDRESS,
      price: '$0.01',
      network: 'base',
      facilitatorUrl: `http://localhost:${FACILITATOR_PORT}`,
    })
  );

  // Protected endpoint
  app.get('/premium-data', (req, res) => {
    res.json({
      message: 'Welcome to premium content!',
      data: {
        secret: 'This is exclusive data worth $0.01',
        timestamp: new Date().toISOString(),
        paidBy: req.headers['x-payment-signature'] || 'unknown',
      },
    });
  });

  // Free endpoint
  app.get('/free-data', (req, res) => {
    res.json({
      message: 'This is free public data',
      hint: 'Try /premium-data for exclusive content (requires payment)',
    });
  });

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', type: 'merchant-self-hosted-facilitator' });
  });

  app.listen(SERVER_PORT, () => {
    console.log(`✅ Server running on http://localhost:${SERVER_PORT}`);
    console.log('');
    console.log('='.repeat(60));
    console.log('🎉 Everything is ready!');
    console.log('='.repeat(60));
    console.log('');
    console.log('Your API now accepts payments from ANY chain:');
    console.log('  • Polygon, Arbitrum, Avalanche, Optimism...');
    console.log('  • Even Solana!');
    console.log('');
    console.log('You always receive: USDC on Base');
    console.log('');
    console.log('Try these endpoints:');
    console.log(`  • GET  http://localhost:${SERVER_PORT}/free-data`);
    console.log(`  • GET  http://localhost:${SERVER_PORT}/premium-data (requires payment)`);
    console.log('='.repeat(60));
  });
}

main().catch(console.error);

