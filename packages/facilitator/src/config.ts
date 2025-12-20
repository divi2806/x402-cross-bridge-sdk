import dotenv from 'dotenv';

dotenv.config();

export const config = {
  baseRpcUrl: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
  paymentSettlementAddress: process.env.PAYMENT_SETTLEMENT_ADDRESS || '',
  settlerPrivateKey: process.env.SETTLER_PRIVATE_KEY || '',
  port: parseInt(process.env.PORT || '3001', 10),
  pollInterval: parseInt(process.env.POLL_INTERVAL || '5000', 10), // 5 seconds
};

// Validate required config
if (!config.paymentSettlementAddress) {
  throw new Error('PAYMENT_SETTLEMENT_ADDRESS is required');
}

if (!config.settlerPrivateKey) {
  throw new Error('SETTLER_PRIVATE_KEY is required');
}

