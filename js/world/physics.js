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
/**
 * IA DE LOS BOTS - STRIKER ENGINE V4 (Vectorial)
 */
export function updateCarAI(ai, ball, boostPads, gameState, keysPressed, allCars) { 
    if (gameState !== 'playing' && gameState !== 'countdown') return;

    const controls = ai.controls;
    keysPressed[controls.up] = false; keysPressed[controls.down] = false;
    keysPressed[controls.left] = false; keysPressed[controls.right] = false;
    keysPressed[controls.boost] = false; keysPressed[controls.drift] = false;

    const isBlue = (ai.color === '#5ad');
    const ownGoalX = isBlue ? 400 : 3600;
    const enemyGoalX = isBlue ? 3600 : 400;
    const centerY = CONST.CONFIG.WORLD_H / 2;

    // --- 1. PREDICCIÓN DEL BALÓN ---
    const distToBall = Math.sqrt((ai.x - ball.x)**2 + (ai.y - ball.y)**2);
    const predFrames = Math.min(20, distToBall / 50);
    const pBallX = ball.x + ball.vx * predFrames;
    const pBallY = ball.y + ball.vy * predFrames;

    // --- 2. CÁLCULO DE VECTORES DE ALINEACIÓN ---
    // Vector del Balón a la Portería Enemiga
    const vecBallToGoalX = enemyGoalX - pBallX;
    const vecBallToGoalY = centerY - pBallY;
    const magBallToGoal = Math.sqrt(vecBallToGoalX**2 + vecBallToGoalY**2);
    const dirGoalX = vecBallToGoalX / magBallToGoal;
    const dirGoalY = vecBallToGoalY / magBallToGoal;

    // Vector del Bot al Balón
    const vecBotToBallX = pBallX - ai.x;
    const vecBotToBallY = pBallY - ai.y;
    const magBotToBall = Math.sqrt(vecBotToBallX**2 + vecBotToBallY**2);
    // Evitar división por cero
    const dirBotX = magBotToBall > 0 ? vecBotToBallX / magBotToBall : 0;
    const dirBotY = magBotToBall > 0 ? vecBotToBallY / magBotToBall : 0;

    // Producto escalar (Dot Product) para saber si estamos detrás del balón apuntando a portería
    // Valor 1 = Perfectamente alineados. Valor < 0 = Estamos por delante del balón.
    const alignment = (dirBotX * dirGoalX) + (dirBotY * dirGoalY);
    
    let targetX, targetY;
    let mode = 'STRIKE';

    // --- 3. TOMA DE DECISIONES Y POSICIONAMIENTO ---
    const ballInOwnHalf = isBlue ? (ball.x < 2000) : (ball.x > 2000);
    const isInsideGoal = (ai.x < 850 || ai.x > 3150); // Detectar si está en la zona de porterías
    
    if (isInsideGoal && Math.abs(ai.y - centerY) < 500) {
        // MODO ESCAPE: Salir de la portería lo antes posible
        mode = 'ESCAPE';
        targetX = 2000;
        targetY = centerY;
    }
    else if (ai.aiState.role === 'defender' && !ballInOwnHalf && distToBall > 1200) {
        // Defensa conservadora si el balón está lejos en campo contrario
        mode = 'DEFEND';
        targetX = ownGoalX + (isBlue ? 500 : -500);
        targetY = centerY + (ball.y - centerY) * 0.5;
    } 
    else if (alignment < 0.1 && distToBall < 1000) {
        // REPOSICIONAMIENTO: Estamos mal alineados.
        // Trazamos una curva para rodear el balón y ponernos detrás.
        mode = 'REPOSITION';
        
        const offsetDist = 450; 
        let behindX = pBallX - dirGoalX * offsetDist;
        let behindY = pBallY - dirGoalY * offsetDist;
        
        const cross = dirGoalX * dirBotY - dirGoalY * dirBotX;
        const swingDist = 400; 
        if (cross > 0) {
            behindX += -dirGoalY * swingDist;
            behindY += dirGoalX * swingDist;
        } else {
            behindX += dirGoalY * swingDist;
            behindY += -dirGoalX * swingDist;
        }
        
        targetX = Math.max(200, Math.min(3800, behindX));
        targetY = Math.max(200, Math.min(2800, behindY));
    } 
    else {
        // ATAQUE FRONTAL: Enfoque total en el balón
        mode = 'STRIKE';
        targetX = pBallX;
        targetY = pBallY;
    }

    // Prioridad de recarga de turbo
    if (ai.boost < 20 && mode !== 'STRIKE') {
        let closestPad = null, minDist = 800;
        boostPads.forEach(pad => {
            if (pad.active) {
                const d = Math.sqrt((ai.x - pad.x)**2 + (ai.y - pad.y)**2);
                if (d < minDist) { minDist = d; closestPad = pad; }
            }
        });
        if (closestPad) {
            targetX = closestPad.x;
            targetY = closestPad.y;
        }
    }

    // --- 4. EVASIÓN DE COMPAÑEROS/RIVALES ---
    allCars.forEach(other => {
        if (other === ai) return;
        const d = Math.sqrt((ai.x - other.x)**2 + (ai.y - other.y)**2);
        if (d < 180) {
            targetX += (ai.x - other.x) * 0.6;
            targetY += (ai.y - other.y) * 0.6;
        }
    });

    // --- 5. CONTROL DEL VEHÍCULO ---
    const dx = targetX - ai.x;
    const dy = targetY - ai.y;
    const targetAngle = Math.atan2(dy, dx); 
    const currentAngle = (ai.angle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    const desiredAngle = (targetAngle + Math.PI * 2 + Math.PI / 2) % (Math.PI * 2);
    
    let angleDiff = desiredAngle - currentAngle;
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2; 
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const absDiff = Math.abs(angleDiff);

    // Acelerador y Freno
    if (absDiff < 1.6) {
        keysPressed[controls.up] = true;
    } else {
        // Si el objetivo está muy a nuestras espaldas
        if (Math.abs(ai.speed) < 1.0) {
            keysPressed[controls.down] = true; // Marcha atrás si vamos despacio
        } else {
            keysPressed[controls.up] = true; // Seguir acelerando pero forzar derrape
        }
    }

    // Volante
    const turnThresh = 0.08;
    if (angleDiff > turnThresh) keysPressed[controls.right] = true;
    else if (angleDiff < -turnThresh) keysPressed[controls.left] = true;

    // Derrape (Drift)
    if (absDiff > 0.6 && Math.abs(ai.speed) > 1.2) {
        keysPressed[controls.drift] = true;
    }

    // Turbo (Boost)
    if (absDiff < 0.3 && ai.boost > 5 && mode === 'STRIKE') {
        keysPressed[controls.boost] = true; // Disparo directo
    } else if (absDiff < 0.15 && ai.boost > 50 && distToBall > 1000) {
        keysPressed[controls.boost] = true; // Acercamiento rápido
    }

    // --- 6. SISTEMA ANTI-ATASCO ---
    if (!ai.stuckTimer) ai.stuckTimer = 0;
    if (Math.abs(ai.speed) < 0.2 && gameState === 'playing') ai.stuckTimer++;
    else ai.stuckTimer = Math.max(0, ai.stuckTimer - 2);

    if (ai.stuckTimer > 40) {
        keysPressed[controls.up] = false;
        keysPressed[controls.down] = true;
        if (ai.stuckTimer % 60 < 30) keysPressed[controls.left] = true;
        else keysPressed[controls.right] = true;
        keysPressed[controls.drift] = false;
        
        if (ai.stuckTimer > 90) ai.stuckTimer = 0;
    }
}
