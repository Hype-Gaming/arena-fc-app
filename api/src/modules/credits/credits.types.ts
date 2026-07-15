// api/src/modules/credits/credits.types.ts
export type CreditTransactionType = 'purchase' | 'grant' | 'unlock' | 'refund';

export interface ApplyTransactionInput {
  userId: string;
  type: CreditTransactionType;
  amount: number;
  refType?: string | null;
  refId?: string | null;
}
