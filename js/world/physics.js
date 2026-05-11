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
            const bounce = (entity.onWallTimer !== undefined) ? CONST.CONFIG.BALL_BOUNCINESS : CONST.CONFIG.CAR_WALL_BOUNCE;
            entity.vx -= (1 + bounce) * dot * closestNormal.x;
            entity.vy -= (1 + bounce) * dot * closestNormal.y;
            if (entity.onWallTimer !== undefined) {
                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius * CONST.CONFIG.BALL_WALL_VISUAL_MULTIPLIER;
                const hitIntensity = Math.min(Math.sqrt(entity.vx**2 + entity.vy**2) / 10, 1.0);
                playSound('wall_hit', hitIntensity);
            } else if (entity.speed !== undefined) {
                // Restauramos el cambio de trayectoria visual (ángulo)
                entity.speed = Math.sqrt(entity.vx**2 + entity.vy**2);
                entity.angle = Math.atan2(entity.vx, -entity.vy);
                
                const hitIntensity = Math.min(Math.abs(dot) / 5, 0.8);
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

        // Velocidades actuales en X e Y
        const vAx = Math.sin(carA.angle) * carA.speed;
        const vAy = -Math.cos(carA.angle) * carA.speed;
        const vBx = Math.sin(carB.angle) * carB.speed;
        const vBy = -Math.cos(carB.angle) * carB.speed;

        // Velocidad relativa a lo largo de la normal de impacto
        const relVx = vAx - vBx;
        const relVy = vAy - vBy;
        const relSpeedNormal = relVx * nx + relVy * ny;

        // Si se están acercando, calculamos el impulso elástico
        if (relSpeedNormal > 0) {
            const restitution = 0.5; 
            const impulse = -(1 + restitution) * relSpeedNormal / 2;

            const newVAx = vAx + impulse * nx;
            const newVAy = vAy + impulse * ny;
            const newVBx = vBx - impulse * nx;
            const newVBy = vBy - impulse * ny;

            // Restauramos el cambio de trayectoria para ambos coches
            carA.speed = Math.sqrt(newVAx**2 + newVAy**2);
            carA.angle = Math.atan2(newVAx, -newVAy);
            
            carB.speed = Math.sqrt(newVBx**2 + newVBy**2);
            carB.angle = Math.atan2(newVBx, -newVBy);
        }

        playSound('car_hit', Math.min(Math.abs(relSpeedNormal) / 5, 1.0));
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
 * IA DE LOS BOTS - RELENTLESS PURSUIT V9 (REDiseño TOTAL)
 */
export function updateCarAI(ai, ball, boostPads, gameState, keysPressed, allCars) { 
    if (gameState !== 'playing' && gameState !== 'countdown') return;

    const controls = ai.controls;
    // Resetear todas las teclas del bot
    keysPressed[controls.up] = false;
    keysPressed[controls.down] = false;
    keysPressed[controls.left] = false;
    keysPressed[controls.right] = false;
    keysPressed[controls.boost] = false;
    keysPressed[controls.drift] = false;

    // --- 1. LOCALIZACIÓN DEL BALÓN ---
    const dx = ball.x - ai.x;
    const dy = ball.y - ai.y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    // --- 2. CÁLCULO DE ÁNGULO MAESTRO ---
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = (ai.angle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    const desiredAngle = (targetAngle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    
    let angleDiff = desiredAngle - currentAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2; 
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const absDiff = Math.abs(angleDiff);

    // --- 3. LÓGICA DE NAVEGACIÓN ---
    // Límites de seguridad del estadio
    const minX = 920, maxX = 3080;
    const minY = 720, maxY = 2280;
    const nearWall = (ai.x < minX || ai.x > maxX || ai.y < minY || ai.y > maxY);

    // Prioridad: Orientarse hacia el balón
    if (absDiff > 0.15) {
        if (angleDiff > 0) keysPressed[controls.right] = true;
        else keysPressed[controls.left] = true;
    }

    // Aceleración inteligente
    if (absDiff < 1.2) {
        keysPressed[controls.up] = true;
        // Turbo si estamos bien encaminados y lejos
        if (absDiff < 0.2 && dist > 500 && ai.boost > 5) {
            keysPressed[controls.boost] = true;
        }
    } else {
        // Giro muy cerrado: derrapar y frenar un poco para no salirnos de la órbita
        keysPressed[controls.drift] = true;
        if (ai.speed > 1.0) keysPressed[controls.down] = true;
        else keysPressed[controls.up] = true;
    }

    // --- 4. EVITAR ATASCOS Y PAREDES ---
    if (nearWall && dist > 300) {
        // Si estamos en la pared y el balón no está aquí, forzar giro al centro
        const toCenterX = 2000 - ai.x;
        const toCenterY = 1500 - ai.y;
        const angleToCenter = Math.atan2(toCenterY, toCenterX);
        // ... (el volante ya está calculando hacia el balón, pero el muro nos frena)
        if (Math.abs(ai.speed) < 0.3) {
            keysPressed[controls.down] = true; // Marcha atrás para despegarse
            keysPressed[controls.up] = false;
        }
    }

    // Sistema Anti-Atasco (Reset de posición mental)
    if (!ai.stuckTimer) ai.stuckTimer = 0;
    if (Math.abs(ai.speed) < 0.1 && gameState === 'playing') ai.stuckTimer++;
    else ai.stuckTimer = 0;

    if (ai.stuckTimer > 40) {
        keysPressed[controls.up] = false;
        keysPressed[controls.down] = true;
        keysPressed[controls.left] = true;
        if (ai.stuckTimer > 70) ai.stuckTimer = 0;
    }
}
