import { GameEngineRegistry } from '@game-platform/game-engine';
import { ticTacToeEngine } from '@game-platform/example-tictactoe';

export const GAME_ENGINE_REGISTRY = 'GAME_ENGINE_REGISTRY';

export const gameEngineRegistryProvider = {
  provide: GAME_ENGINE_REGISTRY,
  useFactory: () => {
    const registry = new GameEngineRegistry();
    registry.register(ticTacToeEngine);
    return registry;
  },
};
