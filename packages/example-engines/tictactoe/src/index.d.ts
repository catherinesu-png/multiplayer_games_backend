import { GameConfig, GameEngine, GameResult, Transition } from '@game-platform/game-engine';
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
export declare class TicTacToeEngine implements GameEngine<TicTacToeState, TicTacToeAction, TicTacToePlayerView> {
    readonly gameKey = "tic-tac-toe";
    readonly version = 1;
    createInitialState(_config: GameConfig): TicTacToeState;
    validateAction(state: TicTacToeState, action: TicTacToeAction, playerIndex: number): void;
    applyAction(state: TicTacToeState, action: TicTacToeAction, playerIndex: number): Transition<TicTacToeState>;
    getPlayerView(state: TicTacToeState, playerIndex: number): TicTacToePlayerView;
    getPublicView(state: TicTacToeState): TicTacToeState;
    getNextTurn(state: TicTacToeState, previousPlayerIndex: number): number | null;
    getGameResult(state: TicTacToeState): GameResult;
    getBotAction(state: TicTacToeState, _playerIndex: number): TicTacToeAction;
    private getExpectedPlayer;
    private getWinner;
    private isDraw;
}
export declare const ticTacToeEngine: TicTacToeEngine;
