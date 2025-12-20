import { ethers } from 'ethers';

const PAYMENT_SETTLEMENT_ABI = [
  'function registerRequirement(bytes32 paymentId, address token, uint256 minAmount, address payee) external',
  'function settle(bytes32 paymentId, address payer, uint256 amount, address token) external',
  'function settled(bytes32 paymentId) external view returns (bool)',
  'function requirements(bytes32) external view returns (address token, uint256 minAmount, address payee)',
  'function isSettled(bytes32) external view returns (bool)',
];

export interface SettlementConfig {
  baseRpcUrl: string;
  paymentSettlementAddress: string;
  settlerPrivateKey: string;
}

export class SettlementService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private contract: ethers.Contract;

  constructor(config: SettlementConfig) {
    this.provider = new ethers.JsonRpcProvider(config.baseRpcUrl);
    this.wallet = new ethers.Wallet(config.settlerPrivateKey, this.provider);
    this.contract = new ethers.Contract(
      config.paymentSettlementAddress,
      PAYMENT_SETTLEMENT_ABI,
      this.wallet
    );
  }

  /**
   * Register a payment requirement on-chain
   */
  async registerRequirement(
    paymentId: string,
    token: string,
    amount: string,
    payee: string
  ): Promise<void> {
    try {
      console.log(`[Settlement] Registering requirement for ${paymentId}`);
      
      const tx = await this.contract.registerRequirement(
        paymentId,
        token,
        amount,
        payee
      );
      
      await tx.wait();
      console.log(`[Settlement] Registered: ${tx.hash}`);
    } catch (error) {
      console.error('[Settlement] Registration failed:', error);
      throw error;
    }
  }

  /**
   * Mark a payment as settled on-chain
   */
  async settlePayment(
    paymentId: string,
    payer: string,
    amount: string,
    token: string
  ): Promise<void> {
    try {
      console.log(`[Settlement] Settling payment ${paymentId}`);
      
      const tx = await this.contract.settle(
        paymentId,
        payer,
        amount,
        token
      );
      
      await tx.wait();
      console.log(`[Settlement] Settled: ${tx.hash}`);
    } catch (error) {
      console.error('[Settlement] Settlement failed:', error);
      throw error;
    }
  }

  /**
   * Check if a payment is settled
   */
  async isSettled(paymentId: string): Promise<boolean> {
    try {
      return await this.contract.settled(paymentId);
    } catch (error) {
      console.error('[Settlement] Check failed:', error);
      return false;
    }
  }
}

