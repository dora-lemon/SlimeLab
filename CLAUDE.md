# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A particle-based fluid simulation (slime physics lab) built with React 19, TypeScript, and Vite. The app uses a "particle fluid" model where particles interact via repulsion (pressure) and attraction (cohesion) forces, visualized with metaball rendering to create a slime-like appearance.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (runs on port 3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

The app requires a Gemini API key for the AI chat functionality. Create a `.env.local` file:

```
GEMINI_API_KEY=your_api_key_here
```

The API key is injected into the app via Vite's `define` config in `vite.config.ts` and accessed as `process.env.API_KEY` or `process.env.GEMINI_API_KEY`.

## Architecture

### Core Components

- **App.tsx**: Main layout with 3-column grid (Controls, Simulation, Chat)
- **SimulationCanvas.tsx**: Canvas rendering with physics loop, mouse/touch interaction
- **Controls.tsx**: Parameter sliders for physics properties
- **ChatPanel.tsx**: AI chat interface powered by Gemini

### Physics Engine (`services/physicsEngine.ts`)

The `PhysicsEngine` class implements a particle-based fluid simulation:

1. **Initialization**: Spawns particles in a circular cluster, with first 2 particles designated as "eyes" (type: 'eye')
2. **Update Loop** (60 FPS):
   - Reset forces and apply gravity
   - **O(N²) inter-particle interactions**:
     - Short-range repulsion (pressure) - prevents overlap
     - Medium-range attraction (cohesion) - holds particles together
   - Mouse/touch force field interaction
   - Velocity Verlet integration with damping (viscosity)
   - Boundary collision with bounce and floor friction

### Rendering (`SimulationCanvas.tsx`)

Multi-pass rendering approach:

1. **Pass 1 (Blob Mode)**: Draw all particles with SVG filter `url(#goo)` which uses Gaussian blur + color matrix threshold to create metaball effect
2. **Pass 2**: Draw semi-transparent particle nuclei (body only, not eyes)
3. **Pass 3**: Draw eyes with pupils that track mouse position

The "goo" SVG filter is defined inline in the component:
- `feGaussianBlur`: Blurs particles
- `feColorMatrix`: High contrast threshold creates smooth envelope
- `feComposite`: Composites with original

### AI Service (`services/geminiService.ts`)

- Uses `@google/genai` SDK with `gemini-3-flash-preview` model
- Constructs context string with current simulation parameters
- System prompt defines the AI as a "Physics Professor" specializing in CFD and soft body simulations

### Data Flow

```
App.tsx (state: SimulationConfig)
  ├── Controls.tsx (updates config via onChange)
  ├── SimulationCanvas.tsx (reads config, creates PhysicsEngine)
  └── ChatPanel.tsx (passes config to Gemini for context)
```

### Key Types (`types.ts`)

- `Vector2`: Simple x,y coordinate
- `Particle`: Physics entity with position, velocity, force, mass, type ('body'|'eye')
- `SimulationConfig`: All tweakable parameters
- `ChatMessage`: Role + text for AI chat

### Constants (`constants.ts`)

- `DEFAULT_CONFIG`: Baseline simulation parameters
- `CANVAS_WIDTH/HEIGHT`: 800x600 internal resolution
- `TIME_STEP`: 1/60 (fixed timestep)
- Color constants for slime rendering

## TypeScript Configuration

- Uses `@/*` path alias for root imports
- JSX mode: `react-jsx`
- Target: ES2022 with DOM lib
- Module resolution: "bundler" mode

## Styling

- Tailwind CSS via CDN in `index.html`
- Custom emerald-450 color defined in Tailwind config
- Inter font family
- Custom scrollbar styling

## Import Maps

Dependencies are loaded via ESM (esm.sh CDN) defined in `index.html` import map. This is unusual for a Vite project but enables the app to work in specific deployment environments.

## Implementation Notes

- Particle count changes trigger PhysicsEngine re-initialization (useEffect dependency in SimulationCanvas)
- Canvas coordinate mapping accounts for CSS scaling via `getBoundingClientRect()`
- Touch and mouse events are both handled for mobile support
- Physics is O(N²) - acceptable for N < 300 particles in JavaScript
- Eyes (first 2 particles) are physically part of the simulation but rendered differently
