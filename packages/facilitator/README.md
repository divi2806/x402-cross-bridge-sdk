# x402 Cross-Chain Facilitator

> **Backend service for instant cross-chain payment settlement**

The facilitator handles cross-chain payment routing, bridging via Relay Network, and on-chain settlement verification. Designed for self-hosting or managed deployment.

---

##**Overview**

The facilitator is the backend engine that powers cross-chain x402 payments:

1. **Quote Generation** - Calculates cross-chain routes and costs
2. **Bridge Coordination** - Manages Relay Network instant bridging
3. **Settlement Verification** - Confirms on-chain payment completion
4. **Status Tracking** - Monitors payment lifecycle

---

## **Key Features**

-  **Instant Bridging** - 2-3 second settlement via Relay liquidity pools
-  **69+ Chains** - Support for all major EVM chains + Solana, Bitcoin
-  **Non-Custodial** - No funds held, only coordinates transactions
-  **Status Polling** - Automatic bridge completion tracking
-  **Docker Ready** - Easy deployment with Docker/Kubernetes
-  **Configurable** - Environment-based configuration

---

##  **Deployment Options**

### **Option 1: Docker (Recommended)**

```bash
# Build image
docker build -t x402-facilitator .

# Run container
docker run -d \
  -p 3001:3001 \
  -e BASE_RPC_URL=https://mainnet.base.org \
  -e PAYMENT_SETTLEMENT_ADDRESS=0xYourContractAddress \
  -e SETTLER_PRIVATE_KEY=0xYourPrivateKey \
  --name x402-facilitator \
  x402-facilitator
```

### **Option 2: Node.js**

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start
pnpm start
```

### **Option 3: Programmatic**

```typescript
import { startFacilitator } from '@x402-crosschain/facilitator';

await startFacilitator({
  port: 3001,
  baseRpcUrl: 'https://mainnet.base.org',
  paymentSettlementAddress: '0xYourContractAddress',
  settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY,
});
```

---

##  **Configuration**

### **Environment Variables**

Create a `.env` file:

```bash
# Required Configuration
BASE_RPC_URL=https://mainnet.base.org
PAYMENT_SETTLEMENT_ADDRESS=0xYourContractAddress
SETTLER_PRIVATE_KEY=0xYourPrivateKeyHere

# Optional Configuration
PORT=3001
POLL_INTERVAL=10000
```

### **Configuration Options**

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `BASE_RPC_URL` | Base network RPC endpoint | - | ✅ Yes |
| `PAYMENT_SETTLEMENT_ADDRESS` | Settlement contract address on Base | - | ✅ Yes |
| `SETTLER_PRIVATE_KEY` | Private key with settler role | - | ✅ Yes |
| `PORT` | HTTP server port | 3001 | ❌ No |
| `POLL_INTERVAL` | Status check interval (ms) | 10000 | ❌ No |

---

##  **API Endpoints**

### **POST /quote-route**

Get a cross-chain payment quote with transaction data.

**Request:**

```typescript
POST http://localhost:3001/quote-route
Content-Type: application/json

{
  "requirement": {
    "chainId": 8453,              // Base
    "tokenAddress": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    "amount": "1000000"           // 1 USDC (6 decimals)
  },
  "payer": {
    "fromChainId": 42161,         // Arbitrum
    "fromToken": "0x0000000000000000000000000000000000000000", // Native ETH
    "address": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3"
  }
}
```

**Response:**

```json
{
  "paymentId": "0xabc123...",
  "txData": {
    "to": "0xa5F565650890fBA1824Ee0F21EbBbF660a179934",
    "data": "0x...",
    "value": "12345678901234",
    "chainId": 42161
  },
  "route": {
    "fromChainId": 42161,
    "toChainId": 8453,
    "fromToken": "0x0000000000000000000000000000000000000000",
    "toToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "expectedOutput": "1000000"
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `paymentId` | string | Unique payment identifier for tracking |
| `txData.to` | string | Relay contract address to send transaction |
| `txData.data` | string | Encoded transaction calldata |
| `txData.value` | string | ETH amount to send (in wei) |
| `txData.chainId` | number | Source chain ID |
| `route.expectedOutput` | string | Expected USDC received on Base |

---

### **GET /verify**

Check if a payment has been settled on-chain.

**Request:**

```bash
GET http://localhost:3001/verify?paymentId=0xabc123...
```

**Response:**

```json
{
  "settled": true
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `settled` | boolean | `true` if payment settled on-chain, `false` otherwise |

---

### **POST /submit-tx**

Submit transaction hash for tracking (optional).

**Request:**

```typescript
POST http://localhost:3001/submit-tx
Content-Type: application/json

{
  "paymentId": "0xabc123...",
  "txHash": "0xdef456..."
}
```

**Response:**

```json
{
  "success": true
}
```

---

### **GET /health**

Health check endpoint.

**Request:**

```bash
GET http://localhost:3001/health
```

**Response:**

```json
{
  "ok": true,
  "activePayments": 3,
  "timestamp": "2025-12-17T00:21:45.123Z"
}
```

---

## **Architecture**

```
┌──────────────────────────────────────────────┐
│         x402 Facilitator Service             │
├──────────────────────────────────────────────┤
│                                              │
│  ┌────────────┐  ┌──────────────┐           │
│  │  Express   │  │   Relay      │           │
│  │  API       │──│   Service    │           │
│  │  Server    │  │              │           │
│  └────────────┘  └──────────────┘           │
│         │                │                   │
│         │                │                   │
│  ┌──────┴────────┐  ┌───┴──────────────┐    │
│  │  Settlement   │  │  Status          │    │
│  │  Service      │  │  Poller          │    │
│  └───────────────┘  └──────────────────┘    │
│         │                                    │
└─────────┼────────────────────────────────────┘
          │
          ▼
  ┌───────────────┐
  │ Base Network  │
  │ Settlement    │
  │ Contract      │
  └───────────────┘
```

### **Components**

1. **Express API Server** - HTTP endpoints for quote/verify/health
2. **Relay Service** - Integration with Relay Network for bridging
3. **Settlement Service** - On-chain settlement contract interactions
4. **Status Poller** - Background process monitoring bridge completion

---

##  **Payment Flow**

```
1. Client → POST /quote-route
      ↓
2. Facilitator → Relay Network (get quote)
      ↓
3. Facilitator → Register payment on-chain
      ↓
4. Facilitator → Return tx data to client
      ↓
5. Client → Submit tx on source chain (Arbitrum)
      ↓
6. Relay Network → Instant bridge (2-3 seconds)
      ↓
7. Status Poller → Check completion
      ↓
8. Facilitator → Settle payment on-chain (Base)
      ↓
9. Client → GET /verify (returns true)
```

---

##**Docker Deployment**

### **Dockerfile**

See [`Dockerfile`](./Dockerfile) in this directory.

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
      - PAYMENT_SETTLEMENT_ADDRESS=${PAYMENT_SETTLEMENT_ADDRESS}
      - SETTLER_PRIVATE_KEY=${SETTLER_PRIVATE_KEY}
      - PORT=3001
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

### **Kubernetes Deployment**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: x402-facilitator
spec:
  replicas: 2
  selector:
    matchLabels:
      app: x402-facilitator
  template:
    metadata:
      labels:
        app: x402-facilitator
    spec:
      containers:
      - name: facilitator
        image: your-registry/x402-facilitator:latest
        ports:
        - containerPort: 3001
        env:
        - name: BASE_RPC_URL
          value: "https://mainnet.base.org"
        - name: PAYMENT_SETTLEMENT_ADDRESS
          valueFrom:
            secretKeyRef:
              name: facilitator-secrets
              key: contract-address
        - name: SETTLER_PRIVATE_KEY
          valueFrom:
            secretKeyRef:
              name: facilitator-secrets
              key: settler-key
        livenessProbe:
          httpGet:
            path: /health
            port: 3001
          initialDelaySeconds: 30
          periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: x402-facilitator
spec:
  selector:
    app: x402-facilitator
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

---

##  **Security Considerations**

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

### **Access Control**

```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

app.use('/quote-route', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
}));

// Add CORS for production
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
}));
```

### **Monitoring**

```bash
# Check facilitator health
curl http://localhost:3001/health

# Monitor logs
docker logs -f x402-facilitator

# Track active payments
curl http://localhost:3001/health | jq '.activePayments'
```

---

##  **Operational Metrics**

### **Performance**

- **Quote Generation**: < 1 second
- **Bridge Settlement**: 2-3 seconds (via Relay)
- **On-chain Settlement**: 2-5 seconds (Base finality)
- **Total Time**: ~5-10 seconds end-to-end

### **Reliability**

- **Uptime Target**: 99.9%
- **Success Rate**: > 99% (via Relay Network)
- **Automatic Retries**: Failed bridges automatically refunded

### **Resource Requirements**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 1 core | 2 cores |
| **RAM** | 512 MB | 1 GB |
| **Storage** | 1 GB | 5 GB |
| **Network** | 10 Mbps | 100 Mbps |

---

## **Testing**

### **Local Testing**

```bash
# Start facilitator
pnpm dev

# Test health endpoint
curl http://localhost:3001/health

# Test quote endpoint
curl -X POST http://localhost:3001/quote-route \
  -H "Content-Type: application/json" \
  -d '{
    "requirement": {
      "chainId": 84532,
      "tokenAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "amount": "1000000"
    },
    "payer": {
      "fromChainId": 421614,
      "fromToken": "0x0000000000000000000000000000000000000000",
      "address": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3"
    }
  }'
```

### **Integration Testing**

See [`examples/`](../../examples/) directory for full integration tests.

---

##  **Troubleshooting**

### **Common Issues**

#### 1. **"Settler not authorized"**

```bash
# Ensure settler address matches contract deployment
# Settler is the address derived from SETTLER_PRIVATE_KEY
```

#### 2. **"Relay quote failed"**

```bash
# Check if route is supported
# Verify fromChainId and toChainId are valid
# Ensure amount is above minimum ($1.00 recommended)
```

#### 3. **"Payment not settling"**

```bash
# Check facilitator logs for poller status
# Verify Base RPC is responding
# Ensure settler wallet has gas for settlement txs
```

#### 4. **"Connection refused"**

```bash
# Verify facilitator is running
curl http://localhost:3001/health

# Check firewall rules
sudo ufw allow 3001

# Verify Docker port mapping
docker ps | grep facilitator
```

---

## 📈 **Scaling**

### **Horizontal Scaling**

```yaml
# Deploy multiple instances behind load balancer
replicas: 3

# Use sticky sessions for in-memory payment tracking
# Or migrate to Redis for shared state:
```

### **Redis Integration (Future)**

```typescript
// Coming soon: Shared payment state
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);
await redis.set(`payment:${paymentId}`, JSON.stringify(payment));
```

---

## 🔄 **Upgrading**

### **Version Migration**

```bash
# Pull latest image
docker pull your-registry/x402-facilitator:latest

# Rolling update
kubectl rollout restart deployment/x402-facilitator

# Verify health
kubectl rollout status deployment/x402-facilitator
```

---

## **API Client Examples**

### **JavaScript/TypeScript**

```typescript
// Get quote
const response = await fetch('https://facilitator.yourdomain.com/quote-route', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ requirement, payer }),
});

const { paymentId, txData } = await response.json();

// Check status
const verifyResponse = await fetch(
  `https://facilitator.yourdomain.com/verify?paymentId=${paymentId}`
);
const { settled } = await verifyResponse.json();
```

### **cURL**

```bash
# Get quote
curl -X POST https://facilitator.yourdomain.com/quote-route \
  -H "Content-Type: application/json" \
  -d '{"requirement":{...},"payer":{...}}'

# Check status
curl "https://facilitator.yourdomain.com/verify?paymentId=0xabc..."

# Health check
curl https://facilitator.yourdomain.com/health
```

---

##**License**

MIT License

---
---

## **Support**

- **GitHub Issues**: https://github.com/divi2806/x402-cross-bridge-sdk/issues
- **Email**: divyansh2824@gmail.com

---

