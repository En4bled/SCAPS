// =============================================
// SCAPS constants.js — VERSIÓN RECUPERACIÓN
// =============================================

export let WORLD_W = 2800;
export let WORLD_H = 3600;

export let BG_IMG_PATH = 'res/Estadio0.png';
export let BG_SCALE = 2.2090;
export let BG_OFFSET_X = 261;
export let BG_OFFSET_Y = 43;

export let FIELD_POLYGON = [
    { "x": 492, "y": 224 }, { "x": 760, "y": 132 }, { "x": 1048, "y": 68 },
    { "x": 1352, "y": 40 }, { "x": 1640, "y": 36 }, { "x": 1952, "y": 68 },
    { "x": 2232, "y": 128 }, { "x": 2476, "y": 208 }, { "x": 2588, "y": 280 },
    { "x": 2680, "y": 696 }, { "x": 2724, "y": 1136 }, { "x": 2736, "y": 1568 },
    { "x": 2740, "y": 1960 }, { "x": 2720, "y": 2408 }, { "x": 2680, "y": 2848 },
    { "x": 2572, "y": 3272 }, { "x": 2488, "y": 3340 }, { "x": 2240, "y": 3420 },
    { "x": 1948, "y": 3492 }, { "x": 1636, "y": 3528 }, { "x": 1336, "y": 3524 },
    { "x": 1056, "y": 3484 }, { "x": 744, "y": 3424 }, { "x": 476, "y": 3332 },
    { "x": 380, "y": 3188 }, { "x": 320, "y": 2868 }, { "x": 288, "y": 2508 },
    { "x": 272, "y": 2144 }, { "x": 256, "y": 1788 }, { "x": 268, "y": 1416 },
    { "x": 292, "y": 1052 }, { "x": 320, "y": 684 }, { "x": 380, "y": 360 }
];

export let GOAL_TOP = { "x": 1239, "y": 401, "w": 390, "d": 151 };
export let GOAL_BOTTOM = { "x": 1239, "y": 3170, "w": 390, "d": 153 };
export let SPAWN_POINTS = [
    { "x": 1566, "y": 2408, "a": -0.45 },
    { "x": 710, "y": 2118, "a": 0.99 },
    { "x": 843, "y": 921, "a": 2.71 },
    { "x": 1676, "y": 1051, "a": -2.38 }
];
export let BOOST_POSITIONS = [
    { "x": 1928, "y": 3084, "isBig": true }, { "x": 540, "y": 3088, "isBig": true },
    { "x": 548, "y": 484, "isBig": true }, { "x": 1936, "y": 484, "isBig": true },
    { "x": 540, "y": 1784, "isBig": true }, { "x": 1944, "y": 1780, "isBig": true }
];

// Físicas Base
export let CAR_ACCEL = 0.10;
export let CAR_MAX_SPEED = 5.8;
export let CAR_BOOST_ACCEL = 0.22;
export let CAR_TURN_SPEED = 0.05;
export let CAR_FRICTION = 0.985;
export let BALL_BOUNCINESS = 0.85;
export let BALL_FRICTION = 0.992;
export let BALL_HIT_FORCE = 1.2;
export let BALL_MAX_SPEED = 20;

export let CAR_WIDTH = 40; 
export let CAR_HEIGHT = 70; 
export let CAR_HITBOX_RADIUS = 30;
export let CAR_REVERSE_ACCEL = 0.10; 
export let CAR_MAX_BOOST_SPEED = 9.5; 
export let CAR_BOOST_CONSUMPTION = 0.40; 
export let CAR_DRIFT_TURN_MULTIPLIER = 1.8; 
export let CAR_CAR_PUSHBACK_BASE = 0.5;
export let CAR_CAR_PUSHBACK_VEL_FACTOR = 0.3; 
export let BALL_BASE_RADIUS = 55; 
export let BALL_WALL_SLOWDOWN_FACTOR = 0.5;
export let BALL_WALL_VISUAL_MULTIPLIER = 1.6; 
export let BALL_WALL_DURATION = 60;
export let KICKOFF_RANDOM_OFFSET = 50;
export let FIELD_MARGIN = 200;
export let GOAL_WIDTH = 400;

// Constantes de Colisión y Demolición
export let FRONTAL_COLLISION_THRESHOLD = 0.8;
export let DEMOLITION_MIN_SPEED_FACTOR = 0.85;
export let DEMOLITION_MULTIPLIER = 2.0;

// Objeto PHYSICS para compatibilidad con el editor (opcional)
export const PHYSICS = {
    CAR_ACCEL, CAR_MAX_SPEED, CAR_BOOST_ACCEL, CAR_TURN_SPEED, CAR_FRICTION,
    BALL_BOUNCINESS, BALL_FRICTION, BALL_HIT_FORCE, BALL_MAX_SPEED
};

export function setConfig(k, v) { 
    if (k === 'WORLD_W') WORLD_W = v;
    if (k === 'WORLD_H') WORLD_H = v;
    if (k === 'BG_IMG_PATH') BG_IMG_PATH = v;
    if (k === 'BG_SCALE') BG_SCALE = v;
    if (k === 'BG_OFFSET_X') BG_OFFSET_X = v;
    if (k === 'BG_OFFSET_Y') BG_OFFSET_Y = v;
    if (k === 'FIELD_POLYGON') FIELD_POLYGON = v;
    if (k === 'GOAL_TOP') GOAL_TOP = v;
    if (k === 'GOAL_BOTTOM') GOAL_BOTTOM = v;
    if (k === 'SPAWN_POINTS') SPAWN_POINTS = v;
    if (k === 'BOOST_POSITIONS') BOOST_POSITIONS = v;
}

export async function loadPhysicsConfig() { return null; } // Desactivado para recuperación