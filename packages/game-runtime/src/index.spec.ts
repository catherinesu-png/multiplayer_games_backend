import { ticTacToeEngine } from '@game-platform/example-tictactoe';
import { gameEngineRegistry } from '@game-platform/game-engine';
import { beforeAll, describe, expect, it } from 'vitest';
import { GameRuntime, GameRuntimeError, type RuntimeGameVersion } from './index';

const publishedTicTacToeVersion: RuntimeGameVersion = {
  id: 'version-1',
  gameId: 'game-1',
  status: 'PUBLISHED',
  engineKey: 'tic-tac-toe',
  engineVersion: 1,
  manifest: {
    gameKey: 'tic-tac-toe',
    engine: { key: 'tic-tac-toe', version: 1 },
  },
};

describe('GameRuntime', () => {
  beforeAll(() => {
    gameEngineRegistry.register(ticTacToeEngine);
  });

  it('resolves a published persisted version and executes it generically', () => {
    const runtime = new GameRuntime();
    const engine = runtime.resolve(publishedTicTacToeVersion);
    const initialState = runtime.createInitialState(publishedTicTacToeVersion);

    expect(engine.gameKey).toBe('tic-tac-toe');
    expect(initialState).toEqual({ board: Array(9).fill(null) });

    runtime.validateAction(publishedTicTacToeVersion, initialState, { type: 'place', cell: 0 }, 0);
    const transition = runtime.applyAction(
      publishedTicTacToeVersion,
      initialState,
      { type: 'place', cell: 0 },
      0,
    );

    expect(transition.state).toEqual({ board: ['X', null, null, null, null, null, null, null, null] });
    expect(transition.nextPlayerIndex).toBe(1);
    expect(runtime.getGameResult(publishedTicTacToeVersion, transition.state)).toEqual({
      winner: null,
      draw: false,
      isOver: false,
      reason: 'ongoing',
    });
  });

  it('rejects non-published versions and missing engine registrations', () => {
    const runtime = new GameRuntime();
    expect(() => runtime.resolve({ ...publishedTicTacToeVersion, status: 'DRAFT' })).toThrowError(
      new GameRuntimeError('Game version version-1 is not published', 'version_not_published'),
    );
    expect(() => runtime.resolve({ ...publishedTicTacToeVersion, engineKey: 'unknown-game' })).toThrowError(
      new GameRuntimeError('No engine registered for unknown-game:1', 'engine_not_found'),
    );
  });
});
