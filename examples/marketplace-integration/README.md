# Marketplace Integration Example

This example shows how to integrate x402 cross-chain payments into a real marketplace/website.

## For Merchants (Backend)

### 1. Install SDK
```bash
npm install @x402-crosschain/sdk
```

### 2. Add Payment Middleware (3 lines!)
```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

// Protect your endpoint with payment
app.use('/premium-content', paymentMiddleware({
  payTo: '0xYourWalletAddress',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'https://your-facilitator.com' // or use hosted one
}));

// Your protected route
app.get('/premium-content', (req, res) => {
  res.json({ data: 'Premium content here!' });
});
```

### 3. Done!
Your endpoint now accepts payments from ANY chain. Customers can pay with ETH on Arbitrum, MATIC on Polygon, etc. You always receive USDC on Base.

## For Customers (Frontend)

### 1. Install SDK + Wagmi
```bash
npm install @x402-crosschain/sdk wagmi viem
```

### 2. Use in React Component
```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient } from 'wagmi';

function BuyButton() {
  const { data: walletClient } = useWalletClient();
  
  const buyContent = async () => {
    // Create payment client with user's wallet
    const client = createBrowserPaymentClient(walletClient, {
      preferredChainId: await walletClient.getChainId(),
      preferredToken: '0x0000000000000000000000000000000000000000' // Native token
    });
    
    // Request content - payment happens automatically!
    const response = await client.get('/premium-content');
    console.log(response.data);
  };
  
  return <button onClick={buyContent}>Buy for $0.01</button>;
}
```

### 3. That's it!
The SDK automatically:
- Detects cross-chain payment needed
- Gets Relay quote
- Prompts MetaMask
- Bridges payment (2-3s)
- Returns content

## Running This Example

1. Start the merchant server:
```bash
cd ../merchant-hosted
pnpm dev
```

2. Start the marketplace frontend:
```bash
pnpm install
pnpm dev
```

3. Open http://localhost:5173
4. Connect your wallet (MetaMask)
5. Click "Buy for $0.01"
6. Approve transaction
7. Get content!

## Key Features

✅ **One-command integration** for merchants
✅ **Cross-chain payments** (69+ chains via Relay)
✅ **Browser wallet support** (MetaMask, Coinbase Wallet, etc.)
✅ **Instant settlement** (2-3 seconds via Relay)
✅ **x402 compliant** (works with all x402 tools)
✅ **No vendor lock-in** (open standard)

## Production Deployment

### Merchant
1. Deploy your API with payment middleware
2. Point to hosted facilitator or run your own
3. Set your `MERCHANT_ADDRESS` to receive USDC

### Facilitator (if self-hosting)
1. Deploy `PaymentSettlement.sol` to Base
2. Run facilitator with `SETTLER_PRIVATE_KEY`
3. Expose facilitator URL for merchants

That's it! Your marketplace now accepts crypto payments from any chain.

