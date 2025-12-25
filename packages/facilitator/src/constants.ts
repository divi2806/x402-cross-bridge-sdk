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

// WETH addresses per chain
export const WETH_ADDRESSES: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  8453: '0x4200000000000000000000000000000000000006',
  42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
  10: '0x4200000000000000000000000000000000000006',
  137: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
};

// Chain IDs
export const CHAIN_IDS: Record<string, number> = {
  'mainnet': 1,
  'base': 8453,
  'base-sepolia': 84532,
  'arbitrum': 42161,
  'optimism': 10,
  'polygon': 137,
  'bsc': 56,
  'avalanche': 43114,
  'zksync': 324,
  'linea': 59144,
};

// Network names
export const NETWORK_NAMES: Record<number, string> = {
  1: 'mainnet',
  8453: 'base',
  84532: 'base-sepolia',
  42161: 'arbitrum',
  10: 'optimism',
  137: 'polygon',
  56: 'bsc',
  43114: 'avalanche',
  324: 'zksync',
  59144: 'linea',
};

// Native token address (0x0 = ETH, MATIC, AVAX, etc.)
export const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export const POLL_INTERVAL = 5000; // 5 seconds
export const MAX_POLL_ATTEMPTS = 720; // 1 hour max (720 * 5s)
