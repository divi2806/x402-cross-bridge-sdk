# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2025-12-25
### Added
- **x402 Protocol Compliance** - `/verify` and `/settle` endpoints now x402-compliant
- **Signature Verification** - EIP-3009 (USDC) and ERC-2612 (other tokens) signature verification
- **Any Token Support** - Accept any ERC-20 token with permit support
- **Native Token Support** - Accept ETH, BNB, MATIC, AVAX (customer sends tx to Relay)
- **Multi-Chain Support** - Added BNB Chain (56), Avalanche (43114), zkSync (324), Linea (59144)
- **Swap + Bridge** - Facilitator uses Relay to swap any token → USDC and bridge to Base

### Changed
- Rewrote `/verify` endpoint to verify EIP-712 signatures
- Rewrote `/settle` endpoint to execute permits and handle Relay bridging
- Facilitator now pays gas for ERC-20 settlements (gasless for customers)

### Removed
- Removed dependency on custom settlement contracts
- Removed `/quote-route` endpoint (replaced with x402 flow)

## [1.0.1] - 2025-12-25
### Changed
- Updated documentation for clarity and accuracy
- Improved explanations and formatting in existing docs

## [1.0.0] - 2025-12-01
### Added
- Initial release
