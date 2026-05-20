import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';
import { ExplosionParticle } from '../fx/particles.js';
import { addFeedMessage, addScreenShake, addHitStop } from '../main.js';

/**
 * MOTOR DE FÍSICAS SCAPS - CORE PRODUCTION V15 (Impulse Based)
 */

export function checkPolygonCollision(entity, polygon) {
    if (!polygon || polygon.length < 2) return;
    
    let closestDist = Infinity;
    let closestProj = { x: 0, y: 0 };
    let closestNormal = { x: 0, y: 0 };
    let hasCollision = false;

    for (let i = 0; i < polygon.length; i++) {
        const p1 = polygon[i];
        const p2 = polygon[(i + 1) % polygon.length];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) continue;

        let t = ((entity.x - p1.x) * dx + (entity.y - p1.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = p1.x + t * dx;
        const projY = p1.y + t * dy;
        const dist = Math.sqrt((entity.x - projX) ** 2 + (entity.y - projY) ** 2);

        if (dist < closestDist) {
            closestDist = dist;
            closestProj = { x: projX, y: projY };
            hasCollision = true;
            
            if (dist > 0.0001) {
                closestNormal = { x: (entity.x - projX) / dist, y: (entity.y - projY) / dist };
            } else {
                const len = Math.sqrt(lenSq);
                closestNormal = { x: -dy / len, y: dx / len };
            }
        }
    }

    if (!hasCollision || closestDist >= entity.radius) return;

    const nx = closestNormal.x;
    const ny = closestNormal.y;
    const overlap = entity.radius - closestDist;

    // 1. Resolución Posicional Estricta (Anti-Tunneling)
    entity.x += nx * overlap;
    entity.y += ny * overlap;

    const isBall = entity.type === 'ball';
    
    // 2. Resolución de Velocidad (Impulso / Rebote)
    if (entity.vx !== undefined) {
        const vNormal = entity.vx * nx + entity.vy * ny;
        if (vNormal < 0) {
            const tx = -ny;
            const ty = nx;
            const vTangent = entity.vx * tx + entity.vy * ty;

            let bounce = 0.4;
            let friction = 0.95;

            if (isBall) {
                bounce = Math.min(0.9, (CONST.CONFIG.BALL_BOUNCINESS || 0.88) * 0.45);
                friction = 0.90; // Añadimos fricción contra la pared para que pierda velocidad al rebotar o arrastrarse
                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                if (Math.abs(vNormal) > 1.5) playSound('wall_hit', Math.min(1.0, Math.abs(vNormal) * 0.1));
                if (Math.abs(vNormal) > 8) addScreenShake(Math.abs(vNormal) * 0.3);
            } else {
                const isJumpingIntoWall = entity.isJumping || (entity.z > 1.0);
                const isSoftImpactOnGround = (entity.z === 0 || (entity.z < 1.0 && (entity.vz || 0) <= 0)) && !entity.isJumping && !entity.isFlipping && vNormal >= -1.5;

                if (isSoftImpactOnGround) {
                    bounce = 0.0;
                    friction = 0.96; // Permitir excelente deslizamiento lateral
                    entity.wallTractionTimer = 0;
                    entity.vz = 0;
                    entity.z = 0;
                } else if (entity.isFlipping || isJumpingIntoWall || vNormal < -1.5) {
                    bounce = 0.35;
                    friction = 0.88;
                    entity.isFlipping = false;
                    entity.isJumping = false;
                    
                    if (entity.z === 0) {
                        entity.z = 0.1;
                        const liftForce = -vNormal * 0.45 + 1.2;
                        entity.vz = Math.max(entity.vz || 0, Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 0.85, liftForce));
                    }
                    
                    if (vNormal < -2) playSound('wall_hit', 0.5);
                    if (vNormal < -4) addScreenShake(Math.abs(vNormal) * 0.45);
                } else {
                    bounce = 0.1;
                    friction = 0.92;
                    entity.wallTractionTimer = 15;
                    entity.lastWallNormal = { x: nx, y: ny };
                    
                    if (entity.z === 0) entity.z = 0.5;
                    const climbForce = Math.abs(vNormal) * 0.85;
                    entity.vz = Math.max(entity.vz || 0, Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 1.2, climbForce));
                }
            }

            const reboundedNormal = -vNormal * bounce;
            entity.vx = reboundedNormal * nx + vTangent * friction * tx;
            entity.vy = reboundedNormal * ny + vTangent * friction * ty;
            
            if (!isBall) entity.speed = Math.sqrt(entity.vx ** 2 + entity.vy ** 2);
        } else if (!isBall && entity.wallTractionTimer > 0) {
            const slopeFactor = 0.65;
            entity.vz = -vNormal / slopeFactor;
            
            const tx = -ny;
            const ty = nx;
            const vTangent = entity.vx * tx + entity.vy * ty;
            const gravityDescentNormal = -(entity.vz || 0) * slopeFactor;
            const finalNormal = Math.max(vNormal, gravityDescentNormal);

            entity.vx = finalNormal * nx + vTangent * tx;
            entity.vy = finalNormal * ny + vTangent * ty;
            entity.speed = Math.sqrt(entity.vx ** 2 + entity.vy ** 2);
        }
    }
}

export function applyTirePhysics(car, timeScale) {
    if (car.isExploded) return;
    if (car.z > 0 && !(car.wallTractionTimer > 0)) return; 
    
    const forwardX = Math.sin(car.angle);
    const forwardY = -Math.cos(car.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    const lateralVel = car.vx * rightX + car.vy * rightY;
    const forwardVel = car.vx * forwardX + car.vy * forwardY;

    const grip = car.isDrifting ? CONST.CONFIG.CAR_LATERAL_GRIP_DRIFT : CONST.CONFIG.CAR_LATERAL_GRIP_NORMAL;
    const newLateralVel = lateralVel * Math.pow(grip, timeScale);

    car.vx = forwardX * forwardVel + rightX * newLateralVel;
    car.vy = forwardY * forwardVel + rightY * newLateralVel;
}

export function applyGlobalFriction(ball, cars, timeScale) {
    const drag = Math.pow(0.999, timeScale); 
    ball.vx *= drag;
    ball.vy *= drag;
    cars.forEach(car => {
        if (!car.isBoosting) {
            car.vx *= drag;
            car.vy *= drag;
        }
    });
}

export function checkCarBallCollision(car, ball, touchHistory, gameTime, timeScale = 1.0) {
    if (car.isExploded) return;

    if (car.ballContactCooldown === undefined) car.ballContactCooldown = 0;

    // Reducir cooldown SIEMPRE en cada frame, sin importar si estamos tocando el balón
    if (car.ballContactCooldown > 0) {
        car.ballContactCooldown -= timeScale;
        if (car.ballContactCooldown < 0) car.ballContactCooldown = 0;
    }

    const dx = ball.x - car.x;
    const dy = ball.y - car.y;
    
    // Calcular dz real + un pequeño offset de sustentación para que no vaya 100% raso, pero sin lanzarlo a las nubes
    let dz = (ball.z - car.z) + 12;

    const distance3D = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const minDistance = car.radius + ball.radius;

    if (distance3D < minDistance) {
        // POSITIONAL PUSH OUT (SIEMPRE ACTIVO PARA EVITAR ATASCOS / ARRASTRE IRREAL)
        const overlap = minDistance - distance3D;
        const nx = dx / distance3D;
        const ny = dy / distance3D;
        const nz = dz / distance3D;

        const totalMass = car.mass + ball.mass;
        const ratioCar = ball.mass / totalMass;
        const ratioBall = car.mass / totalMass;

        car.x -= nx * overlap * ratioCar;
        car.y -= ny * overlap * ratioCar;
        ball.x += nx * overlap * ratioBall;
        ball.y += ny * overlap * ratioBall;
        ball.z = Math.max(0, ball.z + nz * overlap * ratioBall);

        // COOLDOWN DE IMPACTO FUERTE (Evita múltiples sonidos e impulsos exponenciales)
        const isInitialTouch = (car.ballContactCooldown <= 0);
        if (!isInitialTouch) {
            // Fricción de arrastre suave si sigue empujando
            const pushFactor = 0.2;
            ball.vx += car.vx * pushFactor * ratioBall;
            ball.vy += car.vy * pushFactor * ratioBall;
            return;
        }

        const vRelX = ball.vx - car.vx;
        const vRelY = ball.vy - car.vy;
        const vRelZ = ball.vz - car.vz;

        const relVelNormal = vRelX * nx + vRelY * ny + vRelZ * nz;

        if (relVelNormal > 0) return;

        let e = CONST.CONFIG.BALL_BOUNCINESS || 0.88;
        if (car.isFlipping) e = 1.6;

        const impulseMagnitude = -(1 + e) * relVelNormal / ((1 / car.mass) + (1 / ball.mass));

        const jX = impulseMagnitude * nx;
        const jY = impulseMagnitude * ny;
        const jZ = impulseMagnitude * nz;

        // El balón NUNCA hará rebotar a los coches (Masa infinita relativa al balón para recoil)
        // Eliminado el recoilFactor en car.vx / car.vy

        const carSpeedMag = Math.sqrt(car.vx**2 + car.vy**2);
        const forwardX = Math.sin(car.angle);
        const forwardY = -Math.cos(car.angle);
        const dotFront = nx * forwardX + ny * forwardY;
        
        let extraArcadeImpulse = 0;
        if (dotFront > 0.5) {
            extraArcadeImpulse = CONST.CONFIG.BALL_HIT_FORCE * carSpeedMag * 0.15;
            if (car.isFlipping) extraArcadeImpulse *= 1.8;
            
            // Eliminado el recoil arcade extra al coche
        }

        ball.vx += (jX / ball.mass) + (nx * extraArcadeImpulse);
        ball.vy += (jY / ball.mass) + (ny * extraArcadeImpulse);
        ball.vz += (jZ / ball.mass) + (nz * extraArcadeImpulse * 0.5);

        if (ball.onWallTimer > 0) {
            ball.vx *= 1.35;
            ball.vy *= 1.35;
        }

        const currentBallSpeed = Math.sqrt(ball.vx**2 + ball.vy**2);
        const maxBallSpeed = CONST.CONFIG.BALL_MAX_SPEED;
        if (currentBallSpeed > maxBallSpeed) {
            ball.vx = (ball.vx / currentBallSpeed) * maxBallSpeed;
            ball.vy = (ball.vy / currentBallSpeed) * maxBallSpeed;
        }

        const hitAngleDifference = Math.atan2(ny, nx) - car.angle;
        ball.spin = Math.sin(hitAngleDifference) * (impulseMagnitude * 0.005);

        if (car.isPlayer && extraArcadeImpulse > 5) addHitStop(3);
        car.ballContactCooldown = 15;
        
        const nowTime = Date.now();
        if (!ball.lastSoundTime || nowTime - ball.lastSoundTime > 120) {
            playSound('ball_hit', 1.0);
            ball.lastSoundTime = nowTime;
        }
        
        touchHistory.push({ car, time: gameTime });
        if (touchHistory.length > 10) touchHistory.shift();
    }
}

export function checkCarCarCollision(carA, carB, explosionParticles) {
    if (carA.isExploded || carB.isExploded) return;

    const heightDiff = Math.abs(carA.z - carB.z);
    if (heightDiff > 25) return;

    const dx = carB.x - carA.x;
    const dy = carB.y - carA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = carA.radius + carB.radius;

    if (distance < minDist) {
        const overlap = minDist - distance;
        const nx = dx / distance;
        const ny = dy / distance;

        const isASupersonic = carA.isSupersonic && !carA.isExploded && !carA.isFlipping;
        const isBSupersonic = carB.isSupersonic && !carB.isExploded && !carB.isFlipping;
        let demoOccurred = false;

        const areEnemies = carA.color !== carB.color;

        if (areEnemies && isASupersonic && isBSupersonic) {
            const dotA = Math.sin(carA.angle) * nx + (-Math.cos(carA.angle)) * ny;
            const dotB = Math.sin(carB.angle) * (-nx) + (-Math.cos(carB.angle)) * (-ny);

            if (dotA > 0.8 && dotB <= 0.8) {
                explodeCar(carB, explosionParticles, carA);
                demoOccurred = true;
            } else if (dotB > 0.8 && dotA <= 0.8) {
                explodeCar(carA, explosionParticles, carB);
                demoOccurred = true;
            } else if (dotA > 0.8 && dotB > 0.8) {
                explodeCar(carA, explosionParticles, carB);
                explodeCar(carB, explosionParticles, carA);
                demoOccurred = true;
            }
        } else if (areEnemies && isASupersonic) {
            const dotA = Math.sin(carA.angle) * nx + (-Math.cos(carA.angle)) * ny;
            if (dotA > 0.6) {
                explodeCar(carB, explosionParticles, carA);
                demoOccurred = true;
            }
        } else if (areEnemies && isBSupersonic) {
            const dotB = Math.sin(carB.angle) * (-nx) + (-Math.cos(carB.angle)) * (-ny);
            if (dotB > 0.6) {
                explodeCar(carA, explosionParticles, carB);
                demoOccurred = true;
            }
        }

        if (demoOccurred) return;

        carA.x -= nx * (overlap / 2);
        carA.y -= ny * (overlap / 2);
        carB.x += nx * (overlap / 2);
        carB.y += ny * (overlap / 2);

        const vRelX = carB.vx - carA.vx;
        const vRelY = carB.vy - carA.vy;
        const relVelNormal = vRelX * nx + vRelY * ny;

        if (relVelNormal > 0) return;

        const e = 0.3; 
        const impulseMagnitude = -(1 + e) * relVelNormal / ((1 / carA.mass) + (1 / carB.mass));
        
        const jX = impulseMagnitude * nx;
        const jY = impulseMagnitude * ny;

        carA.vx -= jX / carA.mass;
        carA.vy -= jY / carA.mass;
        carB.vx += jX / carB.mass;
        carB.vy += jY / carB.mass;

        if (Math.abs(relVelNormal) > 2) {
            playSound('car_hit', Math.min(1.0, Math.abs(relVelNormal) * 0.15));
        }
    }
}

function explodeCar(car, explosionParticles, killer) {
    car.isExploded = true;
    car.respawnTimer = 180;
    
    for (let i = 0; i < 40; i++) {
        const colorOffset = Math.random() * 50 - 25;
        explosionParticles.push(new ExplosionParticle(car.x, car.y, colorOffset));
    }
    playSound('goal', 0.8);
    addScreenShake(6);
    addHitStop(5);
    
    if (killer) {
        addFeedMessage(`${killer.name} DEMOLIÓ A ${car.name}`);
        killer.score += 20;
    } else {
        addFeedMessage(`${car.name} FUE DEMOLIDO`);
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
