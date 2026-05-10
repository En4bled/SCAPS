/**
 * CONFIGURACIÓN DINÁMICA DE SCAPS
 * Este objeto centraliza todos los parámetros. Los cambios aquí se reflejan en todo el motor.
 */

export const CONFIG = {
    // Dimensiones del Mundo
    WORLD_W: 4000,
    WORLD_H: 3000,

    // Fondo y Estética
    BG_IMG_PATH: 'res/Estadio1.png',
    BG_SCALE: 1.638,
    BG_OFFSET_X: 0,
    BG_OFFSET_Y: 0,

    // Área de Juego (Hitbox principal)
    FIELD_POLYGON: [
        { "x": 912, "y": 617 }, { "x": 3182, "y": 632 },
        { "x": 3326, "y": 782 }, { "x": 3310, "y": 2310 },
        { "x": 3176, "y": 2459 }, { "x": 912, "y": 2439 },
        { "x": 783, "y": 2320 }, { "x": 768, "y": 777 }
    ],

    // Porterías (Top = Izquierda, Bottom = Derecha en modo horizontal)
    GOAL_TOP: { "x": 600, "y": 1500, "w": 800, "d": 200, "netX": 600, "netY": 1500, "netW": 800, "netD": 200 },
    GOAL_BOTTOM: { "x": 3400, "y": 1500, "w": 800, "d": 200, "netX": 3400, "netY": 1500, "netW": 800, "netD": 200 },

    // Spawns (Posiciones de inicio)
    SPAWN_POINTS: [
        { "x": 1100, "y": 1500, "a": 1.57 },
        { "x": 1300, "y": 1100, "a": 1.8 },
        { "x": 2900, "y": 1500, "a": -1.57 },
        { "x": 2700, "y": 1900, "a": -1.8 }
    ],

    // Boosts
    BOOST_POSITIONS: [
        { "x": 2000, "y": 750, "isBig": true }, { "x": 2000, "y": 2250, "isBig": true },
        { "x": 800, "y": 800, "isBig": false }, { "x": 3200, "y": 800, "isBig": false },
        { "x": 800, "y": 2200, "isBig": false }, { "x": 3200, "y": 2200, "isBig": false }
    ],

    // Físicas de Coche
    CAR_ACCEL: 0.022,
    CAR_MAX_SPEED: 1.8,
    CAR_BOOST_ACCEL: 0.045,
    CAR_TURN_SPEED: 0.042,
    CAR_FRICTION: 0.985,
    CAR_WIDTH: 60,
    CAR_HEIGHT: 100,
    CAR_HITBOX_RADIUS: 45,
    CAR_REVERSE_ACCEL: 0.04,
    CAR_MAX_BOOST_SPEED: 3.2,
    CAR_BOOST_CONSUMPTION: 0.35,
    CAR_DRIFT_TURN_MULTIPLIER: 2.8,
    CAR_CAR_PUSHBACK_BASE: 3.0,
    CAR_CAR_PUSHBACK_VEL_FACTOR: 1.2,
    CAR_WALL_BOUNCE: 0.8,

    // Físicas de Balón
    BALL_BOUNCINESS: 1.3,
    BALL_FRICTION: 0.993,
    BALL_HIT_FORCE: 4.8,
    BALL_MAX_SPEED: 6.5,
    BALL_BASE_RADIUS: 55,
    BALL_WALL_SLOWDOWN_FACTOR: 0.4,
    BALL_WALL_VISUAL_MULTIPLIER: 1.6,
    BALL_WALL_DURATION: 60,

    // Otros
    KICKOFF_RANDOM_OFFSET: 50,
    FIELD_MARGIN: 200,
    GOAL_WIDTH: 400,
    FRONTAL_COLLISION_THRESHOLD: 0.8,
    DEMOLITION_MIN_SPEED_FACTOR: 0.85,
    DEMOLITION_MULTIPLIER: 2.0
};

/**
 * Sobrescribe la configuración actual con datos externos (ej: de un JSON de mapa)
 */
export function applyExternalConfig(data) {
    if (!data) return;
    
    if (data.worldW) CONFIG.WORLD_W = data.worldW;
    if (data.worldH) CONFIG.WORLD_H = data.worldH;
    if (data.bgUrl) CONFIG.BG_IMG_PATH = data.bgUrl;
    if (data.bgScale) CONFIG.BG_SCALE = data.bgScale;
    if (data.bgOX !== undefined) CONFIG.BG_OFFSET_X = data.bgOX;
    if (data.bgOY !== undefined) CONFIG.BG_OFFSET_Y = data.bgOY;
    if (data.poly) CONFIG.FIELD_POLYGON = data.poly;
    if (data.goals) {
        CONFIG.GOAL_TOP = data.goals.top;
        CONFIG.GOAL_BOTTOM = data.goals.bottom;
    }
    if (data.spawns) CONFIG.SPAWN_POINTS = data.spawns;
    if (data.boosts) {
        CONFIG.BOOST_POSITIONS = data.boosts.map(b => ({ x: b.x, y: b.y, isBig: b.big }));
    }
}