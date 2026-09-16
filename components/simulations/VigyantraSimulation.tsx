'use client';

/* ============================================================================
   VIGYANTRA — HERO SIMULATION
   ----------------------------------------------------------------------------
   A canvas-driven "signal network" behind the VIGYANTRA wordmark, built to sit
   inside the scroll-scrubbed video hero. It is interactive under touch and
   mouse (a unified pointer field that particles react to), it cycles through
   event call-outs pulled from the actual event roster, and the wordmark stays
   locked in its "highlighted" state for as long as `progress` (the scrub
   position, 0 → 1) is still running — the instant the scrub completes, the
   glyphs play a single shatter/reform beat and settle into a quiet, dimmed
   footer state so the next section can take over.

   Drop-in compatible: same export, same props, same outer wrapper classes.
============================================================================ */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

/* ============================================================================
   1. TYPES
============================================================================ */

interface VigyantraSimulationProps {
  progress: number;
  isLoaded: boolean;
}

interface EventQuote {
  text: string;
  label: string;
  code: string;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseSize: number;
  baseAlpha: number;
  phase: number;
  pull: number;
  variant: 'gold' | 'bright';
}

interface DataGlyph {
  x: number;
  y: number;
  speed: number;
  char: string;
  alpha: number;
  size: number;
  flipAt: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface OrbitRing {
  radius: number;
  speed: number;
  width: number;
  dash: number[];
  offset: number;
  direction: 1 | -1;
}

interface PointerState {
  x: number;
  y: number;
  active: boolean;
  strength: number;
  downX: number;
  downY: number;
  downAt: number;
}

/* ============================================================================
   2. CONSTANTS
============================================================================ */

const GOLD = '212, 175, 122';
const GOLD_BRIGHT = '235, 208, 163';
const PAPER = '245, 243, 238';
const VOID = '4, 4, 6';

const WORDMARK = 'Vigyantra';

const SCRUB_COMPLETE_THRESHOLD = 0.98;

/** One call-out per live event, plus the opening brand line. */
const QUOTES: EventQuote[] = [
  { text: 'INNOVATE. CREATE. INSPIRE.', label: "VIGYANTRA '24", code: '0x001' },
  { text: 'TRAIN YOUR NEURAL NETWORKS', label: 'AI PROMPT BATTLE', code: '0x0A1' },
  { text: 'PASS THE BATON, NOT THE BUG', label: 'CODE RELAY', code: '0x0B2' },
  { text: 'EVERY SYSTEM HAS A SEAM', label: 'HACK & HUNT', code: '0x0C3' },
  { text: 'IDEAS, COMPILED TO INSTALL', label: 'APPFORGE', code: '0x0D4' },
  { text: 'SECURE THE MAINFRAME', label: 'ZEROCRYPT CTF', code: '0x0E5' },
  { text: 'FROM SPARK TO PROTOTYPE', label: 'INNOVATION MARATHON', code: '0x0F6' },
  { text: 'BUILDING SUSTAINABLE TECH', label: 'GREEN TECH CHALLENGE', code: '0x107' },
  { text: 'ENGINEERING THE FUTURE', label: 'ROBOINNOVATE', code: '0x118' },
];

const HEX_GLYPHS = '01ABCDEF#/*';

const QUOTE_INTERVAL_MS = 4200;
const MANUAL_QUOTE_LOCK_MS = 6000;
const GLITCH_INTERVAL_MIN = 4600;
const GLITCH_INTERVAL_MAX = 8200;
const GLITCH_DURATION_MS = 220;

const DESKTOP_CONFIG = {
  nodeCount: 58,
  dataGlyphCount: 18,
  linkDistance: 96,
  pointerRadius: 130,
};

const MOBILE_CONFIG = {
  nodeCount: 34,
  dataGlyphCount: 10,
  linkDistance: 72,
  pointerRadius: 100,
};

/* ============================================================================
   3. PURE HELPERS
   (No Math.random / Date.now at render time — anything that reaches the
   server-rendered markup has to be deterministic across JS engines.)
============================================================================ */

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Pure integer scramble — safe to use while building SSR-visible markup. */
function letterOffset(index: number): { dx: number; dy: number; dr: number } {
  const dx = (((index * 53 + 11) % 17) - 8) * 2.2;
  const dy = (((index * 29 + 7) % 13) - 6) * 2.6;
  const dr = (((index * 71 + 3) % 11) - 5) * 3.4;
  return { dx, dy, dr };
}

/** Runtime-only randomness (canvas particles never touch the SSR markup). */
const rand = (min: number, max: number): number => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

/* ============================================================================
   4. SMALL PRESENTATIONAL PIECES
============================================================================ */

function HudCorner({
  position,
  children,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br';
  children: React.ReactNode;
}) {
  const isTop = position === 'tl' || position === 'tr';
  const isLeft = position === 'tl' || position === 'bl';

  const bracketStyle: React.CSSProperties = {
    position: 'absolute',
    width: 16,
    height: 16,
    borderColor: `rgba(${GOLD}, 0.45)`,
    ...(isTop ? { top: 0, borderTop: '1px solid' } : { bottom: 0, borderBottom: '1px solid' }),
    ...(isLeft ? { left: 0, borderLeft: '1px solid' } : { right: 0, borderRight: '1px solid' }),
  };

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        ...(isTop ? { top: 12 } : { bottom: 28 }),
        ...(isLeft ? { left: 12 } : { right: 12 }),
      }}
    >
      <div style={bracketStyle} />
      <div
        className="font-mono text-[8px] tracking-[0.2em] whitespace-nowrap"
        style={{
          color: `rgba(${GOLD}, 0.5)`,
          margin: isTop ? '6px 0 0 0' : '0 0 6px 0',
          textAlign: isLeft ? 'left' : 'right',
          padding: isLeft ? '0 0 0 6px' : '0 6px 0 0',
        }}
      >
        {children}
      </div>
    </div>
  );
}

function GlyphLetter({
  char,
  index,
  isLoaded,
  isShattering,
}: {
  char: string;
  index: number;
  isLoaded: boolean;
  isShattering: boolean;
}) {
  const { dx, dy, dr } = letterOffset(index);
  const isSpace = char === ' ';

  return (
    <motion.span
      className="inline-block"
      style={
        {
          '--dx': `${dx}px`,
          '--dy': `${dy}px`,
          '--dr': `${dr}deg`,
        } as React.CSSProperties
      }
      data-shatter={isShattering ? 'on' : 'off'}
      initial={{ opacity: 0, y: 18, filter: 'blur(6px)' }}
      animate={
        isLoaded
          ? { opacity: 1, y: 0, filter: 'blur(0px)' }
          : { opacity: 0, y: 18, filter: 'blur(6px)' }
      }
      transition={{
        duration: 0.6,
        delay: 0.15 + index * 0.045,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {isSpace ? '\u00A0' : char}
    </motion.span>
  );
}

/* ============================================================================
   5. MAIN COMPONENT
============================================================================ */

export default function VigyantraSimulation({ progress, isLoaded }: VigyantraSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useReducedMotion();

  const [quoteIndex, setQuoteIndex] = useState(0);
  const [glitchActive, setGlitchActive] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [isShattering, setIsShattering] = useState(false);

  const wasHighlightedRef = useRef(true);
  const pauseAutoUntilRef = useRef(0);

  const isHighlighted = progress < SCRUB_COMPLETE_THRESHOLD;
  const scrubPercent = Math.round(clamp(progress, 0, 1) * 100);

  /* --------------------------------------------------------------------
     5.1 Dynamic quote cycling — automatic, but a tap can jump it forward
         and briefly takes the wheel from the timer.
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!isLoaded) return undefined;
    const interval = setInterval(() => {
      if (Date.now() < pauseAutoUntilRef.current) return;
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, QUOTE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLoaded]);

  const advanceQuoteManually = useCallback(() => {
    pauseAutoUntilRef.current = Date.now() + MANUAL_QUOTE_LOCK_MS;
    setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
  }, []);

  /* --------------------------------------------------------------------
     5.2 Periodic glitch flicker on the wordmark — small, rare, deliberate.
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (!isLoaded || prefersReducedMotion) return undefined;
    let timeoutId: ReturnType<typeof setTimeout>;

    const schedule = () => {
      const delay = rand(GLITCH_INTERVAL_MIN, GLITCH_INTERVAL_MAX);
      timeoutId = setTimeout(() => {
        setGlitchActive(true);
        setTimeout(() => setGlitchActive(false), GLITCH_DURATION_MS);
        schedule();
      }, delay);
    };

    schedule();
    return () => clearTimeout(timeoutId);
  }, [isLoaded, prefersReducedMotion]);

  /* --------------------------------------------------------------------
     5.3 Fire the shatter/reform beat exactly once, right as the scrub
         animation finishes (isHighlighted flips true -> false).
  -------------------------------------------------------------------- */
  useEffect(() => {
    if (wasHighlightedRef.current && !isHighlighted) {
      setIsShattering(true);
      const timeout = setTimeout(() => setIsShattering(false), 780);
      return () => clearTimeout(timeout);
    }
    wasHighlightedRef.current = isHighlighted;
    return undefined;
  }, [isHighlighted]);

  /* --------------------------------------------------------------------
     5.4 Pointer-reactive 3D tilt on the wordmark. Written directly to the
         DOM (no React state) so it stays smooth under touch drag.
  -------------------------------------------------------------------- */
  const handleNameTilt = useCallback(
    (clientX: number, clientY: number) => {
      if (prefersReducedMotion) return;
      const el = nameRef.current;
      const container = containerRef.current;
      if (!el || !container) return;
      const rect = container.getBoundingClientRect();
      const fx = clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const fy = clamp(((clientY - rect.top) / rect.height) * 2 - 1, -1, 1);
      const rotateY = fx * 7;
      const rotateX = fy * -7;
      el.style.transform = `perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    },
    [prefersReducedMotion],
  );

  const resetNameTilt = useCallback(() => {
    const el = nameRef.current;
    if (!el) return;
    el.style.transform = 'perspective(700px) rotateX(0deg) rotateY(0deg)';
  }, []);

  /* --------------------------------------------------------------------
     5.5 The particle / signal field. All state here lives in refs so the
         60fps loop never triggers a React re-render.
  -------------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let time = 0;

    const pointer: PointerState = {
      x: -9999,
      y: -9999,
      active: false,
      strength: 0,
      downX: 0,
      downY: 0,
      downAt: 0,
    };

    let nodes: NetworkNode[] = [];
    let glyphs: DataGlyph[] = [];
    let ripples: Ripple[] = [];
    let rings: OrbitRing[] = [];
    let config = DESKTOP_CONFIG;

    const buildScene = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      width = parent.clientWidth;
      height = parent.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      config = width < 640 ? MOBILE_CONFIG : DESKTOP_CONFIG;

      nodes = Array.from({ length: config.nodeCount }, () => ({
        x: rand(0, width),
        y: rand(0, height),
        vx: rand(-0.28, 0.28),
        vy: rand(-0.28, 0.28),
        baseSize: rand(1, 2.4),
        size: 0,
        baseAlpha: rand(0.15, 0.6),
        phase: rand(0, Math.PI * 2),
        pull: 0,
        variant: Math.random() < 0.14 ? 'bright' : 'gold',
      }));
      nodes.forEach((n) => {
        n.size = n.baseSize;
      });

      glyphs = Array.from({ length: config.dataGlyphCount }, () => ({
        x: rand(0, width),
        y: rand(-height, 0),
        speed: rand(0.25, 0.7),
        char: pick(HEX_GLYPHS.split('')),
        alpha: rand(0.08, 0.22),
        size: rand(9, 12),
        flipAt: rand(2000, 6000),
      }));

      rings = [
        { radius: Math.min(width, height) * 0.16, speed: 0.4, width: 1, dash: [4, 14, 22, 9], offset: 0, direction: 1 },
        { radius: Math.min(width, height) * 0.24, speed: 0.25, width: 1, dash: [2, 10], offset: 0, direction: -1 },
        { radius: Math.min(width, height) * 0.32, speed: 0.15, width: 1, dash: [8, 6, 2, 6], offset: 0, direction: 1 },
      ];

      ripples = [];
    };

    buildScene();

    const handleResize = () => buildScene();
    window.addEventListener('resize', handleResize);

    /* ---- drawing sub-routines ---- */

    const drawVignette = () => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.75;
      const gradient = ctx.createRadialGradient(cx, cy, radius * 0.35, cx, cy, radius);
      gradient.addColorStop(0, `rgba(${VOID}, 0)`);
      gradient.addColorStop(1, `rgba(${VOID}, 0.55)`);
      ctx.save();
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    };

    const drawGrid = () => {
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      ctx.strokeStyle = `rgba(${GOLD}, 0.045)`;
      ctx.lineWidth = 1;
      const spacing = 46;
      for (let x = cx % spacing; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = cy % spacing; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawRadarSweep = () => {
      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.max(width, height) * 0.55;
      const sweepSpeed = prefersReducedMotion ? 0.15 : lerp(0.35, 0.9, clamp(progress, 0, 1));
      const angle = time * sweepSpeed;

      const gradient = ctx.createConicGradient
        ? ctx.createConicGradient(angle, cx, cy)
        : null;

      ctx.save();
      if (gradient) {
        gradient.addColorStop(0, `rgba(${GOLD}, 0.14)`);
        gradient.addColorStop(0.06, `rgba(${GOLD}, 0.0)`);
        gradient.addColorStop(1, `rgba(${GOLD}, 0.0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawOrbitRings = () => {
      const cx = width / 2;
      const cy = height / 2;
      ctx.save();
      rings.forEach((ring) => {
        ring.offset -= ring.speed * ring.direction * (prefersReducedMotion ? 0.3 : 1);
        ctx.beginPath();
        ctx.setLineDash(ring.dash);
        ctx.lineDashOffset = ring.offset;
        ctx.lineWidth = ring.width;
        ctx.strokeStyle = `rgba(${GOLD}, 0.16)`;
        ctx.arc(cx, cy, ring.radius, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.setLineDash([]);

      // compass ticks on the outermost ring
      const outer = rings[rings.length - 1];
      const tickCount = 24;
      for (let i = 0; i < tickCount; i += 1) {
        const a = (i / tickCount) * Math.PI * 2;
        const long = i % 6 === 0;
        const r1 = outer.radius - (long ? 6 : 3);
        const r2 = outer.radius + (long ? 6 : 3);
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
        ctx.strokeStyle = `rgba(${GOLD}, ${long ? 0.3 : 0.14})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawGlyphs = () => {
      ctx.save();
      ctx.font = '10px "JetBrains Mono", "Courier New", monospace';
      ctx.textAlign = 'center';
      glyphs.forEach((g) => {
        g.y += g.speed;
        if (g.y > height + 20) {
          g.y = -20;
          g.x = rand(0, width);
          g.char = pick(HEX_GLYPHS.split(''));
        }
        ctx.fillStyle = `rgba(${GOLD}, ${g.alpha})`;
        ctx.fillText(g.char, g.x, g.y);
      });
      ctx.restore();
    };

    const drawRipples = () => {
      ripples = ripples.filter((r) => r.alpha > 0.01);
      ctx.save();
      ripples.forEach((r) => {
        r.radius += (r.maxRadius - r.radius) * 0.08 + 0.6;
        r.alpha *= 0.94;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD_BRIGHT}, ${r.alpha})`;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      });
      ctx.restore();
    };

    const drawNodesAndLinks = () => {
      const convergence = prefersReducedMotion ? 0 : Math.pow(clamp(progress, 0, 1), 3) * 0.35;
      const cx = width / 2;
      const cy = height / 2;

      nodes.forEach((node) => {
        // gentle drift
        node.x += node.vx * (1 - convergence * 0.6);
        node.y += node.vy * (1 - convergence * 0.6);

        // slow pull toward center as the scrub nears completion
        if (convergence > 0) {
          node.x = lerp(node.x, cx, convergence * 0.01);
          node.y = lerp(node.y, cy, convergence * 0.01);
        }

        // pointer magnetism
        if (pointer.active) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          if (d < config.pointerRadius) {
            const force = (1 - d / config.pointerRadius) * 0.6;
            node.x += (dx / d) * force;
            node.y += (dy / d) * force;
            node.pull = lerp(node.pull, 1, 0.15);
          } else {
            node.pull = lerp(node.pull, 0, 0.08);
          }
        } else {
          node.pull = lerp(node.pull, 0, 0.08);
        }

        // wrap
        if (node.x < -10) node.x = width + 10;
        if (node.x > width + 10) node.x = -10;
        if (node.y < -10) node.y = height + 10;
        if (node.y > height + 10) node.y = -10;

        node.phase += 0.03;
        node.size = node.baseSize + Math.sin(node.phase) * 0.4 + node.pull * 1.6;

        const nodeColor = node.variant === 'bright' ? PAPER : GOLD;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${nodeColor}, ${node.baseAlpha + node.pull * 0.4})`;
        if (node.variant === 'bright') {
          ctx.shadowColor = `rgba(${PAPER}, 0.6)`;
          ctx.shadowBlur = 4;
        }
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < config.linkDistance) {
            const alpha = (1 - d / config.linkDistance) * 0.28;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(${GOLD}, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      if (pointer.active) {
        nodes.forEach((node) => {
          if (node.pull > 0.05) {
            ctx.beginPath();
            ctx.moveTo(pointer.x, pointer.y);
            ctx.lineTo(node.x, node.y);
            ctx.strokeStyle = `rgba(${GOLD_BRIGHT}, ${node.pull * 0.25})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        });

        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${GOLD_BRIGHT}, 0.6)`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, config.pointerRadius * 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${GOLD_BRIGHT}, 0.08)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    };

    const render = () => {
      time += prefersReducedMotion ? 0.003 : 0.012;
      ctx.clearRect(0, 0, width, height);

      drawGrid();
      drawRadarSweep();
      drawGlyphs();
      drawOrbitRings();
      drawNodesAndLinks();
      drawRipples();
      drawVignette();

      rafId = requestAnimationFrame(render);
    };

    render();

    /* ---- pointer plumbing (mouse + touch unified) ---- */

    const toLocal = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    const onPointerMove = (e: PointerEvent) => {
      const { x, y } = toLocal(e.clientX, e.clientY);
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      const { x, y } = toLocal(e.clientX, e.clientY);
      pointer.downX = x;
      pointer.downY = y;
      pointer.downAt = performance.now();
      pointer.active = true;
      pointer.x = x;
      pointer.y = y;
    };

    const onPointerUp = (e: PointerEvent) => {
      const { x, y } = toLocal(e.clientX, e.clientY);
      const dist = Math.hypot(x - pointer.downX, y - pointer.downY);
      const duration = performance.now() - pointer.downAt;

      if (dist < 12 && duration < 400) {
        ripples.push({ x, y, radius: 2, maxRadius: 90, alpha: 0.55 });
        canvas.dispatchEvent(new CustomEvent('vigyantra-tap'));
      }
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointercancel', onPointerLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerLeave);
      canvas.removeEventListener('pointercancel', onPointerLeave);
      cancelAnimationFrame(rafId);
    };
  }, [isLoaded, prefersReducedMotion, progress]);

  /* --------------------------------------------------------------------
     5.6 Wire the canvas's custom "tap" event to the quote carousel and
         the tilt handler to the whole section — this is what makes the
         hero feel touch- and pointer-reactive rather than just decorative.
  -------------------------------------------------------------------- */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const onTap = () => {
      setHasInteracted(true);
      advanceQuoteManually();
    };
    canvas.addEventListener('vigyantra-tap', onTap);
    return () => canvas.removeEventListener('vigyantra-tap', onTap);
  }, [advanceQuoteManually]);

  const onContainerPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      handleNameTilt(e.clientX, e.clientY);
    },
    [handleNameTilt],
  );

  const onContainerPointerDown = useCallback(() => {
    setHasInteracted(true);
  }, []);

  /* --------------------------------------------------------------------
     5.7 Derived display values
  -------------------------------------------------------------------- */
  const letters = useMemo(() => WORDMARK.split(''), []);
  const activeQuote = QUOTES[quoteIndex];

  const marqueeText = useMemo(
    () =>
      'VIGYANTRA_2024 :: EVENT MATRIX SYNCED :: NODES ONLINE :: SCROLL TO EXPLORE :: TOUCH TO INTERACT :: ',
    [],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden pt-4"
      onPointerMove={onContainerPointerMove}
      onPointerLeave={resetNameTilt}
      onPointerDown={onContainerPointerDown}
    >
      {/* Signal-field canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease-in-out' }}
      />

      {/* Framing HUD */}
      <HudCorner position="tl">NODE // VIG‑2024</HudCorner>
      <HudCorner position="tr">SCRUB {String(scrubPercent).padStart(2, '0')}%</HudCorner>
      <HudCorner position="bl">EVT::{activeQuote.code}</HudCorner>
      <HudCorner position="br">
        <span className="inline-flex items-center gap-1">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: `rgba(${GOLD_BRIGHT}, ${isHighlighted ? 1 : 0.4})`,
              boxShadow: isHighlighted ? `0 0 6px rgba(${GOLD_BRIGHT}, 0.9)` : 'none',
            }}
          />
          {isHighlighted ? 'LIVE' : 'STANDBY'}
        </span>
      </HudCorner>

      {/* Wordmark */}
      <div
        ref={nameRef}
        className="relative z-10 text-center transition-[opacity,transform] duration-700"
        style={{
          opacity: isHighlighted ? 1 : 0.4,
          transformStyle: 'preserve-3d',
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onAnimationEnd={() => setIsShattering(false)}
      >
        <h2
          className={`font-serif text-3xl sm:text-4xl tracking-widest uppercase relative vig-wordmark ${glitchActive ? 'vig-glitch' : ''
            } ${isShattering ? 'vig-shatter' : ''}`}
          style={{
            color: '#D4AF7A',
            textShadow: isHighlighted
              ? '0 0 20px rgba(212, 175, 122, 0.8), 0 0 40px rgba(212, 175, 122, 0.4)'
              : 'none',
          }}
        >
          {letters.map((char, i) => (
            <GlyphLetter
              key={`${char}-${i}`}
              char={char}
              index={i}
              isLoaded={isLoaded}
              isShattering={isShattering}
            />
          ))}
        </h2>

        <div
          className="mx-auto mt-2 font-mono text-[9px] tracking-[0.4em]"
          style={{ color: `rgba(${GOLD}, ${isHighlighted ? 0.55 : 0.3})` }}
        >
          SIGNAL&nbsp;NETWORK&nbsp;ACTIVE
        </div>
      </div>

      {/* Dynamic quotes */}
      <div
        className="relative z-10 h-10 mt-3 w-full flex items-center justify-center px-4 text-center cursor-pointer"
        onClick={advanceQuoteManually}
        role="button"
        tabIndex={0}
        aria-label="Show next event highlight"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') advanceQuoteManually();
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className="flex flex-col items-center gap-1"
          >
            <span className="font-mono text-[9px] tracking-[0.3em] text-[#D4AF7A]/80 border border-[#D4AF7A]/30 px-2 py-0.5 rounded-full bg-[#D4AF7A]/5 backdrop-blur-sm">
              {activeQuote.label}
            </span>
            <p className="font-sans text-xs tracking-widest text-[#F5F3EE]/90 uppercase mt-1">
              {activeQuote.text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tap hint — fades permanently after first interaction */}
      <AnimatePresence>
        {isLoaded && !hasInteracted && (
          <motion.div
            className="absolute bottom-10 left-0 right-0 z-10 flex justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0.6] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.6, times: [0, 0.3, 0.7, 1], repeat: Infinity }}
          >
            <span className="font-mono text-[8px] tracking-[0.35em] text-[#D4AF7A]/50 uppercase">
              touch to interact
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom telemetry marquee */}
      <div
        className="absolute bottom-2 left-0 right-0 z-10 overflow-hidden pointer-events-none"
        style={{
          maskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
          WebkitMaskImage: 'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
        }}
      >
        <div className={`vig-marquee font-mono text-[8px] tracking-[0.3em] whitespace-nowrap ${prefersReducedMotion ? 'vig-marquee-paused' : ''
          }`} style={{ color: `rgba(${GOLD}, 0.35)` }}>
          <span>{marqueeText.repeat(2)}</span>
          <span aria-hidden="true">{marqueeText.repeat(2)}</span>
        </div>
      </div>

      {/* Embedded CSS */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scan-vertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500%); }
        }

        @keyframes vig-marquee-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }

        .vig-marquee {
          display: inline-flex;
          animation: vig-marquee-scroll 32s linear infinite;
        }

        .vig-marquee-paused {
          animation-play-state: paused;
        }

        .vig-wordmark {
          will-change: transform, opacity;
        }

        .vig-glitch {
          animation: vig-glitch-flicker 0.22s steps(2, jump-none);
        }

        @keyframes vig-glitch-flicker {
          0% { transform: translate(0, 0); opacity: 1; }
          20% { transform: translate(-1.5px, 0.5px); opacity: 0.85; text-shadow: 1px 0 rgba(255,60,90,0.5), -1px 0 rgba(90,200,255,0.5); }
          40% { transform: translate(1.5px, -0.5px); opacity: 1; }
          60% { transform: translate(-1px, 0); opacity: 0.9; text-shadow: -1px 0 rgba(255,60,90,0.4), 1px 0 rgba(90,200,255,0.4); }
          100% { transform: translate(0, 0); opacity: 1; text-shadow: none; }
        }

        .vig-shatter span[data-shatter="on"] {
          animation: vig-shatter-play 0.78s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes vig-shatter-play {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 1; filter: blur(0px); }
          35% { transform: translate(var(--dx), var(--dy)) rotate(var(--dr)); opacity: 0.35; filter: blur(3px); }
          70% { transform: translate(calc(var(--dx) * -0.4), calc(var(--dy) * -0.4)) rotate(calc(var(--dr) * -0.4)); opacity: 0.7; filter: blur(1px); }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 1; filter: blur(0px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vig-glitch, .vig-shatter span[data-shatter="on"] {
            animation: none !important;
          }
        }
      `}} />
    </div>
  );
}