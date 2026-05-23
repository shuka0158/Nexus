'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/utils';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

export const ParticleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);
  const { theme } = useTheme();

  useEffect(() => {
    if (theme.animationIntensity === 'none' || !theme.particlesEnabled) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = theme.animationIntensity === 'high' ? 80
      : theme.animationIntensity === 'normal' ? 50
      : 25;

    const colors = [theme.accentColor, theme.secondaryColor, '#ffffff'];

    const createParticle = (): Particle => ({
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      vx:      (Math.random() - 0.5) * 0.4,
      vy:      -Math.random() * 0.6 - 0.2,
      size:    Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      color:   colors[Math.floor(Math.random() * colors.length)],
      life:    0,
      maxLife: Math.random() * 200 + 100,
    });

    particlesRef.current = Array.from({ length: count }, createParticle);

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p, i) => {
        p.life++;
        if (p.life > p.maxLife) {
          particlesRef.current[i] = createParticle();
          return;
        }
        p.x += p.vx;
        p.y += p.vy;

        const fadeIn  = Math.min(p.life / 30, 1);
        const fadeOut = Math.min((p.maxLife - p.life) / 30, 1);
        const alpha   = p.opacity * fadeIn * fadeOut;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(p.color, alpha);
        ctx.fill();
      });

      // Draw connections between nearby particles
      if (theme.animationIntensity !== 'reduced') {
        particlesRef.current.forEach((a, i) => {
          particlesRef.current.slice(i + 1).forEach((b) => {
            const dx = a.x - b.x;
            const dy = a.y - b.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 100) {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = hexToRgba(theme.accentColor, (1 - dist / 100) * 0.06);
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          });
        });
      }

      animFrameRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [theme.accentColor, theme.secondaryColor, theme.animationIntensity, theme.particlesEnabled]);

  if (!theme.particlesEnabled || theme.animationIntensity === 'none') return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};
