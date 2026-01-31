import React, { useRef, useEffect, useState, useCallback } from 'react';
import { PhysicsEngine } from '../services/physicsEngine';
import { SimulationConfig, Vector2, KeyboardInput } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TIME_STEP, SLIME_COLOR_BASE } from '../constants';

interface SimulationCanvasProps {
  config: SimulationConfig;
}

export const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ config }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Re-init physics engine if particle count changes dramatically, but usually we just update
  const engineRef = useRef<PhysicsEngine | null>(null);
  const requestRef = useRef<number>(0);
  const mousePosRef = useRef<Vector2 | null>(null);
  const [launchCooldown, setLaunchCooldown] = useState(0);
  const [isCharging, setIsCharging] = useState(false);
  const [chargeStartTime, setChargeStartTime] = useState<number>(0);
  const keyboardInputRef = useRef<KeyboardInput>({ left: false, right: false, jump: false });

  // Initialize engine
  useEffect(() => {
    engineRef.current = new PhysicsEngine(CANVAS_WIDTH, CANVAS_HEIGHT, config.particleCount);
  }, [config.particleCount]); // Re-create if count changes

  // Keyboard handlers for movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // A/D keys for movement
      if (e.code === 'KeyA' || e.key === 'a') {
        keyboardInputRef.current.left = true;
      }
      if (e.code === 'KeyD' || e.key === 'd') {
        keyboardInputRef.current.right = true;
      }
      // Spacebar for jump
      if ((e.code === 'Space' || e.key === ' ')) {
        keyboardInputRef.current.jump = true;
        e.preventDefault(); // Prevent scrolling
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // A/D keys for movement
      if (e.code === 'KeyA' || e.key === 'a') {
        keyboardInputRef.current.left = false;
      }
      if (e.code === 'KeyD' || e.key === 'd') {
        keyboardInputRef.current.right = false;
      }
      // Spacebar for jump
      if ((e.code === 'Space' || e.key === ' ')) {
        keyboardInputRef.current.jump = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update cooldown
  useEffect(() => {
    if (launchCooldown > 0) {
      const timer = setTimeout(() => setLaunchCooldown(0), 300);
      return () => clearTimeout(timer);
    }
  }, [launchCooldown]);

  // Draw charge indicator (must be defined before draw callback)
  const drawChargeIndicator = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!isCharging || !mousePosRef.current) return;

    const chargeDuration = Math.min((Date.now() - chargeStartTime) / 1000, 1.0);
    const chargeLevel = chargeDuration;

    const centerX = mousePosRef.current.x;
    const centerY = mousePosRef.current.y;
    const radius = 30 + chargeLevel * 30; // 30 to 60

    ctx.save();

    // Draw arc showing charge progress
    ctx.beginPath();
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (Math.PI * 2 * chargeLevel);
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);

    // Color shifts yellow to red
    const red = Math.floor(255 * chargeLevel);
    const green = Math.floor(255 * (1 - chargeLevel));
    ctx.strokeStyle = `rgba(${red}, ${green}, 0, 0.8)`;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Inner circle outline
    ctx.beginPath();
    ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Percentage text
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(chargeLevel * 100)}%`, centerX, centerY);

    ctx.restore();
  }, [isCharging, chargeStartTime]);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!engineRef.current) return;
    const engine = engineRef.current;
    
    // Clear background
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Background Grid
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let x=0; x<CANVAS_WIDTH; x+=40) { ctx.moveTo(x,0); ctx.lineTo(x, CANVAS_HEIGHT); }
    for(let y=0; y<CANVAS_HEIGHT; y+=40) { ctx.moveTo(0,y); ctx.lineTo(CANVAS_WIDTH, y); }
    ctx.stroke();

    // Floor
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, CANVAS_HEIGHT - 4, CANVAS_WIDTH, 4);

    // --- Pass 1: Render the Liquid Blob (Metaballs) ---
    // We draw ALL particles (including eyes) here to form the base slime shape
    ctx.save();
    
    if (config.renderMode === 'blob') {
        // Apply the SVG filter defined in index.html or below
        ctx.filter = 'url(#goo)'; 
    }

    for (const p of engine.particles) {
      ctx.beginPath();
      // Draw slightly larger radius for the blob merge effect
      const drawRadius = config.renderMode === 'blob' ? config.particleRadius * 1.3 : config.particleRadius;
      
      ctx.arc(p.position.x, p.position.y, drawRadius, 0, Math.PI * 2);
      
      if (config.renderMode === 'blob') {
          ctx.fillStyle = SLIME_COLOR_BASE;
      } else if (config.renderMode === 'debug') {
          // Heatmap style velocity
          const speed = Math.sqrt(p.velocity.x**2 + p.velocity.y**2);
          const r = Math.min(255, speed);
          ctx.fillStyle = `rgb(${r}, 100, 150)`;
      } else {
          // Simple particles
          ctx.fillStyle = SLIME_COLOR_BASE;
      }
      
      ctx.fill();
    }
    
    ctx.restore(); // Removes the goo filter

    // --- Pass 2: Render Particle Nuclei (Body only) ---
    // This allows user to see the individual "balls" inside the envelope
    if (config.renderMode === 'blob') {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; // Semi-transparent white
        for (const p of engine.particles) {
            // Only draw nuclei for body particles, avoid drawing inside the eye
            if (p.type !== 'eye') {
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, config.particleRadius * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // --- Pass 3: Render Eyes (Specific Particles) ---
    // Now eyes are attached to specific particles, so if the slime splits, eyes go with the clumps.
    if (config.renderMode === 'blob') {
        for (const p of engine.particles) {
            if (p.type === 'eye') {
                const eyeRadius = config.particleRadius * 1.3; 
                const pupilRadius = eyeRadius * 0.4;
                
                // Draw Sclera (White part)
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(p.position.x, p.position.y, eyeRadius, 0, Math.PI * 2);
                ctx.fill();
                
                // Calculate pupil position (look at mouse)
                let pupilOffsetX = 0;
                let pupilOffsetY = 0;
                
                if (mousePosRef.current) {
                    const dx = mousePosRef.current.x - p.position.x;
                    const dy = mousePosRef.current.y - p.position.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    // Limit pupil movement within the eye
                    const maxOffset = eyeRadius * 0.4; 
                    if (dist > 0) {
                        pupilOffsetX = (dx / dist) * maxOffset;
                        pupilOffsetY = (dy / dist) * maxOffset;
                    }
                }

                // Draw Pupil
                ctx.fillStyle = '#0f172a'; // dark slate
                ctx.beginPath();
                ctx.arc(p.position.x + pupilOffsetX, p.position.y + pupilOffsetY, pupilRadius, 0, Math.PI * 2);
                ctx.fill();

                // Reflection (Cute factor)
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.beginPath();
                ctx.arc(p.position.x + pupilOffsetX + 2, p.position.y + pupilOffsetY - 2, pupilRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Charge Indicator
    drawChargeIndicator(ctx);

  }, [config, drawChargeIndicator]);

  const loop = useCallback(() => {
    if (!engineRef.current) return;

    // Physics Step
    engineRef.current.update(TIME_STEP, config, mousePosRef.current, false, keyboardInputRef.current);

    // Render Step
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        draw(ctx);
      }
    }

    requestRef.current = requestAnimationFrame(loop);
  }, [config, draw, drawChargeIndicator]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [loop]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect) {
      // Correctly map screen coordinates to canvas internal coordinates
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      mousePosRef.current = {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left click only
    if (e.button === 0 && !isCharging && launchCooldown <= 0) {
      setIsCharging(true);
      setChargeStartTime(Date.now());
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Left click release to launch
    if (e.button === 0 && isCharging && engineRef.current && mousePosRef.current) {
      const chargeDuration = Math.min((Date.now() - chargeStartTime) / 1000, 1.0);
      const velocity = 200 + chargeDuration * 1000; // 200-1200 range

      engineRef.current.launchChargedParticle(mousePosRef.current, velocity);
      setLaunchCooldown(0.3);
      setIsCharging(false);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-2xl border border-gray-200 bg-white group">

        {/* SVG Filter Definition for Metaballs */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <defs>
            <filter id="goo">
              {/* Blur the input */}
              <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
              {/* High contrast to sharpen the blur edges -> Creates the 'blob' envelope */}
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -9" result="goo" />
              {/* Composite with original to keep colors sane if needed, but here we just output goo */}
              <feComposite in="SourceGraphic" in2="goo" operator="atop"/>
            </filter>
          </defs>
        </svg>

        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="cursor-crosshair w-full h-auto block touch-none"
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => {
              if (isCharging) {
                setIsCharging(false);
              }
              mousePosRef.current = null;
            }}
            onTouchMove={(e) => {
                 const canvas = canvasRef.current;
                 if (!canvas) return;

                 const rect = canvas.getBoundingClientRect();
                 if (rect && e.touches[0]) {
                     const scaleX = canvas.width / rect.width;
                     const scaleY = canvas.height / rect.height;

                     mousePosRef.current = {
                         x: (e.touches[0].clientX - rect.left) * scaleX,
                         y: (e.touches[0].clientY - rect.top) * scaleY
                     };
                 }
            }}
            onTouchStart={(e) => {
              if (e.touches[0] && !isCharging && launchCooldown <= 0) {
                const canvas = canvasRef.current;
                if (canvas) {
                  const rect = canvas.getBoundingClientRect();
                  mousePosRef.current = {
                    x: (e.touches[0].clientX - rect.left) * (canvas.width / rect.width),
                    y: (e.touches[0].clientY - rect.top) * (canvas.height / rect.height)
                  };
                }
                setIsCharging(true);
                setChargeStartTime(Date.now());
              }
            }}
            onTouchEnd={(e) => {
              if (isCharging && engineRef.current && mousePosRef.current) {
                const chargeDuration = Math.min((Date.now() - chargeStartTime) / 1000, 1.0);
                const velocity = 200 + chargeDuration * 1000;

                engineRef.current.launchChargedParticle(mousePosRef.current, velocity);
                setLaunchCooldown(0.3);
                setIsCharging(false);
              }
              mousePosRef.current = null;
            }}
        />
        
        <div className="absolute top-4 left-4 pointer-events-none transition-opacity opacity-50 group-hover:opacity-100">
            <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-emerald-700 shadow-sm border border-emerald-100">
                {config.renderMode === 'blob' ? 'Rendering: Metaball + Particles' : 'Rendering: Raw Particles'}
            </span>
        </div>
    </div>
  );
};