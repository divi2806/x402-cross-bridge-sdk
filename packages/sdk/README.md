# @x402-crosschain/sdk

> **x402-compliant cross-chain payment SDK with Relay Network**

Accept payments in any token on any chain. Customers pay with ETH, WETH, USDC, or any ERC-20 token. Merchants always receive USDC on Base. Gasless for customers (ERC-20 tokens).

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## **Key Features**

- **x402 Protocol Compliant** - Works with standard x402 clients
- **Gasless Payments** - Customers sign permits, no gas needed (ERC-20)
- **Any Token** - Accept ETH, WETH, USDC, DAI, or any ERC-20 token (via Permit2)
- **Any Chain** - 10+ chains including Ethereum, Arbitrum, Base, Polygon, BNB Chain
- **Instant Settlement** - 2-3 second bridging via Relay Network
- **Simple Integration** - Express middleware for merchants

---

## **Installation**

```bash
npm install @x402-crosschain/sdk
# or
pnpm add @x402-crosschain/sdk
```

---

## **Quick Start**

### **For Merchants (Backend)**

```typescript
import express from 'express';
import { paymentMiddleware } from '@x402-crosschain/sdk';

const app = express();

app.use(
  '/premium-content',
  paymentMiddleware({
    payTo: '0xYourWalletAddress',
    price: '$1.00',
    network: 'base',
    facilitatorUrl: 'http://localhost:3001',
    facilitatorAddress: '0xYourFacilitatorWalletAddress', // Required for Permit2 (non-USDC) payments
  })
);

app.get('/premium-content', (req, res) => {
  res.json({ 
    content: 'Premium content unlocked!',
    paidBy: (req as any).payment?.payer 
  });
});

app.listen(3000);
```

### **For Customers (Node.js)**

```typescript
import { createPaymentClient } from '@x402-crosschain/sdk';

// Create payment client with preferred token
const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,  // Arbitrum
  preferredToken: '0x0000000000000000000000000000000000000000', // Native ETH
  preferredNetwork: 'arbitrum',
});

// Make request - SDK handles 402 payment automatically
const response = await client.get('http://localhost:3000/premium-content');
console.log(response.data);
```

### **For Customers (Browser)**

```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';

// With MetaMask/Coinbase Wallet
const client = createBrowserPaymentClient(walletClient, {
  preferredChainId: 8453,
  preferredToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC
});

const response = await client.get('https://api.example.com/premium');
```

---

## **How It Works**

### **ERC-20 Tokens (Gasless for Customer)**

```
1. Customer requests protected resource
2. Server returns 402 with payment requirements
3. Customer signs Permit2 SignatureTransfer or EIP-3009 authorization (NO GAS)
4. Customer retries with X-PAYMENT header
5. Facilitator verifies signature
6. Facilitator calls Permit2.permitTransferFrom() to take tokens
7. Facilitator swaps + bridges via Relay → USDC on Base
8. Merchant receives USDC
```

### **Native ETH/BNB (Customer Pays Gas)**

```
1. Customer requests protected resource
2. Server returns 402 with payment requirements
3. Customer sends ETH tx to Relay
4. Relay swaps ETH → USDC + bridges to Base
5. Merchant receives USDC
```

---

## **Supported Tokens**

| Token Type | Gasless? | How It Works |
|------------|----------|--------------|
| **USDC** | ✅ Yes | EIP-3009 TransferWithAuthorization |
| **WETH, DAI, any ERC-20** | ✅ Yes | Permit2 SignatureTransfer (requires one-time approve) |
| **Native ETH/BNB/MATIC** | ❌ No | Customer sends tx to Relay |

---

## **Supported Chains**

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

---

## **API Reference**

### **paymentMiddleware(config)**

Express middleware for protecting routes with payment requirements.

```typescript
interface MiddlewareConfig {
  payTo: string;                 // Merchant wallet address
  price: string;                 // Price (e.g., '$0.01', '$10.00')
  network: string;               // Settlement network ('base')
  facilitatorUrl: string;        // Facilitator URL
  facilitatorAddress?: string;   // Facilitator wallet address — required for Permit2 (non-USDC) payments
  description?: string;          // Optional description
}
```

### **createPaymentClient(privateKey, preferences)**

Create a payment client for Node.js applications.

```typescript
interface PaymentPreferences {
  preferredChainId?: number;   // Source chain ID
  preferredToken?: string;     // Source token address
  preferredNetwork?: string;   // Source network name
}
```

### **createBrowserPaymentClient(walletClient, preferences)**

Create a payment client for browser applications with MetaMask/Coinbase Wallet.

---

## **Exported Constants**

```typescript
import {
  PERMIT2_ADDRESS,  // '0x000000000022D473030F116dDEE9F6B43aC78BA3' — same on all chains
  USDC_ADDRESSES,   // { [chainId]: address }
  WETH_ADDRESSES,   // { [chainId]: address }
  CHAIN_IDS,        // { 'base': 8453, 'arbitrum': 42161, ... }
  NETWORK_NAMES,    // { 8453: 'base', 42161: 'arbitrum', ... }
} from '@x402-crosschain/sdk';
```

## **Token Addresses**

```typescript
// Native token (ETH, BNB, MATIC, etc.)
const NATIVE = '0x0000000000000000000000000000000000000000';

// USDC
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// WETH
const WETH_ARBITRUM = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';
const WETH_BASE = '0x4200000000000000000000000000000000000006';
```

---

## **Examples**

### **Pay with Native ETH on Arbitrum**

```typescript
const client = createPaymentClient(privateKey, {
  preferredChainId: 42161,
  preferredToken: '0x0000000000000000000000000000000000000000',
  preferredNetwork: 'arbitrum',
});
```

### **Pay with USDC on Base (Same Chain)**

```typescript
const client = createPaymentClient(privateKey, {
  preferredChainId: 8453,
  preferredToken: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  preferredNetwork: 'base',
});
```

### **Pay with WETH on Arbitrum**

```typescript
const client = createPaymentClient(privateKey, {
  preferredChainId: 42161,
  preferredToken: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  preferredNetwork: 'arbitrum',
});
```

---

## **Testing**

```bash
# Start facilitator
cd packages/facilitator && pnpm dev

# Start merchant server
cd examples/merchant-hosted && pnpm dev

# Run customer client
cd examples/customer-client && pnpm dev
```

---

## **License**

MIT License

---

## **Support**

- **GitHub Issues**: https://github.com/divi2806/x402-cross-bridge-sdk/issues
- **Email**: divyansh2824@gmail.com

---

## **Changelog**

### v2.1.0
- **Replaced ERC-2612 with Permit2** for all non-USDC ERC-20 tokens
  - Works with WETH on all chains (mainnet WETH does not support ERC-2612)
  - Unordered random nonces — no sequential front-running risk
  - Single `Permit2.permitTransferFrom()` call instead of `permit()` + `transferFrom()`
  - Consistent EIP-712 domain (`Permit2` contract) across all tokens
- **Added `facilitatorAddress`** to `MiddlewareConfig` — required for correct Permit2 spender binding
- **Added `PERMIT2_ADDRESS`** and `WETH_ADDRESSES` exports
- **Renamed** `PermitPayload` → `Permit2Payload`, payload key `permit` → `permit2`

### v2.0.0 (December 2025)
- **x402 Protocol Compliance** - Full compatibility with x402 standard
- **Gasless Payments** - EIP-3009 and ERC-2612 signature support
- **Native Token Support** - Accept ETH, BNB, MATIC via Relay
- **Multi-Chain** - Added BNB Chain, Avalanche, zkSync, Linea
- **Simplified API** - New `createPaymentClient` and `createBrowserPaymentClient`

### v1.0.0
- Initial release
- Basic cross-chain support via Relay

---
