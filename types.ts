export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  position: Vector2;
  velocity: Vector2;
  force: Vector2;
  mass: number;
  isFixed: boolean;
  radius: number;
  type?: 'body' | 'eye';
  isEmitted: boolean; // true if launched, false if in-body
  health?: number;    // 粒子生命值（发射后）
  maxHealth?: number; // 最大生命值
}

export interface SimulationConfig {
  gravity: number;
  particleCount: number;
  particleRadius: number;
  
  // Fluid Parameters
  repulsionStrength: number; // Short range push
  attractionStrength: number; // Long range pull (Cohesion)
  interactionRadius: number; // How far they see each other
  damping: number; // Viscosity
  
  mouseInteractionRadius: number;
  mouseForce: number;

  // Visual toggles
  renderMode: 'blob' | 'particles' | 'debug';
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface KeyboardInput {
  left: boolean;
  right: boolean;
  jump: boolean;
}

export interface Enemy {
  id: number;
  position: Vector2;
  velocity: Vector2;
  size: number;              // 方块边长
  patrolPoints: Vector2[];   // 巡逻路径点
  currentPatrolIndex: number;
  patrolSpeed: number;
  damage: number;            // 接触伤害
  color: string;             // 敌人颜色
  health: number;            // 敌人生命值
  maxHealth: number;         // 最大生命值
  isDead?: boolean;          // 是否死亡
}

export interface GameState {
  isGameOver: boolean;
}