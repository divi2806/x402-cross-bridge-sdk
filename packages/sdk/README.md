# @x402-crosschain/sdk

> **Cross-chain payment SDK extending x402 protocol with instant multi-chain support**

Enable your application to accept payments in any token on any chain, with instant settlement in USDC on Base. Built on the x402 payment protocol with  instant bridging.

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
---

##**Key Features**

- **Instant Settlement** - 2-3 second cross-chain payments via Relay
- **69+ Chains** - Support for Ethereum, Arbitrum, Base, Polygon, Solana, and more
- **Any Token** - Accept payments in ETH, USDC, USDT, or any supported token
- **Secure** - Built on x402 standard with on-chain settlement verification
- **Merchant-Friendly** - Simple Express middleware integration
- **Production Ready** - Used in production with proven reliability

---

## **Installation**

```bash
npm install @x402-crosschain/sdk
# or
yarn add @x402-crosschain/sdk
# or
pnpm add @x402-crosschain/sdk
```

---

## **Quick Start**

### **For Merchants (Backend)**

Protect your API endpoints with payment requirements:

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

// Protect endpoint with payment requirement
app.use(
  '/premium-content',
  paymentMiddleware({
    recipient: '0xYourWalletAddress',
    price: '1.00',                    // $1.00 in USDC on Base
    network: 'base',
    facilitatorUrl: 'https://facilitator.yourdomain.com',
  })
);

app.get('/premium-content', (req, res) => {
  res.json({ content: 'This premium content is only accessible after payment' });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### **For Customers (Frontend)**

Make cross-chain payments easily:

```typescript
import { payX402 } from '@x402-crosschain/sdk';
import { privateKeyToAccount } from 'viem/accounts';

// Create wallet/signer
const account = privateKeyToAccount('0xYourPrivateKey');

// Make API request
const response = await fetch('https://api.example.com/premium-content');

// If payment required (402 status)
if (response.status === 402) {
  // Pay with any token on any chain
  const result = await payX402(response, account, {
    fromChainId: 42161,              // Arbitrum
    fromToken: '0x0000000000000000000000000000000000000000', // Native ETH
  });

  console.log('Payment completed:', result.txHash);
  
  // Retry request - now authenticated
  const paidResponse = await fetch('https://api.example.com/premium-content', {
    headers: {
      'X-Payment-Signature': result.signature,
    },
  });
  
  const content = await paidResponse.json();
  console.log('Content:', content);
}
```

---

##**Architecture**

```
┌─────────────────────────────────────────────────────────┐
│                    Your Application                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Merchant Backend          Customer Frontend           │
│  (Express + SDK)           (Browser + SDK)              │
│         │                          │                    │
│         └──────────┬───────────────┘                    │
│                    │                                    │
└────────────────────┼────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   x402 Facilitator     │
        │  (our facilitator or   │
        │   hosted service)      │
        └────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │    Relay Network       │
        │ (Instant bridging via  │
        │  liquidity pools)      │
        └────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
   Arbitrum                    Base
   (Customer pays)            (Merchant receives)
   ETH, USDC, etc.           USDC
```

---

## **API Reference**

### **Merchant Middleware**

#### `paymentMiddleware(config: PaymentConfig)`

Protects Express routes with payment requirements.

**Parameters:**

```typescript
interface PaymentConfig {
  recipient: string;           // Wallet address to receive payments
  price: string;               // Price in USD (e.g., "1.00")
  network: 'base' | 'base-sepolia'; // Settlement network
  facilitatorUrl: string;      // Facilitator endpoint URL
}
```

**Example:**

```typescript
app.use(
  '/api/premium',
  paymentMiddleware({
    recipient: '0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3',
    price: '5.00',
    network: 'base',
    facilitatorUrl: 'https://facilitator.yourdomain.com',
  })
);
```

---

### **Customer Payment Client**

#### `payX402(response, signer, userPreference)`

Completes a cross-chain payment for a 402 Payment Required response.

**Parameters:**

```typescript
interface UserPaymentPreference {
  fromChainId: number;         // Source chain ID (e.g., 42161 for Arbitrum)
  fromToken: string;           // Token address (0x0000... for native)
}

// Signer can be:
// - viem Account: privateKeyToAccount('0x...')
// - ethers Signer: new Wallet('0x...', provider)
```

**Returns:**

```typescript
interface PaymentResult {
  success: boolean;
  txHash: string;              // Transaction hash on source chain
  paymentId: string;           // Unique payment identifier
  signature: string;           // Payment proof for subsequent requests
}
```

**Example:**

```typescript
const result = await payX402(response, signer, {
  fromChainId: 42161,          // Arbitrum
  fromToken: '0x0000000000000000000000000000000000000000', // ETH
});

if (result.success) {
  console.log('Payment successful:', result.txHash);
  // Use result.signature for subsequent authenticated requests
}
```

---

##  **Supported Chains**

The SDK supports 69+ chains via Relay Network:

### **Major EVM Chains**
- Ethereum (1)
- Base (8453)
- Arbitrum (42161)
- Optimism (10)
- Polygon (137)
- BNB Chain (56)
- Avalanche (43114)
- And 60+ more...

### **Multi-VM Support**
- ✅ EVM chains
- ✅ Solana
- ✅ Bitcoin
- ✅ Sui
- ✅ Tron

See full list: https://docs.relay.link/resources/supported-chains

---

##  **Token Support**

### **Source Chains (What customers can pay with)**
- Native tokens (ETH, MATIC, AVAX, etc.)
- USDC
- USDT
- WETH
- DAI
- And more...

### **Settlement Chain (What merchants receive)**
- Always settles in **USDC on Base**
- Instant finality (~2 seconds)
- Low gas costs

---

##  **Advanced Configuration**

### **Dynamic Pricing**

```typescript
app.use(
  '/api/content/:id',
  paymentMiddleware({
    recipient: '0xYourAddress',
    price: async (req) => {
      // Fetch dynamic pricing from database
      const content = await db.getContent(req.params.id);
      return content.price.toString();
    },
    network: 'base',
    facilitatorUrl: process.env.FACILITATOR_URL,
  })
);
```

### **Custom Token Selection**

```typescript
// Customer chooses preferred payment token
const result = await payX402(response, signer, {
  fromChainId: 137,            // Polygon
  fromToken: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', // USDC on Polygon
});
```

### **Error Handling**

```typescript
try {
  const result = await payX402(response, signer, userPreference);
  
  if (!result.success) {
    console.error('Payment failed');
  }
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    console.error('User does not have enough tokens');
  } else if (error.message.includes('user rejected')) {
    console.error('User cancelled transaction');
  } else {
    console.error('Payment error:', error);
  }
}
```

---

##**Self-Hosting the Facilitator**

You can run your own facilitator for full control:

```typescript
import { startFacilitator } from '@x402-crosschain/facilitator';

await startFacilitator({
  port: 3001,
  baseRpcUrl: 'https://mainnet.base.org',
  paymentSettlementAddress: '0xYourContractAddress',
  settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY,
});
```

See [Facilitator Documentation](../facilitator/README.md) for details.

---

##  **Fee Structure**

### **Cross-Chain Payment Costs**

| Component | Cost | Who Pays |
|-----------|------|----------|
| **Bridge Fee** | 0.1-0.3% | Customer |
| **Gas (Source Chain)** | $0.01-0.10 | Customer |
| **Gas (Destination)** | Included | Relay |
| **Settlement Gas** | $0.001 | Facilitator |

### **Recommended Minimum Payment**

- **Minimum**: $1.00 (15% total fee)
- **Optimal**: $10+ (2-3% total fee)
- **Not recommended**: < $0.50 (fees dominate)

**Example:**
```
Payment: $10.00
Bridge fee: $0.02 (0.2%)
Gas costs: $0.03
Total cost: $10.05
Effective fee: 0.5%
```

---

##  **Security**

### **Payment Verification**
- All payments verified on-chain
- Settlement contract ensures atomicity
- Non-custodial (no funds held by facilitator)

### **Best Practices**
```typescript
// ✅ Good: Use environment variables
facilitatorUrl: process.env.FACILITATOR_URL,

// ❌ Bad: Hardcode private keys
const signer = new Wallet('0xhardcodedkey...');

// ✅ Good: Use secure key management
const signer = new Wallet(process.env.PRIVATE_KEY, provider);
```

---

##  **Testing**

### **Test Networks**

```typescript
// Use Base Sepolia for testing
paymentMiddleware({
  recipient: '0xTestWallet',
  price: '0.01',
  network: 'base-sepolia',
  facilitatorUrl: 'https://testnet-facilitator.yourdomain.com',
});
```

### **Get Test Tokens**

- **Base Sepolia ETH**: https://www.alchemy.com/faucets/base-sepolia
- **Arbitrum Sepolia ETH**: https://faucets.chain.link/arbitrum-sepolia

---

##  **Examples**

### **E-commerce API**

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

// Product catalog
const products = {
  'prod_1': { name: 'Premium Article', price: '2.00' },
  'prod_2': { name: 'Video Course', price: '49.00' },
};

// Dynamic payment per product
app.use(
  '/api/product/:id',
  paymentMiddleware({
    recipient: process.env.MERCHANT_WALLET,
    price: (req) => products[req.params.id].price,
    network: 'base',
    facilitatorUrl: process.env.FACILITATOR_URL,
  })
);

app.get('/api/product/:id', (req, res) => {
  const product = products[req.params.id];
  res.json({ product: product.name, delivered: true });
});
```

### **Creator Marketplace**

```typescript
// Protect creator content
app.use(
  '/api/creator/:creatorId/content/:contentId',
  paymentMiddleware({
    recipient: async (req) => {
      // Get creator's wallet from database
      const creator = await db.getCreator(req.params.creatorId);
      return creator.walletAddress;
    },
    price: async (req) => {
      const content = await db.getContent(req.params.contentId);
      return content.price;
    },
    network: 'base',
    facilitatorUrl: process.env.FACILITATOR_URL,
  })
);
```

---

## **Support**

- **GitHub Issues**: https://github.com/divi2806/x402-cross-bridge-sdk/issues
- **Email**: divyansh2824@gmail.com


---

##  **License**

MIT License

---

---

##  **Changelog**

### v1.0.0
- Initial release
- Support for 69+ chains via Relay
- Express middleware for merchants
- Browser client for customers
- Self-hosted facilitator option
- Comprehensive documentation

##  **Reference**
 - Refer to facilitator on how to integrate/use the cross chain facilitator - https://www.npmjs.com/package/@x402-crosschain/facilitator
---

