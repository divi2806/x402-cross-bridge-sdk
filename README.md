# x402 Cross-Chain Payment SDK

> **Accept payments from any blockchain, receive USDC on Base — gasless for customers**

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![npm version](https://img.shields.io/npm/v/@x402-crosschain/facilitator.svg)](https://www.npmjs.com/package/@x402-crosschain/facilitator)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Fully x402-compatible** cross-chain payment solution. Customers pay with any token on any chain. Merchants always receive USDC on Base. **Gasless for ERC-20 tokens** via EIP-3009/ERC-2612 signatures.

---

## 🎯 What is This?

The **x402 Cross-Chain Payment SDK** enables merchants to accept payments in **any token on any chain**, while always receiving **USDC on Base**. Built on the standard [x402 payment protocol](https://x402.org), it works seamlessly with all x402-compatible middleware and clients.

### Key Features

- ✨ **Gasless Payments** - Customers sign permits (ERC-20), no gas needed
- ⚡ **Instant Settlement** - 2-3 second cross-chain payments via Relay Network
- 🌐 **10+ Chains** - Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and more
- 💰 **Any Token** - Accept ETH, USDC, WETH, DAI, or any ERC-2612 token
- ✅ **x402 Compliant** - Works with `x402-express`, `x402-axios`, `x402-fetch`, and all standard x402 packages
- 🔒 **Non-Custodial** - No funds held, direct on-chain settlement
- 🚀 **Production Ready** - Docker support, health checks, monitoring

---

## 📦 Packages

This monorepo contains two npm packages:

| Package | npm | Description |
|---------|-----|-------------|
| **`@x402-crosschain/sdk`** | [npm](https://www.npmjs.com/package/@x402-crosschain/sdk) | SDK for merchants and customers |
| **`@x402-crosschain/facilitator`** | [npm](https://www.npmjs.com/package/@x402-crosschain/facilitator) | Backend facilitator service |

---

## 🚀 Quick Start

### For Merchants (Backend)

**Option 1: Use Standard x402 Packages (Recommended)**

Works with any x402-compatible middleware:

```bash
npm install x402-express express
```

```typescript
import express from 'express';
import { paymentMiddleware } from 'x402-express';

const app = express();

// Use hosted facilitator
app.use('/premium-content', paymentMiddleware(
  '0xYourWalletAddress',
  {
    'GET /premium-content': {
      price: '$0.01',
      network: 'base',
    },
  },
  {
    url: 'https://your-facilitator.com', // Your hosted facilitator
  }
));

app.get('/premium-content', (req, res) => {
  res.json({ message: 'Premium content!' });
});

app.listen(3000);
```

**Option 2: Use Our SDK**

```bash
npm install @x402-crosschain/sdk
```

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

app.use('/premium-content', paymentMiddleware({
  payTo: '0xYourWalletAddress',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'https://your-facilitator.com',
}));

app.get('/premium-content', (req, res) => {
  res.json({ message: 'Premium content!' });
});

app.listen(3000);
```

### For Customers (Making Payments)

**Option 1: Use Our SDK (Recommended)**

```bash
npm install @x402-crosschain/sdk
```

```typescript
import { createPaymentClient } from '@x402-crosschain/sdk';

// Pay with USDC on Arbitrum (gasless - just sign a message!)
const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,
  preferredToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
});

// Automatically handles x402 payment flow
const response = await client.get('https://merchant.com/premium-content');
console.log(response.data);
```

**Pay with Native ETH:**

```typescript
// Pay with native ETH on Arbitrum (sends transaction)
const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,
  preferredToken: '0x0000000000000000000000000000000000000000', // Native ETH
});
```

**Browser (MetaMask/Wallet):**

```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();
const client = createBrowserPaymentClient(walletClient!, {
  preferredChainId: 42161,
  preferredToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC (gasless)
});

// User signs message (no gas!) or approves tx (native token)
const response = await client.get('https://merchant.com/premium-content');
```

---

## ✅ x402 Compatibility

This SDK is **100% x402 compliant** and works with all standard x402 packages:

### Compatible Middleware

- ✅ **`x402-express`** - Express.js middleware
- ✅ **`x402-hono`** - Hono framework middleware
- ✅ **`x402-next`** - Next.js middleware
- ✅ **Any x402-compatible middleware**

### Compatible Clients

- ✅ **`x402-axios`** - Axios client with payment interceptor
- ✅ **`x402-fetch`** - Fetch API wrapper
- ✅ **Any x402-compatible client**

### Standard x402 Flow

1. Merchant returns `402 Payment Required` with `X-Payment-Required` header
2. Client creates payment payload and sends `X-PAYMENT` header
3. Facilitator exposes standard `/verify` and `/settle` endpoints
4. Merchant serves content after verification

**Your facilitator works with ALL x402 clients and middleware!**

---

## 🌐 Cross-Chain Support

### How It Works

**For ERC-20 Tokens (USDC, WETH, DAI) - Gasless ✨**

1. **Customer** signs a permit message (no gas!)
2. **Facilitator** executes transfer + Relay bridge
3. **Merchant** receives USDC on Base (2-3 seconds)

**For Native Tokens (ETH, BNB, MATIC) - Pays Gas**

1. **Customer** sends transaction to Relay
2. **Relay** swaps + bridges to USDC on Base
3. **Merchant** receives USDC on Base (2-3 seconds)

### Supported Chains

| Chain | ID | Native Token |
|-------|-----|--------------|
| Ethereum | 1 | ETH |
| Base | 8453 | ETH |
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |
| Polygon | 137 | MATIC |
| BNB Chain | 56 | BNB |
| Avalanche | 43114 | AVAX |
| zkSync | 324 | ETH |
| Linea | 59144 | ETH |

### Supported Tokens

| Token Type | Gasless? | How It Works |
|------------|----------|--------------|
| **USDC** | ✅ Yes | EIP-3009 TransferWithAuthorization |
| **WETH, DAI, etc.** | ✅ Yes | ERC-2612 Permit |
| **Native ETH/BNB** | ❌ No | Customer sends tx to Relay |

---

## 🏗️ Architecture

### ERC-20 Flow (Gasless for Customer)

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Customer  │         │   Merchant   │         │  Facilitator │
│  (Browser)  │         │    Server    │         │              │
└──────┬──────┘         └───────┬──────┘         └──────┬───────┘
       │                        │                        │
       │ 1. GET /premium        │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 2. HTTP 402            │                        │
       │    Payment Required    │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │ 3. Sign permit         │                        │
       │    (NO GAS! ✨)        │                        │
       │                        │                        │
       │ 4. Retry with          │                        │
       │    X-PAYMENT header    │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │ 5. Verify + Settle     │
       │                        │───────────────────────>│
       │                        │                        │
       │                        │    Facilitator:        │
       │                        │    - Execute permit    │
       │                        │    - Take tokens       │
       │                        │    - Relay swap+bridge │
       │                        │    - USDC → Merchant   │
       │                        │                        │
       │                        │ 6. { success: true }   │
       │                        │<───────────────────────│
       │                        │                        │
       │ 7. Premium content     │                        │
       │<───────────────────────│                        │
```

---

## 📦 Installation & Usage

### Option 1: Use Hosted Facilitator (Recommended)

**For Merchants:**

```bash
npm install x402-express express
# or
npm install @x402-crosschain/sdk
```

Point to your hosted facilitator URL. No infrastructure needed!

**For Customers:**

```bash
npm install x402-axios viem
# or
npm install @x402-crosschain/sdk
```

### Option 2: Self-Host Your Own Facilitator

**Install facilitator:**

```bash
npm install @x402-crosschain/facilitator
```

**Create `.env`:**

```bash
SETTLER_PRIVATE_KEY=0xYourPrivateKey  # Wallet to pay gas for settlements
BASE_RPC_URL=https://mainnet.base.org
PORT=3001
```

**Start facilitator:**

```bash
cd packages/facilitator
pnpm dev
```

**Note:** The facilitator wallet needs ETH on each supported chain to pay gas for ERC-20 settlements.

See [USER_INSTALLATION_GUIDE.md](USER_INSTALLATION_GUIDE.md) for complete setup instructions.

---

## 📚 Documentation

- **[Installation Guide](USER_INSTALLATION_GUIDE.md)** - Complete setup for hosted and self-hosted
- **[SDK Documentation](packages/sdk/README.md)** - Full SDK API reference
- **[Facilitator Documentation](packages/facilitator/README.md)** - Facilitator setup and API
- **[Custom Headers Explained](CUSTOM_HEADERS_EXPLAINED.md)** - How cross-chain headers work
- **[GitHub Deployment Guide](GITHUB_DEPLOYMENT_GUIDE.md)** - How to deploy to GitHub
- **[NPM Publishing Guide](NPM_PUBLISH_GUIDE.md)** - How to publish to npm

---

## 🧪 Examples

### Merchant Examples

- **[Hosted Facilitator](examples/merchant-hosted/)** - Use hosted facilitator
- **[Self-Hosted Facilitator](examples/merchant-self-hosted/)** - Run your own facilitator

### Customer Examples

- **[Node.js Client](examples/customer-client/)** - Payment client with private keys
- **[Browser Client](examples/marketplace-integration/)** - React app with MetaMask

### Run Examples

```bash
# Install dependencies
pnpm install

# Build packages
pnpm build

# Start facilitator
cd packages/facilitator
pnpm dev

# Start merchant (new terminal)
cd examples/merchant-hosted
pnpm dev

# Test customer (new terminal)
cd examples/customer-client
pnpm dev
```

---

## ⚡ Why Relay Network?

| Feature | Relay Network | Traditional Bridges |
|---------|--------------|---------------------|
| **Settlement Time** | 2-3 seconds ⚡ | 12-15 minutes ⏳ |
| **Architecture** | Optimistic settlement | Wait for bridge finality |
| **User Experience** | Instant | Requires patience |
| **Supported Chains** | 69+ | Varies |
| **x402 Compatible** | ✅ Yes | ✅ Yes |

Relay uses **optimistic settlement** via liquidity pools - merchants are paid instantly, and the bridge settles in the background.

---

## 🔐 Security

- ✅ **Non-Custodial** - No funds held by facilitator
- ✅ **On-Chain Settlement** - All payments recorded on Base blockchain
- ✅ **Private Key Security** - Settler private key never leaves your server
- ✅ **x402 Standard** - Follows established payment protocol
- ✅ **Open Source** - Code is auditable

---

## 🛠️ Development

### Prerequisites

- Node.js 20+
- pnpm (recommended) or npm
- Foundry (for contracts)

### Setup

```bash
# Clone repository
git clone https://github.com/divi2806/x402-cross-bridge-sdk.git
cd x402-cross-bridge-sdk

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test
```

### Project Structure

```
x402-cross-bridge-sdk/
├── packages/
│   ├── sdk/              # Main SDK package
│   └── facilitator/      # Facilitator backend
├── contracts/            # Smart contracts
├── examples/             # Usage examples
└── docs/                 # Documentation
```

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

Contributions welcome! Please read our contributing guidelines before submitting PRs.

---

## 🙋 Support

- **Issues**: [GitHub Issues](https://github.com/divi2806/x402-cross-bridge-sdk/issues)
- **Documentation**: See documentation files in this repo
- **x402 Protocol**: [x402.org](https://x402.org)
- **Relay Network**: [docs.relay.link](https://docs.relay.link)

---

## 🎉 Credits

Built with:
- [x402 Protocol](https://x402.org) - Standard for HTTP-based payments
- [Relay Network](https://relay.link) - Instant cross-chain bridging
- [x402-express](https://www.npmjs.com/package/x402-express) - Standard x402 middleware
- [x402-axios](https://www.npmjs.com/package/x402-axios) - Standard x402 client
- [Foundry](https://getfoundry.sh) - Smart contract development
- [Viem](https://viem.sh) - Ethereum interactions

---

## 🚀 Get Started

**Ready to accept payments from any chain?**

```bash
npm install @x402-crosschain/sdk
```

See [USER_INSTALLATION_GUIDE.md](USER_INSTALLATION_GUIDE.md) for complete setup instructions.

---

**Built with ❤️ for the x402 ecosystem**
