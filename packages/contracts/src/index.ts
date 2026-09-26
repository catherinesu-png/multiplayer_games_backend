export type RuntimeGameStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type RuntimeGameRecord = {
  id: string;
  slug: string;
  creatorUserId: string;
  status: RuntimeGameStatus;
  versionIds: string[];
};
