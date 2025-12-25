# Example: Merchant Using Hosted Facilitator

This example shows a merchant API that uses a **hosted facilitator** for cross-chain payments.

## What This Demonstrates

- Merchant installs the SDK
- Merchant points to a hosted facilitator (provided by your company)
- Merchant accepts payments from ANY chain
- Merchant ALWAYS receives USDC on Base

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your merchant address

# Start server
pnpm dev
```

## Test It

1. Start the merchant server:
```bash
pnpm dev
```

2. Try the free endpoint:
```bash
curl http://localhost:3000/free-data
```

3. Try the premium endpoint (will return 402):
```bash
curl -i http://localhost:3000/premium-data
```

You'll get a 402 response with payment instructions.

4. Use the customer client example to pay and retry.

## How It Works

```typescript
import { paymentMiddleware } from '@x402-crosschain/sdk';

app.use('/premium-data', paymentMiddleware({
  recipient: '0xYourAddress',
  price: '0.01',
  network: 'base-sepolia',
  facilitatorUrl: 'https://facilitator.yourcompany.com'
}));
```

That's it! The merchant doesn't need to know about:
- Mayan Finance
- Cross-chain swaps
- Bridge protocols
- Multiple chains

They just say "I want $0.01 in USDC on Base" and customers can pay from anywhere.

