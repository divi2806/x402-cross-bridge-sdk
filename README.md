# x402 Cross-Chain Payment SDK

> **Accept payments from any blockchain, receive USDC on Base — all in 2-3 seconds**

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![npm version](https://img.shields.io/npm/v/@x402-crosschain/facilitator.svg)](https://www.npmjs.com/package/@x402-crosschain/facilitator)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Fully x402-compatible** cross-chain payment solution that extends the x402 protocol to support payments from **69+ blockchain networks** with instant settlement via Relay Network.

---

## 🎯 What is This?

The **x402 Cross-Chain Payment SDK** enables merchants to accept payments in **any token on any chain**, while always receiving **USDC on Base**. Built on the standard [x402 payment protocol](https://x402.org), it works seamlessly with all x402-compatible middleware and clients.

### Key Features

- ⚡ **Instant Settlement** - 2-3 second cross-chain payments via Relay Network
- 🌐 **69+ Chains** - Ethereum, Base, Arbitrum, Optimism, Polygon, Solana, and more
- 💰 **Any Token** - Accept ETH, USDC, USDT, or any supported token
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

**Option 1: Use Standard x402 Packages**

Works with any x402-compatible client:

```bash
npm install x402-axios viem
```

```typescript
import { withPaymentInterceptor } from 'x402-axios';
import axios from 'axios';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';

const account = privateKeyToAccount('0xYourPrivateKey');

const client = withPaymentInterceptor(
  axios.create({ baseURL: 'https://merchant.com' }),
  account
);

// Automatically handles 402 payment flow
const response = await client.get('/premium-content');
console.log(response.data);
```

**Option 2: Use Our SDK**

```bash
npm install @x402-crosschain/sdk
```

```typescript
import { createPaymentClient } from '@x402-crosschain/sdk';
import { privateKeyToAccount } from 'viem/accounts';

const account = privateKeyToAccount('0xYourPrivateKey');
const client = createPaymentClient(account);

// Automatically handles cross-chain payments
const response = await client.get('https://merchant.com/premium-content');
console.log(response.data);
```

**Browser (MetaMask/Wallet):**

```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();
const client = createBrowserPaymentClient(walletClient!);

// User approves payment in MetaMask
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

1. **Customer** pays with any token on any chain (e.g., ETH on Arbitrum)
2. **Relay Network** bridges and swaps to USDC on Base (2-3 seconds)
3. **Merchant** receives USDC on Base
4. **Customer** gets their content

### Supported Chains

**69+ chains** via Relay Network:

**EVM Chains:**
- Ethereum, Base, Arbitrum, Optimism, Polygon
- BNB Chain, Avalanche, Blast, zkSync Era
- Linea, Scroll, Mantle, Mode, Zora
- And 50+ more...

**Non-EVM Chains:**
- Solana
- Bitcoin
- And more coming soon...

### Supported Tokens

- **Native tokens**: ETH, MATIC, AVAX, etc.
- **Stablecoins**: USDC, USDT, DAI
- **Any ERC-20 token** on supported chains

---

## 🏗️ Architecture

```
┌─────────────┐         ┌──────────────┐         ┌──────────────┐
│   Customer  │         │   Merchant   │         │  Facilitator │
│  (Browser/  │         │    Server    │         │  (Relay)     │
│   Node.js)  │         │              │         │              │
└──────┬──────┘         └───────┬──────┘         └──────┬───────┘
       │                        │                        │
       │ 1. GET /premium        │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │ 2. HTTP 402            │                        │
       │    X-Payment-Required  │                        │
       │<───────────────────────│                        │
       │                        │                        │
       │ 3. Pay with ETH        │                        │
       │    on Arbitrum         │         ⚡ Relay       │
       │────────────────────────┼──────────────────────>│
       │                        │      (2-3 seconds)    │
       │                        │                        │
       │                        │ 4. Merchant receives  │
       │                        │    USDC on Base        │
       │                        │<───────────────────────│
       │                        │                        │
       │ 5. POST /verify        │                        │
       │    X-PAYMENT header    │                        │
       │────────────────────────┼──────────────────────>│
       │                        │                        │
       │ 6. { isValid: true }   │                        │
       │<───────────────────────┼────────────────────────│
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

**Install both packages:**

```bash
npm install @x402-crosschain/sdk @x402-crosschain/facilitator
```

**Start facilitator:**

```typescript
import { startFacilitator } from '@x402-crosschain/facilitator';

await startFacilitator({
  port: 3001,
  baseRpcUrl: 'https://mainnet.base.org',
  paymentSettlementAddress: '0xYourContractAddress',
  settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY,
});
```

**Use with your middleware:**

```typescript
import { paymentMiddleware } from '@x402-crosschain/sdk';

app.use('/premium', paymentMiddleware({
  payTo: '0xYourAddress',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'http://localhost:3001', // Your facilitator
}));
```

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
