# SCAPS Technical Documentation
**Current Version:** 1.0.0 - Production Core

## 1. System Architecture Overview
SCAPS is designed as a modular, event-driven game engine. The architecture is decoupled into specialized modules for rendering, physics resolution, AI decision-making, and state management.

### Primary Technologies:
- **Language**: JavaScript (ECMAScript 2022+)
- **Environment**: Web Browser (Client-side)
- **API**: HTML5 Canvas (2D) for rendering, Web Audio API for sound processing.

---

## 2. Core Modules

### 2.1. Main Execution Loop (`js/main.js`)
The `main.js` script serves as the entry point and primary game loop controller.
- **Clock Management**: Implements a `requestAnimationFrame` loop operating at a target 60FPS.
- **Scene Management**: A state machine controls the transitions between `intro`, `menu`, `matchSetup`, `playing`, and `paused` states.
- **Entity Orchestration**: Coordinates the lifecycle and rendering order of cars, ball, particles, and UI overlays.

### 2.2. Physics Engine and Collision Solver (`js/world/physics.js`)
The physics module handles spatial partitioning and collision resolution.
- **Collision Detection**: 
    - **Circle-Polygon**: Used for ball/car-to-wall interactions.
    - **Circle-Circle**: Used for car-to-car and car-to-ball interactions.
- **Impulse Resolution**: Implements 1D elastic collision formulas to handle momentum transfer and restitution (bounciness).
- **Position Correction**: Uses overlap resolution (Minkowski Sum principles) to prevent entity interpenetration.

### 2.3. Autonomous Intelligence: Relentless Pursuit V9
The AI module (`updateCarAI`) implements a deterministic pursuit algorithm.
- **Vector-based Steering**: Calculates the normalized direction vector toward the target (the ball).
- **Angular Alignment**: Prioritizes rotational alignment; if the angular difference exceeds threshold, the bot utilizes deceleration and drifting to pivot.
- **Spatial Constraints**: Integrates a boundary-aware repulsion system using coordinate clamping and field polygon checks to maintain arena presence and avoid goal-net trapping.

### 2.4. Entity Definition (`js/entities/`)
- **Vehicle Physics (`Car.js`)**: Implements traction, acceleration curves, and steering torque. Features dynamic `speedFactor` steering which adjusts maneuverability based on velocity.
- **Ball Dynamics (`Ball.js`)**: Handles friction, terminal velocity, and visual Z-axis simulation (scaling) for "lift" effects.

---

## 3. Map Data and Rendering
Arenas are defined as JSON objects containing:
- **FIELD_POLYGON**: Defines the physical collision boundaries of the arena.
- **GOAL_DATA**: Defines the coordinate triggers for scoring.
- **Visual Offsets**: Decoupled visual sprites from collision data to support diverse aesthetic styles.

## 4. Development Workflow
The system includes a dedicated Map Editor (`editor.html`) that allows for visual manipulation of JSON arena data, including grid-snapping for coordinate precision and real-time visualization of goal triggers.

---
*Documentation updated: May 2026.*
