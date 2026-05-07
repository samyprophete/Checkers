const fs = require('fs');

const Ecode = fs.readFileSync('engine.js', 'utf8');

global.window = {};
eval(Ecode);
const E = window.DamesEngine;

let state = E.createInitialState();
// Clear board
for(let r=0; r<E.SIZE; r++) for(let c=0; c<E.SIZE; c++) state.board[r][c] = E.EMPTY;

// Pawn double jump
state.board[7][0] = E.WHITE;
state.board[6][1] = E.BLACK;
state.board[4][3] = E.BLACK;
state.currentPlayer = E.WHITE;

let moves1 = E.getLegalMoves(state);
console.log("Pawn moves1:", moves1);

function getAllPaths(s, moves) {
    let paths = [];
    for (const m of moves) {
        const nextState = E.applyMove(s, m);
        if (m.isCapture && nextState.mustContinueRafle) {
            const subMoves = E.getLegalMoves(nextState);
            const subPaths = getAllPaths(nextState, subMoves);
            for (const sp of subPaths) {
                paths.push({
                    to: sp.to,
                    pathNodes: [m.to, ...sp.pathNodes],
                    moveSequence: [m, ...sp.moveSequence]
                });
            }
        } else {
            paths.push({
                to: m.to,
                pathNodes: [m.to],
                moveSequence: [m]
            });
        }
    }
    return paths;
}

let paths1 = getAllPaths(state, moves1);
console.log("Pawn double jump paths:", JSON.stringify(paths1, null, 2));


// King test
state.board[7][0] = E.WHITE_KING;
state.board[6][1] = E.EMPTY;
state.board[4][3] = E.EMPTY;

// King simple move
let moves2 = E.getLegalMoves(state);
console.log("King simple moves:", moves2.length);

// King capture
state.board[5][2] = E.BLACK;
state.board[4][3] = E.EMPTY;
state.board[3][4] = E.EMPTY;
let moves3 = E.getLegalMoves(state);
console.log("King capture moves:", JSON.stringify(moves3, null, 2));

let paths3 = getAllPaths(state, moves3);
console.log("King capture paths:", JSON.stringify(paths3, null, 2));

