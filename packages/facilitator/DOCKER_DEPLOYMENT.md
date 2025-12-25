# Docker Deployment Guide

## Quick Start

### 1. Setup Environment

```bash
cd packages/facilitator

# Copy example env file
cp env.example.txt .env

# Edit with your values
nano .env
```

Required environment variables:
```env
BASE_RPC_URL=https://mainnet.base.org
PAYMENT_SETTLEMENT_ADDRESS=0xYourContractAddress
SETTLER_PRIVATE_KEY=0xYourPrivateKey
PORT=3001
```

### 2. Build Docker Image

```bash
docker build -t x402-facilitator .
```

### 3. Run Container

```bash
# Using .env file
docker run -p 3001:3001 --env-file .env x402-facilitator

# Or with environment variables
docker run -p 3001:3001 \
  -e BASE_RPC_URL="https://mainnet.base.org" \
  -e PAYMENT_SETTLEMENT_ADDRESS="0xYourContractAddress" \
  -e SETTLER_PRIVATE_KEY="0xYourPrivateKey" \
  x402-facilitator
```

### 4. Verify It's Running

```bash
# Check health endpoint
curl http://localhost:3001/health

# Should return: {"status":"healthy"}
```

## Docker Compose (Recommended for Production)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  facilitator:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3001/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

Run with Docker Compose:

```bash
# Start
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Cloud Deployment

### Google Cloud Run

```bash
# 1. Build and tag
docker build -t gcr.io/YOUR_PROJECT/x402-facilitator .

# 2. Push to Google Container Registry
docker push gcr.io/YOUR_PROJECT/x402-facilitator

# 3. Deploy to Cloud Run
gcloud run deploy x402-facilitator \
  --image gcr.io/YOUR_PROJECT/x402-facilitator \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars BASE_RPC_URL="https://mainnet.base.org" \
  --set-env-vars PAYMENT_SETTLEMENT_ADDRESS="0xYourContract" \
  --set-secrets SETTLER_PRIVATE_KEY=settler-key:latest
```

### AWS ECS/Fargate

```bash
# 1. Build and tag
docker build -t x402-facilitator .

# 2. Tag for ECR
docker tag x402-facilitator:latest \
  YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/x402-facilitator:latest

# 3. Push to ECR
docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/x402-facilitator:latest

# 4. Create ECS task definition and service (via AWS Console or CLI)
```

### Heroku

```bash
# 1. Login to Heroku Container Registry
heroku container:login

# 2. Build and push
heroku container:push web --app your-app-name

# 3. Release
heroku container:release web --app your-app-name

# 4. Set environment variables
heroku config:set BASE_RPC_URL="https://mainnet.base.org" --app your-app-name
heroku config:set PAYMENT_SETTLEMENT_ADDRESS="0xYourContract" --app your-app-name
heroku config:set SETTLER_PRIVATE_KEY="0xYourKey" --app your-app-name
```

### Railway

```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Deploy
railway up

# 5. Set environment variables in Railway dashboard
```

## Troubleshooting

### Build Errors

**Error: `ERR_PNPM_NO_LOCKFILE`**

This is expected in a monorepo. The Dockerfile has been updated to work without `pnpm-lock.yaml`.

Solution: Use the updated Dockerfile (already fixed).

**Error: Missing dependencies**

```bash
# Ensure you're in the right directory
cd packages/facilitator

# Clean build
docker build --no-cache -t x402-facilitator .
```

### Runtime Errors

**Error: Cannot connect to RPC**

Check your `BASE_RPC_URL`:
```bash
# Test RPC connection
curl -X POST $BASE_RPC_URL \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

**Error: Invalid private key**

Ensure your `SETTLER_PRIVATE_KEY`:
- Starts with `0x`
- Is 66 characters long (0x + 64 hex chars)
- Has ETH on Base for gas

**Error: Contract not found**

Verify `PAYMENT_SETTLEMENT_ADDRESS`:
```bash
# Check contract on Basescan
open https://basescan.org/address/$PAYMENT_SETTLEMENT_ADDRESS
```

### Container Issues

**Container exits immediately**

```bash
# Check logs
docker logs $(docker ps -lq)

# Run in foreground to see errors
docker run -p 3001:3001 --env-file .env x402-facilitator
```

**Port already in use**

```bash
# Find process using port 3001
lsof -i :3001

# Kill it or use different port
docker run -p 3002:3001 --env-file .env x402-facilitator
```

## Security Best Practices

1. **Never commit `.env` files**
   ```bash
   # Add to .gitignore
   echo ".env" >> .gitignore
   ```

2. **Use secrets management**
   - Google Cloud: Secret Manager
   - AWS: Secrets Manager or Parameter Store
   - Azure: Key Vault
   - Kubernetes: Secrets

3. **Rotate private keys regularly**

4. **Use read-only RPC URLs when possible**

5. **Monitor gas usage and set alerts**

6. **Use HTTPS for all external connections**

7. **Implement rate limiting**

8. **Set up logging and monitoring**

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:3001/health

# With monitoring
while true; do
  curl -s http://localhost:3001/health | jq
  sleep 10
done
```

### Logs

```bash
# Docker logs
docker logs -f CONTAINER_ID

# Docker Compose logs
docker-compose logs -f facilitator

# Export logs
docker logs CONTAINER_ID > facilitator.log 2>&1
```

### Metrics

Consider adding:
- Prometheus for metrics
- Grafana for dashboards
- Sentry for error tracking
- DataDog/New Relic for APM

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  facilitator:
    build: .
    deploy:
      replicas: 3
    ports:
      - "3001-3003:3001"
```

### Load Balancing

Use nginx or cloud load balancers:

```nginx
upstream facilitator {
    server localhost:3001;
    server localhost:3002;
    server localhost:3003;
}

server {
    listen 80;
    location / {
        proxy_pass http://facilitator;
    }
}
```

## Backup and Recovery

### Backup Strategy

1. **Environment variables**: Store in secure vault
2. **Private keys**: Use hardware security modules (HSM) in production
3. **Logs**: Export to external storage
4. **Metrics**: Store in time-series database

### Disaster Recovery

1. Keep Docker images in multiple registries
2. Document deployment process
3. Test recovery procedures regularly
4. Have rollback plan ready

## Cost Optimization

1. **Use smaller base images**
   - Current: `node:20-alpine` (smallest)

2. **Multi-stage builds**
   - Already implemented

3. **Optimize dependencies**
   ```bash
   # Analyze bundle size
   npm install -g cost-of-modules
   cost-of-modules
   ```

4. **Use cloud spot/preemptible instances**

5. **Implement caching**

## Support

For issues:
1. Check logs first
2. Verify environment variables
3. Test RPC connection
4. Check contract deployment
5. Review GitHub issues
6. Contact support

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Base Network Docs](https://docs.base.org/)
- [x402 Protocol](https://x402.org/)

