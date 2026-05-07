const fs = require('fs');
const Ecode = fs.readFileSync('engine.js', 'utf8');
global.window = {};
eval(Ecode);
const E = window.DamesEngine;

let state = E.createInitialState();
for(let r=0; r<E.SIZE; r++) for(let c=0; c<E.SIZE; c++) state.board[r][c] = E.EMPTY;

state.currentPlayer = E.WHITE;
state.board[7][0] = E.WHITE_KING;
state.board[5][2] = E.BLACK;
state.board[3][4] = E.BLACK;

let moves = E.getLegalMoves(state);

function getAllPaths(s, currentMoves) {
    let paths = [];
    for (const m of currentMoves) {
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

let paths = getAllPaths(state, moves);

fs.writeFileSync('test_out2.json', JSON.stringify({
    kingDoubleJumpPaths: paths
}, null, 2));
