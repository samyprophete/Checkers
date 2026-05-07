/**
 * fx.js — Procedural Visual Effects Engine
 * Particle systems, idle animations, camera tilt, hover physics,
 * combo tracking, cinematic effects, dynamic lighting.
 */
window.DamesFX = (() => {
    'use strict';

    /* ── Canvas Particle Layer ────────────────────────── */
    let canvas, ctx, particles = [], animFrameId;
    const MAX_PARTICLES = 120;

    function initCanvas() {
        canvas = document.getElementById('fx-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        spawnAmbientParticles(30);
        tickParticles();
    }

    function resizeCanvas() {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    /* ═══════════════════════════════════════════════════
       8. PARTICLE SYSTEMS (dust, sparks, atmosphere)
       ═══════════════════════════════════════════════════ */
    class Particle {
        constructor(x, y, opts = {}) {
            this.x = x; this.y = y;
            this.vx = opts.vx ?? (Math.random() - 0.5) * 0.5;
            this.vy = opts.vy ?? -Math.random() * 0.3 - 0.1;
            this.life = opts.life ?? 200 + Math.random() * 300;
            this.maxLife = this.life;
            this.size = opts.size ?? 1 + Math.random() * 2.5;
            this.color = opts.color ?? `hsla(35, 60%, 70%, `;
            this.type = opts.type ?? 'dust'; // dust | spark | blood | gold
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
            if (this.type === 'dust') {
                this.vx += (Math.random() - 0.5) * 0.02;
                this.vy += (Math.random() - 0.5) * 0.01;
            }
            if (this.type === 'spark') {
                this.vy += 0.02; // gravity
                this.size *= 0.99;
            }
            return this.life > 0;
        }
        draw(ctx) {
            const alpha = Math.min(1, this.life / this.maxLife * 2);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            if (this.type === 'spark') {
                ctx.fillStyle = `hsla(40, 100%, 75%, ${alpha})`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = `rgba(255,180,50,${alpha * 0.5})`;
            } else if (this.type === 'blood') {
                ctx.fillStyle = `rgba(180, 10, 10, ${alpha * 0.8})`;
                ctx.shadowBlur = 0;
            } else if (this.type === 'gold') {
                ctx.fillStyle = `hsla(45, 100%, 60%, ${alpha})`;
                ctx.shadowBlur = 8;
                ctx.shadowColor = `rgba(255,215,0,${alpha * 0.6})`;
            } else {
                ctx.fillStyle = this.color + (alpha * 0.35) + ')';
                ctx.shadowBlur = 0;
            }
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function spawnAmbientParticles(count) {
        for (let i = 0; i < count; i++) {
            particles.push(new Particle(
                Math.random() * (canvas?.width || 1000),
                Math.random() * (canvas?.height || 800),
                { life: 300 + Math.random() * 500, size: 0.5 + Math.random() * 2 }
            ));
        }
    }

    function tickParticles() {
        if (!ctx || !canvas) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        particles = particles.filter(p => p.update());
        particles.forEach(p => p.draw(ctx));

        /* Replenish ambient dust */
        if (particles.length < 15) spawnAmbientParticles(5);

        animFrameId = requestAnimationFrame(tickParticles);
    }

    /** Burst particles at a screen position */
    function burstAt(screenX, screenY, type, count = 12) {
        if (particles.length > MAX_PARTICLES) return;
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) + (Math.random() - 0.5);
            const speed = 1 + Math.random() * 3;
            const opts = {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: type === 'spark' ? 1.5 + Math.random() * 2 : 2 + Math.random() * 4,
                life: 40 + Math.random() * 60,
                type
            };
            particles.push(new Particle(screenX, screenY, opts));
        }
    }

    /** Get screen center of a DOM element */
    function elCenter(el) {
        if (!el) return { x: 0, y: 0 };
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    /* ═══════════════════════════════════════════════════
       2. IDLE ANIMATIONS (board breathing, floating particles)
       ═══════════════════════════════════════════════════ */
    let idleTimer = null, idleActive = false;
    const IDLE_DELAY = 5000; // 5s inactivity

    function resetIdleTimer() {
        clearTimeout(idleTimer);
        if (idleActive) stopIdle();
        idleTimer = setTimeout(startIdle, IDLE_DELAY);
    }

    function startIdle() {
        if (idleActive) return;
        idleActive = true;
        const board = document.getElementById('board-wrapper');
        if (board) {
            gsap.to(board, {
                scale: 1.008, duration: 2.5, ease: 'sine.inOut',
                yoyo: true, repeat: -1,
                overwrite: 'auto'
            });
        }
        /* Floating dust burst */
        if (canvas) {
            spawnAmbientParticles(15);
        }
    }

    function stopIdle() {
        idleActive = false;
        const board = document.getElementById('board-wrapper');
        if (board) {
            gsap.killTweensOf(board, 'scale');
            gsap.to(board, { scale: 1, duration: 0.4, overwrite: 'auto' });
        }
    }

    /* ═══════════════════════════════════════════════════
       3. RANDOM CAMERA TILT PER GAME
       ═══════════════════════════════════════════════════ */
    function randomCameraTilt() {
        const board = document.getElementById('board-wrapper');
        if (!board) return;
        const rx = gsap.utils.random(-4, 4);
        const ry = gsap.utils.random(-3, 3);
        gsap.to(board, {
            rotationX: rx, rotationY: ry,
            duration: 1.5, ease: 'power2.out'
        });
    }

    /* ═══════════════════════════════════════════════════
       4. INTERACTIVE HOVER PHYSICS
       ═══════════════════════════════════════════════════ */
    function initHoverPhysics() {
        const board = document.getElementById('board');
        if (!board) return;
        board.addEventListener('mousemove', e => {
            const piece = e.target.closest('.piece');
            if (!piece || piece._hovered) return;
            piece._hovered = true;
            const rot = gsap.utils.random(-8, 8);
            gsap.to(piece, {
                y: -3, scale: 1.08, rotation: rot,
                boxShadow: '0 8px 16px rgba(0,0,0,.5)',
                duration: 0.25, ease: 'power2.out', overwrite: 'auto'
            });
        });
        board.addEventListener('mouseout', e => {
            const piece = e.target.closest('.piece');
            if (!piece) return;
            piece._hovered = false;
            gsap.to(piece, {
                y: 0, scale: 1, rotation: 0,
                boxShadow: '0 3px 8px rgba(0,0,0,.4)',
                duration: 0.35, ease: 'back.out(1.5)', overwrite: 'auto'
            });
        }, true);
    }

    /* ═══════════════════════════════════════════════════
       5. DYNAMIC GLOW BASED ON ACTIONS
       ═══════════════════════════════════════════════════ */
    function pulseGlow(color = 'rgba(212,160,74,.2)', intensity = 50) {
        const board = document.getElementById('board-wrapper');
        if (!board) return;
        gsap.to(board, {
            boxShadow: `0 8px ${intensity}px ${color}, inset 0 1px 0 rgba(255,255,255,.05)`,
            duration: 0.4, ease: 'power2.out',
            yoyo: true, repeat: 1,
            onComplete() {
                gsap.set(board, {
                    boxShadow: '0 8px 32px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.05)'
                });
            }
        });
    }

    /* ═══════════════════════════════════════════════════
       6. COMBO TRACKING FOR MULTI-CAPTURES
       ═══════════════════════════════════════════════════ */
    let comboCount = 0, comboTimer = null;

    function registerCapture(captureCount) {
        comboCount += captureCount;
        clearTimeout(comboTimer);
        comboTimer = setTimeout(() => { comboCount = 0; }, 3000);

        if (comboCount >= 2) showComboText(comboCount);
        if (comboCount >= 3) {
            pulseGlow('rgba(255,50,50,.3)', 70);
            screenShake(comboCount);
        }
    }

    function showComboText(count) {
        const el = document.getElementById('combo-text');
        if (!el) return;
        el.textContent = count >= 3 ? `💀 ×${count} COMBO!` : `⚡ ×${count}`;
        el.classList.add('active');
        gsap.fromTo(el,
            { scale: 0.5, opacity: 0, y: 10 },
            {
                scale: 1.2, opacity: 1, y: 0, duration: 0.35, ease: 'back.out(2)',
                onComplete() {
                    gsap.to(el, {
                        scale: 1, opacity: 0, y: -20, duration: 0.8, delay: 0.6,
                        onComplete() { el.classList.remove('active'); }
                    });
                }
            }
        );
    }

    function screenShake(intensity = 2) {
        const app = document.getElementById('app');
        if (!app) return;
        const tl = gsap.timeline();
        for (let i = 0; i < 4; i++) {
            const x = gsap.utils.random(-intensity, intensity);
            const y = gsap.utils.random(-intensity, intensity);
            tl.to(app, { x, y, duration: 0.05 });
        }
        tl.to(app, { x: 0, y: 0, duration: 0.1 });
    }

    /* ═══════════════════════════════════════════════════
       7. CINEMATIC SLOW MOTION
       ═══════════════════════════════════════════════════ */
    function slowMotion(duration = 1.5) {
        gsap.globalTimeline.timeScale(0.35);
        const overlay = document.getElementById('bg-overlay');
        if (overlay) {
            gsap.to(overlay, { opacity: 0.7, duration: 0.2 });
        }
        setTimeout(() => {
            gsap.globalTimeline.timeScale(1);
            if (overlay) gsap.to(overlay, { opacity: 1, duration: 0.3 });
        }, duration * 1000);
    }

    /* ═══════════════════════════════════════════════════
       9. ENHANCED AI THINKING ANIMATIONS
       ═══════════════════════════════════════════════════ */
    let scanTween = null;
    function startBoardScan() {
        const cells = document.querySelectorAll('#board .cell.dark');
        if (!cells.length) return;
        scanTween = gsap.to(cells, {
            backgroundColor: 'rgba(124,92,224,.15)',
            stagger: { each: 0.03, repeat: -1, yoyo: true, from: 'random' },
            duration: 0.4, ease: 'sine.inOut'
        });
    }

    function stopBoardScan() {
        if (scanTween) { scanTween.kill(); scanTween = null; }
        gsap.to('#board .cell.dark', {
            backgroundColor: '', duration: 0.3, overwrite: 'auto'
        });
    }

    /* ═══════════════════════════════════════════════════
       10. CINEMATIC STATE TRANSITIONS
       ═══════════════════════════════════════════════════ */
    function transitionWipe(onMid) {
        const wipe = document.getElementById('wipe-overlay');
        if (!wipe) { onMid?.(); return; }
        wipe.style.display = 'block';
        gsap.fromTo(wipe, { x: '-100%' },
            {
                x: '0%', duration: 0.35, ease: 'power3.in',
                onComplete() {
                    onMid?.();
                    gsap.to(wipe, {
                        x: '100%', duration: 0.35, ease: 'power3.out', delay: 0.1,
                        onComplete() { wipe.style.display = 'none'; }
                    });
                }
            }
        );
    }

    /* ═══════════════════════════════════════════════════
       1. RANDOMIZED MICRO-ANIMATION HELPERS
       ═══════════════════════════════════════════════════ */
    function randomArc() {
        return {
            liftScale: 1.2 + Math.random() * 0.2,      // 1.2-1.4
            liftRotation: gsap.utils.random(-6, 6),
            arcEase: ['sine.inOut', 'power2.inOut', 'circ.inOut'][Math.floor(Math.random() * 3)],
            landEase: ['bounce.out', 'back.out(2)', 'elastic.out(1,0.5)'][Math.floor(Math.random() * 3)],
            duration: 0.35 + Math.random() * 0.15
        };
    }

    function randomCapture() {
        return {
            spinAngle: 180 + Math.random() * 360,
            flyDuration: 0.4 + Math.random() * 0.2,
            bloodCount: 8 + Math.floor(Math.random() * 6)
        };
    }

    /* ── Public API ───────────────────────────────────── */
    function init() {
        initCanvas();
        initHoverPhysics();
        resetIdleTimer();
        document.addEventListener('click', resetIdleTimer);
        document.addEventListener('mousemove', resetIdleTimer);
    }

    return {
        init,
        burstAt, elCenter, Particle,
        randomCameraTilt,
        pulseGlow,
        registerCapture, comboCount: () => comboCount,
        slowMotion,
        startBoardScan, stopBoardScan,
        transitionWipe,
        randomArc, randomCapture,
        resetIdleTimer, screenShake,
        particles, canvas
    };
})();
