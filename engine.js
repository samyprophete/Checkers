/**
 * engine.js — Dames (Checkers) Game Engine (Simplified)
 * Simple logic: diagonal forward moves, simple jumps, multi-jumps (rafles).
 */
window.DamesEngine = (() => {
    'use strict';

    const EMPTY = 0, BLACK = 1, WHITE = 2, BLACK_KING = 3, WHITE_KING = 4;
    const SIZE = 8;

    const inBounds = (r, c) => r >= 0 && r < SIZE && c >= 0 && c < SIZE;
    const isPlayerPiece = (cell, p) => p === WHITE ? (cell === WHITE || cell === WHITE_KING) : (cell === BLACK || cell === BLACK_KING);
    const isOpponentPiece = (cell, p) => p === WHITE ? (cell === BLACK || cell === BLACK_KING) : (cell === WHITE || cell === WHITE_KING);
    const isKing = c => c === BLACK_KING || c === WHITE_KING;
    const fwdDirs = p => p === BLACK ? [[1, -1], [1, 1]] : [[-1, -1], [-1, 1]];
    const allDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const promoRow = p => p === WHITE ? 0 : SIZE - 1;
    const kingOf = p => p === WHITE ? WHITE_KING : BLACK_KING;
    const cloneBoard = b => b.map(r => [...r]);

    function createInitialState() {
        const board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));
        for (let r = 0; r < 3; r++)
            for (let c = 0; c < SIZE; c++)
                if ((r + c) % 2 === 1) board[r][c] = BLACK;
        for (let r = 5; r < SIZE; r++)
            for (let c = 0; c < SIZE; c++)
                if ((r + c) % 2 === 1) board[r][c] = WHITE;
                
        return {
            board, currentPlayer: WHITE,
            blackCount: 12, whiteCount: 12,
            gameOver: false, winner: null,
            moveHistory: []
        };
    }

    // Récupérer les coups légaux pour un joueur
    function getLegalMoves(state) {
        const { board, currentPlayer: p } = state;
        let captures = [];
        let simples = [];

        // Si on est au milieu d'une rafle, on ne peut bouger que la pièce en cours
        const piecesToGenerate = state.mustContinueRafle 
            ? [{r: state.mustContinueRafle[0], c: state.mustContinueRafle[1]}] 
            : [];

        if (piecesToGenerate.length === 0) {
            for (let r = 0; r < SIZE; r++) {
                for (let c = 0; c < SIZE; c++) {
                    if (isPlayerPiece(board[r][c], p)) piecesToGenerate.push({r, c});
                }
            }
        }

        for (const {r, c} of piecesToGenerate) {
            const isK = isKing(board[r][c]);
            const singleDirs = fwdDirs(p);
            
            if (isK) {
                // --- Dames (Flying Kings) ---
                
                // Simples
                if (!state.mustContinueRafle) {
                    for (const [dr, dc] of allDirs) {
                        let step = 1;
                        while(true) {
                            const tr = r + dr * step, tc = c + dc * step;
                            if (!inBounds(tr, tc) || board[tr][tc] !== EMPTY) break;
                            simples.push({ from: [r, c], to: [tr, tc], captures: [], isCapture: false });
                            step++;
                        }
                    }
                }

                // Captures
                for (const [dr, dc] of allDirs) {
                    let step = 1;
                    let foundOpponent = null;
                    while(true) {
                        const tr = r + dr * step, tc = c + dc * step;
                        if (!inBounds(tr, tc)) break;
                        
                        const cell = board[tr][tc];

                        if (cell !== EMPTY) {
                            if (foundOpponent) {
                                // On a déjà trouvé un pion adverse, et on tombe sur une autre pièce -> stop
                                break;
                            } else {
                                if (isOpponentPiece(cell, p)) {
                                    // Vérifier si cette pièce n'a pas déjà été capturée dans la séquence (les pièces restent sur le plateau pendant la rafle)
                                    if (state.capturedSoFar && state.capturedSoFar.some(cap => cap[0] === tr && cap[1] === tc)) {
                                        break; // On ne peut pas sauter deux fois la même pièce
                                    }
                                    foundOpponent = [tr, tc];
                                } else {
                                    // C'est notre propre pièce -> stop
                                    break; 
                                }
                            }
                        } else if (foundOpponent) {
                            // Case vide après un pion adverse -> C'est une case d'atterrissage valide
                            captures.push({ from: [r, c], to: [tr, tc], captures: [foundOpponent], isCapture: true });
                        }
                        step++;
                    }
                }

            } else {
                // --- Pions normaux ---
                
                // Jumps (Captures)
                for (const [dr, dc] of allDirs) { // Les pions peuvent prendre en arrière
                    const mr = r + dr, mc = c + dc;
                    const tr = r + 2 * dr, tc = c + 2 * dc;
                    
                    if (inBounds(tr, tc) && isOpponentPiece(board[mr][mc], p) && board[tr][tc] === EMPTY) {
                        if(state.capturedSoFar && state.capturedSoFar.some(cap => cap[0] === mr && cap[1] === mc)) {
                          continue;
                        }
                        captures.push({ from: [r, c], to: [tr, tc], captures: [[mr, mc]], isCapture: true });
                    }
                }
                
                // Simples
                if (!state.mustContinueRafle) {
                    for (const [dr, dc] of singleDirs) {
                        const tr = r + dr, tc = c + dc;
                        if (inBounds(tr, tc) && board[tr][tc] === EMPTY) {
                            simples.push({ from: [r, c], to: [tr, tc], captures: [], isCapture: false });
                        }
                    }
                }
            }
        }

        // Simplification extrême : la prise est obligatoire (si possible, on doit prendre)
        return captures.length > 0 ? captures : simples;
    }

    function applyMove(state, move) {
        const nb = cloneBoard(state.board);
        let piece = nb[move.from[0]][move.from[1]];
        nb[move.from[0]][move.from[1]] = EMPTY;

        // Promotion immédiate (règle russe/brésilienne) : on devient dame dès qu'on touche la dernière rangée, 
        // et on peut continuer la rafle en tant que dame immédiatement.
        if (!isKing(piece) && move.to[0] === promoRow(state.currentPlayer)) {
            piece = kingOf(state.currentPlayer);
        }
        nb[move.to[0]][move.to[1]] = piece;

        let curCapturedSoFar = state.capturedSoFar ? [...state.capturedSoFar] : [];

        // Ajouter les captures à la liste de cette séquence (rafle)
        if (move.isCapture) {
            for(const [cr, cc] of move.captures) {
                curCapturedSoFar.push([cr, cc]);
            }
        }

        let partial = false;
        
        // Gérer les rafles (peut-on encore capturer depuis move.to ?)
        if (move.isCapture) {
            // Créer un state temporaire pour tester les mouvements suivants possibles
            const tempState = {
                board: nb,
                currentPlayer: state.currentPlayer,
                mustContinueRafle: move.to,
                capturedSoFar: curCapturedSoFar
            };
            const nextMoves = getLegalMoves(tempState);
            // Si le résultat est une liste de captures, la rafle DOIT continuer
            if (nextMoves.length > 0 && nextMoves[0].isCapture) {
                partial = true;
            }
        }

        // Retirer les pièces SEULEMENT si la rafle est terminée
        if (!partial && move.isCapture) {
            for(const [cr, cc] of curCapturedSoFar) {
                nb[cr][cc] = EMPTY;
            }
            curCapturedSoFar = [];
        }

        // Compter les pièces restantes (il faut faire attention aux pièces encore prises mais non retirées,
        // mais c'est seulement pour la fin de la rafle que winner est déterminé précisément)
        let bc = 0, wc = 0;
        for (let r = 0; r < SIZE; r++) for (let c2 = 0; c2 < SIZE; c2++) {
            const v = nb[r][c2];
            if (v === BLACK || v === BLACK_KING) bc++;
            if (v === WHITE || v === WHITE_KING) wc++;
        }

        // Si des pièces n'ont pas encore été retirées, on ajuste les compteurs temporairement pour détecter la victoire
        if (partial && curCapturedSoFar.length > 0) {
            for(const [cr, cc] of curCapturedSoFar) {
                const v = state.board[cr][cc]; // L'original
                if (v === BLACK || v === BLACK_KING) bc--;
                if (v === WHITE || v === WHITE_KING) wc--;
            }
        }

        const nextState = {
            board: nb, 
            currentPlayer: partial ? state.currentPlayer : (state.currentPlayer === WHITE ? BLACK : WHITE),
            mustContinueRafle: partial ? move.to : null,
            capturedSoFar: partial ? curCapturedSoFar : null,
            blackCount: bc, whiteCount: wc,
            gameOver: false, winner: null,
            moveHistory: state.moveHistory
        };

        if (bc <= 0) { nextState.gameOver = true; nextState.winner = WHITE; }
        else if (wc <= 0) { nextState.gameOver = true; nextState.winner = BLACK; }
        else if (!partial && getLegalMoves(nextState).length === 0) {
             nextState.gameOver = true; nextState.winner = state.currentPlayer; 
        }

        return nextState;
    }

    return {
        EMPTY, BLACK, WHITE, BLACK_KING, WHITE_KING, SIZE,
        createInitialState, getLegalMoves, applyMove, cloneBoard,
        isPlayerPiece, isOpponentPiece, isKing, kingOf
    };
})();
