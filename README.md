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

### 2. Autonomous Intelligence (AI Striker V9)
- **Heuristic Navigation**: High-frequency pathfinding focused on ball-interception and target alignment.
- **Spatial Awareness**: Boundary-detection system using polygon-based repulsion to maintain arena positioning.
- **Tactical Utility**: Adaptive use of Boost and Drift mechanics for competitive play and rapid repositioning.

### 3. Integrated Map Editor (Level Design Suite)
- **Visual Mapping**: WYSIWYG interface for defining field boundaries, goal zones, and spawn points.
- **Decoupled Architecture**: Separation of collision hitboxes from visual net representations for maximum design flexibility.
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
