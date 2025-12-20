# User Installation Guide - Full Control Options

This guide shows how users can install and use the SDK with **full control** - either using a hosted facilitator or self-hosting their own.

---

## Option 1: Use Hosted Facilitator (Recommended for Most Users)

**Best for:** Merchants who want simplicity and don't want to manage infrastructure.

### Installation

```bash
npm install @x402-crosschain/sdk
# or
pnpm add @x402-crosschain/sdk
# or
yarn add @x402-crosschain/sdk
```

### Usage

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

// Use hosted facilitator
app.use(
  '/premium-content',
  paymentMiddleware({
    payTo: '0xYourWalletAddress',
    price: '$0.01',
    network: 'base',
    facilitatorUrl: 'https://your-hosted-facilitator.com', // ← Hosted facilitator
  })
);

app.get('/premium-content', (req, res) => {
  res.json({ message: 'Premium content here!' });
});

app.listen(3000);
```

**What you get:**
- ✅ Simple integration (just SDK)
- ✅ No infrastructure to manage
- ✅ Works immediately
- ✅ Hosted facilitator handles all complexity

---

## Option 2: Self-Host Your Own Facilitator (Full Control)

**Best for:** Merchants who want full control, custom infrastructure, or to avoid facilitator fees.

### Installation

Install **both** packages:

```bash
npm install @x402-crosschain/sdk @x402-crosschain/facilitator
# or
pnpm add @x402-crosschain/sdk @x402-crosschain/facilitator
# or
yarn add @x402-crosschain/sdk @x402-crosschain/facilitator
```

### Step 1: Deploy Your Smart Contract

Deploy `PaymentSettlement.sol` to Base network and note the contract address.

### Step 2: Set Up Environment Variables

Create `.env` file:

```env
# Facilitator Configuration
SETTLER_PRIVATE_KEY=0xYourPrivateKey  # Wallet authorized to call settle()
PAYMENT_SETTLEMENT_ADDRESS=0xYourContractAddress
BASE_RPC_URL=https://mainnet.base.org
PORT=3001

# Merchant Configuration
MERCHANT_ADDRESS=0xYourMerchantWallet
SERVER_PORT=3000
```

### Step 3: Start Your Facilitator

```typescript
import { startFacilitator } from '@x402-crosschain/facilitator';
import dotenv from 'dotenv';

dotenv.config();

// Start your own facilitator
await startFacilitator({
  port: Number(process.env.PORT || 3001),
  settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY!,
  baseRpcUrl: process.env.BASE_RPC_URL!,
  paymentSettlementAddress: process.env.PAYMENT_SETTLEMENT_ADDRESS!,
});

console.log('Facilitator running on http://localhost:3001');
```

### Step 4: Use SDK with Your Facilitator

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

// Use your own facilitator
app.use(
  '/premium-content',
  paymentMiddleware({
    payTo: process.env.MERCHANT_ADDRESS!,
    price: '$0.01',
    network: 'base',
    facilitatorUrl: 'http://localhost:3001', // ← Your own facilitator
  })
);

app.get('/premium-content', (req, res) => {
  res.json({ message: 'Premium content here!' });
});

app.listen(3000);
```

**What you get:**
- ✅ Full control over facilitator
- ✅ No dependency on hosted service
- ✅ Custom infrastructure
- ✅ Can modify facilitator code if needed

---

## Complete Self-Hosted Example

Here's a complete example that starts both facilitator and merchant server:

```typescript
import express from 'express';
import dotenv from 'dotenv';
import { paymentMiddleware } from '@x402-crosschain/sdk';
import { startFacilitator } from '@x402-crosschain/facilitator';

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT || 3000;
const FACILITATOR_PORT = process.env.PORT || 3001;

async function main() {
  // Step 1: Start your facilitator
  console.log('Starting facilitator...');
  await startFacilitator({
    port: Number(FACILITATOR_PORT),
    settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY!,
    baseRpcUrl: process.env.BASE_RPC_URL!,
    paymentSettlementAddress: process.env.PAYMENT_SETTLEMENT_ADDRESS!,
  });
  console.log(`✅ Facilitator running on http://localhost:${FACILITATOR_PORT}`);

  // Step 2: Start merchant server
  const app = express();

  app.use(
    '/premium-content',
    paymentMiddleware({
      payTo: process.env.MERCHANT_ADDRESS!,
      price: '$0.01',
      network: 'base',
      facilitatorUrl: `http://localhost:${FACILITATOR_PORT}`,
    })
  );

  app.get('/premium-content', (req, res) => {
    res.json({ message: 'Premium content!' });
  });

  app.listen(SERVER_PORT, () => {
    console.log(`✅ Merchant server running on http://localhost:${SERVER_PORT}`);
  });
}

main().catch(console.error);
```

---

## Comparison: Hosted vs Self-Hosted

| Feature | Hosted Facilitator | Self-Hosted Facilitator |
|---------|-------------------|------------------------|
| **Installation** | Just SDK | SDK + Facilitator |
| **Setup Complexity** | ⭐ Simple | ⭐⭐⭐ Requires contract deployment |
| **Infrastructure** | None (hosted) | Your own server |
| **Control** | Limited | Full control |
| **Customization** | None | Can modify code |
| **Cost** | May have fees | Your infrastructure costs |
| **Maintenance** | Handled by provider | You maintain it |

---

## Migration: Hosted → Self-Hosted

If you start with hosted and want to switch to self-hosted:

1. Install facilitator package: `npm install @x402-crosschain/facilitator`
2. Deploy `PaymentSettlement.sol` contract
3. Set up environment variables
4. Start facilitator with `startFacilitator()`
5. Change `facilitatorUrl` in middleware from hosted URL to `http://localhost:3001`

**That's it!** Your merchant code doesn't need to change.

---

## For Customers (Payment Clients)

Customers only need the SDK:

```bash
npm install @x402-crosschain/sdk
```

**Node.js (Private Key):**
```typescript
import { createPaymentClient } from '@x402-crosschain/sdk';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0xYourPrivateKey');
const client = createPaymentClient(account);

// Make paid request
const response = await client.get('https://merchant.com/premium-content');
```

**Browser (MetaMask/Wallet):**
```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();
const client = createBrowserPaymentClient(walletClient!);

// Make paid request
const response = await client.get('https://merchant.com/premium-content');
```

---

## Summary

**You have full control:**

1. **Use hosted facilitator** → Just install SDK, point to hosted URL
2. **Self-host facilitator** → Install SDK + Facilitator, run your own
3. **Switch anytime** → Change `facilitatorUrl` in middleware config

Both options are fully supported and work seamlessly! 🚀

