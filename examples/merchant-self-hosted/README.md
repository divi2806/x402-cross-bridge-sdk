# Example: Merchant Running Own Facilitator

This example shows a merchant that runs their **own facilitator** locally.

## What This Demonstrates

- Merchant has full control over infrastructure
- Merchant runs the facilitator on their own server
- Cross-chain payments still work the same way

## Setup

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with:
#   - Your merchant address
#   - Settlement private key
#   - Base RPC URL
#   - PaymentSettlement contract address

# Start everything
pnpm dev
```

This will start:
1. Your local facilitator (port 3001)
2. Your merchant API (port 3000)

## Test It

1. Start the servers:
```bash
pnpm dev
```

2. Check the free endpoint:
```bash
curl http://localhost:3000/free-data
```

3. Check the premium endpoint:
```bash
curl -i http://localhost:3000/premium-data
```

## How It Works

```typescript
import { startFacilitator, paymentMiddleware } from '@x402-crosschain/sdk';

// 1. Start local facilitator
await startFacilitator({
  port: 3001,
  privateKey: process.env.PRIVATE_KEY,
  baseRpcUrl: process.env.BASE_RPC_URL
});

// 2. Use it in your API
app.use('/premium', paymentMiddleware({
  recipient: '0xYourAddress',
  price: '0.01',
  network: 'base',
  facilitatorUrl: 'http://localhost:3001'
}));
```

## Benefits of Self-Hosting

1. **Full Control**: You control the infrastructure
2. **Privacy**: Payment data stays on your servers
3. **Customization**: Can modify facilitator behavior if needed
4. **No Dependency**: Not reliant on external hosted service

## What Merchant Sees

When starting the facilitator, merchant sees:
```
🚀 Starting local cross-chain facilitator...
   Port: 3001
   This facilitator handles cross-chain payments automatically
   Customers can pay from ANY supported chain
   You will receive USDC on Base
```

**Merchant does NOT see:**
- Mayan configuration
- Bridge protocols
- Swap routing details
- Technical cross-chain complexity

It's all abstracted inside the facilitator!

