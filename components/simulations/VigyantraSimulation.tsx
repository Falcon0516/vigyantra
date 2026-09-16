'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VigyantraSimulationProps {
  isHighlighted: boolean;
  isLoaded: boolean;
}

const quotes = [
  { text: "INNOVATE. CREATE. INSPIRE.", label: "VIGYANTRA '24" },
  { text: "TRAIN YOUR NEURAL NETWORKS", label: "AI PROMPT BATTLE" },
  { text: "SECURE THE MAINFRAME", label: "ZEROCRYPT CTF" },
  { text: "COMPILE YOUR DREAMS", label: "APP DEV CHALLENGE" },
  { text: "ENGINEERING THE FUTURE", label: "ROBOINNOVATE" },
  { text: "BUILDING SUSTAINABLE TECH", label: "GREEN TECH" }
];

export default function VigyantraSimulation({ isHighlighted, isLoaded }: VigyantraSimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);

  // Cycle quotes based on time rather than scroll progress so it feels alive even when idle
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % quotes.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  // Particle System
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;
    let rafId = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight;
        canvas.width = width * (window.devicePixelRatio || 1);
        canvas.height = height * (window.devicePixelRatio || 1);
        ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    // Node particles
    const nodes = Array.from({ length: 40 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      baseAlpha: Math.random() * 0.5 + 0.1
    }));

    let time = 0;

    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      nodes.forEach(node => {
        // Move
        node.x += node.vx;
        node.y += node.vy;

        // Wrap around
        if (node.x < 0) node.x = width;
        if (node.x > width) node.x = 0;
        if (node.y < 0) node.y = height;
        if (node.y > height) node.y = 0;

        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 122, ${node.baseAlpha})`;
        ctx.fill();
      });

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 80) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            // Opacity based on distance
            const alpha = (1 - dist / 80) * 0.3;
            ctx.strokeStyle = `rgba(212, 175, 122, ${alpha})`;
            ctx.stroke();
          }
        }
      }

      // Orbital Event Rings
      const cx = width / 2;
      const cy = height / 2;
      ctx.lineWidth = 1;
      
      [60, 90, 120].forEach((radius, idx) => {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        // Dash pattern moving
        ctx.setLineDash([5, 15, 20, 10]);
        ctx.lineDashOffset = -(time * 20 * (idx % 2 === 0 ? 1 : -1));
        ctx.strokeStyle = `rgba(212, 175, 122, 0.15)`;
        ctx.stroke();
      });
      ctx.setLineDash([]); // reset

      rafId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(rafId);
    };
  }, [isLoaded]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden pt-12">
      {/* Background Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease-in-out' }}
      />

      {/* Main Brand Text */}
      <div
        className="relative z-10 text-center transition-all duration-700"
        style={{
          transform: isHighlighted ? 'scale(1)' : 'scale(0.95)',
          opacity: isHighlighted ? 1 : 0.4,
        }}
      >
        <h2
          className="font-serif text-3xl sm:text-4xl tracking-widest uppercase relative"
          style={{
            color: '#D4AF7A',
            textShadow: isHighlighted ? '0 0 20px rgba(212, 175, 122, 0.8), 0 0 40px rgba(212, 175, 122, 0.4)' : 'none',
          }}
        >
          Vigyantra
          
          {/* Scanning line effect */}
          {isHighlighted && (
            <div 
              className="absolute inset-0 pointer-events-none mix-blend-overlay"
              style={{
                background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.8), transparent)',
                height: '20%',
                width: '100%',
                animation: 'scan-vertical 3s linear infinite'
              }}
            />
          )}
        </h2>
      </div>

      {/* Dynamic Quotes */}
      <div className="relative z-10 h-12 mt-6 w-full flex items-center justify-center px-4 text-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={quoteIndex}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex flex-col items-center gap-1"
          >
            <span className="font-mono text-[9px] tracking-[0.3em] text-[#D4AF7A]/80 border border-[#D4AF7A]/30 px-2 py-0.5 rounded-full bg-[#D4AF7A]/5 backdrop-blur-sm">
              {quotes[quoteIndex].label}
            </span>
            <p className="font-sans text-xs tracking-widest text-[#F5F3EE]/90 uppercase mt-1">
              {quotes[quoteIndex].text}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Embedded CSS for the scanline */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-vertical {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(500%); }
        }
      `}} />
    </div>
  );
}
