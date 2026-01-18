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