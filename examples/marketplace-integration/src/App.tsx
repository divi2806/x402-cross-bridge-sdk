import { useEffect, useState } from 'react';
import { createBrowserPaymentClient } from '@x402-crosschain/sdk';
import { useWalletClient, useAccount } from 'wagmi';

/**
 * Example: Marketplace using x402 cross-chain payments
 * 
 * This is a complete example showing how a content marketplace
 * would integrate the SDK for seamless cross-chain payments.
 */
export default function MarketplaceApp() {
  const { data: walletClient } = useWalletClient();
  const { address, chainId } = useAccount();
  const [content, setContent] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      console.log('Buying content with cross-chain payment...');
      console.log('Your chain:', chainId);
      console.log('Your address:', address);

      // Create payment client with user's wallet
      const paymentClient = createBrowserPaymentClient(walletClient, {
        preferredChainId: chainId,
        preferredToken: '0x0000000000000000000000000000000000000000', // Native token
        preferredNetwork: getNetworkName(chainId || 1),
      });

      // Request protected content
      // The SDK automatically:
      // 1. Receives 402 Payment Required
      // 2. Gets Relay quote for cross-chain bridge
      // 3. Prompts user to approve transaction in MetaMask
      // 4. Sends payment transaction
      // 5. Retries request with payment proof
      // 6. Returns content
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

  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>🛍️ Content Marketplace</h1>
      <p>Buy premium content with crypto from ANY chain!</p>

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
          <p style={{ fontSize: '14px', color: '#666' }}>
            Pay from any chain! We support Arbitrum, Optimism, Polygon, and more.
            Your payment will be automatically bridged to Base via Relay (2-3 seconds).
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
        <h4>🔧 How This Works</h4>
        <ol style={{ lineHeight: '1.8' }}>
          <li>You click "Buy for $0.01"</li>
          <li>SDK detects you're on a different chain than merchant requires</li>
          <li>SDK gets Relay quote for cross-chain bridge</li>
          <li>Your wallet (MetaMask) prompts you to approve transaction</li>
          <li>Relay bridges your payment to Base (2-3 seconds)</li>
          <li>Merchant receives USDC on Base</li>
          <li>You get the premium content!</li>
        </ol>
        <p style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
          <strong>Integration:</strong> Merchants just need 3 lines of code:
        </p>
        <pre style={{ background: '#fff', padding: '10px', borderRadius: '4px', fontSize: '12px' }}>
{`app.use('/premium-data', paymentMiddleware({
  payTo: '0xYourAddress',
  price: '$0.01',
  network: 'base',
  facilitatorUrl: 'https://facilitator.yourdomain.com'
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
  };
  return names[chainId] || `Chain ${chainId}`;
}

