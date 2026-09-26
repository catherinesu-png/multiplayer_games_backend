export type RuntimeGameStatus = 'draft' | 'published' | 'archived';

export type RuntimeGameReference = {
  gameId: string;
  versionId: string;
  status: RuntimeGameStatus;
};
