import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';

/**
 * Verifica y resuelve colisiones entre una entidad circular y un polígono (paredes)
 */
export function checkPolygonCollision(entity, polygon) {
    if (!polygon || polygon.length < 2) return;

    let closestDist = Infinity;
    let closestPoint = null;
    let normal = null;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];

        // Encontrar punto más cercano en el segmento p1-p2 al centro de la entidad
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const denom = dx * dx + dy * dy;
        const t = (denom === 0) ? 0 : ((entity.x - p1.x) * dx + (entity.y - p1.y) * dy) / denom;
        const constrainedT = Math.max(0, Math.min(1, t));
        
        const nearestX = p1.x + constrainedT * dx;
        const nearestY = p1.y + constrainedT * dy;

        const distDx = entity.x - nearestX;
        const distDy = entity.y - nearestY;
        const distSq = distDx * distDx + distDy * distDy;

        if (distSq < closestDist) {
            closestDist = distSq;
            closestPoint = { x: nearestX, y: nearestY };
            normal = { x: distDx, y: distDy };
        }
    }

    const distance = Math.sqrt(closestDist);
    if (distance < entity.radius && distance > 0) {
        const overlap = entity.radius - distance;
        const nx = normal.x / distance;
        const ny = normal.y / distance;

        // Resolver posición
        entity.x += nx * overlap;
        entity.y += ny * overlap;

        // Resolver velocidad (rebote)
        const dot = entity.vx * nx + entity.vy * ny;
        if (dot < 0) {
            const restitution = (entity.constructor.name === 'Ball') ? CONST.BALL_WALL_SLOWDOWN_FACTOR : 0.3;
            
            if (entity.constructor.name === 'Ball') {
                entity.onWallTimer = CONST.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius * CONST.BALL_WALL_VISUAL_MULTIPLIER;
                entity.vx -= (1 + restitution) * dot * nx;
                entity.vy -= (1 + restitution) * dot * ny;
            } else {
                // Los coches también rebotan un poco para evitar quedarse pegados
                entity.vx -= (1 + restitution) * dot * nx;
                entity.vy -= (1 + restitution) * dot * ny;
                entity.speed *= 0.5; 
            }
        }
        return true;
    }
    return false;
}

export function checkCarBallCollision(car, ball, touchHistory, gameTime) {
    if (ball.isFireball) return; 
    const dx = ball.x - car.x; const dy = ball.y - car.y; const distance = Math.sqrt(dx * dx + dy * dy); const combinedRadii = car.radius + ball.radius;
    if (distance < combinedRadii) {
        const overlap = combinedRadii - distance; const nx = dx / distance; const ny = dy / distance; 
        ball.x += nx * overlap; ball.y += ny * overlap;
        let hitForce = CONST.BALL_HIT_FORCE; 
        let carVelocityContribution = 0.5;
        const carVelX = (car.vx * carVelocityContribution); 
        const carVelY = (car.vy * carVelocityContribution);
        ball.vx = (nx * hitForce) + carVelX; ball.vy = (ny * hitForce) + carVelY;
        const currentSpeed = Math.sqrt(ball.vx**2 + ball.vy**2);
        if (currentSpeed > CONST.BALL_MAX_SPEED) { const factor = CONST.BALL_MAX_SPEED / currentSpeed; ball.vx *= factor; ball.vy *= factor; }
        
        car.speed *= 0.92; 
        
        // Efecto de sonido del golpe (intensidad basada en velocidad)
        const hitIntensity = Math.min(Math.max(currentSpeed / 15, 0.2), 1.0);
        playSound('ball_hit', hitIntensity);

        // Registrar toque para asistencias
        if (touchHistory.length === 0 || touchHistory[0].car !== car) {
            touchHistory.unshift({ car: car, time: gameTime }); 
            if (touchHistory.length > 2) touchHistory.pop(); 
        }
    }
}

export function checkCarCarCollision(car1, car2) {
    const dx = car2.x - car1.x; const dy = car2.y - car1.y; const distance = Math.sqrt(dx * dx + dy * dy); const combinedRadii = car1.radius + car2.radius;
    
    if (distance < combinedRadii && distance > 0) {
        const overlap = combinedRadii - distance; 
        const nx = dx / distance; const ny = dy / distance; 
        
        car1.x -= nx * (overlap / 2); car1.y -= ny * (overlap / 2); 
        car2.x += nx * (overlap / 2); car2.y += ny * (overlap / 2);
        
        const rvx = car2.vx - car1.vx;
        const rvy = car2.vy - car1.vy;
        const velAlongNormal = rvx * nx + rvy * ny;

        if (velAlongNormal > 0) return;

        let impulse = (CONST.CAR_CAR_PUSHBACK_BASE + Math.abs(velAlongNormal) * CONST.CAR_CAR_PUSHBACK_VEL_FACTOR);
        
        const car1ForwardX = Math.sin(car1.angle);
        const car1ForwardY = -Math.cos(car1.angle);
        const dotProductCar1 = (car1ForwardX * nx) + (car1ForwardY * ny); 

        const car2ForwardX = Math.sin(car2.angle);
        const car2ForwardY = -Math.cos(car2.angle);
        const dotProductCar2 = (car2ForwardX * -nx) + (car2ForwardY * -ny); 

        const isCar1Frontal = (dotProductCar1 > CONST.FRONTAL_COLLISION_THRESHOLD);
        const isCar2Frontal = (dotProductCar2 > CONST.FRONTAL_COLLISION_THRESHOLD);
        
        const minDemoSpeed = CONST.CAR_MAX_BOOST_SPEED * CONST.DEMOLITION_MIN_SPEED_FACTOR;
        const isCar1Fast = (car1.speed > minDemoSpeed);
        const isCar2Fast = (car2.speed > minDemoSpeed);

        if (isCar1Frontal && isCar1Fast && !isCar2Frontal) {
            impulse *= CONST.DEMOLITION_MULTIPLIER;
        } 
        else if (isCar2Frontal && isCar2Fast && !isCar1Frontal) {
            impulse *= CONST.DEMOLITION_MULTIPLIER;
        }

        car1.vx -= nx * impulse; car1.vy -= ny * impulse;
        car2.vx += nx * impulse; car2.vy += ny * impulse;
        
        car1.speed = Math.sqrt(car1.vx**2 + car1.vy**2);
        car2.speed = Math.sqrt(car2.vx**2 + car2.vy**2);
    }
}

export function checkGoalPhysics(ball) {
    const goals = [CONST.GOAL_TOP, CONST.GOAL_BOTTOM];
    goals.forEach(g => {
        const top = g.y - g.w/2; const bottom = g.y + g.w/2;
        const isLeftGoal = (g.x < CONST.WORLD_W / 2);
        const frontX = g.x; const backX = isLeftGoal ? g.x - g.d : g.x + g.d;
        
        const inXRange = isLeftGoal ? (ball.x < frontX && ball.x > backX) : (ball.x > frontX && ball.x < backX);
        if (inXRange) {
            // Colisión con los "largueros" laterales (arriba/abajo de la portería)
            if (Math.abs(ball.y - top) < ball.radius && ball.y < top) { ball.y = top - ball.radius; ball.vy *= -CONST.BALL_WALL_SLOWDOWN_FACTOR; }
            if (Math.abs(ball.y - bottom) < ball.radius && ball.y > bottom) { ball.y = bottom + ball.radius; ball.vy *= -CONST.BALL_WALL_SLOWDOWN_FACTOR; }
        }
        if (ball.y > top && ball.y < bottom) {
            // Colisión con el fondo de la red
            const distBack = Math.abs(ball.x - backX);
            if (distBack < ball.radius) { ball.x = isLeftGoal ? backX + ball.radius : backX - ball.radius; ball.vx *= -CONST.BALL_WALL_SLOWDOWN_FACTOR; }
        }
        // Postes frontales
        [top, bottom].forEach(py => {
            const dx = ball.x - frontX, dy = ball.y - py; const dist = Math.sqrt(dx*dx+dy*dy);
            if (dist < ball.radius) {
                const nx = dx/dist, ny = dy/dist;
                // Solo rebotar si viene de fuera de la portería
                if (isLeftGoal ? nx > 0 : nx < 0) {
                    ball.x = frontX + nx*ball.radius; ball.y = py + ny*ball.radius;
                    const dot = ball.vx*nx + ball.vy*ny; ball.vx -= 1.5*dot*nx; ball.vy -= 1.5*dot*ny;
                }
            }
        });
    });
}

export function updateCarAI(ai, ball, boostPads, gameState, keysPressed) { 
    if (gameState === 'goalScored' || gameState === 'gameOver') {
        Object.keys(ai.controls).forEach(k => keysPressed[ai.controls[k]] = false);
        return;
    }
    
    if (gameState === 'countdown') {
        keysPressed[ai.controls.up] = true;
        keysPressed[ai.controls.down] = false;
        keysPressed[ai.controls.left] = false;
        keysPressed[ai.controls.right] = false;
        keysPressed[ai.controls.boost] = false;
        return; 
    }

    const controls = ai.controls; 
    let targetX = ball.x, targetY = ball.y;
    let goToTarget = true; 
    let useBoost = false;

    const ownGoalX = (ai.color === '#5ad') ? (CONST.FIELD_MARGIN) : (CONST.WORLD_W - CONST.FIELD_MARGIN);
    const ownGoalY = CONST.WORLD_H / 2;
    const opponentGoalX = (ai.color === '#5ad') ? (CONST.WORLD_W - CONST.FIELD_MARGIN) : (CONST.FIELD_MARGIN);
    const opponentGoalY = CONST.WORLD_H / 2;
    
    const distToBall = Math.sqrt((ai.x - ball.x)**2 + (ai.y - ball.y)**2);
    const ballInOwnHalf = (ai.color === '#5ad') ? (ball.x < CONST.WORLD_W / 2) : (ball.x > CONST.WORLD_W / 2);

    // Lógica de Boost
    if (ai.boost < 30 && !ai.aiState.targetBoostPad) {
        let bestPad = null;
        let minDist = Infinity;
        boostPads.forEach(pad => {
            if (pad.active && !pad.isMini) {
                const padInOwnHalf = (ai.color === '#5ad') ? (pad.y > CONST.WORLD_H / 2) : (pad.y < CONST.WORLD_H / 2);
                if (ai.aiState.role !== 'attacker' && !padInOwnHalf && ballInOwnHalf) {
                    return; 
                }
                const d = Math.sqrt((ai.x - pad.x)**2 + (ai.y - pad.y)**2);
                if (d < minDist) { minDist = d; bestPad = pad; }
            }
        });
        if (bestPad && minDist > 100) ai.aiState.targetBoostPad = bestPad;
    }
    
    if (ai.aiState.targetBoostPad) {
        if (!ai.aiState.targetBoostPad.active || ai.boost > 90) {
            ai.aiState.targetBoostPad = null; 
        } else {
            const distToGoal = Math.sqrt((ball.x - ownGoalX)**2 + (ball.y - ownGoalY)**2);
            if (ai.aiState.role !== 'attacker' && distToGoal < 1500) {
                ai.aiState.targetBoostPad = null; 
            } else {
                targetX = ai.aiState.targetBoostPad.x;
                targetY = ai.aiState.targetBoostPad.y;
                useBoost = (distToBall > 1000); 
            }
        }
    }

    // Lógica de Roles
    if (!ai.aiState.targetBoostPad) {
        if (ai.aiState.role === 'defender') {
            if (ballInOwnHalf) {
                targetX = (ball.x + ownGoalX) / 2;
                targetY = (ball.y + ownGoalY) / 2;
                const distToGoal = Math.sqrt((ball.x - ownGoalX)**2 + (ball.y - ownGoalY)**2);
                if (distToGoal < 1200) {
                    targetX = ball.x + (ball.x - opponentGoalX) / 5; 
                    targetY = ball.y + (ball.y - opponentGoalY) / 5;
                    useBoost = (distToBall < 800);
                }
            } else {
                targetX = CONST.WORLD_W / 2 + (ai.color === '#5ad' ? -200 : 200); 
                targetY = ball.y; 
                goToTarget = true; 
            }
        } 
        else if (ai.aiState.role === 'support') {
             if (ballInOwnHalf) {
                targetX = (ball.x * 1.2 + ownGoalX) / 2.2;
                targetY = (ball.y * 1.2 + ownGoalY) / 2.2;
                const distToGoal = Math.sqrt((ball.x - ownGoalX)**2 + (ball.y - ownGoalY)**2);
                if (distToGoal < 1400) { 
                    targetX = ball.x + (ball.x - opponentGoalX) / 5; 
                    targetY = ball.y + (ball.y - opponentGoalY) / 5;
                    useBoost = (distToBall < 900);
                }
            } else {
                targetX = CONST.WORLD_W / 2 - (ai.color === '#5ad' ? -400 : 400); 
                targetY = ball.y; 
                goToTarget = true; 
            }
        }
        else { 
            const predictionFactor = Math.min(distToBall / 100, 15);
            targetX = ball.x + ball.vx * predictionFactor;
            targetY = ball.y + ball.vy * predictionFactor;
            
            const aimOffsetX = (Math.random() - 0.5) * (CONST.GOAL_WIDTH / 2);
            const angleToGoal = Math.atan2((opponentGoalX + aimOffsetX) - ai.x, (opponentGoalY) - ai.y);
            
            targetX += Math.sin(angleToGoal) * 200;
            targetY -= Math.cos(angleToGoal) * 200;

            useBoost = (distToBall > 600);
        }
    }

    const dx = targetX - ai.x; 
    const dy = targetY - ai.y;
    let targetAngle = Math.atan2(dx, -dy); 
    let currentAngle = (ai.angle + Math.PI * 2) % (Math.PI * 2);
    targetAngle = (targetAngle + Math.PI * 2) % (Math.PI * 2); 
    let angleDiff = targetAngle - currentAngle;
    
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2; 
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const distToTarget = Math.sqrt(dx*dx + dy*dy);

    const turnThreshold = 0.2; // Reducido para que giren más rápido
    if (angleDiff > turnThreshold) { keysPressed[controls.right] = true; keysPressed[controls.left] = false; } 
    else if (angleDiff < -turnThreshold) { keysPressed[controls.left] = true; keysPressed[controls.right] = false; } 
    else { keysPressed[controls.left] = false; keysPressed[controls.right] = false; }
    
    ai.aiState.stuckTimer = ai.aiState.stuckTimer || 0;
    ai.aiState.reverseTimer = ai.aiState.reverseTimer || 0;

    if (ai.aiState.reverseTimer > 0) {
        ai.aiState.reverseTimer--;
        keysPressed[controls.up] = false;
        keysPressed[controls.down] = true;
        keysPressed[controls.boost] = false;
        // Invierte la dirección de giro al dar marcha atrás
        let tempLeft = keysPressed[controls.left];
        keysPressed[controls.left] = keysPressed[controls.right];
        keysPressed[controls.right] = tempLeft;
        return;
    }

    if (goToTarget) {
        keysPressed[controls.up] = true; 
        keysPressed[controls.down] = false;
        
        // Si está casi parado pero intentando avanzar, probablemente está atascado
        if (Math.abs(ai.speed) < 0.5) {
            ai.aiState.stuckTimer++;
            if (ai.aiState.stuckTimer > 60) { // 1 segundo atascado
                ai.aiState.reverseTimer = 30; // 0.5 segundos de marcha atrás
                ai.aiState.stuckTimer = 0;
            }
        } else {
            ai.aiState.stuckTimer = 0;
        }
    } else {
        keysPressed[controls.up] = false; 
        keysPressed[controls.down] = false;
        ai.aiState.stuckTimer = 0;
    }
    
    keysPressed[controls.boost] = useBoost && ai.boost > 10 && Math.abs(angleDiff) < 0.3 && keysPressed[controls.up];
    keysPressed[controls.drift] = false; 
}
