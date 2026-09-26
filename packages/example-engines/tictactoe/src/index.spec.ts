import { describe, expect, it } from 'vitest';
import { TicTacToeEngine, type TicTacToeState } from './index';

describe('TicTacToeEngine', () => {
  it('marks a winning row', () => {
    const engine = new TicTacToeEngine();
    let state = engine.createInitialState({});

    state = engine.applyAction(state, { type: 'place', cell: 0 }, 0).state;
    state = engine.applyAction(state, { type: 'place', cell: 3 }, 1).state;
    state = engine.applyAction(state, { type: 'place', cell: 1 }, 0).state;
    state = engine.applyAction(state, { type: 'place', cell: 4 }, 1).state;
    const finalState = engine.applyAction(state, { type: 'place', cell: 2 }, 0);

    expect(finalState.state.board).toEqual(['X', 'X', 'X', 'O', 'O', null, null, null, null]);
    expect(finalState.result.isOver).toBe(true);
    expect(finalState.result.winner).toBe(0);
    expect(finalState.nextPlayerIndex).toBeNull();
  });

  it('rejects illegal move on occupied cell', () => {
    const engine = new TicTacToeEngine();
    let state = engine.createInitialState({});
    state = engine.applyAction(state, { type: 'place', cell: 0 }, 0).state;
    expect(() => engine.validateAction(state, { type: 'place', cell: 0 }, 1)).toThrow();
  });

  it('gives a deterministic bot move', () => {
    const engine = new TicTacToeEngine();
    const state: TicTacToeState = {
      board: ['X', null, null, null, 'O', null, null, null, null],
    };
    expect(engine.getBotAction(state, 1)).toEqual({ type: 'place', cell: 1 });
  });
});
