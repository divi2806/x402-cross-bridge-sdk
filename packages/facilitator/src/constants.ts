// Token address mappings
export const USDC_ADDRESSES: Record<number, string> = {
  84532: '0x036CbD53842c5426634e7929541eC2318f3dCF7e', // Base Sepolia
  8453: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Mainnet
  421614: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Arbitrum Sepolia
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum One
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum Mainnet
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85', // Optimism
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // Polygon
};

// Native token address (0x0 = ETH, MATIC, AVAX, etc.)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export const POLL_INTERVAL = 5000; // 5 seconds
export const MAX_POLL_ATTEMPTS = 720; // 1 hour max (720 * 5s)
