import { useState } from 'react';
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient, useAccount } from 'wagmi';

// Token addresses
const NATIVE_TOKEN = '0x0000000000000000000000000000000000000000';
const USDC_ARBITRUM = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ARBITRUM = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1';

/**
 * Example: Marketplace using x402 cross-chain payments
 * 
 * Supports:
 * - Native ETH/MATIC (customer pays gas, sends tx to Relay)
 * - USDC (gasless via EIP-3009 signature)
 * - WETH/DAI (gasless via ERC-2612 permit)
 */
export default function MarketplaceApp() {
  const { data: walletClient } = useWalletClient();
  const { address, chainId } = useAccount();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedToken, setSelectedToken] = useState<string>(NATIVE_TOKEN);

  // Merchant's API endpoint (protected by x402)
  const PREMIUM_CONTENT_URL = 'http://localhost:3000/premium-data';

  const buyContent = async () => {
    if (!walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const isNative = selectedToken === NATIVE_TOKEN;
      console.log('Buying content with x402 payment...');
      console.log('Your chain:', chainId);
      console.log('Your address:', address);
      console.log('Payment token:', selectedToken);
      console.log('Gasless:', !isNative ? 'Yes (ERC-20 permit)' : 'No (native token)');

      // Create payment client with user's wallet
      const paymentClient = createBrowserPaymentClient(walletClient, {
        preferredChainId: chainId,
        preferredToken: selectedToken,
        preferredNetwork: getNetworkName(chainId || 1),
      });

      // Request protected content
      // The SDK automatically handles x402 flow:
      // 
      // For ERC-20 (USDC, WETH, DAI) - GASLESS:
      // 1. Receives 402 Payment Required
      // 2. Signs EIP-3009 (USDC) or ERC-2612 permit (other tokens)
      // 3. Retries with X-PAYMENT header containing signature
      // 4. Facilitator executes transfer + Relay bridge
      // 5. Merchant receives USDC on Base
      //
      // For Native ETH/MATIC - Customer pays gas:
      // 1. Receives 402 Payment Required
      // 2. Gets Relay quote, sends tx to Relay
      // 3. Relay swaps + bridges to USDC on Base
      // 4. Merchant receives USDC
      const response = await paymentClient.get(PREMIUM_CONTENT_URL);

      setContent(response.data);
      console.log('Content purchased successfully!');
    } catch (err: any) {
      console.error('Purchase failed:', err);
      setError(err.message || 'Failed to purchase content');
    } finally {
      setLoading(false);
    }
  };

  const getTokenOptions = () => {
    if (chainId === 42161) {
      return [
        { value: NATIVE_TOKEN, label: 'ETH (Native)', gasless: false },
        { value: USDC_ARBITRUM, label: 'USDC', gasless: true },
        { value: WETH_ARBITRUM, label: 'WETH', gasless: true },
      ];
    } else if (chainId === 8453) {
      return [
        { value: NATIVE_TOKEN, label: 'ETH (Native)', gasless: false },
        { value: USDC_BASE, label: 'USDC', gasless: true },
      ];
    }
    return [{ value: NATIVE_TOKEN, label: 'Native Token', gasless: false }];
  };

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🛍️ Content Marketplace</h1>
      <p>Buy premium content with crypto from ANY chain! x402-compliant.</p>

      <div style={{ background: '#f5f5f5', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
        <h3>Your Wallet</h3>
        {address ? (
          <>
            <p><strong>Address:</strong> {address}</p>
            <p><strong>Chain:</strong> {getNetworkName(chainId || 1)} ({chainId})</p>
          </>
        ) : (
          <p>⚠️ Please connect your wallet (use wagmi ConnectKit or RainbowKit)</p>
        )}
      </div>

      <div style={{ marginTop: '30px' }}>
        <h3>📦 Premium Content</h3>
        <div style={{ background: '#fff', border: '2px solid #ddd', padding: '20px', borderRadius: '8px' }}>
          <h4>Exclusive Data Access</h4>
          <p>Price: $0.01 USDC (on Base)</p>
          
          <div style={{ marginTop: '15px' }}>
            <label><strong>Pay with:</strong></label>
            <select 
              value={selectedToken} 
              onChange={(e) => setSelectedToken(e.target.value)}
              style={{ marginLeft: '10px', padding: '8px', borderRadius: '4px' }}
            >
              {getTokenOptions().map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} {opt.gasless ? '(Gasless ✨)' : ''}
                </option>
              ))}
            </select>
          </div>

          <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
            {selectedToken === NATIVE_TOKEN 
              ? '💸 Native token: You will sign a transaction (pays gas)'
              : '✨ ERC-20 token: Gasless! Just sign a message, no gas needed'}
          </p>
          
          <button
            onClick={buyContent}
            disabled={!address || loading}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              background: address && !loading ? '#0070f3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: address && !loading ? 'pointer' : 'not-allowed',
              marginTop: '10px',
            }}
          >
            {loading ? 'Processing...' : 'Buy for $0.01'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {content && (
        <div style={{ marginTop: '20px', padding: '20px', background: '#efe', border: '1px solid #cfc', borderRadius: '6px' }}>
          <h3>✅ Purchase Successful!</h3>
          <pre style={{ background: '#fff', padding: '15px', borderRadius: '4px', overflow: 'auto' }}>
            {JSON.stringify(content, null, 2)}
          </pre>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', background: '#f0f7ff', borderRadius: '8px' }}>
        <h4>🔧 How x402 Payment Works</h4>
        
        <div style={{ marginBottom: '15px' }}>
          <strong>For ERC-20 Tokens (USDC, WETH, DAI) - Gasless ✨</strong>
          <ol style={{ lineHeight: '1.6', marginTop: '5px' }}>
            <li>You click "Buy" → SDK requests protected content</li>
            <li>Server returns 402 Payment Required</li>
            <li>SDK prompts you to sign a message (EIP-3009/ERC-2612)</li>
            <li>No gas needed! Just a signature</li>
            <li>Facilitator executes transfer + Relay bridge</li>
            <li>Merchant receives USDC on Base</li>
          </ol>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <strong>For Native Tokens (ETH, MATIC) - Pays Gas</strong>
          <ol style={{ lineHeight: '1.6', marginTop: '5px' }}>
            <li>You click "Buy" → SDK requests protected content</li>
            <li>Server returns 402 Payment Required</li>
            <li>SDK gets Relay quote, prompts transaction</li>
            <li>You approve tx in MetaMask (pays gas)</li>
            <li>Relay swaps + bridges to USDC on Base</li>
            <li>Merchant receives USDC on Base</li>
          </ol>
        </div>

        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          <strong>Merchant Integration:</strong> Just 3 lines of code:
        </p>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
{`app.use('/premium-data', paymentMiddleware({
  payTo: '0xYourAddress',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'http://localhost:3001'
}));`}
        </pre>
      </div>
    </div>
  );
}

function getNetworkName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Ethereum',
    8453: 'Base',
    42161: 'Arbitrum',
    10: 'Optimism',
    137: 'Polygon',
    56: 'BNB Chain',
    43114: 'Avalanche',
  };
  return names[chainId] || `Chain ${chainId}`;
}
