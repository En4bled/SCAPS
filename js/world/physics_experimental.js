import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';

/**
 * ARCHIVO EXPERIMENTAL V10 - IA REDESIGN
 * Implementa una arquitectura FSM + Steering Behaviors.
 */

// --- FUNCIONES DE COLISIÓN (Herencia de V9) ---

export function checkPolygonCollision(entity, polygon) {
    if (!polygon || polygon.length < 2) return;
    let closestDist = Infinity;
    let closestNormal = { x: 0, y: 0 };
    let hasCollision = false;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        let t = ((entity.x - p1.x) * dx + (entity.y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.sqrt((entity.x - projX) ** 2 + (entity.y - projY) ** 2);

        if (dist < entity.radius) {
            const nx = (entity.x - projX) / dist;
            const ny = (entity.y - projY) / dist;
            const overlap = entity.radius - dist;
            entity.x += nx * overlap;
            entity.y += ny * overlap;
            if (dist < closestDist) {
                closestDist = dist;
                closestNormal = { x: nx, y: ny };
                hasCollision = true;
            }
        }
    }

    if (hasCollision && entity.vx !== undefined) {
        const dot = entity.vx * closestNormal.x + entity.vy * closestNormal.y;
        if (dot < 0) {
            const bounce = (entity.onWallTimer !== undefined) ? CONST.CONFIG.BALL_BOUNCINESS : CONST.CONFIG.CAR_WALL_BOUNCE;
            entity.vx -= (1 + bounce) * dot * closestNormal.x;
            entity.vy -= (1 + bounce) * dot * closestNormal.y;
            if (entity.onWallTimer !== undefined) {
                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius * CONST.CONFIG.BALL_WALL_VISUAL_MULTIPLIER;
                playSound('wall_hit', 0.5);
            } else if (entity.speed !== undefined) {
                entity.speed = Math.sqrt(entity.vx**2 + entity.vy**2);
                entity.angle = Math.atan2(entity.vx, -entity.vy);
                playSound('wall_hit', 0.4);
            }
        }
    }
}

export function checkCarBallCollision(car, ball, touchHistory, gameTime) {
    // RAMP LOGIC: Si el balón está 'volando' tras chocar con la pared, los coches pasan por debajo
    if (ball.onWallTimer > 0) return;

    const dx = ball.x - car.x;
    const dy = ball.y - car.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = car.radius + ball.radius;

    if (distance < minDist) {
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - distance;
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;
        const relativeVelX = ball.vx - car.vx;
        const relativeVelY = ball.vy - car.vy;
        const dotProduct = relativeVelX * Math.cos(angle) + relativeVelY * Math.sin(angle);
        if (dotProduct < 0) {
            const impulse = Math.max(CONST.CONFIG.BALL_HIT_FORCE, -dotProduct * 1.5);
            ball.vx += Math.cos(angle) * impulse;
            ball.vy += Math.sin(angle) * impulse;
            ball.vx += Math.cos(car.angle) * (car.speed * 0.3);
            ball.vy += Math.sin(car.angle) * (car.speed * 0.3);
            ball.vx *= CONST.CONFIG.BALL_BOUNCINESS;
            ball.vy *= CONST.CONFIG.BALL_BOUNCINESS;
            ball.onWallTimer = 15; 
            ball.targetRadius = ball.radius * 1.35;
            playSound('ball_hit', 1.0);
        }
        touchHistory.push({ car, time: gameTime });
        if (touchHistory.length > 10) touchHistory.shift();
    }
}

export function checkCarCarCollision(carA, carB) {
    const dx = carB.x - carA.x;
    const dy = carB.y - carA.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = carA.radius + carB.radius;
    if (dist < minDist) {
        const angle = Math.atan2(dy, dx);
        const overlap = (minDist - dist) / 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);
        carA.x -= nx * overlap; carA.y -= ny * overlap;
        carB.x += nx * overlap; carB.y += ny * overlap;
        const vAx = Math.sin(carA.angle) * carA.speed;
        const vAy = -Math.cos(carA.angle) * carA.speed;
        const vBx = Math.sin(carB.angle) * carB.speed;
        const vBy = -Math.cos(carB.angle) * carB.speed;
        const relVx = vAx - vBx;
        const relVy = vAy - vBy;
        const relSpeedNormal = relVx * nx + relVy * ny;
        if (relSpeedNormal > 0) {
            const impulse = -(1.5) * relSpeedNormal / 2;
            const nVAx = vAx + impulse * nx; const nVAy = vAy + impulse * ny;
            const nVBx = vBx - impulse * nx; const nVBy = vBy - impulse * ny;
            carA.speed = Math.sqrt(nVAx**2 + nVAy**2);
            carA.angle = Math.atan2(nVAx, -nVAy);
            carB.speed = Math.sqrt(nVBx**2 + nVBy**2);
            carB.angle = Math.atan2(nVBx, -nVBy);
        }
        playSound('car_hit', 0.5);
    }
}

export function checkGoalPhysics(ball) {
    const goals = [CONST.CONFIG.GOAL_TOP, CONST.CONFIG.GOAL_BOTTOM];
    goals.forEach(g => {
        const isLeftGoal = (g.x < CONST.CONFIG.WORLD_W / 2);
        const bounds = {
            minX: isLeftGoal ? g.x - 10 : g.x - g.w + 10,
            maxX: isLeftGoal ? g.x + g.w - 10 : g.x + 10,
            minY: g.y,
            maxY: g.y + g.h
        };
        if (ball.x > bounds.minX && ball.x < bounds.maxX && ball.y > bounds.minY && ball.y < bounds.maxY) {
            if (ball.y < bounds.minY + 20 || ball.y > bounds.maxY - 20) ball.vy *= -0.8;
            if (isLeftGoal && ball.x < bounds.minX + 20) ball.vx *= -0.8;
            if (!isLeftGoal && ball.x > bounds.maxX - 20) ball.vx *= -0.8;
        }
    });
}

// --- NUEVA IA EXPERIMENTAL V10 ---

const AI_STATE = {
    IDLE: 'IDLE',
    KICKOFF: 'KICKOFF',
    PURSUIT: 'PURSUIT',
    ALIGN: 'ALIGN',
    RECOVER: 'RECOVER',
    UNSTUCK: 'UNSTUCK',
    AVOIDANCE: 'AVOIDANCE'
};
/**
 * IA DE LOS BOTS - EXPERIMENTAL V11 (Fix Matemático Definitivo)
 */
export function updateCarAI(ai, ball, boostPads, gameState, keysPressed, allCars) { 
    if (gameState !== 'playing' && gameState !== 'countdown') return;

    const controls = ai.controls;
    // Resetear controles
    keysPressed[controls.up] = false; keysPressed[controls.down] = false;
    keysPressed[controls.left] = false; keysPressed[controls.right] = false;
    keysPressed[controls.boost] = false; keysPressed[controls.drift] = false;

    // 1. Vector hacia el balón (Persecución pura)
    const dx = ball.x - ai.x;
    const dy = ball.y - ai.y;
    
    // 2. CÁLCULO DE ÁNGULOS (EL BUG CRÍTICO ESTABA AQUÍ)
    // Math.atan2 devuelve el ángulo donde 0 es la Derecha, PI/2 es Abajo, -PI/2 es Arriba.
    const targetAngle = Math.atan2(dy, dx);
    
    // El sistema del coche asume que angle = 0 es Arriba y angle = PI/2 es Derecha.
    // Convertimos el ángulo del coche al sistema estándar de atan2 restando PI/2.
    const standardCarAngle = ai.angle - Math.PI / 2;
    
    let angleDiff = targetAngle - standardCarAngle;
    
    // Normalizar la diferencia de ángulo entre -PI y PI
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const absDiff = Math.abs(angleDiff);

    // 3. CONTROL DE DIRECCIÓN (Volante)
    const DEADZONE = 0.08; // Radianes de zona muerta para evitar oscilación
    if (absDiff > DEADZONE) {
        if (angleDiff > 0) {
            keysPressed[controls.right] = true;
        } else {
            keysPressed[controls.left] = true;
        }
    }

    // 4. CONTROL DE ACELERACIÓN Y FRENO
    if (absDiff < 0.3) {
        // Perfectamente alineado: ¡Acelerar a fondo!
        keysPressed[controls.up] = true;
        // Usar turbo si estamos enfocados
        if (ai.boost > 0) {
            keysPressed[controls.boost] = true;
        }
    } else if (absDiff < 1.2) {
        // Ligeramente desalineado: Acelerar normal para ir corrigiendo
        keysPressed[controls.up] = true;
    } else {
        // Muy desalineado (el balón está a un lado o detrás):
        // FRENAR e intentar girar rápido usando derrape
        keysPressed[controls.down] = true;
        keysPressed[controls.drift] = true;
    }

    // 5. SISTEMA ANTI-ATASCO SIMPLE
    // Si la velocidad es muy baja durante varios frames, probablemente estemos contra una pared
    if (!ai.stuckTimer) ai.stuckTimer = 0;
    
    if (Math.abs(ai.speed) < 0.2 && gameState === 'playing') {
        ai.stuckTimer++;
    } else {
        ai.stuckTimer = 0;
    }

    // Si llevamos medio segundo atascados, maniobra de escape
    if (ai.stuckTimer > 30) {
        keysPressed[controls.up] = false;
        keysPressed[controls.down] = true; // Marcha atrás
        keysPressed[controls.left] = true; // Girar para despegarse
        if (ai.stuckTimer > 60) {
            ai.stuckTimer = 0; // Resetear
        }
    }
}
