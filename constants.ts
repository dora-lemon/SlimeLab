import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  gravity: 400,
  particleCount: 120, // More particles for a fluid look
  particleRadius: 12, // Visual radius
  
  repulsionStrength: 800, 
  attractionStrength: 1.5,
  interactionRadius: 50,
  damping: 0.96, // High damping for viscous slime feel
  
  mouseInteractionRadius: 150,
  mouseForce: 1000,
  
  renderMode: 'blob',
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const TIME_STEP = 1 / 60;
export const SLIME_COLOR_BASE = '#10b981'; // Tailwind emerald-500
export const SLIME_COLOR_DARK = '#047857'; // Tailwind emerald-700
