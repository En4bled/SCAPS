# Changelog - SCAPS

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-05-10 - *Production Release: AI & Physics Overhaul*
### Added
- **AI Engine (Relentless Pursuit V9)**: 
    - Implemented a high-frequency, deterministic pathfinding algorithm for autonomous agents.
    - Added boundary-check heuristics to prevent wall-collision locking.
    - Integrated tactical maneuver prioritization: rotation-first steering for targets at wide angles.
- **Physics Engine Refinement**:
    - Implemented 1D Elastic Impulse resolution for car-to-car collisions.
    - Added momentum-preserving wall bounce logic with speed clamping to ensure physical consistency.
    - Optimized collision detection for non-rectangular field boundaries.

### Fixed
- **Syntax Integrity**: Resolved recurring `SyntaxError` caused by redundant termination braces in `physics.js`.
- **Handling & Agility**: Corrected steering dampening issues; vehicles now maintain 80% maneuverability at terminal velocity.
- **Goal Trapping**: Resolved AI states that caused bots to become unresponsive within goal net geometry.

## [0.9.0] - 2026-05-10 - *Cinematic Implementation*
### Added
- **Cinematic Sequence Manager**: Implemented a 3-second orchestrated start sequence with dynamic focal length adjustment (initial zoom 0.1).
- **Audio Spatialization**: Refined audio feedback for wall and car impacts based on velocity magnitude.

### Changed
- **Global Scaling**: Uniformly increased entity dimensions by 50% to enhance gameplay visibility and collision detection accuracy.

## [0.8.0] - 2026-05-10 - *UI & Personalization Architecture*
### Added
- **Asynchronous Personalization Suite**: Persistence for player names and vehicle asset selection.
- **Gallery Pagination**: Implemented O(1) paging logic for map and vehicle selectors to optimize DOM performance.

## [0.7.0] - 2026-05-10 - *Audio Engine & UX Integration*
### Added
- **Dynamic Playlist Controller**: Implemented a shuffle-based audio playback system with metadata notification overlays.
- **In-Game Settings**: Integrated real-time audio volume and mute controls within the pause menu state.

## [0.6.0] - 2026-05-10 - *Level Design Suite (Editor)*
### Added
- **Decoupled Goal Logic**: Independent definition of physical goal triggers and visual net sprites.
- **Grid Snapping Heuristics**: Improved precision for level design via coordinate quantization.
