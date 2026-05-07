window.DamesUI = (() => {
    'use strict';
    const E = window.DamesEngine;
    const AI = window.DamesAI;

    let state, selectedPiece, validPaths = [], difficulty, lastMove, aiThinking;
    let draggables = [];
    let isAnimating = false;
    let gameMode = 'ai';  // 'ai' or 'local'
    const playerColor = E.WHITE, aiColor = E.BLACK;

    const $ = id => document.getElementById(id);
    let boardEl, turnText, whiteCount, blackCount, historyList,
        modalOverlay, startModal, endModal, endTitle, endMsg, thinkingIndicator,
        gameoverContainer, gameoverVideo;

    function isHumanTurn() {
        if (gameMode === 'local') return true;
        return state.currentPlayer === playerColor;
    }

    function init() {
        boardEl = $('board');
        turnText = $('turn-text');
        whiteCount = $('white-count');
        blackCount = $('black-count');
        historyList = $('history-list');
        modalOverlay = $('modal-overlay');
        startModal = $('start-modal');
        endModal = $('end-modal');
        endTitle = $('end-title');
        endMsg = $('end-msg');
        thinkingIndicator = $('ai-thinking');
        gameoverContainer = $('gameover-video-container');
        if(gameoverContainer) gameoverVideo = $('gameover-video');

        const btnEasy = $('btn-easy'); if (btnEasy) btnEasy.onclick = () => startGame('easy', 'ai');
        const btnHard = $('btn-hard'); if (btnHard) btnHard.onclick = () => startGame('hard', 'ai');
        const btnLocal = $('btn-local'); if (btnLocal) btnLocal.onclick = () => startGame('easy', 'local');
        const btnRestart = $('btn-restart'); if (btnRestart) btnRestart.onclick = showStartModal;
        const btnRestart2 = $('btn-restart2'); if (btnRestart2) btnRestart2.onclick = showStartModal;

        showStartModal();
    }

    function showStartModal() {
        if(endModal) endModal.classList.remove('visible');
        if(startModal) startModal.classList.add('visible');
        if(modalOverlay) modalOverlay.classList.add('active');
    }

    function hideModals() {
        if(modalOverlay) modalOverlay.classList.remove('active');
        if(startModal) startModal.classList.remove('visible');
        if(endModal) endModal.classList.remove('visible');
    }

    function showEndModal(winner) {
        const youWin = winner === playerColor;
        if (gameMode === 'local') {
            const isP1 = winner === E.WHITE;
            if(endTitle) endTitle.textContent = isP1 ? '🎉 Joueur 1 gagne !' : '🎉 Joueur 2 gagne !';
            if(endMsg) endMsg.textContent = isP1 ? 'Les Blancs remportent la partie !' : 'Les Noirs remportent la partie !';
        } else {
            if(endTitle) endTitle.textContent = youWin ? '🎉 Victoire !' : '😔 Défaite';
            if(endMsg) endMsg.textContent = youWin
                ? 'Félicitations, tu as gagné la partie !'
                : 'L\'IA a remporté cette manche. Retente ta chance !';
        }
        if(startModal) startModal.classList.remove('visible');
        if(endModal) endModal.classList.add('visible');
        if(modalOverlay) modalOverlay.classList.add('active');
    }

    function startGame(diff, mode) {
        difficulty = diff;
        gameMode = mode || 'ai';
        state = E.createInitialState();
        selectedPiece = null;
        validPaths = [];
        lastMove = null;
        aiThinking = false;
        
        if (thinkingIndicator) thinkingIndicator.classList.remove('active');
        hideModals();
        renderBoard();
        updateStatus();
    }

    // Calcule tous les chemins (sauts multiples) possibles
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

    function renderBoard() {
        if (draggables) draggables.forEach(d => d.kill());
        draggables = [];
        
        boardEl.innerHTML = '';
        const legalMoves = (!state.gameOver && isHumanTurn() && !aiThinking)
            ? E.getLegalMoves(state) : [];
        const playableSet = new Set(legalMoves.map(m => `${m.from[0]},${m.from[1]}`));

        for (let r = 0; r < E.SIZE; r++) {
            for (let c = 0; c < E.SIZE; c++) {
                const cell = document.createElement('div');
                const dark = (r + c) % 2 === 1;
                cell.className = 'cell ' + (dark ? 'dark' : 'light');
                cell.dataset.r = r;
                cell.dataset.c = c;

                if (dark) {
                    const key = `${r},${c}`;
                    if (selectedPiece && r === selectedPiece[0] && c === selectedPiece[1])
                        cell.classList.add('highlight-src');
                    // Surligner tout les noeuds de tous les chemins valides
                    else if (validPaths.some(p => p.pathNodes.some(node => node[0] === r && node[1] === c)))
                        cell.classList.add('highlight-dest');
                    
                    if (lastMove && ((r === lastMove.from[0] && c === lastMove.from[1]) || (r === lastMove.to[0] && c === lastMove.to[1])))
                        cell.classList.add('highlight-last');
                    
                    if (playableSet.has(key))
                        cell.classList.add('highlight-playable');
                }

                const val = state.board[r][c];
                const isCaptured = state.capturedSoFar && state.capturedSoFar.some(cap => cap[0] === r && cap[1] === c);

                if (val !== E.EMPTY && !isCaptured) {
                    const p = document.createElement('div');
                    p.className = 'piece';
                    p.classList.add(E.isPlayerPiece(val, E.WHITE) ? 'white' : 'black');
                    if (E.isKing(val)) p.classList.add('king');
                    cell.appendChild(p);
                }

                if (dark) cell.addEventListener('click', () => handleClick(r, c));
                boardEl.appendChild(cell);
            }
        }

        // --- GSAP DRAGGABLE ---
        if (!state.gameOver && isHumanTurn() && !aiThinking && !isAnimating && typeof Draggable !== 'undefined') {
            const playerClass = state.currentPlayer === E.WHITE ? '.piece.white' : '.piece.black';
            const draggableSelector = state.mustContinueRafle 
                ? `.cell[data-r="${state.mustContinueRafle[0]}"][data-c="${state.mustContinueRafle[1]}"] ${playerClass}`
                : playerClass;

            draggables = Draggable.create(draggableSelector, {
                type: 'x,y',
                zIndexBoost: false,
                onDragStart: function() {
                    if (!isHumanTurn()) return;
                    
                    this.target.style.zIndex = 1000;
                    const cell = this.target.parentElement;
                    const r = parseInt(cell.dataset.r);
                    const c = parseInt(cell.dataset.c);
                    
                    if (!state.mustContinueRafle) {
                         if (selectedPiece && (selectedPiece[0] !== r || selectedPiece[1] !== c)) {
                             document.querySelectorAll('.highlight-src, .highlight-dest').forEach(el => {
                                 el.classList.remove('highlight-src', 'highlight-dest');
                             });
                         }
                         
                         const allLegal = E.getLegalMoves(state);
                         const moves = allLegal.filter(m => m.from[0] === r && m.from[1] === c);
            
                         if (moves.length) {
                             selectedPiece = [r, c];
                             validPaths = getAllPaths(state, moves);
                             
                             cell.classList.add('highlight-src');
                             validPaths.forEach(p => {
                                 p.pathNodes.forEach(node => {
                                     const destCell = getCell(node[0], node[1]);
                                     if(destCell) destCell.classList.add('highlight-dest');
                                 });
                             });
                         } else {
                             selectedPiece = null;
                             validPaths = [];
                         }
                    }
                },
                onDragEnd: function() {
                    this.target.style.zIndex = '';
                    if (!isHumanTurn()) return;

                    let droppedOnValidDest = false;
                    
                    const destCells = document.querySelectorAll('.highlight-dest');
                    for (const dest of Array.from(destCells)) {
                        if (this.hitTest(dest, '20%')) {
                            const dr = parseInt(dest.dataset.r);
                            const dc = parseInt(dest.dataset.c);
                            
                            droppedOnValidDest = true;
                            // Il faut absolument reset GSAP x,y à 0 avant handleClick
                            // pour que l'animation "gsap.to" dans animateMove parte bien du point de départ
                            // de la case actuelle avant que le DOM ne soit reconstruit physiquement.
                            gsap.set(this.target, {x: 0, y: 0});
                            
                            handleClick(dr, dc);
                            break;
                        }
                    }

                    if (!droppedOnValidDest) {
                        gsap.to(this.target, {x: 0, y: 0, duration: 0.3, onComplete: () => {
                            if (!state.mustContinueRafle) {
                                selectedPiece = null;
                                validPaths = [];
                                renderBoard();
                            }
                        }});
                    }
                }
            });
        }
    }

    function handleClick(r, c) {
        if (state.gameOver || !isHumanTurn() || aiThinking || isAnimating) return;

        // Si l'utilisateur clique sur une destination d'un chemin valide
        let targetSequence = null;
        for (const p of validPaths) {
            const nodeIdx = p.pathNodes.findIndex(node => node[0] === r && node[1] === c);
            if (nodeIdx !== -1) {
                targetSequence = p.moveSequence.slice(0, nodeIdx + 1);
                break;
            }
        }

        if (targetSequence) {
            executeSequence(targetSequence);
            return;
        }

        // Sinon, sélection d'une nouvelle pièce
        if (!state.mustContinueRafle && E.isPlayerPiece(state.board[r][c], state.currentPlayer)) {
            const allLegal = E.getLegalMoves(state);
            const moves = allLegal.filter(m => m.from[0] === r && m.from[1] === c);

            if (moves.length) {
                selectedPiece = [r, c];
                validPaths = getAllPaths(state, moves);
            } else {
                selectedPiece = null;
                validPaths = [];
            }
            renderBoard();
        } else if (!state.mustContinueRafle) {
            selectedPiece = null;
            validPaths = [];
            renderBoard();
        }
    }

    function animateMove(move) {
        return new Promise(resolve => {
            const fromCell = getCell(move.from[0], move.from[1]);
            const piece = fromCell ? fromCell.querySelector('.piece') : null;
            if (!piece) { resolve(); return; }

            const targetCell = getCell(move.to[0], move.to[1]);
            if (!targetCell) { resolve(); return; }

            const startFr = fromCell.getBoundingClientRect();
            const targetFr = targetCell.getBoundingClientRect();
            
            const stepX = targetFr.left - startFr.left;
            const stepY = targetFr.top - startFr.top;

            // Simple linear GSAP animation
            gsap.to(piece, {
                x: stepX, y: stepY,
                duration: 0.3, 
                ease: 'power1.inOut',
                onComplete: resolve
            });
        });
    }

    function animateCaptures(captures) {
        return new Promise(resolve => {
            if (!captures || !captures.length) { resolve(); return; }
            
            const promises = captures.map(([r, c]) => {
                return new Promise(res => {
                    const cell = getCell(r, c);
                    const piece = cell ? cell.querySelector('.piece') : null;
                    if (!piece) { res(); return; }
                    
                    // Simple fade out
                    gsap.to(piece, {
                        scale: 0, opacity: 0,
                        duration: 0.2,
                        onComplete: res
                    });
                });
            });
            Promise.all(promises).then(resolve);
        });
    }

    async function executeSequence(seq) {
        isAnimating = true;
        
        for (let i = 0; i < seq.length; i++) {
            const move = seq[i];
            
            await animateMove(move);
            if (move.isCapture && move.captures.length) {
                await animateCaptures(move.captures);
            }

            state = E.applyMove(state, move);
            lastMove = move;
            
            // Re-render board quickly between jumps
            renderBoard();
        }

        if (state.mustContinueRafle) {
            // L'utilisateur s'est arrêté en milieu de rafle (clic sur un noeud intermédiaire)
            selectedPiece = state.mustContinueRafle;
            const moves = E.getLegalMoves(state);
            validPaths = getAllPaths(state, moves);
        } else {
            selectedPiece = null;
            validPaths = [];
        }

        updateStatus();

        if (state.gameOver) { 
            setTimeout(() => handleGameOver(state.winner), 500); 
            isAnimating = false;
            return; 
        }

        // IA joue seulement si la rafle n'est pas en cours
        if (!state.mustContinueRafle && gameMode === 'ai' && state.currentPlayer === aiColor) {
            aiThinking = true;
            if (turnText) turnText.classList.add('thinking');
            if (thinkingIndicator) thinkingIndicator.classList.add('active');
            await delay(400);
            await doAIMove();
        } else {
            isAnimating = false;
        }
    }

    async function doAIMove() {
        isAnimating = true;
        try {
            let move = AI.getAIMove(state, difficulty);
            
            while (move) {
                renderBoard(); // Update highlights for AI piece
                await delay(200);
                
                await animateMove(move);
                if (move.isCapture && move.captures.length) {
                    await animateCaptures(move.captures);
                }

                state = E.applyMove(state, move);
                lastMove = move;
                updateStatus();

                if (state.gameOver) { 
                    setTimeout(() => handleGameOver(state.winner), 500); 
                    break;
                }

                // Si l'IA doit continuer une rafle
                if (state.mustContinueRafle) {
                    move = AI.getAIMove(state, difficulty);
                } else {
                    break; // Fin du tour de l'IA
                }
            }
        } catch (err) {
            console.error('doAIMove error:', err);
        } finally {
            turnText.classList.remove('thinking');
            if (thinkingIndicator) thinkingIndicator.classList.remove('active');
            aiThinking = false;
            isAnimating = false;
            renderBoard();
        }
    }

    function updateStatus() {
        whiteCount.textContent = state.whiteCount;
        blackCount.textContent = state.blackCount;

        const isWhite = state.currentPlayer === E.WHITE;
        if (gameMode === 'local') {
            turnText.textContent = isWhite ? '⬤ Joueur 1 (Blanc)' : '⬤ Joueur 2 (Noir)';
            turnText.className = isWhite ? 'white-turn' : 'black-turn';
        } else {
            turnText.textContent = isWhite ? '⬤ Ton tour' : '⬤ IA réfléchit…';
            turnText.className = isWhite ? 'white-turn' : 'black-turn';
            if (!isWhite) turnText.classList.add('thinking');
        }

        historyList.innerHTML = '';
        state.moveHistory.forEach((m, i) => {
            const s = document.createElement('span');
            s.textContent = `${i + 1}. ${m}`;
            historyList.appendChild(s);
        });
        historyList.scrollLeft = historyList.scrollWidth;
    }

    function handleGameOver(winner) {
        if (gameoverContainer) {
            gameoverContainer.classList.add('active');
            gameoverVideo.currentTime = 0;
            const playPromise = gameoverVideo.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => showEndModal(winner));
            }
            
            const onVideoEnd = () => {
                gameoverVideo.removeEventListener('ended', onVideoEnd);
                gameoverContainer.classList.remove('active');
                showEndModal(winner);
            };
            gameoverVideo.addEventListener('ended', onVideoEnd);
            
            setTimeout(() => {
                if (gameoverContainer.classList.contains('active')) {
                    gameoverVideo.pause();
                    onVideoEnd();
                }
            }, 6000);
        } else {
            showEndModal(winner);
        }
    }

    function getCell(r, c) { return boardEl.children[r * E.SIZE + c] || null; }
    function delay(ms) { return new Promise(res => setTimeout(res, ms)); }

    document.addEventListener('DOMContentLoaded', init);
    return { init };
})();
