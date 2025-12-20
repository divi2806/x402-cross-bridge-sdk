import { ethers } from 'ethers';

/**
 * Relay API Service
 * Uses Relay's instant bridging (2-3 second settlement) via liquidity pools
 */

const RELAY_API_BASE_URL = 'https://api.relay.link';

interface RelayQuoteRequest {
  user: string;
  originChainId: number;
  destinationChainId: number;
  originCurrency: string;
  destinationCurrency: string;
  amount: string;
  tradeType: 'EXACT_INPUT' | 'EXACT_OUTPUT';
  recipient?: string;
  slippageTolerance?: string;
}

interface RelayQuoteResponse {
  steps: Array<{
    id: string;
    action: string;
    description: string;
    kind: string;
    requestId: string;
    items: Array<{
      status: string;
      data: {
        from: string;
        to: string;
        data: string;
        value: string;
        chainId: number;
      };
      check: {
        endpoint: string;
        method: string;
      };
    }>;
  }>;
  fees: {
    gas: {
      amount: string;
      currency: string;
    };
    relayer: {
      amount: string;
      currency: string;
    };
  };
  details: {
    operation: string;
    timeEstimate: number;
    currencyIn: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
    };
    currencyOut: {
      currency: {
        chainId: number;
        address: string;
        symbol: string;
        name: string;
        decimals: number;
      };
      amount: string;
    };
  };
}

interface RelayStatusResponse {
  status: 'waiting' | 'pending' | 'success' | 'failure' | 'refund';
  inTxHash?: string;
  outTxHash?: string;
  refundTxHash?: string;
}

export type SwapStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export class RelayService {
  /**
   * Get a quote for cross-chain swap using Relay's reverse quote
   * 
   * @param fromChainId - Source chain ID (e.g., 42161 for Arbitrum)
   * @param fromToken - Source token address (0x0000... for native)
   * @param toChainId - Destination chain ID (e.g., 8453 for Base)
   * @param toToken - Destination token address
   * @param amount - Destination amount needed (in smallest unit)
   * @param userAddress - User's wallet address
   * @returns Quote with transaction data and route info
   */
  async getQuote(
    fromChainId: number,
    fromToken: string,
    toChainId: number,
    toToken: string,
    amount: string,
    userAddress: string
  ): Promise<{
    quoteId: string;
    txData: { to: string; data: string; value: string; chainId: number };
    expectedOutput: string;
    requestId: string;
  }> {
    try {
      console.log('[Relay] Fetching quote...');
      console.log(`  From: Chain ${fromChainId}, Token ${fromToken}`);
      console.log(`  To: Chain ${toChainId}, Token ${toToken}`);
      console.log(`  Destination amount needed: ${amount} (in smallest unit)`);
      console.log(`  User: ${userAddress}`);
      console.log(`  ✅ Using Relay instant bridging (2-3 second settlement)`);

      // Build Relay quote request (EXACT_OUTPUT = reverse quote)
      const quoteRequest: RelayQuoteRequest = {
        user: userAddress,
        originChainId: fromChainId,
        destinationChainId: toChainId,
        originCurrency: fromToken.toLowerCase(),
        destinationCurrency: toToken.toLowerCase(),
        amount: amount, // Requesting specific destination amount
        tradeType: 'EXACT_OUTPUT',
        recipient: userAddress,
        slippageTolerance: '50', // 0.5% slippage in basis points
      };

      console.log('[Relay] Quote request:', JSON.stringify(quoteRequest, null, 2));

      const response = await fetch(`${RELAY_API_BASE_URL}/quote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quoteRequest),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Relay API error: ${response.status} - ${errorText}`);
      }

      const quote = await response.json() as RelayQuoteResponse;

      console.log('[Relay] Quote response:', JSON.stringify(quote, null, 2));

      if (!quote.steps || quote.steps.length === 0) {
        throw new Error('No steps found in Relay quote');
      }

      const firstStep = quote.steps[0];
      if (!firstStep.items || firstStep.items.length === 0) {
        throw new Error('No items found in first step');
      }

      const firstItem = firstStep.items[0];
      const txData = firstItem.data;

      if (!txData || !txData.to || !txData.data) {
        throw new Error('Invalid transaction data in Relay quote');
      }

      console.log('[Relay] Quote received successfully');
      console.log(`  Request ID: ${firstStep.requestId}`);
      console.log(`  Expected output: ${quote.details.currencyOut.amount} ${quote.details.currencyOut.currency.symbol}`);
      console.log(`  Time estimate: ${quote.details.timeEstimate}s`);
      console.log(`  Operation: ${quote.details.operation}`);

      const txDataResponse = {
        to: txData.to,
        data: txData.data,
        value: txData.value || '0x0',
        chainId: fromChainId,
      };

      console.log('[Relay] Transaction prepared:', {
        to: txDataResponse.to,
        value: txDataResponse.value,
        dataLength: txDataResponse.data.length,
        hasData: txDataResponse.data !== '0x',
      });

      return {
        quoteId: firstStep.requestId, // Use Relay's requestId
        txData: txDataResponse,
        expectedOutput: quote.details.currencyOut.amount,
        requestId: firstStep.requestId,
      };
    } catch (error: any) {
      console.error('[Relay] Quote failed:', error);
      throw new Error(`Failed to get Relay quote: ${error.message || error}`);
    }
  }

  /**
   * Get the status of a cross-chain swap/bridge
   * 
   * @param requestId - Relay request ID from quote
   * @param txHash - Transaction hash (optional, for logging)
   * @returns Status: PENDING, COMPLETED, or FAILED
   */
  async getSwapStatus(requestId: string, txHash?: string): Promise<SwapStatus> {
    try {
      console.log(`[Relay] Checking swap status...`);
      console.log(`  Request ID: ${requestId}`);
      if (txHash) {
        console.log(`  Tx Hash: ${txHash}`);
      }

      const response = await fetch(
        `${RELAY_API_BASE_URL}/intents/status/v3?requestId=${requestId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Relay] Status check failed: ${response.status} - ${errorText}`);
        return 'PENDING'; // Assume pending on error
      }

      const statusResponse = await response.json() as RelayStatusResponse;

      console.log('[Relay] Status response:', statusResponse);

      // Map Relay status to our status
      switch (statusResponse.status) {
        case 'success':
          console.log(`[Relay]  Swap COMPLETED`);
          if (statusResponse.outTxHash) {
            console.log(`  Destination tx: ${statusResponse.outTxHash}`);
          }
          return 'COMPLETED';

        case 'failure':
        case 'refund':
          console.log(`[Relay]  Swap FAILED (status: ${statusResponse.status})`);
          return 'FAILED';

        case 'waiting':
        case 'pending':
        default:
          console.log(`[Relay]  Swap still pending (status: ${statusResponse.status})`);
          return 'PENDING';
      }
    } catch (error: any) {
      console.error('[Relay] Status check error:', error);
      return 'PENDING'; // Assume pending on error to avoid false negatives
    }
  }
}

