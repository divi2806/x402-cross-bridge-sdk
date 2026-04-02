# x402 Cross-Chain Payment SDK

> **Accept payments from any blockchain, receive USDC on Base — gasless for customers**

[![npm version](https://img.shields.io/npm/v/@x402-crosschain/sdk.svg)](https://www.npmjs.com/package/@x402-crosschain/sdk)
[![npm version](https://img.shields.io/npm/v/@x402-crosschain/facilitator.svg)](https://www.npmjs.com/package/@x402-crosschain/facilitator)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Fully x402-compatible** cross-chain payment solution. Customers pay with any token on any chain. Merchants always receive USDC on Base. **Gasless for ERC-20 tokens** via [Uniswap Permit2](https://github.com/Uniswap/permit2) and EIP-3009 signatures.

---

## What is This?

The **x402 Cross-Chain Payment SDK** enables merchants to accept payments in **any token on any chain**, while always receiving **USDC on Base**. Built on the standard [x402 payment protocol](https://x402.org), it works seamlessly with all x402-compatible middleware and clients.

### Key Features

- **Gasless Payments** — Customers sign a message, no gas needed (Permit2 for all ERC-20s, EIP-3009 for USDC)
- **WETH Support** — Pay with WETH on any chain, fully gasless via Permit2
- **Instant Settlement** — 2-3 second cross-chain payments via Relay Network
- **10+ Chains** — Ethereum, Base, Arbitrum, Optimism, Polygon, BNB Chain, and more
- **Any Token** — Accept ETH, USDC, WETH, DAI, or any ERC-20
- **x402 Compliant** — Works with `x402-express`, `x402-axios`, `x402-fetch`, and all standard x402 packages
- **Non-Custodial** — No funds held, direct on-chain settlement
- **Production Ready** — Docker support, health checks, monitoring

---

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| **`@x402-crosschain/sdk`** | [npm](https://www.npmjs.com/package/@x402-crosschain/sdk) | SDK for merchants and customers |
| **`@x402-crosschain/facilitator`** | [npm](https://www.npmjs.com/package/@x402-crosschain/facilitator) | Backend facilitator service |

---

## Quick Start

### For Merchants (Backend)

**Option 1: Use Standard x402 Packages (Recommended)**

```bash
npm install x402-express express
```

```typescript
import express from 'express';
import { paymentMiddleware } from 'x402-express';

const app = express();

app.use('/premium-content', paymentMiddleware(
  '0xYourWalletAddress',
  {
    'GET /premium-content': {
      price: '$0.01',
      network: 'base',
    },
  },
  {
    url: 'https://your-facilitator.com',
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
  facilitatorAddress: '0xYourFacilitatorWalletAddress', // Required for Permit2 (non-USDC) payments
}));

app.get('/premium-content', (req, res) => {
  res.json({ message: 'Premium content!' });
});

app.listen(3000);
```

> **`facilitatorAddress` is required** when accepting non-USDC tokens (WETH, DAI, etc.) via Permit2. It must match the wallet address of the running facilitator so the Permit2 `spender` field is set correctly. For USDC-only merchants it is optional.

### For Customers (Making Payments)

```bash
npm install @x402-crosschain/sdk
```

**Pay with USDC (gasless — sign only):**

```typescript
import { createPaymentClient } from '@x402-crosschain/sdk';

const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,
  preferredToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC on Arbitrum
});

const response = await client.get('https://merchant.com/premium-content');
console.log(response.data);
```

**Pay with WETH (gasless — sign only, requires one-time approval):**

```typescript
import { createPaymentClient, PERMIT2_ADDRESS, WETH_ADDRESSES } from '@x402-crosschain/sdk';

// One-time setup per wallet: approve Permit2 to spend WETH
// (do this in your onboarding flow, not on every payment)
// await wethContract.approve(PERMIT2_ADDRESS, MaxUint256);

const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,
  preferredToken: WETH_ADDRESSES[42161], // WETH on Arbitrum
});

const response = await client.get('https://merchant.com/premium-content');
console.log(response.data);
```

**Pay with Native ETH (sends a transaction):**

```typescript
const client = createPaymentClient('0xYourPrivateKey', {
  preferredChainId: 42161,
  preferredToken: '0x0000000000000000000000000000000000000000',
});
```

**Browser (MetaMask / any wallet):**

```typescript
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient } from 'wagmi';

const { data: walletClient } = useWalletClient();

const client = createBrowserPaymentClient(walletClient!, {
  preferredChainId: 42161,
  preferredToken: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // USDC
});

const response = await client.get('https://merchant.com/premium-content');
```

---

## How Gasless Payments Work

### Payment type selection

| Token | Method | Who signs | Who pays gas |
|-------|--------|-----------|--------------|
| USDC | EIP-3009 `TransferWithAuthorization` | Customer | Facilitator |
| WETH, DAI, any ERC-20 | **Permit2 `SignatureTransfer`** | Customer | Facilitator |
| Native ETH / BNB / MATIC | Customer sends tx to Relay | Customer | Customer |

### Permit2 — Universal gasless transfers

Starting in v2.1.0 this SDK uses **Uniswap Permit2** (`0x000000000022D473030F116dDEE9F6B43aC78BA3`) instead of per-token ERC-2612 for all non-USDC ERC-20 tokens. Permit2 is deployed at the same address on every major EVM chain.

**Why Permit2 over ERC-2612:**

| | ERC-2612 | Permit2 |
|--|---------|---------|
| Token support | Only tokens that implement `permit()` natively | **Any ERC-20** (WETH included) |
| Nonce type | Sequential uint256 — griefable | **Random bitmap** — no front-running |
| Domain | Per-token (name/version differ) | **Always `Permit2` contract** — consistent |
| Settlement | `token.permit()` + `token.transferFrom()` | **Single `Permit2.permitTransferFrom()`** |
| WETH on mainnet | Not supported | **Supported** |

**How Permit2 works:**

```
1. Customer: token.approve(PERMIT2_ADDRESS, MaxUint256)   ← one-time, per token
2. Customer: sign PermitTransferFrom { token, amount, spender: facilitator, nonce, deadline }
3. Facilitator: Permit2.permitTransferFrom(permit, { to: merchant, amount }, owner, sig)
```

The one-time approval in step 1 is all the customer ever needs to do on-chain. All future payments for that token are gasless signed messages.

**Permit2 is deployed on:** Ethereum, Base, Arbitrum, Optimism, Polygon, and all other major EVM chains.

### Cross-chain flow

```
Customer (WETH on Arbitrum)
  ↓ signs Permit2 message (no gas)

Facilitator
  ↓ Permit2.permitTransferFrom()   → takes WETH from customer
  ↓ Relay quote (EXACT_OUTPUT)     → WETH@Arbitrum → USDC@Base
  ↓ approve Relay router
  ↓ execute bridge tx

Merchant receives USDC on Base (2–3 seconds)
```

---

## Architecture

### ERC-20 Flow (Gasless)

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
       │ 3. Sign Permit2 msg    │                        │
       │    (NO GAS)            │                        │
       │                        │                        │
       │ 4. Retry with          │                        │
       │    X-PAYMENT header    │                        │
       │───────────────────────>│                        │
       │                        │                        │
       │                        │ 5. Verify + Settle     │
       │                        │───────────────────────>│
       │                        │                        │
       │                        │    Facilitator:        │
       │                        │    - Permit2 transfer  │
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

## x402 Compatibility

This SDK is **100% x402 compliant** and works with all standard x402 packages:

### Compatible Middleware

- `x402-express` — Express.js middleware
- `x402-hono` — Hono framework middleware
- `x402-next` — Next.js middleware
- Any x402-compatible middleware

### Compatible Clients

- `x402-axios` — Axios client with payment interceptor
- `x402-fetch` — Fetch API wrapper
- Any x402-compatible client

### Standard x402 Flow

1. Merchant returns `402 Payment Required`
2. Client creates payment payload and sends `X-PAYMENT` header
3. Facilitator exposes standard `/verify` and `/settle` endpoints
4. Merchant serves content after verification

---

## Supported Chains

| Chain | Chain ID | Native Token |
|-------|----------|--------------|
| Ethereum | 1 | ETH |
| Base | 8453 | ETH |
| Base Sepolia | 84532 | ETH |
| Arbitrum | 42161 | ETH |
| Optimism | 10 | ETH |
| Polygon | 137 | MATIC |
| BNB Chain | 56 | BNB |
| Avalanche | 43114 | AVAX |
| zkSync | 324 | ETH |
| Linea | 59144 | ETH |

---

## Installation & Setup

### Option 1: Use a Hosted Facilitator

**Merchants — install the SDK:**

```bash
npm install @x402-crosschain/sdk
```

**Customers — install the SDK:**

```bash
npm install @x402-crosschain/sdk
```

Point the middleware to your hosted facilitator URL. No infrastructure needed.

### Option 2: Self-Host Your Own Facilitator

**Install:**

```bash
npm install @x402-crosschain/facilitator
```

**Create `.env`:**

```bash
SETTLER_PRIVATE_KEY=0xYourPrivateKey   # Wallet that pays gas for settlements
BASE_RPC_URL=https://mainnet.base.org
PORT=3001
```

**Start:**

```bash
cd packages/facilitator
pnpm dev
```

The facilitator wallet needs ETH on each source chain it will settle from (to pay gas for `Permit2.permitTransferFrom()` and Relay bridge calls).

**Docker:**

```bash
docker compose up
```

See [USER_INSTALLATION_GUIDE.md](USER_INSTALLATION_GUIDE.md) for complete setup instructions.

---

## Exported Constants

```typescript
import {
  PERMIT2_ADDRESS,   // '0x000000000022D473030F116dDEE9F6B43aC78BA3'
  USDC_ADDRESSES,    // { [chainId]: address }
  WETH_ADDRESSES,    // { [chainId]: address }
  CHAIN_IDS,         // { 'base': 8453, 'arbitrum': 42161, ... }
  NETWORK_NAMES,     // { 8453: 'base', 42161: 'arbitrum', ... }
} from '@x402-crosschain/sdk';
```

---

## Security

- **Non-Custodial** — No funds held by facilitator
- **On-Chain Settlement** — All payments recorded on-chain
- **Private Key Security** — Settler private key never leaves your server
- **Permit2 Nonces** — Random bitmap nonces, not sequential — no front-running
- **Deadline Enforcement** — 6-second buffer check on facilitator before accepting any signature
- **Spender Verification** — Permit2 spender must match the facilitator wallet address
- **x402 Standard** — Follows established payment protocol
- **Open Source** — Code is fully auditable

---

## Relay Network

| Feature | Relay Network | Traditional Bridges |
|---------|--------------|---------------------|
| Settlement Time | 2-3 seconds | 12-15 minutes |
| Architecture | Optimistic settlement | Wait for bridge finality |
| Supported Chains | 69+ | Varies |
| x402 Compatible | Yes | Yes |

Relay uses **optimistic settlement** via liquidity pools — merchants are paid instantly while the bridge settles in the background.

---

## Changelog

### v2.1.0

- **Replaced ERC-2612 with Permit2** for all non-USDC ERC-20 tokens
  - Works with WETH on all chains (mainnet WETH does not support ERC-2612)
  - Unordered random nonces — no sequential front-running risk
  - Single `Permit2.permitTransferFrom()` call instead of `permit()` + `transferFrom()`
  - Consistent EIP-712 domain across all tokens
- **Added `facilitatorAddress`** to `MiddlewareConfig` — required for correct Permit2 spender binding
- **Added `PERMIT2_ADDRESS`** export from SDK
- **Renamed** `PermitPayload` → `Permit2Payload`, payload key `permit` → `permit2`

### v2.0.0

- Initial release with x402 protocol support
- EIP-3009 for USDC, ERC-2612 for other ERC-20s
- Relay Network cross-chain bridging

---

## Migration from v2.0.0 to v2.1.0

If you were checking `payload.permit` directly, update to `payload.permit2`:

```typescript
// Before (v2.0.0)
const payer = payload.permit?.owner || payload.authorization?.from;

// After (v2.1.0)
const payer = payload.permit2?.owner || payload.authorization?.from;
```

If you were using the `PermitPayload` type:

```typescript
// Before
import type { PermitPayload } from '@x402-crosschain/sdk';

// After
import type { Permit2Payload } from '@x402-crosschain/sdk';
```

Add `facilitatorAddress` to your middleware config:

```typescript
paymentMiddleware({
  payTo: '0xMerchant',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'http://localhost:3001',
  facilitatorAddress: '0xFacilitatorWallet', // new in v2.1.0
})
```

---

## Documentation

- [Installation Guide](USER_INSTALLATION_GUIDE.md)
- [SDK Documentation](packages/sdk/README.md)
- [Facilitator Documentation](packages/facilitator/README.md)
- [Custom Headers Explained](CUSTOM_HEADERS_EXPLAINED.md)

---

## Development

```bash
git clone https://github.com/divi2806/x402-cross-bridge-sdk.git
cd x402-cross-bridge-sdk
pnpm install
pnpm build
```

### Project Structure

```
x402-cross-bridge-sdk/
├── packages/
│   ├── sdk/              # Main SDK package (@x402-crosschain/sdk)
│   └── facilitator/      # Facilitator backend (@x402-crosschain/facilitator)
├── examples/             # Usage examples
└── docs/                 # Documentation
```

---

## Support

- **Issues**: [GitHub Issues](https://github.com/divi2806/x402-cross-bridge-sdk/issues)
- **x402 Protocol**: [x402.org](https://x402.org)
- **Relay Network**: [docs.relay.link](https://docs.relay.link)
- **Permit2**: [github.com/Uniswap/permit2](https://github.com/Uniswap/permit2)

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

Built with the [x402 Protocol](https://x402.org), [Relay Network](https://relay.link), [Uniswap Permit2](https://github.com/Uniswap/permit2), and [Viem](https://viem.sh).
