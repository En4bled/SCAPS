/**
 * CONFIGURACIÓN DINÁMICA DE SCAPS
 * Este objeto centraliza todos los parámetros. Los cambios aquí se reflejan en todo el motor.
 */

export const CONFIG = {
    VERSION: '1.6.0 - STABLE',
    // Iluminación Dinámica
    AMBIENT_LIGHT: 0.4, // 0.0 (total oscuridad) a 1.0 (día total)
    LIGHT_SOURCES: [
        { x: 500, y: 500, intensity: 0.8, radius: 1500, color: 'rgba(255, 255, 255, 0.15)' },
        { x: 3500, y: 500, intensity: 0.8, radius: 1500, color: 'rgba(255, 255, 255, 0.15)' },
        { x: 500, y: 2500, intensity: 0.8, radius: 1500, color: 'rgba(255, 255, 255, 0.15)' },
        { x: 3500, y: 2500, intensity: 0.8, radius: 1500, color: 'rgba(255, 255, 255, 0.15)' }
    ],
    // Dimensiones del Mundo
    WORLD_W: 4000,
    WORLD_H: 3000,

    // Fondo y Estética
    BG_IMG_PATH: 'recursos/stadiums/estadio1.png',
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
    CAR_ACCEL: 0.045,
    CAR_MAX_SPEED: 2.0,
    CAR_BOOST_ACCEL: 0.075,
    CAR_TURN_SPEED: 0.05,
    CAR_FRICTION: 0.985,
    CAR_WIDTH: 60,
    CAR_HEIGHT: 100,
    CAR_HITBOX_RADIUS: 45,
    CAR_REVERSE_ACCEL: 0.05,
    CAR_MAX_BOOST_SPEED: 3.5,
    CAR_BOOST_CONSUMPTION: 0.35,
    CAR_DRIFT_TURN_MULTIPLIER: 2.8,
    CAR_CAR_PUSHBACK_BASE: 3.0,
    CAR_CAR_PUSHBACK_VEL_FACTOR: 1.2,
    CAR_WALL_BOUNCE: 0.3,
    
    // Decoupled Physics & Acrobatics
    CAR_LATERAL_GRIP_NORMAL: 0.68,     // Agarre lateral en conducción normal (multiplicador por frame, menor = más agarre)
    CAR_LATERAL_GRIP_DRIFT: 0.92,      // Agarre lateral reducido al derrapar (multiplicador por frame, mayor = más deslizamiento)
    CAR_ELASTICITY: 0.45,              // Elasticidad en colisión coche-coche (restitución)
    CAR_WALL_RESTITUTION: 0.6,         // Elasticidad al chocar contra las paredes
    CAR_JUMP_FORCE: 4.6,               // Fuerza inicial de salto vertical en Z
    CAR_GRAVITY: 0.22,                 // Gravedad aplicada al coche en Z
    CAR_FLIP_IMPULSE: 1.2,            // Impulso horizontal añadido por el Front/Back Flip (más sutil y controlado)
    CAR_FLIP_DURATION: 32,             // Duración en frames de la animación de voltereta y Power Shot (alineada con la caída)

    // Físicas de Balón
    BALL_BOUNCINESS: 0.85, // 1.3 rompía las leyes de la termodinámica generando energía de la nada
    BALL_FRICTION: 0.985, // Más fricción en el césped (el aire usará 0.998)
    BALL_HIT_FORCE: 10.0, // Aumentado para tiros mucho más potentes (antes 7.5)
    BALL_MAX_SPEED: 25.0, // Subido masivamente (antes 14) porque ahora tenemos red de seguridad anti-tunneling
    BALL_BASE_RADIUS: 55,
    BALL_WALL_SLOWDOWN_FACTOR: 0.8, // Las paredes no deben frenar tanto al balón
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
    if (data.ambientLight !== undefined) CONFIG.AMBIENT_LIGHT = data.ambientLight;
    if (data.lights) CONFIG.LIGHT_SOURCES = data.lights;
}

/**
 * Helper dinámico para resolver rutas absolutas a recursos en XAMPP o servidores raíz.
 * Convierte automáticamente todas las rutas a minúsculas para compatibilidad absoluta
 * con servidores Linux case-sensitive y despliegues locales.
 */
export function getAssetPath(relativePath) {
    if (!relativePath) return '';
    
    // Ignorar si ya es una ruta absoluta o una cadena base64 de datos
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://') || relativePath.startsWith('data:')) {
        return relativePath;
    }

    // Normalizar la ruta a minúsculas
    let cleanPath = relativePath.toLowerCase();

    // Eliminar barra inicial si la tiene
    if (cleanPath.startsWith('/')) {
        cleanPath = cleanPath.substring(1);
    }

    // Calcular la ruta base dinámica a partir del pathname actual
    const pathSegments = window.location.pathname.split('/');
    pathSegments.pop(); // Elimina index.html u otro archivo de la URL
    const basePath = pathSegments.join('/') + '/';

    return window.location.origin + basePath + cleanPath;
}