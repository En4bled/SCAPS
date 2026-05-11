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

### 2.2. Physics Engine (`js/world/physics_experimental.js`)
The physics module handles spatial partitioning and collision resolution. Currently running on the **Experimental V11 Branch**.
- **Collision Detection**: 
    - **Circle-Polygon**: Used for ball/car-to-wall interactions.
    - **Circle-Circle**: Used for car-to-car and car-to-ball interactions.
- **Impulse Resolution**: Implements 1D elastic collision formulas to handle momentum transfer and restitution.
- **Detalles Matemáticos**: Ver [ESPECIFICACIONES_FISICAS.md](./ESPECIFICACIONES_FISICAS.md) para fórmulas de colisión y sistemas de coordenadas.
- **Z-Axis Simulation (Ramp Mechanics)**: The physics engine overrides 2D collision algorithms when the ball hits a wall, triggering an `onWallTimer`. During this state, the ball's sprite scales up (Zoom) and car-to-ball collision is temporarily suspended, simulating an aerial trajectory over the vehicles.

### 2.3. Autonomous Intelligence: Experimental V11
The AI module (`updateCarAI`) implements a hyper-optimized deterministic pursuit algorithm.
- **Coordinate System Alignment**: Corrects a fundamental math divergence between standard trigonometric space (where `atan2(0)` is Right) and the vehicle space (where angle `0` is Up). This math alignment guarantees zero-orbiting interception vectors.
- **Throttle Gating**: Active speed control based on angular difference (`absDiff`). Bots will release the throttle or brake hard if the target vector requires a turn sharper than ~17 degrees, optimizing the turning radius.
- **Hardware-Level Anti-Stuck**: Evaluates absolute velocity per frame. If velocity drops below a threshold for 30 consecutive frames, an emergency reverse-and-steer sequence overrides all other inputs.

### 2.4. Real-Time Physics Editor (`js/ui/physics_editor.js`)
- An interactive UI overlay that injects into the DOM and binds directly to `CONST.CONFIG` properties.
- Suspends the main game loop (`isPaused`) and allows hot-swapping of physical parameters (Friction, Bounciness, Torques) with immediate effect upon resumption.

### 2.5. Entity Definition (`js/entities/`)
- **Vehicle Physics (`Car.js`)**: Implements traction, acceleration curves, and steering torque. Features dynamic `speedFactor` steering which adjusts maneuverability based on velocity.
- **Ball Dynamics (`Ball.js`)**: Handles friction, terminal velocity, and visual Z-axis simulation (scaling) for "lift" effects.

### 2.6. Match Lifecycle & UI (`js/main.js` / `index.html`)
- **Cinematic Intro**: Hybrid Lerp system that blends map centering with player tracking during a 3-second zoom-in phase.
- **Asset Preloading**: Real-time asset decoding (`img.decode()`) during the "Loading Stadium" phase to eliminate frame-rate stutters.
- **Game Over System**: Dynamic end-game screen with winner detection, rematch logic, and session state persistence.

---

## 3. Map Data and Rendering
Arenas are defined as JSON objects containing:
- **FIELD_POLYGON**: Defines the physical collision boundaries of the arena.
- **GOAL_DATA**: Defines the coordinate triggers for scoring.
- **Visual Offsets**: Decoupled visual sprites from collision data to support diverse aesthetic styles.

## 4. Development Workflow
The system includes a dedicated Map Editor (`editor.html`) that allows for visual manipulation of JSON arena data, including grid-snapping for coordinate precision and real-time visualization of goal triggers.

---
*Documentation updated: May 2026 (Ref: V11 Physics & UI Update).*
