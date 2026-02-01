import { Particle, Vector2, SimulationConfig, KeyboardInput } from '../types';

// 音效事件类型
export type SoundEvent = {
  type: 'jump' | 'launch' | 'bounce' | 'reabsorb';
  intensity?: number;
};

export class PhysicsEngine {
  particles: Particle[] = [];
  width: number;
  height: number;

  // Sound event callback
  onSoundEvent?: (event: SoundEvent) => void;

  // Jump state
  private jumpCooldown: number = 0;
  private jumpWasPressed: boolean = false;

  // Collision sound cooldown (prevent too many sounds)
  private bounceSoundCooldown: number = 0;

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
        type: isEye ? 'eye' : 'body',
        isEmitted: false // Initially all particles are in-body
      });
    }
  }

  launchParticle() {
    // Find a body particle (not an eye) that is not emitted to launch
    const bodyParticles = this.particles.filter(p => p.type !== 'eye' && !p.isEmitted);
    if (bodyParticles.length === 0) return;

    // Pick a random body particle
    const particle = bodyParticles[Math.floor(Math.random() * bodyParticles.length)];

    // Mark as emitted
    particle.isEmitted = true;

    // Launch it upward with slight random angle
    const launchSpeed = 500 + Math.random() * 200;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5; // Upward with slight spread

    particle.velocity.x = Math.cos(angle) * launchSpeed;
    particle.velocity.y = Math.sin(angle) * launchSpeed;
  }

  launchChargedParticle(targetPosition: Vector2, velocityMagnitude: number) {
    // Find body particles (not eyes) that are not emitted
    const bodyParticles = this.particles.filter(p => p.type !== 'eye' && !p.isEmitted);
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

    // Mark as emitted
    selectedParticle.isEmitted = true;

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

    // Trigger launch sound event with intensity based on velocity
    const intensity = Math.min(velocityMagnitude / 1200, 1);
    this.onSoundEvent?.({ type: 'launch', intensity });
  }

  // Re-absorption constants
  private readonly REABSORPTION_VELOCITY_THRESHOLD = 50; // units/sec
  private readonly REABSORPTION_DISTANCE_THRESHOLD = 35; // units

  // Check if two particles are connected based on distance
  private areParticlesConnected(p1: Particle, p2: Particle, connectionDistance: number): boolean {
    const dx = p2.position.x - p1.position.x;
    const dy = p2.position.y - p1.position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < connectionDistance;
  }

  // Find the largest connected component (main group) based on particle proximity
  private findMainGroup(interactionRadius: number): Set<number> {
    const visited = new Set<number>();
    let mainGroup: Set<number> = new Set();
    let maxGroupSize = 0;

    // Build adjacency list
    const adjacency = new Map<number, Set<number>>();
    for (let i = 0; i < this.particles.length; i++) {
      adjacency.set(i, new Set());
    }

    // Find connections between particles using the connection check function
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const pA = this.particles[i];
        const pB = this.particles[j];

        if (this.areParticlesConnected(pA, pB, interactionRadius)) {
          adjacency.get(i)!.add(j);
          adjacency.get(j)!.add(i);
        }
      }
    }

    // BFS to find connected components
    for (let i = 0; i < this.particles.length; i++) {
      if (visited.has(i)) continue;

      const currentGroup: Set<number> = new Set();
      const queue: number[] = [i];

      while (queue.length > 0) {
        const current = queue.shift()!;

        if (visited.has(current)) continue;
        visited.add(current);
        currentGroup.add(current);

        const neighbors = adjacency.get(current)!;
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          }
        }
      }

      // Update main group if current is larger
      if (currentGroup.size > maxGroupSize) {
        maxGroupSize = currentGroup.size;
        mainGroup = currentGroup;
      }
    }

    return mainGroup;
  }

  // Check if emitted particles should be re-absorbed into the main body
  checkReabsorption() {
    const bodyParticles = this.particles.filter(p => p.type !== 'eye');

    for (const p of this.particles) {
      // Only check particles that are currently emitted
      if (!p.isEmitted) continue;

      // Skip eyes (they should never be emitted anyway, but just in case)
      if (p.type === 'eye') continue;

      // Calculate velocity magnitude
      const velocityMag = Math.sqrt(p.velocity.x * p.velocity.x + p.velocity.y * p.velocity.y);

      // Check if moving slowly enough
      if (velocityMag > this.REABSORPTION_VELOCITY_THRESHOLD) continue;

      // Check if near any body particle (in-body)
      let nearBody = false;
      for (const bodyP of bodyParticles) {
        // Skip checking against self
        if (bodyP.id === p.id) continue;

        // Only consider particles that are not emitted as part of the "main body"
        if (bodyP.isEmitted) continue;

        const dx = bodyP.position.x - p.position.x;
        const dy = bodyP.position.y - p.position.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.REABSORPTION_DISTANCE_THRESHOLD) {
          nearBody = true;
          break;
        }
      }

      // Re-absorb if slow and near body
      if (nearBody) {
        p.isEmitted = false;
        // Trigger reabsorb sound
        this.onSoundEvent?.({ type: 'reabsorb' });
      }
    }
  }

  update(dt: number, config: SimulationConfig, mousePos: Vector2 | null, isDragging: boolean, keyboardInput?: KeyboardInput) {
    const N = this.particles.length;

    // Find the main group (largest connected component)
    const mainGroup = this.findMainGroup(config.interactionRadius);

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

    // 3. Mouse Interaction (Force Field) - Only affects main group
    if (mousePos && isDragging) {
      for (let i = 0; i < this.particles.length; i++) {
        if (!mainGroup.has(i)) continue; // Only affect main group

        const p = this.particles[i];
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

    // 3.5. Keyboard Controls (Movement & Jump) - Only affects main group
    if (keyboardInput) {
      // Force field approach for movement (similar to mouse interaction)
      // This keeps the slime's shape intact
      const moveForceMagnitude = 15; // Force field strength
      const moveFieldRadius = 200; // Radius of the force field

      // Calculate main group center for force field positioning
      let centerX = 0, centerY = 0, count = 0;
      for (let i = 0; i < this.particles.length; i++) {
        if (mainGroup.has(i) && !this.particles[i].isEmitted) {
          centerX += this.particles[i].position.x;
          centerY += this.particles[i].position.y;
          count++;
        }
      }
      if (count > 0) {
        centerX /= count;
        centerY /= count;
      }

      // Apply movement force field to main group particles only
      for (let i = 0; i < this.particles.length; i++) {
        if (!mainGroup.has(i)) continue; // Only control main group
        const p = this.particles[i];
        if (p.isEmitted) continue; // Don't control emitted particles

        // Horizontal movement via force field
        if (keyboardInput.left || keyboardInput.right) {
          const direction = keyboardInput.left ? -1 : 1;
          const targetX = centerX + direction * moveFieldRadius;
          const dx = targetX - p.position.x;
          const dy = centerY - p.position.y; // Pull toward center Y to maintain shape
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < moveFieldRadius) {
            const forceFactor = (1 - dist / moveFieldRadius);
            p.force.x += direction * forceFactor * moveForceMagnitude * 10;
          }

          // Direct horizontal force for more responsive movement
          p.force.x += direction * moveForceMagnitude * 20;
        }
      }

      // Jump (impulse-based) - Only affects main group
      const jumpImpulse = 350;
      const jumpPressed = keyboardInput.jump;
      const jumpTriggered = jumpPressed && !this.jumpWasPressed;

      // Check if main group is on ground
      let onGround = false;
      for (let i = 0; i < this.particles.length; i++) {
        if (mainGroup.has(i) && !this.particles[i].isEmitted && this.particles[i].position.y >= this.height - config.particleRadius - 8) {
          onGround = true;
          break;
        }
      }

      if (jumpTriggered && onGround && this.jumpCooldown <= 0) {
        for (let i = 0; i < this.particles.length; i++) {
          if (mainGroup.has(i) && !this.particles[i].isEmitted) {
            this.particles[i].velocity.y = -jumpImpulse;
          }
        }
        this.jumpCooldown = 0.25;
        // Trigger jump sound
        this.onSoundEvent?.({ type: 'jump' });
      }

      this.jumpWasPressed = jumpPressed;

      // Update cooldown
      if (this.jumpCooldown > 0) {
        this.jumpCooldown -= dt;
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
    }

    // 4.5. Check for re-absorption of emitted particles
    this.checkReabsorption();

    // 5. Boundaries
    let playedBounceSound = false;
    let maxImpactSpeed = 0;

    for (const p of this.particles) {
      const r = config.particleRadius;
      const bounce = 0.5;

      // Floor
      if (p.position.y > this.height - r) {
        const impactSpeed = Math.abs(p.velocity.y);
        p.position.y = this.height - r;
        p.velocity.y *= -bounce;
        // Floor friction
        p.velocity.x *= 0.9;

        // Track impact speed for sound
        if (impactSpeed > maxImpactSpeed) {
          maxImpactSpeed = impactSpeed;
        }
        playedBounceSound = true;
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

    // Play bounce sound if there was a significant impact and cooldown allows
    if (playedBounceSound && maxImpactSpeed > 50 && this.bounceSoundCooldown <= 0) {
      const intensity = Math.min(maxImpactSpeed / 300, 1);
      this.onSoundEvent?.({ type: 'bounce', intensity });
      this.bounceSoundCooldown = 0.1; // 100ms cooldown
    }

    // Update bounce sound cooldown
    if (this.bounceSoundCooldown > 0) {
      this.bounceSoundCooldown -= dt;
    }
  }
}