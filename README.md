# SCAPS: Sports-Car Arena Physics Simulation

SCAPS is a high-performance 2D physics engine and game framework inspired by vehicular soccer dynamics. Developed using a pure web-stack approach (HTML5, CSS3, and JavaScript ES6+), it provides a robust environment for real-time simulation, competitive AI behavior, and interactive level design.

## 🛠 Technical Stack
- **Core Logic**: Vanilla JavaScript (ES6 Modules)
- **Rendering Engine**: HTML5 Canvas API (2D Context)
- **Styling & UI**: CSS3 Custom Properties & Flexbox/Grid
- **Data Persistence**: JSON-based configuration and level storage

## 🚀 Key Features

### 1. Advanced Physics Engine
- **Collision Resolution**: Real-time Impulse-based collision handling for Car-to-Car and Car-to-Ball interactions.
- **Dynamic Maneuverability**: Advanced vehicle handling including traction loss (drifting), torque-based steering, and acceleration curves.
- **Elastic Momentum**: Physically accurate momentum transfer between entities, preventing overlapping and ensuring consistent bounce vectors.

### 2. Autonomous Intelligence (AI Striker V11 Experimental)
- **Deterministic Steering**: Math-corrected angular resolution to eliminate orbiting and ensure immediate ball-facing vectors.
- **Throttle Gating**: Advanced speed management where bots actively brake on sharp turns (>17°) to prevent overshooting.
- **Fail-Safe Recovery**: Aggressive anti-stuck logic based on low-velocity frame-counting to execute escape maneuvers.

### 3. Real-Time Physics Editor
- **Hot-Swapping**: Modify vehicle speed, traction, and ball collision properties instantly during gameplay.
- **UI Overlay**: Dedicated pause-overlay toggled via the `º` key for testing balancing changes without reloading.

### 4. Integrated Map Editor (Level Design Suite)
- **Visual Mapping**: WYSIWYG interface for defining field boundaries, goal zones, and spawn points.
- **Z-Axis Simulation (Ramps)**: Walls act as ramps, propelling the ball into the air (`onWallTimer`) and passing cleanly over vehicles.
- **Asset Management**: Dynamic JSON loading for custom field textures and arena configurations.

## 🎮 Input Specification
| Action | Key Mapping |
| :--- | :--- |
| **Movement** | `W`, `A`, `S`, `D` |
| **Nitro (Boost)** | `Left Shift` |
| **Evasion (Drift)** | `Left Control` |
| **Camera Toggle** | `V` |
| **Scoreboard** | `Tab` |
| **Pause Menu** | `Esc` |

## 📦 Project Structure
- `/js/core`: System constants and engine initialization.
- `/js/world`: Physics solver, collision detection, and field rendering.
- `/js/entities`: Modular classes for Vehicles and Ball physics.
- `/js/ui`: Scene management and interface interactions.
- `editor.html`: Dedicated level design environment.

---
*Developed by En4bLeD_ & Antigravity Assistant. 2026.*
