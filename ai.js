/**
 * ai.js — Dames AI Engine (Simplified)
 * Just a basic random move picker to avoid freezing the browser.
 */
window.DamesAI = (() => {
    'use strict';
    const E = window.DamesEngine;

    /** Pick a random legal move */
    function getAIMove(state) {
        const moves = E.getLegalMoves(state);
        if (!moves || !moves.length) return null;
        
        // Randomly pick one legal move
        const randomIndex = Math.floor(Math.random() * moves.length);
        return moves[randomIndex];
    }

    return { getAIMove };
})();
