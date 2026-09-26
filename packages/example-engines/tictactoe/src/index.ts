import {
  GameConfig,
  GameEngine,
  GameEngineError,
  GameResult,
  Transition,
  gameEngineRegistry,
} from '@game-platform/game-engine';

export type TicTacToeCell = 'X' | 'O' | null;

export type TicTacToeState = {
  board: Array<TicTacToeCell>;
};

export type TicTacToeAction = {
  type: 'place';
  cell: number;
};

export type TicTacToePlayerView = {
  board: Array<TicTacToeCell>;
  playerIndex: number;
  symbol: 'X' | 'O';
};

export class TicTacToeEngine implements GameEngine<TicTacToeState, TicTacToeAction, TicTacToePlayerView> {
  readonly gameKey = 'tic-tac-toe';
  readonly version = 1;

  createInitialState(_config: GameConfig): TicTacToeState {
    return { board: Array(9).fill(null) };
  }

  validateAction(state: TicTacToeState, action: TicTacToeAction, playerIndex: number): void {
    if (action.type !== 'place') {
      throw new GameEngineError('Unsupported action type', 'invalid_action');
    }
    if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell > 8) {
      throw new GameEngineError('Move must target a valid board cell', 'invalid_action');
    }
    if (state.board[action.cell] !== null) {
      throw new GameEngineError('Cell is already occupied', 'occupied_cell');
    }
    if (this.getGameResult(state).isOver) {
      throw new GameEngineError('Game is already over', 'game_over');
    }
    const expected = this.getExpectedPlayer(state);
    if (playerIndex !== expected) {
      throw new GameEngineError(`It is player ${expected}'s turn`, 'wrong_turn');
    }
  }

  applyAction(state: TicTacToeState, action: TicTacToeAction, playerIndex: number): Transition<TicTacToeState> {
    this.validateAction(state, action, playerIndex);
    const nextBoard = [...state.board];
    nextBoard[action.cell] = playerIndex === 0 ? 'X' : 'O';
    const winner = this.getWinner(nextBoard);
    const draw = this.isDraw(nextBoard);
    const isGameOver = winner !== null || draw;
    const result: GameResult = {
      winner,
      draw,
      isOver: isGameOver,
      reason: winner !== null ? 'win' : draw ? 'draw' : 'ongoing',
    };

    return {
      state: { board: nextBoard },
      nextPlayerIndex: isGameOver ? null : this.getNextTurn(state, playerIndex),
      winner,
      draw,
      isGameOver,
      result,
    };
  }

  getPlayerView(state: TicTacToeState, playerIndex: number): TicTacToePlayerView {
    return {
      board: state.board,
      playerIndex,
      symbol: playerIndex === 0 ? 'X' : 'O',
    };
  }

  getPublicView(state: TicTacToeState): TicTacToeState {
    return { ...state };
  }

  getNextTurn(state: TicTacToeState, previousPlayerIndex: number): number | null {
    if (this.getGameResult(state).isOver) return null;
    return previousPlayerIndex === 0 ? 1 : 0;
  }

  getGameResult(state: TicTacToeState): GameResult {
    const winner = this.getWinner(state.board);
    if (winner !== null) return { winner, draw: false, isOver: true, reason: 'win' };
    if (this.isDraw(state.board)) return { winner: null, draw: true, isOver: true, reason: 'draw' };
    return { winner: null, draw: false, isOver: false, reason: 'ongoing' };
  }

  getBotAction(state: TicTacToeState, _playerIndex: number): TicTacToeAction {
    const available = state.board
      .map((cell, idx) => (cell === null ? idx : null))
      .filter((value): value is number => value !== null);
    if (available.length === 0) {
      throw new GameEngineError('No legal moves available', 'no_moves');
    }
    return { type: 'place', cell: available[0] };
  }

  private getExpectedPlayer(state: TicTacToeState): number {
    let xCount = 0;
    let oCount = 0;
    for (const cell of state.board) {
      if (cell === 'X') xCount += 1;
      if (cell === 'O') oCount += 1;
    }
    return xCount <= oCount ? 0 : 1;
  }

  private getWinner(board: Array<TicTacToeCell>): number | null {
    const winningLines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
    for (const [a, b, c] of winningLines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] === 'X' ? 0 : 1;
      }
    }
    return null;
  }

  private isDraw(board: Array<TicTacToeCell>): boolean {
    return board.every(Boolean) && this.getWinner(board) === null;
  }
}

export const ticTacToeEngine = new TicTacToeEngine();
gameEngineRegistry.register(ticTacToeEngine);
