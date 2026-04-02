# x402 Cross-Chain Facilitator

> **x402-compliant facilitator for cross-chain payments with Relay Network**

The facilitator verifies payment signatures (EIP-3009 for USDC, Permit2 for all other ERC-20s), executes token transfers, and handles cross-chain bridging via Relay Network. Merchants receive USDC on Base regardless of what token/chain the customer pays with.

---

## **Overview**

The facilitator is the backend engine that powers x402 cross-chain payments:

1. **Signature Verification** - Verifies EIP-3009 (USDC) and Permit2 SignatureTransfer (all other ERC-20s) signatures
2. **Token Collection** - Executes `Permit2.permitTransferFrom()` or `transferWithAuthorization()` to collect tokens
3. **Swap & Bridge** - Uses Relay Network to swap any token → USDC and bridge to Base
4. **Settlement** - Delivers USDC to merchant on Base

---

## **Key Features**

- **x402 Protocol Compliant** - Works with standard x402 clients (x402-axios, x402-fetch)
- **Gasless for Customers** - Customers sign permits, facilitator pays gas (ERC-20 tokens)
- **Any Token Support** - Accept ETH, WETH, USDC, DAI, or any ERC-20 token (via Permit2)
- **Any Chain Support** - 10+ chains including Ethereum, Arbitrum, Base, Polygon, BNB Chain
- **Instant Settlement** - 2-3 second bridging via Relay liquidity pools
- **Native Token Support** - Accept native ETH/BNB/MATIC (customer sends tx)

---

## **Supported Payment Methods**

| Payment Type | Gasless? | How It Works |
|--------------|----------|--------------|
| **USDC** | ✅ Yes | EIP-3009 TransferWithAuthorization |
| **WETH, DAI, any ERC-20** | ✅ Yes | Permit2 SignatureTransfer (one-time approve required) |
| **Native ETH/BNB** | ❌ No | Customer sends tx to Relay directly |

---

## **Deployment**

### **Option 1: Docker (Recommended)**

```bash
docker build -t x402-facilitator .

docker run -d \
  -p 3001:3001 \
  -e BASE_RPC_URL=https://mainnet.base.org \
  -e SETTLER_PRIVATE_KEY=0xYourPrivateKey \
  --name x402-facilitator \
  x402-facilitator
```

### **Option 2: Node.js**

```bash
pnpm install
pnpm build
pnpm start
```

---

## **Configuration**

### **Environment Variables**

```bash
# Required
SETTLER_PRIVATE_KEY=0xYourPrivateKey   # Wallet to pay gas for settlements
BASE_RPC_URL=https://mainnet.base.org  # Base RPC for settlement

# Optional
PORT=3001
```

### **Configuration Options**

| Variable | Description | Required |
|----------|-------------|----------|
| `SETTLER_PRIVATE_KEY` | Private key for facilitator wallet (pays gas) | ✅ Yes |
| `BASE_RPC_URL` | Base network RPC endpoint | ✅ Yes |
| `PORT` | HTTP server port (default: 3001) | ❌ No |

**Note:** The facilitator wallet needs ETH on each supported chain to pay gas for settlements.

---

## **API Endpoints**

### **POST /verify**

Verify a payment signature (Permit2 for non-USDC ERC-20, EIP-3009 for USDC, or native ETH via Relay status).

**Request (Permit2 — WETH/DAI/any ERC-20):**

```json
{
  "paymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "arbitrum",
    "payload": {
      "permit2": {
        "owner": "0xCustomerAddress",
        "spender": "0xFacilitatorWalletAddress",
        "token": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
        "amount": "500000000000000000",
        "nonce": "123456789",
        "deadline": "1735200000"
      },
      "signature": "0x..."
    }
  },
  "paymentRequirements": {
    "scheme": "exact",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "maxAmountRequired": "1000000",
    "network": "base",
    "payTo": "0xMerchantAddress"
  }
}
```

**Request (EIP-3009 — USDC):**

```json
{
  "paymentPayload": {
    "x402Version": 1,
    "scheme": "exact",
    "network": "base",
    "payload": {
      "authorization": {
        "from": "0xCustomerAddress",
        "to": "0xFacilitatorWalletAddress",
        "value": "1000000",
        "validAfter": "0",
        "validBefore": "1735200000",
        "nonce": "0x..."
      },
      "signature": "0x..."
    }
  },
  "paymentRequirements": {
    "scheme": "exact",
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "maxAmountRequired": "1000000",
    "network": "base",
    "payTo": "0xMerchantAddress"
  }
}
```

**Response:**

```json
{
  "isValid": true,
  "payer": "0xCustomerAddress"
}
```

---

### **POST /settle**

Execute the payment: collect tokens, swap/bridge via Relay, deliver to merchant.

**Request:** Same as `/verify`

**Response:**

```json
{
  "success": true,
  "transaction": "0xSettlementTxHash",
  "network": "base",
  "payer": "0xCustomerAddress"
}
```

---

### **GET /health**

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "type": "x402-facilitator"
}
```

---

## **Payment Flow**

### **ERC-20 Tokens (Gasless for Customer)**

```
1. Customer signs Permit2 SignatureTransfer (or EIP-3009 for USDC)
2. Customer sends X-PAYMENT header with signature
3. Facilitator verifies signature (/verify)
4. Facilitator calls Permit2.permitTransferFrom() to collect tokens (single call)
5. Facilitator calls Relay to swap + bridge → USDC on Base
6. Relay delivers USDC to merchant
7. Facilitator confirms settlement (/settle)
```

### **Native ETH/BNB (Customer Pays Gas)**

```
1. Customer sends ETH tx directly to Relay
2. Relay swaps ETH → USDC + bridges to Base
3. Merchant receives USDC
4. Facilitator verifies via Relay status
```

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

## **Docker Deployment**

### **Docker Compose**

```yaml
version: '3.8'

services:
  facilitator:
    build: .
    ports:
      - "3001:3001"
    environment:
      - BASE_RPC_URL=https://mainnet.base.org
      - SETTLER_PRIVATE_KEY=${SETTLER_PRIVATE_KEY}
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## **Security**

### **Private Key Management**

**CRITICAL**: Never expose your settler private key!

```bash
# ✅ Good: Use environment variables
export SETTLER_PRIVATE_KEY=0x...

# ✅ Good: Use Docker secrets
docker run --env-file .env.production x402-facilitator

# ❌ Bad: Hardcode in source
const privateKey = "0x123..." // NEVER DO THIS
```

---

## **Testing**

```bash
# Start facilitator
pnpm dev

# Test health endpoint
curl http://localhost:3001/health

# Test verify endpoint
curl -X POST http://localhost:3001/verify \
  -H "Content-Type: application/json" \
  -d '{"paymentPayload":{...},"paymentRequirements":{...}}'
```

---

## **Troubleshooting**

| Issue | Solution |
|-------|----------|
| "Permit2 spender mismatch" | Set `facilitatorAddress` in merchant middleware to match this wallet |
| "Signature verification failed" | Check EIP-712 domain parameters match (Permit2 domain is always the Permit2 contract) |
| "Insufficient gas" | Fund facilitator wallet with ETH on source chain |
| "Relay quote failed" | Verify token/chain is supported by Relay |
| "Transfer failed" | Check customer has approved Permit2 contract (`token.approve(PERMIT2_ADDRESS, MaxUint256)`) |

---

## **Changelog**

### v2.1.0
- **Replaced ERC-2612 with Permit2** for all non-USDC ERC-20 tokens (including WETH)
  - Single `Permit2.permitTransferFrom()` call replaces `permit()` + `transferFrom()`
  - Works with any ERC-20 — no need for per-token `permit()` support
  - Random unordered nonces — no sequential front-running risk
- **Added `requestId` tracking** for native ETH payments via Relay status API
- Both `/verify` and `/settle` updated for Permit2 flow

### v2.0.0 (December 2025)
- Initial release with x402 protocol support
- EIP-3009 for USDC, ERC-2612 for other ERC-20s
- Relay Network cross-chain bridging

---

## **License**

MIT License

---

## **Support**

- **GitHub Issues**: https://github.com/divi2806/x402-cross-bridge-sdk/issues
- **Email**: divyansh2824@gmail.com

---
