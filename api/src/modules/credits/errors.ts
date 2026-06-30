// api/src/modules/credits/errors.ts
export class InsufficientCreditsError extends Error {
  readonly userId: string;
  readonly currentBalance: number;
  readonly amount: number;

  constructor(userId: string, currentBalance: number, amount: number) {
    super(
      `Insufficient credits for user ${userId}: balance ${currentBalance}, attempted delta ${amount}`,
    );
    this.name = 'InsufficientCreditsError';
    this.userId = userId;
    this.currentBalance = currentBalance;
    this.amount = amount;
    Object.setPrototypeOf(this, InsufficientCreditsError.prototype);
  }
}
