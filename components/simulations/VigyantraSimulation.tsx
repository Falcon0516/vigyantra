'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { motion, useAnimation, useReducedMotion } from 'framer-motion';

interface VigyantraSimulationProps {
  progress: number;
  isLoaded: boolean;
}

export default function VigyantraSimulation({ progress, isLoaded }: VigyantraSimulationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  
  // Interactive tilt and glow state
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);
  const controls = useAnimation();

  // Subtle floating animation when not interacting
  useEffect(() => {
    if (isLoaded && !isHovering && !prefersReducedMotion) {
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
  }, [isLoaded, isHovering, controls, prefersReducedMotion]);

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

  // Fade out as progress reaches the end
  const isHighlighted = progress < 0.98;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-center justify-center overflow-hidden touch-none"
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
        className="relative z-10"
        style={{
          perspective: 1200,
          opacity: isLoaded && isHighlighted ? 1 : 0,
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