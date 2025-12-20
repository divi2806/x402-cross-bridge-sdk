# Payment Settlement Contract

Smart contract deployed on Base that tracks cross-chain payment settlements.

## Deployment

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Set environment variables
export SETTLER_PRIVATE_KEY= your-wallet-private-key
export BASE_RPC_URL=RPC_OF_YOUR_CHOICE

# Deploy to Base Sepolia
forge script script/Deploy.s.sol:DeployScript --rpc-url base-sepolia --broadcast --verify

# Deploy to Base Mainnet
forge script script/Deploy.s.sol:DeployScript --rpc-url base --broadcast --verify
```

## Contract Address

After deployment, update the address in:
- `packages/facilitator/.env` - `PAYMENT_SETTLEMENT_ADDRESS`
- `packages/sdk/src/constants.ts`

