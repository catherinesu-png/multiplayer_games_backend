export type PlayerToken = 0 | 1;

export type GameConfig = {
  players?: number;
  boardSize?: number;
  [key: string]: unknown;
};

export type Transition<TState> = {
  state: TState;
  nextPlayerIndex: number | null;
  winner: number | null;
  draw: boolean;
  isGameOver: boolean;
  result: GameResult;
};

export type GameResult = {
  winner: number | null;
  draw: boolean;
  isOver: boolean;
  reason?: string;
};

export class GameEngineError extends Error {
  constructor(message: string, public readonly code: string = 'illegal_move') {
    super(message);
    this.name = 'GameEngineError';
  }
}

export interface GameEngine<TState, TAction, TPlayerView> {
  readonly gameKey: string;
  readonly version: number;
  createInitialState(config: GameConfig): TState;
  validateAction(state: TState, action: TAction, playerIndex: number): void;
  applyAction(state: TState, action: TAction, playerIndex: number): Transition<TState>;
  getPlayerView(state: TState, playerIndex: number): TPlayerView;
  getPublicView(state: TState): unknown;
  getNextTurn(state: TState, previousPlayerIndex: number): number | null;
  getGameResult(state: TState): GameResult;
  getBotAction?(state: TState, playerIndex: number): TAction;
}

export class GameEngineRegistry {
  private readonly engines = new Map<string, GameEngine<unknown, unknown, unknown>>();

  register(engine: GameEngine<unknown, unknown, unknown>): void {
    this.engines.set(`${engine.gameKey}:${engine.version}`, engine);
  }

  get(gameKey: string, version: number): GameEngine<unknown, unknown, unknown> | undefined {
    return this.engines.get(`${gameKey}:${version}`);
  }

  has(gameKey: string, version: number): boolean {
    return this.engines.has(`${gameKey}:${version}`);
  }

  getLatest(gameKey: string): GameEngine<unknown, unknown, unknown> | undefined {
    let latest: GameEngine<unknown, unknown, unknown> | undefined;
    for (const [key, engine] of this.engines.entries()) {
      if (key.startsWith(`${gameKey}:`)) {
        if (!latest || engine.version > latest.version) {
          latest = engine;
        }
      }
    }
    return latest;
  }
}

export const gameEngineRegistry = new GameEngineRegistry();
