import {
  GameConfig,
  GameEngine,
  GameEngineError,
  GameEngineRegistry,
  GameResult,
  Transition,
  gameEngineRegistry,
} from '@game-platform/game-engine';
export type RuntimeGameStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type RuntimeGameReference = {
  gameId: string;
  versionId: string;
  status: RuntimeGameStatus;
};

export type RuntimeGameVersion = {
  id: string;
  gameId: string;
  status: RuntimeGameStatus;
  engineKey: string;
  engineVersion: number;
  manifest: unknown;
};

export class GameRuntimeError extends Error {
  constructor(message: string, public readonly code: 'version_not_published' | 'engine_not_found') {
    super(message);
    this.name = 'GameRuntimeError';
  }
}

export class GameRuntime {
  constructor(private readonly registry: GameEngineRegistry = gameEngineRegistry) {}

  resolve(version: RuntimeGameVersion): GameEngine<unknown, unknown, unknown> {
    if (version.status !== 'PUBLISHED') {
      throw new GameRuntimeError(`Game version ${version.id} is not published`, 'version_not_published');
    }

    const engine = this.registry.get(version.engineKey, version.engineVersion);
    if (!engine) {
      throw new GameRuntimeError(
        `No engine registered for ${version.engineKey}:${version.engineVersion}`,
        'engine_not_found',
      );
    }
    return engine;
  }

  createInitialState(version: RuntimeGameVersion, config: GameConfig = {}): unknown {
    return this.resolve(version).createInitialState(config);
  }

  validateAction(version: RuntimeGameVersion, state: unknown, action: unknown, playerIndex: number): void {
    this.resolve(version).validateAction(state, action, playerIndex);
  }

  applyAction(version: RuntimeGameVersion, state: unknown, action: unknown, playerIndex: number): Transition<unknown> {
    return this.resolve(version).applyAction(state, action, playerIndex);
  }

  getGameResult(version: RuntimeGameVersion, state: unknown): GameResult {
    return this.resolve(version).getGameResult(state);
  }

  getPlayerView(version: RuntimeGameVersion, state: unknown, playerIndex: number): unknown {
    return this.resolve(version).getPlayerView(state, playerIndex);
  }

  getPublicView(version: RuntimeGameVersion, state: unknown): unknown {
    return this.resolve(version).getPublicView(state);
  }
}

export { GameEngineError };
