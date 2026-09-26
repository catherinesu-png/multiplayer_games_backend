import { describe, expect, it } from 'vitest';
import type { RuntimeGameRecord } from '@game-platform/contracts';

describe('runtime game data architecture', () => {
  it('represents multiple user-created games as records', () => {
    const records: RuntimeGameRecord[] = [
      { id: 'game-a', slug: 'game-a', creatorUserId: 'user-a', status: 'DRAFT', versionIds: ['version-a'] },
      { id: 'game-b', slug: 'game-b', creatorUserId: 'user-a', status: 'PUBLISHED', versionIds: ['version-b'] },
      { id: 'game-c', slug: 'game-c', creatorUserId: 'user-a', status: 'ARCHIVED', versionIds: ['version-c'] },
      { id: 'game-d', slug: 'game-d', creatorUserId: 'user-b', status: 'PUBLISHED', versionIds: ['version-d'] },
      { id: 'game-e', slug: 'game-e', creatorUserId: 'user-b', status: 'DRAFT', versionIds: ['version-e'] },
    ];

    expect(records).toHaveLength(5);
    expect(new Set(records.map((record) => record.id)).size).toBe(5);
    expect(records.filter((record) => record.creatorUserId === 'user-a')).toHaveLength(3);
    expect(records.filter((record) => record.creatorUserId === 'user-b')).toHaveLength(2);
    expect(records.every((record) => record.versionIds.length > 0)).toBe(true);
  });
});
