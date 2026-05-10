// =============================================
// SCAPS constants.js — VERSIÓN RECUPERACIÓN
// =============================================

export let WORLD_W = 4000;
export let WORLD_H = 3000;

export let BG_IMG_PATH = 'res/Estadio1.png';
export let BG_SCALE = 1.0; 
export let BG_OFFSET_X = 0;
export let BG_OFFSET_Y = 0;

export let FIELD_POLYGON = [
    { "x": 1000, "y": 600 }, { "x": 3000, "y": 600 },
    { "x": 3400, "y": 1000 }, { "x": 3400, "y": 2000 },
    { "x": 3000, "y": 2400 }, { "x": 1000, "y": 2400 },
    { "x": 600, "y": 2000 }, { "x": 600, "y": 1000 }
];

export let GOAL_TOP = { "x": 600, "y": 1500, "w": 800, "d": 200 }; 
export let GOAL_BOTTOM = { "x": 3400, "y": 1500, "w": 800, "d": 200 }; 

export let SPAWN_POINTS = [
    { "x": 1100, "y": 1500, "a": 1.57 },
    { "x": 1300, "y": 1100, "a": 1.8 },
    { "x": 2900, "y": 1500, "a": -1.57 },
    { "x": 2700, "y": 1900, "a": -1.8 }
];

export let BOOST_POSITIONS = [
    { "x": 2000, "y": 750, "isBig": true }, { "x": 2000, "y": 2250, "isBig": true },
    { "x": 800, "y": 800, "isBig": false }, { "x": 3200, "y": 800, "isBig": false },
    { "x": 800, "y": 2200, "isBig": false }, { "x": 3200, "y": 2200, "isBig": false }
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