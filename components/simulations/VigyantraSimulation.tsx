'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, useAnimation, useReducedMotion, AnimatePresence } from 'framer-motion';

interface VigyantraSimulationProps {
  progress: number;
  isLoaded: boolean;
}

const QUOTES = [
  { text: 'INNOVATE. CREATE. INSPIRE.', label: "VIGYANTRA '24" },
  { text: 'TRAIN YOUR NEURAL NETWORKS', label: 'AI PROMPT BATTLE' },
  { text: 'PASS THE BATON, NOT THE BUG', label: 'CODE RELAY' },
  { text: 'EVERY SYSTEM HAS A SEAM', label: 'HACK & HUNT' },
  { text: 'IDEAS, COMPILED TO INSTALL', label: 'APPFORGE' },
  { text: 'SECURE THE MAINFRAME', label: 'ZEROCRYPT CTF' },
  { text: 'FROM SPARK TO PROTOTYPE', label: 'NEXORA' },
];

export default function VigyantraSimulation({ progress, isLoaded }: VigyantraSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  const [quoteIndex, setQuoteIndex] = useState(0);
  
  // Interactive tilt and glow state
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimation();

  // Rotate quotes
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % QUOTES.length);
    }, 3500);
    return () => clearInterval(interval);
  }, [isLoaded]);

  // Subtle floating animation when not interacting
  useEffect(() => {
    if (isLoaded && !isHovering && !prefersReducedMotion && progress < 0.8) {
      controls.start({
        y: [0, -6, 0],
        transition: {
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut"
        }
      });
    } else {
      controls.stop();
      controls.start({ y: 0, transition: { duration: 0.5 } });
    }
  }, [isLoaded, isHovering, controls, prefersReducedMotion, progress]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setMousePosition({ x, y });
    }
  }, [prefersReducedMotion]);

  const handlePointerEnter = () => setIsHovering(true);
  const handlePointerLeave = () => {
    setIsHovering(false);
    setMousePosition({ x: 0.5, y: 0.5 });
  };

  // Calculate tilt based on pointer position
  const rotateX = (mousePosition.y - 0.5) * -30;
  const rotateY = (mousePosition.x - 0.5) * 30;

  // Transition to top left as progress nears 1
  const transitionStart = 0.85;
  const t = Math.max(0, Math.min(1, (progress - transitionStart) / (1 - transitionStart))); // 0 to 1
  
  // As t -> 1, move to top left and scale down, then fade out
  const moveX = t * -40; // vw shift (approx)
  const moveY = t * -40; // vh shift (approx)
  const logoScale = 1 - (t * 0.4);
  const logoOpacity = isLoaded ? (progress > 0.98 ? 0 : 1 - (t * 0.5)) : 0;
  
  const currentQuote = QUOTES[quoteIndex];

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden touch-none pt-4"
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      {/* Background Interactive Glow */}
      <motion.div
        className="absolute w-72 h-72 rounded-full pointer-events-none blur-3xl opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(212,175,122,0.6) 0%, rgba(212,175,122,0) 70%)',
        }}
        animate={{
          x: (mousePosition.x - 0.5) * 150,
          y: (mousePosition.y - 0.5) * 150,
          scale: isHovering ? 1.2 : 1,
          opacity: isHovering ? 0.4 : 0.15,
        }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      />

      {/* Main Logo Container with 3D Tilt */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        style={{
          perspective: 1200,
          opacity: logoOpacity,
          x: `${moveX}vw`,
          y: `${moveY}vh`,
          scale: logoScale,
        }}
        animate={controls}
      >
        <motion.div
          style={{
            transformStyle: 'preserve-3d',
          }}
          animate={{
            rotateX: isHovering ? rotateX : 0,
            rotateY: isHovering ? rotateY : 0,
            scale: isHovering ? 1.05 : 1,
          }}
          transition={{
            type: 'spring',
            damping: 25,
            stiffness: 150,
          }}
        >
          {/* Logo Shadow/Glow */}
          <motion.div
            className="absolute inset-0 rounded-lg blur-2xl opacity-40 pointer-events-none"
            style={{ background: 'rgba(212, 175, 122, 0.4)' }}
            animate={{
              opacity: isHovering ? 0.7 : 0.4,
              scale: isHovering ? 1.1 : 1,
            }}
          />

          {/* Actual Logo Image */}
          <div className="relative pointer-events-none">
            <Image
              src="/vigyantra-logo.png"
              alt="Vigyantra Logo"
              width={320}
              height={80}
              className="w-auto h-12 sm:h-16 md:h-20 object-contain drop-shadow-2xl"
              priority
            />
          </div>
        </motion.div>
        
        {/* Dynamic Quotes and Event Names */}
        <div className="mt-8 h-16 flex flex-col items-center justify-center overflow-hidden" style={{ opacity: 1 - (t * 2) }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={quoteIndex}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="flex flex-col items-center text-center pointer-events-none"
            >
              <span className="font-mono text-[10px] sm:text-xs tracking-[0.25em] text-[#D4AF7A] mb-1.5 opacity-80 uppercase">
                {currentQuote.label}
              </span>
              <span className="font-serif text-sm sm:text-base tracking-widest text-[#F5F3EE] uppercase" style={{ textShadow: '0 0 10px rgba(212,175,122,0.3)' }}>
                {currentQuote.text}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Minimal Ambient Particles */}
      {isLoaded && !prefersReducedMotion && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 2 + 1 + 'px',
                height: Math.random() * 2 + 1 + 'px',
                background: 'rgba(212, 175, 122, 0.6)',
                left: Math.random() * 100 + '%',
                top: Math.random() * 100 + '%',
              }}
              animate={{
                y: [0, -120],
                opacity: [0, 1, 0],
              }}
              transition={{
                duration: Math.random() * 4 + 4,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}