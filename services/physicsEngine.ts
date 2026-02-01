import { Particle, Vector2, SimulationConfig, KeyboardInput, Enemy, GameState } from '../types';
import {
  ENEMY_SIZE,
  ENEMY_SPEED,
  ENEMY_DAMAGE,
  ENEMY_COLOR,
  ENEMY_COUNT,
  ENEMY_MAX_HEALTH,
  ENEMY_HIT_COOLDOWN,
  INVINCIBILITY_TIME,
  MAX_HEALTH,
  PARTICLE_MAX_HEALTH,
  PARTICLE_HEALTH_DECAY,
  PARTICLE_DAMAGE,
  TIME_STEP
} from '../constants';

// 音效事件类型
export type SoundEvent = {
  type: 'jump' | 'launch' | 'bounce' | 'reabsorb' | 'hurt' | 'gameOver' | 'enemyHit' | 'particleDeath';
  intensity?: number;
};

// 游戏状态变化事件
export type GameStateEvent = {
  isGameOver: boolean;
  particleCount?: number;
};

export class PhysicsEngine {
  particles: Particle[] = [];
  enemies: Enemy[] = [];
  gameState: GameState;
  width: number;
  height: number;
  private initialParticleCount: number; // Save for reset

  // Sound event callback
  onSoundEvent?: (event: SoundEvent) => void;

  // Game state change callback
  onGameStateChange?: (state: GameStateEvent) => void;

  // Jump state
  private jumpCooldown: number = 0;
  private jumpWasPressed: boolean = false;

  // Collision sound cooldown (prevent too many sounds)
  private bounceSoundCooldown: number = 0;

  // Enemy hit cooldowns (map enemyId -> cooldown time)
  private enemyHitCooldowns: Map<number, number> = new Map();

  constructor(width: number, height: number, particleCount: number) {
    this.width = width;
    this.height = height;
    this.initialParticleCount = particleCount;
    this.gameState = {
      isGameOver: false
    };
    this.initSlime(particleCount);
    this.initEnemies(ENEMY_COUNT);
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
        isEmitted: false, // Initially all particles are in-body
        health: 100, // All particles start with health
        maxHealth: 100
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

    // Set particle health
    selectedParticle.health = PARTICLE_MAX_HEALTH;
    selectedParticle.maxHealth = PARTICLE_MAX_HEALTH;

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

    // Get indices of alive particles only
    const aliveIndices: number[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].health === undefined || this.particles[i].health > 0) {
        aliveIndices.push(i);
      }
    }

    // Build adjacency list for alive particles only
    const adjacency = new Map<number, Set<number>>();
    for (const i of aliveIndices) {
      adjacency.set(i, new Set());
    }

    // Find connections between particles using the connection check function
    for (let idx = 0; idx < aliveIndices.length; idx++) {
      for (let jdx = idx + 1; jdx < aliveIndices.length; jdx++) {
        const i = aliveIndices[idx];
        const j = aliveIndices[jdx];
        const pA = this.particles[i];
        const pB = this.particles[j];

        if (this.areParticlesConnected(pA, pB, interactionRadius)) {
          adjacency.get(i)!.add(j);
          adjacency.get(j)!.add(i);
        }
      }
    }

    // BFS to find connected components
    for (const i of aliveIndices) {
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
    const bodyParticles = this.particles.filter(p => p.type !== 'eye' && (p.health === undefined || p.health > 0));

    for (const p of this.particles) {
      // Skip dead particles
      if (p.health !== undefined && p.health <= 0) continue;

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

  // Initialize enemies with patrol paths
  initEnemies(count: number) {
    this.enemies = [];
    for (let i = 0; i < count; i++) {
      // Generate random patrol path (3-4 points along the ground)
      const numPoints = 3 + Math.floor(Math.random() * 2);
      const patrolPoints: Vector2[] = [];

      // Random starting region (avoiding center where slime spawns)
      const side = i % 2; // 0 = left side, 1 = right side
      const baseX = side === 0 ? this.width * 0.25 : this.width * 0.75;

      // Ground level (accounting for enemy size)
      const groundY = this.height - ENEMY_SIZE / 2 - 4;

      for (let j = 0; j < numPoints; j++) {
        patrolPoints.push({
          x: baseX + (Math.random() - 0.5) * 200,
          y: groundY
        });
      }

      this.enemies.push({
        id: i,
        position: { ...patrolPoints[0] },
        velocity: { x: 0, y: 0 },
        size: ENEMY_SIZE,
        patrolPoints,
        currentPatrolIndex: 0,
        patrolSpeed: ENEMY_SPEED + Math.random() * 40,
        damage: ENEMY_DAMAGE,
        color: ENEMY_COLOR,
        health: ENEMY_MAX_HEALTH,
        maxHealth: ENEMY_MAX_HEALTH,
        isDead: false
      });
    }
  }

  // Update enemy positions along patrol paths
  updateEnemies(dt: number) {
    if (this.gameState.isGameOver) return;

    for (const enemy of this.enemies) {
      // Get current target patrol point
      const target = enemy.patrolPoints[enemy.currentPatrolIndex];
      const dx = target.x - enemy.position.x;
      const dy = target.y - enemy.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Move towards target
      if (dist > 5) {
        const moveX = (dx / dist) * enemy.patrolSpeed * dt;
        const moveY = (dy / dist) * enemy.patrolSpeed * dt;
        enemy.position.x += moveX;
        enemy.position.y += moveY;
      } else {
        // Reached target, move to next point
        enemy.currentPatrolIndex = (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length;
      }
    }
  }

  // Check collisions between enemies and slime particles
  checkEnemyCollisions() {
    // Update enemy hit cooldowns
    for (const [enemyId, cooldown] of this.enemyHitCooldowns) {
      if (cooldown > 0) {
        this.enemyHitCooldowns.set(enemyId, cooldown - TIME_STEP);
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead) continue;

      const halfSize = enemy.size / 2;
      const hitCooldown = this.enemyHitCooldowns.get(enemy.id) || 0;

      for (const particle of this.particles) {
        // Skip dead particles
        if (particle.health !== undefined && particle.health <= 0) continue;

        // Check if particle is inside enemy bounds (AABB collision)
        const particleLeft = particle.position.x - particle.radius;
        const particleRight = particle.position.x + particle.radius;
        const particleTop = particle.position.y - particle.radius;
        const particleBottom = particle.position.y + particle.radius;

        const enemyLeft = enemy.position.x - halfSize;
        const enemyRight = enemy.position.x + halfSize;
        const enemyTop = enemy.position.y - halfSize;
        const enemyBottom = enemy.position.y + halfSize;

        if (particleRight > enemyLeft &&
            particleLeft < enemyRight &&
            particleBottom > enemyTop &&
            particleTop < enemyBottom) {

          // Emitted particle hits enemy - damage enemy
          if (particle.isEmitted) {
            if (hitCooldown <= 0) {
              this.damageEnemy(enemy, PARTICLE_DAMAGE);
              this.enemyHitCooldowns.set(enemy.id, ENEMY_HIT_COOLDOWN);
              // Destroy the particle on hit
              particle.health = 0;
              this.onSoundEvent?.({ type: 'particleDeath' });
            }
          }
          // Main body particle hits enemy - kill the particle
          else if (!particle.isEmitted) {
            particle.health = 0;
            this.onSoundEvent?.({ type: 'hurt' });
          }
        }
      }
    }
  }

  // Damage an enemy
  damageEnemy(enemy: Enemy, amount: number) {
    enemy.health = Math.max(0, enemy.health - amount);
    this.onSoundEvent?.({ type: 'enemyHit' });

    // Check if enemy died
    if (enemy.health <= 0) {
      enemy.isDead = true;
    }
  }

  // Update particles (remove dead ones, check game over)
  updateEmittedParticles(dt: number) {
    const particlesToRemove: number[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      // Check if already dead
      if (p.health !== undefined && p.health <= 0) {
        particlesToRemove.push(i);
      }
    }

    // Remove dead particles (from highest index to lowest)
    for (let i = particlesToRemove.length - 1; i >= 0; i--) {
      const idx = particlesToRemove[i];
      this.particles.splice(idx, 1);
    }

    // Check game over: no particles left
    if (this.particles.length === 0 && !this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.onGameStateChange?.({
        isGameOver: true,
        particleCount: 0
      });
      this.onSoundEvent?.({ type: 'gameOver' });
    } else if (!this.gameState.isGameOver) {
      // Notify particle count
      this.onGameStateChange?.({
        isGameOver: false,
        particleCount: this.particles.length
      });
    }
  }

  // Reset game
  resetGame() {
    this.gameState = {
      isGameOver: false
    };
    this.enemyHitCooldowns.clear();

    // Reset slime position
    this.initSlime(this.initialParticleCount);

    // Reset enemies
    this.initEnemies(ENEMY_COUNT);

    // Notify state change
    this.onGameStateChange?.({
      isGameOver: false,
      particleCount: this.particles.length
    });
  }

  update(dt: number, config: SimulationConfig, mousePos: Vector2 | null, isDragging: boolean, keyboardInput?: KeyboardInput) {
    const N = this.particles.length;

    // Find the main group (largest connected component)
    const mainGroup = this.findMainGroup(config.interactionRadius);

    // 1. Reset Forces & Apply Gravity
    for (let i = 0; i < N; i++) {
      const p = this.particles[i];
      // Skip dead particles
      if (p.health !== undefined && p.health <= 0) continue;
      p.force.x = 0;
      p.force.y = p.mass * config.gravity;
    }

    // 2. Inter-particle Interactions (O(N^2) - acceptable for N < 300 in JS)
    // We combine Repulsion (keep apart) and Attraction (hold together)
    for (let i = 0; i < N; i++) {
      const pA = this.particles[i];
      // Skip dead particles
      if (pA.health !== undefined && pA.health <= 0) continue;

      for (let j = i + 1; j < N; j++) {
        const pB = this.particles[j];
        // Skip dead particles
        if (pB.health !== undefined && pB.health <= 0) continue;

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
      // Skip dead particles
      if (p.health !== undefined && p.health <= 0) continue;

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
      // Skip dead particles
      if (p.health !== undefined && p.health <= 0) continue;

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

    // 6. Update enemies
    this.updateEnemies(dt);

    // 6.5. Update emitted particles (health decay)
    this.updateEmittedParticles(dt);

    // 7. Check enemy collisions (skip if game over)
    if (!this.gameState.isGameOver) {
      this.checkEnemyCollisions();
    }
  }
}