Integration Guides
Bridging Integration Guide
How to Integrate Bridging using Relay

This guide shows you how to integrate the Relay API for bridging and onboarding.
​
Get a Quote
To bridge assets, you first need to get a quote that provides all necessary information including fees, transaction data, and execution steps. Use the quote endpoint to request bridging information.
​
Basic Quote Request

cURL

JavaScript/Node.js

Python
curl -X POST "https://api.relay.link/quote/v2" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0x03508bb71268bba25ecacc8f620e01866650532c",
    "originChainId": 1,
    "destinationChainId": 8453,
    "originCurrency": "0x0000000000000000000000000000000000000000",
    "destinationCurrency": "0x0000000000000000000000000000000000000000",
    "amount": "100000000000000000",
    "tradeType": "EXACT_INPUT"
  }'
​
Quote Response Structure
The quote response contains all information needed to execute the bridge:
{
  "steps": [
    {
      "id": "deposit",
      "action": "Confirm transaction in your wallet",
      "description": "Deposit funds for executing the bridge",
      "kind": "transaction",
      "requestId": "0x92b99e6e1ee1deeb9531b5ad7f87091b3d71254b3176de9e8b5f6c6d0bd3a331",
      "items": [
        {
          "status": "incomplete",
          "data": {
            "from": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
            "to": "0xf70da97812cb96acdf810712aa562db8dfa3dbef",
            "data": "0x00fad611",
            "value": "100000000000000000",
            "chainId": 1
          },
          "check": {
            "endpoint": "/intents/status?requestId=0x92b99e6e1ee1deeb9531b5ad7f87091b3d71254b3176de9e8b5f6c6d0bd3a331",
            "method": "GET"
          }
        }
      ]
    }
  ],
  "fees": {
    "gas": {
      "amount": "21000000000000000",
      "currency": "eth"
    },
    "relayer": {
      "amount": "5000000000000000",
      "currency": "eth"
    }
  },
  "details": {
    "operation": "bridge",
    "timeEstimate": 30,
    "currencyIn": {
      "currency": {
        "chainId": 1,
        "address": "0x0000000000000000000000000000000000000000",
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18
      },
      "amount": "100000000000000000"
    },
    "currencyOut": {
      "currency": {
        "chainId": 8453,
        "address": "0x0000000000000000000000000000000000000000",
        "symbol": "ETH",
        "name": "Ethereum",
        "decimals": 18
      },
      "amount": "95000000000000000"
    }
  }
}
​
Quote Parameters
Parameter	Type	Required	Description
user	string	Yes	Address that will deposit funds and submit transactions
originChainId	number	Yes	Source chain ID (e.g., 1 for Ethereum)
destinationChainId	number	Yes	Destination chain ID (e.g., 8453 for Base)
originCurrency	string	Yes	Currency contract on source chain (e.g., “0x0000000000000000000000000000000000000000”, “0x833589fcd6edb6e08f4c7c32d4f71b54bda02913”)
destinationCurrency	string	Yes	Currency contract on destination chain
amount	string	Yes	Amount in wei/smallest unit
tradeType	string	Yes	”EXACT_INPUT” or “EXACT_OUTPUT”
recipient	string	No	Recipient address (defaults to user)
slippageTolerance	string	No	Slippage in basis points (e.g., “50” for 0.5%)
useExternalLiquidity	boolean	No	Use canonical+ bridging for more liquidity
referrer	string	No	Identifier that can be used to monitor transactions from a specific source.
refundTo	string	No	Address to send the refund to in the case of failure, if not specified the user address is used
topupGas	boolean	No	If set, the destination fill will include a gas topup to the recipient (only supported for EVM chains if the requested currency is not the gas currency on the destination chain)
topupGasAmount	string	No	The destination gas topup amount in USD decimal format, e.g 100000 = $1. topupGas is required to be enabled. Defaults to 2000000 ($2)
​
Execute the Bridge
After receiving a bridge quote, execute it by processing each step in the response. The execution handles both the origin chain transaction and destination chain fulfillment.

Learn more about step execution using the API here.
​
Monitor Bridge Status
You can check the status of a bridge operation at any time using the /intents/status endpoint:

cURL

JavaScript
curl "https://api.relay.link/intents/status/v3?requestId=0x92b99e6e1ee1deeb9531b5ad7f87091b3d71254b3176de9e8b5f6c6d0bd3a331"
​
Status Values
Status	Description
waiting	Deposit tx for the request is yet to be indexed
pending	Deposit tx was indexed, now the fill is pending
success	Relay completed successfully
failure	Relay failed
refund	Funds were refunded due to failure
​
Advanced Features
​
App Fees
You can include app fees in your bridge requests to monetize your integration:
{
  "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "eth",
  "destinationCurrency": "eth",
  "amount": "100000000000000000",
  "tradeType": "EXACT_INPUT",
  "appFees": [
    {
      "recipient": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
      "fee": "100" // 1% in basis points
    }
  ]
}
​
Custom Slippage
Control slippage tolerance for your bridges:
{
  "user": "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "eth",
  "destinationCurrency": "eth",
  "amount": "100000000000000000",
  "tradeType": "EXACT_INPUT",
  "slippageTolerance": "50" // 0.5% slippage tolerance
}
​
Preflight Checklist
☐ Verify user balance - Ensure the user has sufficient funds for the bridge amount plus fees
☐ Check chain support - Confirm both origin and destination chains are supported
☐ Validate quote - Quotes are revalidated when being filled, keep your quotes as fresh as possible.
☐ Handle errors - Implement proper error handling for API requests and transaction failures
☐ Monitor progress - Use the status endpoints to track bridge completion

Integration Guides
Call Execution Integration Guide
How to execute cross-chain calls using Relay

You can use Relay cross-chain execution to perform any action (tx) on any chain. This works by specifying the transaction data you wish to execute on the destination chain as part of the initial quoting process.
​
Contract Compatibility
Before integrating cross-chain calls, ensure your contract is compatible with Relay. Review our Contract Compatibility overview to make any necessary changes to your smart contracts.
​
Get a Quote
To execute a cross-chain transaction, you need to specify the origin chain for payment, the destination chain where the contract is deployed, and the transaction data to execute. Use the quote endpoint with specific parameters for cross-chain calling.
​
Basic Cross-Chain Call Quote

cURL

JavaScript/Node.js

Python
curl -X POST "https://api.relay.link/quote/v2" \
  -H "Content-Type: application/json" \
  -d '{
    "user": "0x03508bb71268bba25ecacc8f620e01866650532c",
    "originChainId": 1,
    "destinationChainId": 8453,
    "originCurrency": "0x0000000000000000000000000000000000000000",
    "destinationCurrency": "0x0000000000000000000000000000000000000000",
    "amount": "100000000000000000",
    "tradeType": "EXACT_OUTPUT",
    "txs": [
      {
        "to": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
        "value": "100000000000000000",
        "data": "0xd0e30db0"
      }
    ]
  }'
​
Contract Interaction with Web3
When calling smart contracts, you’ll need to encode the function call data. Here’s how to do it with popular libraries:
Important for ERC20 transactions: If your contract call involves spending ERC20 tokens, you must include an approval transaction in your txs array before the actual contract call. See the ERC20 examples below.

JavaScript/ethers.js

JavaScript/viem

Python/web3.py
import { ethers } from "ethers";

// Contract ABI for the function you want to call
const contractABI = [
  "function mint(address to, uint256 amount) external payable",
];

// Create interface to encode function data
const iface = new ethers.Interface(contractABI);
const callData = iface.encodeFunctionData("mint", [
  "0x03508bb71268bba25ecacc8f620e01866650532c", // recipient
  1, // amount to mint
]);

// Use this callData in your quote request
const quoteRequest = {
  user: "0x03508bb71268bba25ecacc8f620e01866650532c",
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: "eth",
  destinationCurrency: "eth",
  amount: "100000000000000000",
  tradeType: "EXACT_OUTPUT",
  txs: [
    {
      to: "0xContractAddress",
      value: "100000000000000000",
      data: callData,
    },
  ],
};
​
ERC20 Contract Calls
Critical: When your contract call involves spending ERC20 tokens, you must include an approval transaction in your txs array. The approval must come before the actual contract call.
​
ERC20 Approval + Contract Call Pattern

JavaScript/ethers.js

JavaScript/viem

Python/web3.py
import { ethers } from "ethers";

// ERC20 ABI for approval
const erc20ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
];

// Contract ABI for the function you want to call
const contractABI = [
  "function purchaseWithUSDC(address to, uint256 usdcAmount) external",
];

// Encode approval transaction
const erc20Interface = new ethers.Interface(erc20ABI);
const approvalData = erc20Interface.encodeFunctionData("approve", [
  "0xContractAddress", // Contract that will spend tokens
  "1000000000", // Amount to approve (1000 USDC with 6 decimals)
]);

// Encode contract call transaction
const contractInterface = new ethers.Interface(contractABI);
const contractCallData = contractInterface.encodeFunctionData(
  "purchaseWithUSDC",
  [
    "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3", // recipient
    "1000000000", // 1000 USDC
  ]
);

const quoteRequest = {
  user: "0x742d35Cc6634C0532925a3b8D9d4DB0a2D7DD5B3",
  originChainId: 1,
  destinationChainId: 8453,
  originCurrency: "usdc",
  destinationCurrency: "usdc",
  amount: "1000000000", // Amount required for call (1000 USDC with 6 decimals)
  tradeType: "EXACT_OUTPUT",
  txs: [
    {
      to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC contract address
      value: "0",
      data: approvalData,
    },
    {
      to: "0xContractAddress",
      value: "0",
      data: contractCallData,
    },
  ],
};
​
Sweeping ERC20 Balance
Relay’s router contract has a useful function that you can call to transfer out full balance of an ERC20 token, even if you don’t know the full balance. There are currently two methods for doing this:
cleanupErc20s
cleanupNative
You can use these by passing in the txs field as follows:
{
  "to": "0xRouterContractAddress",
  "data": "0xEncodedCalldata", // encoded calldata for cleanupErc20s or cleanupNative
  "value": 0
}
​
ERC20 Troubleshooting Guide
Problem: “ERC20: transfer amount exceeds allowance” error Solution: Ensure you include the approval transaction before your contract call
Problem: Transaction reverts with “ERC20: insufficient allowance” Solution: Check that the approval amount is sufficient for your contract call
Problem: Approval transaction succeeds but contract call fails Solution: Verify the contract address in the approval matches the contract you’re calling
​
ERC20 Best Practices
Always approve before spending: Include approval as the first transaction
Use exact amounts: Approve the exact amount your contract will spend
Check token decimals: USDC uses 6 decimals, most others use 18
Verify contract addresses: Use the correct token contract for each chain
Handle allowances: Some tokens require setting allowance to 0 before setting a new amount
​
Quote Parameters for Cross-Chain Calls
Parameter	Type	Required	Description
user	string	Yes	Address that will pay for the transaction
originChainId	number	Yes	Chain ID where payment originates
destinationChainId	number	Yes	Chain ID where contract calls execute
originCurrency	string	Yes	Currency contract on source chain (e.g., “0x0000000000000000000000000000000000000000”, “0x833589fcd6edb6e08f4c7c32d4f71b54bda02913”)
destinationCurrency	string	Yes	Currency contract on destination chain
amount	string	Yes	Total value of all txs combined
tradeType	string	Yes	Must be “EXACT_OUTPUT”
txs	array	Yes	Array of transaction objects
txs[].to	string	Yes	Contract address to call
txs[].value	string	Yes	ETH value to send with call
txs[].data	string	Yes	Encoded function call data
recipient	string	No	Alternative recipient for any surplus
referrer	string	No	Identifier that can be used to monitor transactions from a specific source.
refundTo	string	No	Address to send the refund to in the case of failure, if not specified the user address is used
​
Execute the Call
After receiving a call quote, execute it by processing each step in the response. The execution handles both the origin chain transaction and destination chain fulfillment.

Learn more about step execution using the API here.
​
Monitor Cross-Chain Call Status
Track the progress of your cross-chain call using the status endpoint:

cURL

JavaScript
curl "https://api.relay.link/intents/status/v3?requestId=0x92b99e6e1ee1deeb9531b5ad7f87091b3d71254b3176de9e8b5f6c6d0bd3a331"
​
Status Values
Status	Description
waiting	Deposit tx for the request is yet to be indexed
pending	Deposit tx was indexed, now the fill is pending
success	Relay completed successfully
failure	Relay failed
refund	Funds were refunded due to failure
​
Advanced Features
​
App Fees
You can include app fees in your call requests to monetize your integration:
cURL
curl -X POST "https://api.relay.link/quote/v2" \
  -H "Content-Type: application/json" \
  -d '{
  "user": "0x03508bb71268bba25ecacc8f620e01866650532c",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "0x0000000000000000000000000000000000000000",
  "destinationCurrency": "0x0000000000000000000000000000000000000000",
  "amount": "100000000000000000",
  "tradeType": "EXACT_OUTPUT",
  "txs": [
    {
      "to": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "value": "100000000000000000",
      "data": "0xd0e30db0"
    }
  ],
  "appFees": [
    {
      "recipient": "0x03508bb71268bba25ecacc8f620e01866650532c",
      "fee": "50"
    }
  ]
}'
​
Custom Slippage
Control slippage tolerance for your calls:
cURL
curl -X POST "https://api.relay.link/quote/v2" \
  -H "Content-Type: application/json" \
  -d '{
  "user": "0x03508bb71268bba25ecacc8f620e01866650532c",
  "originChainId": 1,
  "destinationChainId": 8453,
  "originCurrency": "0x0000000000000000000000000000000000000000",
  "destinationCurrency": "0x0000000000000000000000000000000000000000",
  "amount": "100000000000000000",
  "tradeType": "EXACT_OUTPUT",
  "txs": [
    {
      "to": "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
      "value": "100000000000000000",
      "data": "0xd0e30db0"
    }
  ],
  "slippageTolerance": "50"
}'
​
Preflight Checklist
☐ Contract compatibility - Ensure your smart contract follows Relay compatibility guidelines
☐ ERC20 approvals - Include approval transactions before any ERC20 spending calls
☐ Verify transaction data - Confirm amount equals the sum of all txs[].value fields
☐ Check tradeType - Must be set to "EXACT_OUTPUT" for cross-chain calls
☐ Validate call data - Ensure contract function calls are properly encoded
☐ Token addresses - Use correct ERC20 contract addresses for each chain
☐ Test contract calls - Verify contract functions work as expected on destination chain
☐ Balance verification - Confirm user has sufficient funds for amount + fees
☐ Error handling - Implement proper error handling for failed contract executions
☐ Monitor progress - Use status endpoints to track execution progress
☐ Gas estimation - Account for potential gas usage variations in contract calls
​
Common Use Cases
NFT Minting with ETH: Mint NFTs on L2s while paying from L1
// Mint NFT cross-chain with ETH
const mintTx = {
  to: "0xNFTContract",
  value: "50000000000000000", // 0.05 ETH mint price
  data: encodeFunctionData({
    abi: nftABI,
    functionName: "mint",
    args: [userAddress, tokenId],
  }),
};
NFT Minting with ERC20: Mint NFTs using USDC
// Mint NFT cross-chain with USDC (requires approval first)
const usdcAmount = parseUnits("50", 6); // 50 USDC

const txs = [
  {
    to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC contract
    value: "0",
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: ["0xNFTContract", usdcAmount],
    }),
  },
  {
    to: "0xNFTContract",
    value: "0",
    data: encodeFunctionData({
      abi: nftABI,
      functionName: "mintWithUSDC",
      args: [userAddress, tokenId, usdcAmount],
    }),
  },
];
DeFi Operations: Execute swaps, provide liquidity, or claim rewards on other chains
// Provide liquidity cross-chain with ERC20 tokens
const tokenAmount = parseUnits("1000", 18); // 1000 tokens
const usdcAmount = parseUnits("1000", 6); // 1000 USDC

const txs = [
  // Approve token A
  {
    to: "0xTokenAContract",
    value: "0",
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: ["0xDEXContract", tokenAmount],
    }),
  },
  // Approve token B (USDC)
  {
    to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    value: "0",
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: ["0xDEXContract", usdcAmount],
    }),
  },
  // Add liquidity
  {
    to: "0xDEXContract",
    value: "0",
    data: encodeFunctionData({
      abi: dexABI,
      functionName: "addLiquidity",
      args: [
        "0xTokenAContract",
        "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
        tokenAmount,
        usdcAmount,
        (tokenAmount * 95n) / 100n, // 5% slippage
        (usdcAmount * 95n) / 100n, // 5% slippage
        Math.floor(Date.now() / 1000) + 1800, // 30 min deadline
      ],
    }),
  },
];
Gaming: Execute game actions, purchase items, or claim rewards across chains
// Purchase game item with USDC cross-chain
const itemPrice = parseUnits("10", 6); // 10 USDC

const txs = [
  {
    to: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC approval
    value: "0",
    data: encodeFunctionData({
      abi: erc20ABI,
      functionName: "approve",
      args: ["0xGameContract", itemPrice],
    }),
  },
  {
    to: "0xGameContract",
    value: "0",
    data: encodeFunctionData({
      abi: gameABI,
      functionName: "purchaseItemWithUSDC",
      args: [itemId, userAddress, itemPrice],
    }),
  },
];

Transaction Indexing
How to integrate Relay’s transaction indexing APIs

​
Overview
Relay provides two key APIs for transaction indexing:
transactions/single - For indexing same-chain transfers, wraps, and unwraps
transactions/index - For accelerating indexing of transactions with internal deposits
​
API 1: transactions/single
​
When to Use
Use this API for same-chain actions including:
Token transfers
Token wraps (e.g., ETH to WETH)
Token unwraps (e.g., WETH to ETH)
Note: This is not required for same-chain swaps.
​
Purpose
Ensures same-chain actions are properly indexed
Relay’s indexer doesn’t actively monitor same-chain actions by default
Critical for applications supporting same-chain token operations
​
API Reference
Documentation
Implementation Reference
​
Request Example
curl -X POST 'https://api.relay.link/transactions/single' \
  -H 'Content-Type: application/json' \
  -d '{
  "tx": "{\"from\":\"0x03508bB71268BBA25ECaCC8F620e01866650532c\",\"to\":\"0x3c499c542cef5e3811e1192ce70d8cc03d5c3359\",\"data\":\"0xa9059cbb00000000000000000000000036329d1ff4b31ec85280a86e7cf58fca7c005ed000000000000000000000000000000000000000000000000000000000000f4240\",\"value\":\"0\",\"chainId\":137,\"gas\":\"94464\",\"maxFeePerGas\":\"34643644476\",\"maxPriorityFeePerGas\":\"34180692255\",\"txHash\":\"0x935be17e13f1dc4aee15e75cc9c119f2d639e58b061a54246843f2ddf1052f7c\"}",
  "chainId":"137",
  "requestId":"0xcb6bec4106d2bc6f692831e00445f843fa39239ca61bc304486b0c96e1d531a9"
}'
​
API 2: transactions/index
​
When to Use
Use this API for transactions that contain internal deposits that need to be detected through trace analysis. This is particularly important for teams using their own proxy contracts.
​
Purpose
Accelerates the indexing process by triggering indexing before transaction validation completes
Ensures Relay fetches transaction traces to detect internal deposits
Recommended for custom proxy contract implementations
​
API Reference
Documentation
Implementation Reference
​
Request Example
cURL
curl -X POST 'https://api.relay.link/transactions/index' \
  -H 'Content-Type: application/json' \
  -d '{
  "txHash": "0x9f2c5e8b1d4a7f0c3e6b9d2f5a8c1e4b7d0a3f6c9e2b5d8a1f4c7e0b3d6a9f2c",
  "chainId": 8453
}'
​
Integration
Call this API immediately after submitting a transaction, before waiting for confirmation.
​
Decision Matrix
Transaction Type	API Endpoint	Reason
Cross-chain transactions	transactions/index	Accelerates indexing before validation
Proxy contract transactions	transactions/index	Detects internal deposits via trace analysis
Same-chain swaps	transactions/index	Accelerates indexing and detects internal deposits
Same-chain token transfers	transactions/single	Not actively monitored by default indexer
ETH ↔ WETH wraps/unwraps	transactions/single	Same-chain operations need explicit indexing
​
Key Takeaways
transactions/single is essential for same-chain operations that aren’t automatically monitored
transactions/index is for accelerating indexing of transactions with internal deposits
Call these APIs immediately after transaction submission for optimal indexing performance
Choose the appropriate API based on your transaction type using the decision matrix above
For detailed implementation examples, refer to the Relay SDK source code links provided above.
