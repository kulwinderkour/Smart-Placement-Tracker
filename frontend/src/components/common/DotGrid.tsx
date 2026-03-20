import React, { useEffect, useRef } from 'react';

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  speedTrigger?: number;
  shockRadius?: number;
  shockStrength?: number;
  maxSpeed?: number;
  resistance?: number;
  returnDuration?: number;
  className?: string;
}

export const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 5,
  gap = 15,
  baseColor = '#271E37',
  activeColor = '#5227FF',
  proximity = 120,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dots: { x: number; y: number; baseX: number; baseY: number; vx: number; vy: number; baseColor: string; activeColor: string }[] = [];
    let animationFrameId: number;
    let mouseX = -1000;
    let mouseY = -1000;
    let mouseSpeedX = 0;
    let mouseSpeedY = 0;
    let lastMouseX = -1000;
    let lastMouseY = -1000;

    const initDots = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      dots = [];
      const rows = Math.ceil(canvas.height / gap);
      const cols = Math.ceil(canvas.width / gap);

      for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
          const x = j * gap + gap / 2;
          const y = i * gap + gap / 2;
          dots.push({
            x,
            y,
            baseX: x,
            baseY: y,
            vx: 0,
            vy: 0,
            baseColor,
            activeColor,
          });
        }
      }
    };

    const drawDots = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      dots.forEach((dot) => {
        const dx = mouseX - dot.baseX;
        const dy = mouseY - dot.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate force based on proximity
        let force = 0;
        if (distance < proximity) {
          force = (proximity - distance) / proximity;
        }

        // Apply mouse movement shock factor
        const mouseSpeed = Math.sqrt(mouseSpeedX * mouseSpeedX + mouseSpeedY * mouseSpeedY);
        if (mouseSpeed > speedTrigger && distance < shockRadius) {
          force += (shockStrength * mouseSpeed) / maxSpeed;
        }

        // Calculate acceleration
        const angle = Math.atan2(dy, dx);
        const accelerationX = -Math.cos(angle) * force * 10;
        const accelerationY = -Math.sin(angle) * force * 10;

        // Apply resistance and update velocity
        dot.vx += accelerationX;
        dot.vy += accelerationY;
        dot.vx *= 1 - 10 / resistance;
        dot.vy *= 1 - 10 / resistance;

        // Apply return force
        const returnForceX = (dot.baseX - dot.x) * (1 / (returnDuration * 60));
        const returnForceY = (dot.baseY - dot.y) * (1 / (returnDuration * 60));
        dot.vx += returnForceX;
        dot.vy += returnForceY;

        // Update position
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Determine color
        const colorRatio = Math.min(1, Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy) / 5);
        
        ctx.fillStyle = force > 0 || colorRatio > 0.1 ? dot.activeColor : dot.baseColor;
        // Optionally blend if you want more smooth transitions, but simple swap/ratio is enough
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize / 2, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const renderLoop = () => {
      mouseSpeedX = mouseX - lastMouseX;
      mouseSpeedY = mouseY - lastMouseY;
      lastMouseX = mouseX;
      lastMouseY = mouseY;
      
      drawDots();
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };

    const handleMouseLeave = () => {
      mouseX = -1000;
      mouseY = -1000;
    };

    const handleResize = () => {
      initDots();
    };

    initDots();
    renderLoop();

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [
    dotSize, gap, baseColor, activeColor, proximity,
    speedTrigger, shockRadius, shockStrength, maxSpeed,
    resistance, returnDuration
  ]);

  return (
    <div ref={containerRef} className={`w-full h-full absolute inset-0 overflow-hidden ${className}`}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default DotGrid;
