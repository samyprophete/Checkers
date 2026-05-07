const fs = require('fs');
const engineCode = fs.readFileSync('engine.js', 'utf8');
global.window = {};
eval(engineCode);
const E = window.DamesEngine;

let state = E.createInitialState();
// Set up a capture scenario
state.board[5][0] = E.EMPTY;
state.board[5][2] = E.EMPTY;
state.board[4][1] = E.WHITE;
state.board[3][2] = E.BLACK; // Black at 3,2 to be captured
state.board[2][3] = E.EMPTY; // Empty landing at 2,3

const moves = E.getLegalMoves(state);
console.log("Legal moves:", JSON.stringify(moves, null, 2));

if (moves.length > 0) {
    try {
        state = E.applyMove(state, moves[0]);
        console.log("Move applied successfully, board updated");
    } catch (e) {
        console.error("Error applying move:", e);
    }
}
