export interface FeedEntradaDto {
  id: string;
  market: string;
  selection: string;
  odd: number;
  costInCredits: number;
  status: string;
  publishedAt: Date | null;
  locked: boolean;
  justification: string | null;
}

export interface FeedMatchDto {
  id: string;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  startsAt: Date;
  status: string;
  entradas: FeedEntradaDto[];
}

export interface FeedCategoryDto {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  matches: FeedMatchDto[];
}

export interface FeedResponseDto {
  categories: FeedCategoryDto[];
}
