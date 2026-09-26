"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ticTacToeEngine = exports.TicTacToeEngine = void 0;
const game_engine_1 = require("@game-platform/game-engine");
class TicTacToeEngine {
    gameKey = 'tic-tac-toe';
    version = 1;
    createInitialState(_config) {
        return { board: Array(9).fill(null) };
    }
    validateAction(state, action, playerIndex) {
        if (action.type !== 'place') {
            throw new game_engine_1.GameEngineError('Unsupported action type', 'invalid_action');
        }
        if (!Number.isInteger(action.cell) || action.cell < 0 || action.cell > 8) {
            throw new game_engine_1.GameEngineError('Move must target a valid board cell', 'invalid_action');
        }
        if (state.board[action.cell] !== null) {
            throw new game_engine_1.GameEngineError('Cell is already occupied', 'occupied_cell');
        }
        if (this.getGameResult(state).isOver) {
            throw new game_engine_1.GameEngineError('Game is already over', 'game_over');
        }
        const expected = this.getExpectedPlayer(state);
        if (playerIndex !== expected) {
            throw new game_engine_1.GameEngineError(`It is player ${expected}'s turn`, 'wrong_turn');
        }
    }
    applyAction(state, action, playerIndex) {
        this.validateAction(state, action, playerIndex);
        const nextBoard = [...state.board];
        nextBoard[action.cell] = playerIndex === 0 ? 'X' : 'O';
        const winner = this.getWinner(nextBoard);
        const draw = this.isDraw(nextBoard);
        const isGameOver = winner !== null || draw;
        const result = {
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
    getPlayerView(state, playerIndex) {
        return {
            board: state.board,
            playerIndex,
            symbol: playerIndex === 0 ? 'X' : 'O',
        };
    }
    getPublicView(state) {
        return { ...state };
    }
    getNextTurn(state, previousPlayerIndex) {
        if (this.getGameResult(state).isOver)
            return null;
        return previousPlayerIndex === 0 ? 1 : 0;
    }
    getGameResult(state) {
        const winner = this.getWinner(state.board);
        if (winner !== null)
            return { winner, draw: false, isOver: true, reason: 'win' };
        if (this.isDraw(state.board))
            return { winner: null, draw: true, isOver: true, reason: 'draw' };
        return { winner: null, draw: false, isOver: false, reason: 'ongoing' };
    }
    getBotAction(state, _playerIndex) {
        const available = state.board
            .map((cell, idx) => (cell === null ? idx : null))
            .filter((value) => value !== null);
        if (available.length === 0) {
            throw new game_engine_1.GameEngineError('No legal moves available', 'no_moves');
        }
        return { type: 'place', cell: available[0] };
    }
    getExpectedPlayer(state) {
        let xCount = 0;
        let oCount = 0;
        for (const cell of state.board) {
            if (cell === 'X')
                xCount += 1;
            if (cell === 'O')
                oCount += 1;
        }
        return xCount <= oCount ? 0 : 1;
    }
    getWinner(board) {
        const winningLines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
        for (const [a, b, c] of winningLines) {
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a] === 'X' ? 0 : 1;
            }
        }
        return null;
    }
    isDraw(board) {
        return board.every(Boolean) && this.getWinner(board) === null;
    }
}
exports.TicTacToeEngine = TicTacToeEngine;
exports.ticTacToeEngine = new TicTacToeEngine();
game_engine_1.gameEngineRegistry.register(exports.ticTacToeEngine);
