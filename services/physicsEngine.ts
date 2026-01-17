import { Particle, Vector2, SimulationConfig } from '../types';

export class PhysicsEngine {
  particles: Particle[] = [];
  width: number;
  height: number;

  constructor(width: number, height: number, particleCount: number) {
    this.width = width;
    this.height = height;
    this.initSlime(particleCount);
  }

  // Initialize a random cluster of particles
  initSlime(count: number) {
    this.particles = [];
    const centerX = this.width / 2;
    const centerY = this.height / 2;
    
    // Spawn in a rough circle
    for (let i = 0; i < count; i++) {
      let x, y;
      const isEye = i < 2;

      // Position the first two particles (eyes) centrally so they form a face initially
      if (i === 0) { // Left eye
         x = centerX - 12;
         y = centerY - 15;
      } else if (i === 1) { // Right eye
         x = centerX + 12;
         y = centerY - 15;
      } else {
         // Random position for body particles
         const angle = Math.random() * Math.PI * 2;
         const r = Math.sqrt(Math.random()) * 80; 
         x = centerX + Math.cos(angle) * r;
         y = centerY + Math.sin(angle) * r;
      }
      
      this.particles.push({
        id: i,
        position: { x, y },
        velocity: { 
            x: (Math.random() - 0.5) * 50, 
            y: (Math.random() - 0.5) * 50 
        },
        force: { x: 0, y: 0 },
        mass: 1,
        isFixed: false,
        radius: 10, // Physical collision radius (approx)
        type: isEye ? 'eye' : 'body'
      });
    }
  }

  launchParticle() {
    // Find a body particle (not an eye) to launch
    const bodyParticles = this.particles.filter(p => p.type !== 'eye');
    if (bodyParticles.length === 0) return;

    // Pick a random body particle
    const particle = bodyParticles[Math.floor(Math.random() * bodyParticles.length)];

    // Launch it upward with slight random angle
    const launchSpeed = 500 + Math.random() * 200;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5; // Upward with slight spread

    particle.velocity.x = Math.cos(angle) * launchSpeed;
    particle.velocity.y = Math.sin(angle) * launchSpeed;
  }

  launchChargedParticle(targetPosition: Vector2, velocityMagnitude: number) {
    const bodyParticles = this.particles.filter(p => p.type !== 'eye');
    if (bodyParticles.length === 0) return;

    // Select bottom-most particle (feels more natural for "launching")
    let selectedParticle = bodyParticles[0];
    let maxY = -Infinity;

    for (const p of bodyParticles) {
      if (p.position.y > maxY) {
        maxY = p.position.y;
        selectedParticle = p;
      }
    }

    // Calculate direction to mouse cursor
    const dx = targetPosition.x - selectedParticle.position.x;
    const dy = targetPosition.y - selectedParticle.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) {
      // Default upward if mouse is on particle
      selectedParticle.velocity.x = 0;
      selectedParticle.velocity.y = -velocityMagnitude;
      return;
    }

    // Apply velocity in direction of mouse
    selectedParticle.velocity.x = (dx / distance) * velocityMagnitude;
    selectedParticle.velocity.y = (dy / distance) * velocityMagnitude;
  }

  update(dt: number, config: SimulationConfig, mousePos: Vector2 | null, isDragging: boolean) {
    const N = this.particles.length;

    // 1. Reset Forces & Apply Gravity
    for (let i = 0; i < N; i++) {
      const p = this.particles[i];
      p.force.x = 0;
      p.force.y = p.mass * config.gravity;
    }

    // 2. Inter-particle Interactions (O(N^2) - acceptable for N < 300 in JS)
    // We combine Repulsion (keep apart) and Attraction (hold together)
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const pA = this.particles[i];
        const pB = this.particles[j];

        const dx = pB.position.x - pA.position.x;
        const dy = pB.position.y - pA.position.y;
        const distSq = dx * dx + dy * dy;

        // Optimization: Skip if too far
        const interactRadSq = config.interactionRadius * config.interactionRadius;
        if (distSq > interactRadSq || distSq === 0) continue;

        const dist = Math.sqrt(distSq);
        const nx = dx / dist;
        const ny = dy / dist;

        let forceMagnitude = 0;

        // Extra repulsion between eyes to keep them separated
        const bothEyes = pA.type === 'eye' && pB.type === 'eye';

        // A. Repulsion (Short range, strong)
        // Mimic volume preservation: if closer than nominal diameter, push hard
        const diameter = config.particleRadius * 1.5;
        if (dist < diameter) {
            const push = (1 - dist / diameter);
            // Apply extra repulsion for eyes
            const repulsion = bothEyes ? config.repulsionStrength * 2.5 : config.repulsionStrength;
            forceMagnitude -= repulsion * push;
        }

        // B. Attraction (Medium range, weak - Cohesion)
        // Only attract if not too close (to avoid collapse)
        if (dist > diameter) {
            const pull = (1 - dist / config.interactionRadius);
            forceMagnitude += config.attractionStrength * pull * 100; // scaling factor
        }

        const fx = nx * forceMagnitude;
        const fy = ny * forceMagnitude;

        pA.force.x += fx;
        pA.force.y += fy;
        pB.force.x -= fx;
        pB.force.y -= fy;
      }
    }

    // 3. Mouse Interaction (Force Field)
    if (mousePos && isDragging) {
      for (const p of this.particles) {
        const dx = mousePos.x - p.position.x;
        const dy = mousePos.y - p.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < config.mouseInteractionRadius) {
            // Pull towards mouse
            const forceFactor = (1 - dist / config.mouseInteractionRadius);
            p.force.x += dx * forceFactor * config.mouseForce * 0.05;
            p.force.y += dy * forceFactor * config.mouseForce * 0.05;
            
            // Damping near mouse to stabilize grabbing
            p.velocity.x *= 0.8;
            p.velocity.y *= 0.8;
        }
      }
    }

    // 4. Integration
    for (const p of this.particles) {
      const ax = p.force.x / p.mass;
      const ay = p.force.y / p.mass;

      p.velocity.x += ax * dt;
      p.velocity.y += ay * dt;

      // Global Damping (Viscosity)
      p.velocity.x *= config.damping;
      p.velocity.y *= config.damping;

      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;

      // 5. Boundaries
      const r = config.particleRadius;
      const bounce = 0.5;

      // Floor
      if (p.position.y > this.height - r) {
        p.position.y = this.height - r;
        p.velocity.y *= -bounce;
        // Floor friction
        p.velocity.x *= 0.9;
      }
      // Ceiling
      if (p.position.y < r) {
        p.position.y = r;
        p.velocity.y *= -bounce;
      }
      // Walls
      if (p.position.x > this.width - r) {
        p.position.x = this.width - r;
        p.velocity.x *= -bounce;
      }
      if (p.position.x < r) {
        p.position.x = r;
        p.velocity.x *= -bounce;
      }
    }
  }
}