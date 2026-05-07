const fs = require('fs');

const Ecode = fs.readFileSync('engine.js', 'utf8');
const uicode = fs.readFileSync('ui.js', 'utf8');

global.window = {};
global.document = {
    addEventListener: () => {},
    getElementById: (id) => ({
        classList: { add: ()=>{}, remove: ()=>{} },
        querySelectorAll: () => [],
        appendChild: () => {},
        children: Array(64).fill({ getBoundingClientRect: () => ({left:0, top:0}), querySelector: () => ({ getBoundingClientRect: () => ({left:0,top:0}) }) })
    })
};
global.gsap = {
    from: () => {},
    to: () => ({ kill: ()=>{} }),
    fromTo: () => {},
    killTweensOf: () => {},
    set: () => {},
    timeline: ({onComplete}) => {
        return {
            to: function() { return this; },
            play: () => { if(onComplete) onComplete(); }
           // wait, gsap timelines execute instantly if we mock them incorrectly.
           // Let's just mock it so it calls onComplete immediately.
        }
    }
};
global.gsap.timeline = function(opts) {
    if (opts && opts.onComplete) setTimeout(opts.onComplete, 10);
    return {
        to: function() { return this; },
        play: function() { return this; }
    }
}
global.alert = console.log;

eval(Ecode);
const E = window.DamesEngine;
global.window.DamesEngine = E;

// We just want to see if animateMove or target logic throws.
let state = E.createInitialState();
state.board[5][0] = E.EMPTY;
state.board[5][2] = E.EMPTY;
state.board[4][1] = E.WHITE;
state.board[3][2] = E.BLACK; // Black at 3,2 to be captured
state.board[2][3] = E.EMPTY;

const allLegal = E.getLegalMoves(state);
const validMoves = allLegal.filter(m => m.from[0] === 4 && m.from[1] === 1);

console.log("Valid moves:", validMoves);

const target = validMoves.find(m =>
    (m.to[0] === 2 && m.to[1] === 3) ||
    (m.path && m.path.slice(1).some(step => step[0] === 2 && step[1] === 3))
);

console.log("Target found:", target);
