# Example: Customer Payment Client

This example shows how a customer pays for an x402 protected API using cross-chain payments.

## What This Demonstrates

- Customer has tokens on Chain A (e.g., Arbitrum)
- API requires payment on Chain B (Base)
- SDK handles the cross-chain swap automatically
- Customer gets access to the API

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with:
#   - Your wallet private key
#   - API URL
#   - Your preferred chain/token

# Run client
pnpm dev
```

## Prerequisites

1. A merchant server must be running (see merchant examples)
2. You need tokens on the source chain (e.g., USDC on Arbitrum)

## How It Works

```typescript
import { payX402 } from '@x402-crosschain/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// 1. Try to access protected API
const response = await fetch('https://api.example.com/premium');

if (response.status === 402) {
  // 2. Payment required - handle it
  const account = privateKeyToAccount('0x...');
  
  // 3. Pay from ANY chain you want
  await payX402(response, account, {
    fromChainId: 421614, // Arbitrum Sepolia
    fromToken: '0x...'   // USDC on Arbitrum
  });
  
  // 4. Merchant receives USDC on Base
  // 5. You get access to the API
}
```

## What Happens

```
Customer (Has USDC on Arbitrum)
    ↓
[Requests /premium-data]
    ↓
Server (Returns 402: Need $0.01 USDC on Base)
    ↓
payX402() handles everything:
  1. Gets cross-chain quote from facilitator
  2. Facilitator uses optimal routing (Mayan internally)
  3. Customer signs ONE transaction on Arbitrum
  4. Cross-chain swap executes
  5. USDC arrives on Base to merchant
  6. Payment marked as settled
    ↓
Customer retries request with payment proof
    ↓
Server (Returns 200: Here's your data!)
```

## Customer Experience

The customer NEVER knows about:
- Mayan Finance
- Bridge protocols
- Multiple transactions
- Complex routing

They just:
1. See "Payment required"
2. Click "Pay" (or call `payX402()`)
3. Sign ONE transaction
4. Get access

Simple! 🎉

