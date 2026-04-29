import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  level: number;
  isActive: boolean;
  color?: string;
}

export function AudioVisualizer({ level, isActive, color = '#3b82f6' }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(null);
  const barsRef = useRef<number[]>(new Array(40).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = canvas.width / barsRef.current.length;
      const centerY = canvas.height / 2;

      // Update bars with some smoothing
      barsRef.current = barsRef.current.map((v, i) => {
        const target = isActive ? level * (Math.random() * 0.5 + 0.5) * canvas.height : 2;
        return v + (target - v) * 0.2;
      });

      ctx.fillStyle = color;
      barsRef.current.forEach((v, i) => {
        const x = i * barWidth;
        const h = Math.max(2, v);
        ctx.beginPath();
        ctx.roundRect(x + 2, centerY - h / 2, barWidth - 4, h, 2);
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [level, isActive, color]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={100} 
      className="w-full h-24 rounded-lg bg-secondary/20"
    />
  );
}
