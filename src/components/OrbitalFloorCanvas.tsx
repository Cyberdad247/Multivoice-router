import React, { useRef, useEffect } from 'react';

interface OrbitalFloorCanvasProps {
  isSpeaking: boolean;
  isConnected: boolean;
  reducedMotion?: boolean;
  activeColor?: string;
}

interface Particle {
  x: number;
  y: number;
  radius: number;
  angle: number;
  distance: number;
  speed: number;
  baseRadius: number;
  alpha: number;
  color: string;
}

export function OrbitalFloorCanvas({
  isSpeaking,
  isConnected,
  reducedMotion = false,
  activeColor = '#dfc486'
}: OrbitalFloorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const dpr = window.devicePixelRatio || 1;
    const width = 680;
    const height = 380;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const centerX = width / 2;
    const centerY = height / 2;

    // Generate celestial orbit particles
    const particleCount = 48;
    const particles: Particle[] = [];
    const colors = [activeColor, '#d5b570', '#e5cd99', '#9dc7db', '#bda5d7'];

    for (let i = 0; i < particleCount; i++) {
      const distance = 50 + Math.random() * 260;
      particles.push({
        x: 0,
        y: 0,
        radius: 1.2 + Math.random() * 1.8,
        baseRadius: 1.2 + Math.random() * 1.8,
        angle: Math.random() * Math.PI * 2,
        distance,
        speed: (0.002 + Math.random() * 0.006) * (i % 2 === 0 ? 1 : -1),
        alpha: 0.2 + Math.random() * 0.6,
        color: colors[i % colors.length]
      });
    }

    let wavePhase = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Active excitation state
      const isExcited = isSpeaking || isConnected;
      const pulseMultiplier = isExcited ? 1.6 : 0.8;
      wavePhase += isExcited ? 0.04 : 0.015;

      // Draw concentric orbital geometric rings
      const rings = [70, 130, 195, 255];
      rings.forEach((r, idx) => {
        const ringPulse = isExcited ? Math.sin(wavePhase + idx) * 4 : 0;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r + ringPulse, 0, Math.PI * 2);
        ctx.strokeStyle = idx % 2 === 0 ? 'rgba(218, 177, 107, 0.16)' : 'rgba(157, 199, 219, 0.12)';
        ctx.lineWidth = idx === 0 ? 1.5 : 1;
        if (idx === 1) {
          ctx.setLineDash([4, 8]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
      });

      // If active, draw acoustic ripple waves outward
      if (isExcited) {
        const rippleR = (wavePhase * 40) % 270;
        const rippleAlpha = Math.max(0, 1 - rippleR / 270) * 0.45;
        ctx.beginPath();
        ctx.arc(centerX, centerY, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(223, 196, 134, ${rippleAlpha})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.stroke();
      }

      // Draw and update orbiting stardust particles
      particles.forEach(p => {
        p.angle += p.speed * (isExcited ? 2.2 : 1);
        const waveOffset = isExcited ? Math.sin(wavePhase * 2 + p.distance * 0.05) * 8 : 0;
        const currentDist = p.distance + waveOffset;

        p.x = centerX + Math.cos(p.angle) * currentDist;
        p.y = centerY + Math.sin(p.angle) * (currentDist * 0.58); // Elliptical 3D perspective squish

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * pulseMultiplier, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * (isExcited ? 1 : 0.6);
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isExcited ? 6 : 2;
        ctx.fill();
      });

      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;

      if (!reducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isConnected, reducedMotion, activeColor]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        transform: 'translateZ(2px)'
      }}
      aria-hidden="true"
    />
  );
}
