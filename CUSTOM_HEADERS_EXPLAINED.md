# Custom HTTP Headers - Complete Explanation

## What Are HTTP Headers?

HTTP headers are **key-value pairs** sent with every HTTP request and response. They provide metadata about the request/response.

### Standard Headers (Built into HTTP)
```http
GET /api/data HTTP/1.1
Host: example.com
Content-Type: application/json
Authorization: Bearer token123
```

**Examples:**
- `Content-Type`: Tells server what format the data is in
- `Authorization`: Contains authentication credentials
- `User-Agent`: Identifies the client making the request

### Custom Headers (Application-Specific)

Custom headers are headers **you define** for your application. They must start with `X-` (by convention) or use a custom prefix.

**Format:**
```http
X-Custom-Header-Name: value
```

**Why Custom Headers?**
- Pass application-specific metadata
- Don't interfere with standard HTTP behavior
- Can be ignored by clients that don't understand them (graceful degradation)

---

## Our Custom Headers: Cross-Chain Payment Preferences

We use **two custom headers** to enable cross-chain payments:

### 1. `X-PREFERRED-TOKEN`
**Purpose:** Tells the merchant/facilitator which token the customer wants to pay with

**Format:**
```http
X-PREFERRED-TOKEN: 0x0000000000000000000000000000000000000000
```

**Values:**
- `0x0000000000000000000000000000000000000000` = Native token (ETH, MATIC, etc.)
- `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` = USDC contract address
- Any ERC-20 token contract address

### 2. `X-PREFERRED-NETWORK`
**Purpose:** Tells the merchant/facilitator which blockchain network the customer is on

**Format:**
```http
X-PREFERRED-NETWORK: arbitrum
```

**Values:**
- `arbitrum` = Arbitrum One
- `base` = Base
- `ethereum` = Ethereum Mainnet
- `optimism` = Optimism
- `polygon` = Polygon
- Any supported network name

---

## Code Snippets: Where We Use These Headers

### 1. **Client Side: Setting the Headers**

#### Node.js Client (`payment-client.ts`)

```typescript:128:136:packages/sdk/src/client/payment-client.ts
// Add preference headers for cross-chain verification
if (isCrossChain) {
  originalRequest.headers!['X-PREFERRED-TOKEN'] = preferences?.preferredToken || '0x0000000000000000000000000000000000000000';
  originalRequest.headers!['X-PREFERRED-NETWORK'] = getNetworkName(customerChainId);
  
  // Add to payment requirements for facilitator
  paymentRequirements.srcTokenAddress = preferences?.preferredToken || '0x0000000000000000000000000000000000000000';
  paymentRequirements.srcNetwork = getNetworkName(customerChainId);
}
```

**What happens:**
1. Client detects it's on a different chain than merchant
2. Sets `X-PREFERRED-TOKEN` to the token address (or `0x0000...` for native ETH)
3. Sets `X-PREFERRED-NETWORK` to the network name (e.g., `arbitrum`)
4. These headers are sent with the payment request

#### Browser Client (`browser-client.ts`)

```typescript
// Similar logic, but uses browser wallet
if (isCrossChain) {
  request.headers['X-PREFERRED-TOKEN'] = preferredToken || '0x0000000000000000000000000000000000000000';
  request.headers['X-PREFERRED-NETWORK'] = getNetworkName(chainId);
}
```

---

### 2. **Server Side: Reading the Headers**

#### Merchant Middleware (`payment-middleware.ts`)

```typescript:57:69:packages/sdk/src/middleware/payment-middleware.ts
// Add cross-chain support: Get preference headers
const preferredToken = req.headers['x-preferred-token'] as string;
const preferredNetwork = req.headers['x-preferred-network'] as string;

if (preferredToken || preferredNetwork) {
  console.log('[Middleware] Cross-chain payment detected:', {
    srcToken: preferredToken,
    srcNetwork: preferredNetwork,
    destNetwork: config.network,
  });
  paymentRequirements.srcTokenAddress = preferredToken;
  paymentRequirements.srcNetwork = preferredNetwork;
}
```

**What happens:**
1. Middleware reads `X-PREFERRED-TOKEN` and `X-PREFERRED-NETWORK` from request headers
2. If present, it knows this is a cross-chain payment
3. Adds this info to `paymentRequirements` object
4. Sends to facilitator for verification

**Note:** HTTP headers are case-insensitive, so `X-PREFERRED-TOKEN` and `x-preferred-token` are the same.

---

### 3. **Facilitator: Using the Headers**

#### Facilitator Verify Endpoint (`index.ts`)

```typescript:35:45:packages/facilitator/src/index.ts
// Extract cross-chain info from payment requirements
const srcNetwork = paymentRequirements.extra?.srcNetwork || paymentRequirements.srcNetwork;
const srcTokenAddress = paymentRequirements.extra?.srcTokenAddress || paymentRequirements.srcTokenAddress;
const destNetwork = paymentRequirements.network;

const isCrossChain = srcNetwork && srcNetwork !== destNetwork;

if (isCrossChain) {
  console.log('[API] Cross-chain payment detected:', {
    srcNetwork,
    destNetwork,
    srcToken: srcTokenAddress,
  });
}
```

**What happens:**
1. Facilitator receives `paymentRequirements` (which includes the header values)
2. Checks if `srcNetwork !== destNetwork` (cross-chain detected)
3. Uses Relay to verify the bridge transaction
4. Returns verification result

---

## Complete Flow: How Headers Work End-to-End

### Step-by-Step Example

**Scenario:** Customer on Arbitrum wants to pay with ETH, merchant wants USDC on Base

#### Step 1: Customer Makes Request
```http
GET /premium-data HTTP/1.1
Host: merchant.com
```

#### Step 2: Merchant Responds with 402
```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [{
    "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",  // USDC
    "network": "base",
    "maxAmountRequired": "10000",  // $0.01 USDC
    "payTo": "0xMerchantAddress"
  }]
}
```

#### Step 3: Client Detects Cross-Chain
```typescript
// Client code detects:
const customerChainId = 42161;  // Arbitrum
const merchantChainId = 8453;   // Base
const isCrossChain = customerChainId !== merchantChainId;  // true!
```

#### Step 4: Client Executes Bridge & Sets Headers
```http
GET /premium-data HTTP/1.1
Host: merchant.com
X-PAYMENT: <base64-encoded-payment-payload>
X-PREFERRED-TOKEN: 0x0000000000000000000000000000000000000000  ← Custom header!
X-PREFERRED-NETWORK: arbitrum                                    ← Custom header!
```

**What the headers mean:**
- `X-PREFERRED-TOKEN: 0x0000...` = "I'm paying with native ETH"
- `X-PREFERRED-NETWORK: arbitrum` = "I'm on Arbitrum chain"

#### Step 5: Middleware Reads Headers
```typescript
const preferredToken = req.headers['x-preferred-token'];  // "0x0000..."
const preferredNetwork = req.headers['x-preferred-network'];  // "arbitrum"

// Middleware now knows:
// - Customer is on Arbitrum
// - Customer wants to pay with ETH
// - Merchant wants USDC on Base
// - This is a cross-chain payment!
```

#### Step 6: Facilitator Verifies Bridge
```typescript
// Facilitator receives:
{
  paymentPayload: { ... },
  paymentRequirements: {
    srcNetwork: "arbitrum",      // From X-PREFERRED-NETWORK
    srcTokenAddress: "0x0000...", // From X-PREFERRED-TOKEN
    destNetwork: "base",
    asset: "0x8335...",          // USDC on Base
  }
}

// Facilitator checks Relay bridge status
const status = await relay.getSwapStatus(requestId);
// If status === 'COMPLETED', payment is valid!
```

#### Step 7: Merchant Serves Content
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "data": "Premium content here!"
}
```

---

## Why This Approach Works

### 1. **x402 Compliant**
- Headers are optional (graceful degradation)
- Standard x402 clients ignore them
- Doesn't break existing x402 implementations

### 2. **Backward Compatible**
- If headers are missing, it's treated as same-chain payment
- Old clients still work
- New clients get cross-chain benefits

### 3. **Flexible**
- Customer can specify any token/network
- Facilitator can support multiple bridge providers
- Easy to extend with more headers

### 4. **Standard HTTP Practice**
- Custom headers are a standard HTTP feature
- No special protocols needed
- Works with any HTTP client

---

## Technical Details

### Header Naming Convention

**Why `X-` prefix?**
- Historical convention for custom headers
- Indicates "experimental" or "custom"
- Modern practice: Can use any prefix (e.g., `X402-`, `Relay-`)

**Case Sensitivity:**
- Header names are **case-insensitive**
- `X-PREFERRED-TOKEN` = `x-preferred-token` = `X-Preferred-Token`
- We use uppercase for consistency

### Header Values

**Token Address:**
- Must be valid Ethereum address format
- `0x` prefix + 40 hex characters
- `0x0000...` is special (means native token)

**Network Name:**
- Must match our network mapping
- Examples: `arbitrum`, `base`, `ethereum`, `optimism`
- Case-sensitive (we normalize to lowercase)

### Security Considerations

**Are headers secure?**
- Headers are sent in plain text (not encrypted)
- But they're just preferences, not secrets
- Actual payment proof is in `X-PAYMENT` header (signed payload)
- Headers can't be used to steal funds (just preferences)

**Validation:**
- Middleware validates header values
- Facilitator verifies actual bridge transaction
- Headers are just hints, not authorization

---

## Comparison: With vs Without Headers

### Without Custom Headers (Standard x402)
```
Customer: Has ETH on Arbitrum
Merchant: Wants USDC on Base
Result: ❌ Payment fails (wrong chain, wrong token)
```

### With Custom Headers (Cross-Chain x402)
```
Customer: Has ETH on Arbitrum
Merchant: Wants USDC on Base
Headers: X-PREFERRED-TOKEN: 0x0000..., X-PREFERRED-NETWORK: arbitrum
Result: ✅ Payment succeeds (Relay bridges automatically)
```

---

## Summary

**Custom HTTP headers** (`X-PREFERRED-TOKEN` and `X-PREFERRED-NETWORK`) are:
1. **Metadata** - Tell merchant/facilitator customer's payment preferences
2. **Optional** - Work with or without them (backward compatible)
3. **Standard** - Use normal HTTP header mechanism
4. **Powerful** - Enable cross-chain payments while staying x402 compliant

They're the **secret sauce** that makes cross-chain payments seamless! 🚀

