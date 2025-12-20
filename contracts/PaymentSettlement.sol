// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title PaymentSettlement
 * @notice Records settlement of cross-chain x402 payments on Base
 * @dev Used by the facilitator to mark payments as settled after cross-chain swaps complete
 */
contract PaymentSettlement {
    /// @notice Requirement details for a payment
    struct Requirement {
        address token;      // Token that must be received
        uint256 minAmount;  // Minimum amount required
        address payee;      // Recipient of the payment
    }

    /// @notice Address authorized to register requirements and settle payments
    address public settler;

    /// @notice Mapping of paymentId to payment requirements
    mapping(bytes32 => Requirement) public requirements;

    /// @notice Mapping of paymentId to settlement status
    mapping(bytes32 => bool) public isSettled;

    /// @notice Emitted when a new payment requirement is registered
    event RequirementRegistered(
        bytes32 indexed paymentId,
        address indexed token,
        uint256 minAmount,
        address indexed payee
    );

    /// @notice Emitted when a payment is settled
    event PaymentSettled(
        bytes32 indexed paymentId,
        address indexed payer,
        uint256 amount,
        address indexed token
    );

    /// @notice Thrown when caller is not the settler
    error OnlySettler();

    /// @notice Thrown when payment is already settled
    error AlreadySettled();

    /// @notice Thrown when token doesn't match requirement
    error TokenMismatch();

    /// @notice Thrown when amount is below minimum
    error InsufficientAmount();

    modifier onlySettler() {
        if (msg.sender != settler) revert OnlySettler();
        _;
    }

    constructor(address _settler) {
        settler = _settler;
    }

    /**
     * @notice Register a payment requirement
     * @param paymentId Unique identifier for the payment
     * @param token Token address expected
     * @param minAmount Minimum amount required
     * @param payee Address to receive payment
     */
    function registerRequirement(
        bytes32 paymentId,
        address token,
        uint256 minAmount,
        address payee
    ) external onlySettler {
        requirements[paymentId] = Requirement({
            token: token,
            minAmount: minAmount,
            payee: payee
        });

        emit RequirementRegistered(paymentId, token, minAmount, payee);
    }

    /**
     * @notice Settle a payment
     * @param paymentId Unique identifier for the payment
     * @param payer Address that paid
     * @param amount Amount that was paid
     * @param token Token that was paid
     */
    function settle(
        bytes32 paymentId,
        address payer,
        uint256 amount,
        address token
    ) external onlySettler {
        if (isSettled[paymentId]) revert AlreadySettled();

        Requirement memory req = requirements[paymentId];
        if (token != req.token) revert TokenMismatch();
        if (amount < req.minAmount) revert InsufficientAmount();

        isSettled[paymentId] = true;

        emit PaymentSettled(paymentId, payer, amount, token);
    }

    /**
     * @notice Check if a payment is settled
     * @param paymentId Payment identifier
     * @return True if settled, false otherwise
     */
    function settled(bytes32 paymentId) external view returns (bool) {
        return isSettled[paymentId];
    }
}

