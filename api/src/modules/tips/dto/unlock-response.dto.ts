export interface UnlockedEntradaDto {
  id: string;
  market: string;
  selection: string;
  odd: number;
  costInCredits: number;
  status: string;
}

export interface UnlockResponseDto {
  alreadyUnlocked: boolean;
  justification: string;
  entrada: UnlockedEntradaDto;
}
