import { SimulationConfig } from './types';

export const DEFAULT_CONFIG: SimulationConfig = {
  gravity: 400,
  particleCount: 30,
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

// Enemy constants
export const ENEMY_SIZE = 40;
export const ENEMY_SPEED = 80;
export const ENEMY_DAMAGE = 10;
export const ENEMY_COLOR = '#ef4444'; // Tailwind red-500
export const ENEMY_COUNT = 2;
export const ENEMY_MAX_HEALTH = 50;  // 敌人生命值
export const ENEMY_HIT_COOLDOWN = 0.3; // 受击冷却时间
export const INVINCIBILITY_TIME = 1.0; // Seconds of invincibility after damage

// Emitted particle constants
export const PARTICLE_MAX_HEALTH = 100;  // 发射粒子最大生命值
export const PARTICLE_HEALTH_DECAY = 20; // 每秒生命值衰减
export const PARTICLE_DAMAGE = 15;       // 粒子对敌人的伤害

// Game state constants
export const MAX_HEALTH = 100;
