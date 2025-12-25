import express from 'express';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@x402-crosschain/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS || '0x0000000000000000000000000000000000000000';
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3001';

console.log('='.repeat(70));
console.log('x402 Merchant Server - Standard Compatible');
console.log('='.repeat(70));
console.log(`Merchant Address: ${MERCHANT_ADDRESS}`);
console.log(`Facilitator URL:  ${FACILITATOR_URL}`);
console.log('='.repeat(70));
console.log('');
console.log('x402 Protocol Features:');
console.log('  - EIP-3009 TransferWithAuthorization (USDC)');
console.log('  - ERC-2612 Permit (other ERC-20 tokens)');
console.log('  - Gasless for customers (sign only, no tx)');
console.log('  - Cross-chain via Relay (AnySpend-style)');
console.log('');
console.log('Compatible with standard x402 clients:');
console.log('  - x402-axios, x402-fetch, x402-express');
console.log('');
console.log('Merchant always receives: USDC on Base');
console.log('='.repeat(70));

// Apply x402 payment middleware to protected route
app.use(
  '/premium-data',
  paymentMiddleware({
    payTo: MERCHANT_ADDRESS,
    price: '$0.01',
    network: 'base',
    facilitatorUrl: FACILITATOR_URL,
    description: 'Access to premium content',
  })
);

// Protected endpoint
app.get('/premium-data', (req, res) => {
  const payment = (req as any).payment;
  
  res.json({
    message: 'Welcome to premium content!',
    data: {
      secret: 'This is exclusive data worth $0.01',
      timestamp: new Date().toISOString(),
      paidBy: payment?.payer || 'unknown',
      amount: payment?.amount || 'unknown',
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
  res.json({ status: 'ok', type: 'x402-merchant' });
});

app.listen(PORT, () => {
  console.log('');
  console.log(`[OK] Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Try these endpoints:');
  console.log(`  - GET  http://localhost:${PORT}/free-data (no payment)`);
  console.log(`  - GET  http://localhost:${PORT}/premium-data (requires payment)`);
  console.log(`  - GET  http://localhost:${PORT}/health`);
  console.log('='.repeat(60));
});
