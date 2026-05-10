import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';

/**
 * Física de colisión entre entidades y el polígono del campo.
 */
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
            
            // Empujar fuera
            const overlap = entity.radius - dist;
            entity.x += nx * overlap;
            entity.y += ny * overlap;

            // Reflejar velocidad (solo si es el punto más cercano)
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
            const bounce = (entity.radius > 50) ? CONST.CONFIG.BALL_BOUNCINESS : 0.2; // Pelota vs Coche
            entity.vx -= (1 + bounce) * dot * closestNormal.x;
            entity.vy -= (1 + bounce) * dot * closestNormal.y;
            if (entity.onWallTimer !== undefined) {
                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius * CONST.CONFIG.BALL_WALL_VISUAL_MULTIPLIER;
                // Si tiene onWallTimer es que es el balón, lanzamos sonido de pared
                const hitIntensity = Math.min(Math.sqrt(entity.vx**2 + entity.vy**2) / 10, 1.0);
                playSound('wall_hit', hitIntensity);
            }
        }
    }
}

/**
 * Colisión Coche-Balón
 */
export function checkCarBallCollision(car, ball, touchHistory, gameTime) {
    if (ball.isFireball) return; 
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
            
            // Añadir influencia del giro del coche
            const carAngleX = Math.cos(car.angle);
            const carAngleY = Math.sin(car.angle);
            ball.vx += carAngleX * (car.speed * 0.3);
            ball.vy += carAngleY * (car.speed * 0.3);
            
            ball.vx *= CONST.CONFIG.BALL_BOUNCINESS;
            ball.vy *= CONST.CONFIG.BALL_BOUNCINESS;

            // --- EFECTO DE ELEVACIÓN AL GOLPEAR CON COCHE ---
            ball.onWallTimer = 15; 
            ball.targetRadius = ball.radius * 1.35;

            // Sonido de golpeo al balón
            const hitIntensity = Math.min(impulse / 15, 1.2);
            playSound('ball_hit', hitIntensity);
        }

        const currentSpeed = Math.sqrt(ball.vx**2 + ball.vy**2);
        if (currentSpeed > CONST.CONFIG.BALL_MAX_SPEED) { 
            const factor = CONST.CONFIG.BALL_MAX_SPEED / currentSpeed; 
            ball.vx *= factor; ball.vy *= factor; 
        }

        touchHistory.push({ car, time: gameTime });
        if (touchHistory.length > 10) touchHistory.shift();
    }
}

/**
 * Colisión Coche-Coche
 */
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

        const pushForce = CONST.CONFIG.CAR_CAR_PUSHBACK_BASE + (Math.abs(carA.speed) + Math.abs(carB.speed)) * CONST.CONFIG.CAR_CAR_PUSHBACK_VEL_FACTOR;
        carA.vx -= nx * pushForce; carA.vy -= ny * pushForce;
        carB.vx += nx * pushForce; carB.vy += ny * pushForce;
        carA.speed *= 0.5; carB.speed *= 0.5;
    }
}

/**
 * Colisión del balón con las redes de las porterías
 */
export function checkGoalPhysics(ball) {
    const goals = [CONST.CONFIG.GOAL_TOP, CONST.CONFIG.GOAL_BOTTOM];
    goals.forEach(g => {
        const isLeftGoal = (g.x < CONST.CONFIG.WORLD_W / 2);
        const top = g.y - g.w/2;
        const bottom = g.y + g.w/2;
        const frontX = g.x;
        const backX = isLeftGoal ? g.x - g.d : g.x + g.d;
        
        const inYRange = (ball.y > top && ball.y < bottom);
        if (inYRange) {
            const inXRange = isLeftGoal ? (ball.x < frontX && ball.x > backX) : (ball.x > frontX && ball.x < backX);
            if (inXRange) {
                // Colisión con los postes laterales de la portería
                if (ball.y - ball.radius < top) { ball.y = top + ball.radius; ball.vy *= -0.5; }
                if (ball.y + ball.radius > bottom) { ball.y = bottom - ball.radius; ball.vy *= -0.5; }
                // Colisión con el fondo de la red
                if (isLeftGoal) {
                    if (ball.x - ball.radius < backX) { ball.x = backX + ball.radius; ball.vx *= -0.5; }
                } else {
                    if (ball.x + ball.radius > backX) { ball.x = backX - ball.radius; ball.vx *= -0.5; }
                }
            }
        }
    });
}

/**
 * IA DE LOS BOTS - MEJORADA V2
 */
export function updateCarAI(ai, ball, boostPads, gameState, keysPressed, allCars) { 
    if (gameState !== 'playing' && gameState !== 'countdown') return;

    const controls = ai.controls;
    keysPressed[controls.up] = false; keysPressed[controls.down] = false;
    keysPressed[controls.left] = false; keysPressed[controls.right] = false;
    keysPressed[controls.boost] = false; keysPressed[controls.drift] = false;

    // --- DETECCIÓN DE ATASCO ---
    if (!ai.stuckTimer) ai.stuckTimer = 0;
    if (Math.abs(ai.speed) < 0.2 && gameState === 'playing') ai.stuckTimer++;
    else ai.stuckTimer = Math.max(0, ai.stuckTimer - 2);

    if (ai.stuckTimer > 60) {
        keysPressed[controls.down] = true;
        if (ai.stuckTimer % 60 < 30) keysPressed[controls.left] = true;
        else keysPressed[controls.right] = true;
        if (ai.stuckTimer > 120) ai.stuckTimer = 0;
        return;
    }

    // --- EVITAR OTROS COCHES (EVITAR BLOQUEOS) ---
    let avoidX = 0, avoidY = 0;
    allCars.forEach(other => {
        if (other === ai) return;
        const dx = ai.x - other.x;
        const dy = ai.y - other.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist < 150) { // Si están muy cerca, generar fuerza de repulsión para el target
            avoidX += (dx / dist) * 200;
            avoidY += (dy / dist) * 200;
        }
    });

    const ownGoalX = (ai.color === '#5ad') ? 600 : 3400;
    const enemyGoalX = (ai.color === '#5ad') ? 3400 : 600;
    const centerY = CONST.CONFIG.WORLD_H / 2;
    
    // Predicción simple del balón
    const predBallX = ball.x + ball.vx * 15;
    const predBallY = ball.y + ball.vy * 15;
    const distToBall = Math.sqrt((ai.x - ball.x)**2 + (ai.y - ball.y)**2);

    let target = { x: predBallX, y: predBallY };
    let useBoost = false;

    // --- LÓGICA DE ROLES ---
    if (ai.aiState.role === 'attacker') {
        const offset = 220;
        const dirToGoalX = (enemyGoalX - predBallX);
        const dirToGoalY = (centerY - predBallY);
        const mag = Math.max(1, Math.sqrt(dirToGoalX**2 + dirToGoalY**2));
        
        const idealX = predBallX - (dirToGoalX / mag) * offset;
        const idealY = predBallY - (dirToGoalY / mag) * offset;

        const isBehind = (ai.color === '#5ad') ? (ai.x < ball.x - 40) : (ai.x > ball.x + 40);
        target = isBehind ? { x: predBallX, y: predBallY } : { x: idealX, y: idealY };
    } 
    else if (ai.aiState.role === 'defender') {
        if (distToBall > 1000) {
            target = { x: ownGoalX + (ai.color === '#5ad' ? 350 : -350), y: centerY + (ball.y - centerY) * 0.6 };
        }
    } 
    else if (ai.aiState.role === 'support') {
        if (ai.boost < 40) {
            let closestPad = null, minDist = Infinity;
            boostPads.forEach(pad => {
                if (pad.active) {
                    const d = Math.sqrt((ai.x - pad.x)**2 + (ai.y - pad.y)**2);
                    if (d < minDist) { minDist = d; closestPad = pad; }
                }
            });
            if (closestPad) target = { x: closestPad.x, y: closestPad.y };
        } else {
            target = { x: (CONST.CONFIG.WORLD_W / 2 + ball.x) / 2, y: ball.y };
        }
    }

    // Aplicar fuerza de evasión al target final
    target.x += avoidX;
    target.y += avoidY;

    // --- CÁLCULO DE DIRECCIÓN ---
    const dx = target.x - ai.x;
    const dy = target.y - ai.y;
    let targetAngle = Math.atan2(dy, dx); 
    let currentAngle = (ai.angle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    let desiredAngle = (targetAngle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    
    let angleDiff = desiredAngle - currentAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2; 
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const turnThreshold = 0.12;
    if (angleDiff > turnThreshold) keysPressed[controls.right] = true;
    else if (angleDiff < -turnThreshold) keysPressed[controls.left] = true;

    if (Math.abs(angleDiff) > 1.3 && ai.speed > 1.2) keysPressed[controls.drift] = true;

    if (Math.abs(angleDiff) < 1.4) {
        keysPressed[controls.up] = true;
        if (Math.abs(angleDiff) < 0.25 && distToBall > 500) useBoost = true;
    } else if (Math.abs(angleDiff) > 2.6 && distToBall < 400) {
        keysPressed[controls.up] = false;
        keysPressed[controls.down] = true;
        keysPressed[controls.left] = !keysPressed[controls.left];
        keysPressed[controls.right] = !keysPressed[controls.right];
    }

    if (useBoost && ai.boost > 10) keysPressed[controls.boost] = true;
}
