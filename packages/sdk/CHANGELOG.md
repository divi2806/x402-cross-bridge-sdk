# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-12-25
### Added
- **x402 Protocol Compliance** - Full compatibility with standard x402 clients
- **Gasless Payments** - EIP-3009 (USDC) and ERC-2612 (other tokens) signature support
- **Native Token Support** - Accept ETH, BNB, MATIC, AVAX via Relay
- **Multi-Chain Support** - Added BNB Chain (56), Avalanche (43114), zkSync (324), Linea (59144)
- **New Payment Client** - `createPaymentClient()` for Node.js with automatic 402 handling
- **Browser Client** - `createBrowserPaymentClient()` for MetaMask/Coinbase Wallet

### Changed
- Rewrote payment flow: customers sign permits instead of sending transactions
- Updated middleware to include EIP-712 domain info in 402 response
- Facilitator now executes token transfers on behalf of customers

### Removed
- Removed dependency on custom settlement contracts (uses existing USDC/Relay contracts)

## [1.0.2] - 2025-12-25
### Changed
- Updated the reference tags and licenses

## [1.0.1] - 2025-12-25
### Changed
- Updated documentation for clarity and accuracy
- Improved explanations and formatting in existing docs

## [1.0.0] - 2025-12-01
### Added
- Initial release
