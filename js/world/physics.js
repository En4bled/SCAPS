import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';
import { ExplosionParticle } from '../fx/particles.js';
import { addFeedMessage, addScreenShake, addHitStop } from '../main.js';

/**
 * MOTOR DE FÍSICAS SCAPS - CORE PRODUCTION V12
 * Este es el motor principal que gestiona colisiones, impulsos e IA.
 */

export function checkPolygonCollision(entity, polygon) {
    if (!polygon || polygon.length < 2) return;
    
    let closestDist = Infinity;
    let closestProj = { x: 0, y: 0 };
    let closestNormal = { x: 0, y: 0 };
    let hasCollision = false;
    let closestIndex = -1;

    // 1. Escaneo limpio del polígono para evitar el bug de actualización incremental de posición
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
            closestIndex = i;
            hasCollision = true;
            
            if (dist > 0.0001) {
                closestNormal = { x: (entity.x - projX) / dist, y: (entity.y - projY) / dist };
            } else {
                const len = Math.sqrt(lenSq);
                closestNormal = { x: -dy / len, y: dx / len };
            }
        }
    }

    if (!hasCollision) return;

    const nx = closestNormal.x;
    const ny = closestNormal.y;
    const overlap = entity.radius - closestDist;

    const isBall = (entity.onWallTimer !== undefined);

    if (isBall) {
        // --- COMPORTAMIENTO FÍSICO DEL BALÓN (Estable y Rebotador) ---
        if (closestDist < entity.radius) {
            entity.x += nx * overlap;
            entity.y += ny * overlap;
        }

        if (entity.vx !== undefined) {
            const dot = entity.vx * nx + entity.vy * ny;
            if (dot < 0) {
                const bounce = CONST.CONFIG.BALL_BOUNCINESS;
                const friction = 0.98;
                const vNormalX = nx * dot;
                const vNormalY = ny * dot;
                const vTangentX = entity.vx - vNormalX;
                const vTangentY = entity.vy - vNormalY;

                entity.vx = vTangentX * friction - vNormalX * bounce;
                entity.vy = vTangentY * friction - vNormalY * bounce;

                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius; // Mantener tamaño físico real sin agrandamiento visual
                
                if (entity.vz !== undefined) {
                    const wallBounceZ = Math.abs(dot) * bounce * 0.04 + 0.3;
                    entity.vz = Math.min(2.5, entity.vz + wallBounceZ);
                }
                if (Math.abs(dot) > 8) addScreenShake(Math.abs(dot) * 0.3);
                playSound('wall_hit', 0.5);
            }
        }
    } else {
        // --- COMPORTAMIENTO AVANZADO DE RAMPAS/PAREDES PARA EL COCHE ---
        const z = entity.z || 0;
        const slopeFactor = 0.65;
        const maxPenetration = 30;
        
        // Si el coche está haciendo un flip, está saltando o viene volando sin tracción previa,
        // rebota limpiamente contra el muro en lugar de incrustarse en la colisión.
        const isJumpingIntoWall = entity.isJumping || (z > 1.0 && (entity.wallTractionTimer || 0) <= 0);
        if (entity.isFlipping || isJumpingIntoWall) {
            const isOnWall = (closestDist < entity.radius);
            if (isOnWall) {
                // Resolver colisión empujando fuera de la pared por completo (sin allowedPenetration)
                entity.x += nx * overlap;
                entity.y += ny * overlap;
                
                if (entity.vx !== undefined) {
                    const vNormal = entity.vx * nx + entity.vy * ny;
                    if (vNormal < 0) {
                        const tx = -ny;
                        const ty = nx;
                        const vTangent = entity.vx * tx + entity.vy * ty;
                        
                        // Rebote horizontal limpio y elástico siguiendo la trayectoria reflejada
                        const bounce = 0.40;
                        const reboundedNormal = -vNormal * bounce;
                        entity.vx = reboundedNormal * nx + vTangent * 0.88 * tx;
                        entity.vy = reboundedNormal * ny + vTangent * 0.88 * ty;
                        
                        // Cancelar flip/salto e impulsarse verticalmente (elevación) en proporción al impacto
                        entity.isFlipping = false;
                        entity.isJumping = false;
                        
                        const liftForce = -vNormal * 0.45 + 1.5;
                        entity.vz = Math.max(entity.vz || 0, Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 0.85, liftForce));
                        
                        addScreenShake(Math.abs(vNormal) * 0.45);
                        playSound('wall_hit', 0.5);
                    }
                }
                entity.speed = Math.sqrt(entity.vx ** 2 + entity.vy ** 2);
                return;
            }
        }
        
        const allowedPenetration = Math.min(maxPenetration, z * slopeFactor);
        const isOnWall = (closestDist < entity.radius);

        if (isOnWall) {
            entity.wallTractionTimer = 15;
            entity.lastWallNormal = { x: nx, y: ny };
            if (z === 0) {
                entity.z = 0.5; // Pequeño offset para inicializar el estado de rampa
            }
        }

        // Resolución de la posición física límite (solo si excede la anchura de la rampa)
        const actualOverlap = overlap - allowedPenetration;
        if (actualOverlap > 0) {
            entity.x += nx * actualOverlap;
            entity.y += ny * actualOverlap;
        }

        if (entity.vx !== undefined) {
            const vNormal = entity.vx * nx + entity.vy * ny;
            const tx = -ny; // Vector tangente perpendicular
            const ty = nx;
            const vTangent = entity.vx * tx + entity.vy * ty;

            if (isOnWall) {
                if (vNormal < 0) {
                    // El coche se mueve hacia la pared (Subiendo la rampa)
                    const impactForce = Math.abs(vNormal);

                    // Si es un impacto directo fuerte contra la base de la pared (z bajo)
                    if (z <= 1.0 && impactForce > 1.2) {
                        const bounce = 0.18; // Rebote controlado
                        const reboundedNormal = -vNormal * bounce;
                        const climbForce = impactForce * 0.72;
                        // Usar Math.max en lugar de acumulación aditiva para evitar que el coche salga disparado verticalmente
                        entity.vz = Math.max(entity.vz || 0, Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 1.15, climbForce));

                        // Rebote horizontal amortiguado con deslizamiento
                        entity.vx = reboundedNormal * nx + vTangent * 0.92 * tx;
                        entity.vy = reboundedNormal * ny + vTangent * 0.92 * ty;

                        if (impactForce > 4) addScreenShake(impactForce * 0.4);
                        playSound('wall_hit', 0.3);
                    } else {
                        // Subida suave o deslizamiento continuo por la rampa
                        const climbForce = impactForce * 0.85;
                        // Usar Math.max en lugar de acumulación aditiva para evitar la realimentación exponencial en la rampa
                        entity.vz = Math.max(entity.vz || 0, Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 1.2, climbForce));

                        // La velocidad normal se acopla cinemáticamente a la velocidad vertical
                        const constrainedNormal = -entity.vz * slopeFactor;

                        // Deslizamiento perfecto: ¡Sin fricción artificial de colisión aplicada al tangente!
                        entity.vx = constrainedNormal * nx + vTangent * tx;
                        entity.vy = constrainedNormal * ny + vTangent * ty;
                    }
                } else {
                    // El coche se aleja de la pared (Bajando la rampa)
                    // La velocidad vertical de caída se ajusta según la velocidad de alejamiento
                    entity.vz = -vNormal / slopeFactor;

                    // Si la gravedad está haciendo caer al coche más rápido de lo que el jugador se aleja,
                    // la restricción cinemática empuja al coche hacia el campo para mantenerlo en la rampa
                    const gravityDescentNormal = -(entity.vz || 0) * slopeFactor;
                    const finalNormal = Math.max(vNormal, gravityDescentNormal);

                    entity.vx = finalNormal * nx + vTangent * tx;
                    entity.vy = finalNormal * ny + vTangent * ty;
                }
                
                // Mantener actualizada la velocidad lineal del chasis
                entity.speed = Math.sqrt(entity.vx ** 2 + entity.vy ** 2);
            }
        }
    }
}

/**
 * Aplica fricción de neumáticos: Agarre lateral extremo vs inercia frontal.
 * Evita que los coches deslicen como si estuvieran en hielo.
 */
export function applyTirePhysics(car, timeScale) {
    if (car.isExploded) return;
    
    // Si el coche está en el aire, no hay fricción de neumáticos (a menos que esté subiendo por la rampa de la pared)
    if (car.z > 0 && !(car.wallTractionTimer > 0)) return;
    
    // 1. Vectores de dirección del coche
    const forwardX = Math.sin(car.angle);
    const forwardY = -Math.cos(car.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    // 2. Descomponer velocidad física real
    const lateralVel = car.vx * rightX + car.vy * rightY;
    const forwardVel = car.vx * forwardX + car.vy * forwardY;

    // 3. Aplicar retención lateral (fricción de neumático según si derrapa o no)
    const grip = car.isDrifting ? CONST.CONFIG.CAR_LATERAL_GRIP_DRIFT : CONST.CONFIG.CAR_LATERAL_GRIP_NORMAL;
    const newLateralVel = lateralVel * Math.pow(grip, timeScale);

    // 4. Recomponer velocidades vectoriales finales
    car.vx = forwardX * forwardVel + rightX * newLateralVel;
    car.vy = forwardY * forwardVel + rightY * newLateralVel;
}

/**
 * Arrastre Atmosférico Global (Drag)
 */
export function applyGlobalFriction(ball, cars, timeScale) {
    const drag = Math.pow(0.999, timeScale); 
    ball.vx *= drag;
    ball.vy *= drag;
    cars.forEach(car => {
        if (!car.isExploded) {
            car.vx *= drag;
            car.vy *= drag;
            car.speed = Math.sqrt(car.vx**2 + car.vy**2);
        }
    });
}

export function checkCarBallCollision(car, ball, touchHistory, gameTime, timeScale = 1.0) {
    if (car.isExploded) return;

    // --- VERIFICACIÓN DE ALTURA EN EJE Z ---
    const carZ = car.z || 0;
    const ballZ = ball.z || 0;
    const carHeight = 22; // Altura tridimensional del chasis
    const zOverlap = Math.abs(carZ - ballZ) < (carHeight + ball.radius);
    if (!zOverlap) return; // Si no coinciden en altura, se cruzan sin colisión

    const dx = ball.x - car.x;
    const dy = ball.y - car.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = car.radius + ball.radius;

    if (distance < minDist) {
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - distance;
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;

        // Leer vx/vy físicos directos del coche
        const relativeVelX = ball.vx - car.vx;
        const relativeVelY = ball.vy - car.vy;
        const dotProduct = relativeVelX * Math.cos(angle) + relativeVelY * Math.sin(angle);

        if (dotProduct < 0) {
            // --- IMPACTO POR ZONAS (Power Shot / Front Flip) ---
            const forwardX = Math.sin(car.angle);
            const forwardY = -Math.cos(car.angle);
            const dotFront = Math.cos(angle) * forwardX + Math.sin(angle) * forwardY;
            
            let hitForceMultiplier = 1.0;
            let zLift = 0;
            
            if (car.isFlipping) {
                // VOLTERETA FRONTAL (Front Flip): Power Shot súper cargado con elevación extra
                hitForceMultiplier = 2.15;
                ball.targetRadius = ball.radius; // Mantener tamaño constante
                zLift = 3.6;
                if (car.isPlayer) addHitStop(4); // Pausa dramática al golpear con Flip
            } else if (dotFront > 0.7) { // Impacto frontal estándar
                hitForceMultiplier = 1.6;
                ball.targetRadius = ball.radius; // Mantener tamaño constante
                zLift = 2.2;
            } else if (dotFront > 0.3) { // Impacto diagonal
                hitForceMultiplier = 1.25;
                zLift = 1.0;
            }

            const carSpeedMag = Math.sqrt(car.vx**2 + car.vy**2);
            let impulse = ((CONST.CONFIG.BALL_HIT_FORCE * hitForceMultiplier) + (-dotProduct * 1.3) + (carSpeedMag * 1.25)) * timeScale;
            
            // --- PINCH LOGIC ---
            if (ball.onWallTimer > 0) {
                impulse *= 1.4;
            }

            if (impulse > 8 && car.isPlayer && !car.isFlipping) {
                addHitStop(3);
            }

            // Descomponer la velocidad actual del balón
            const ballNormalVel = ball.vx * Math.cos(angle) + ball.vy * Math.sin(angle);
            const ballTangentX = ball.vx - ballNormalVel * Math.cos(angle);
            const ballTangentY = ball.vy - ballNormalVel * Math.sin(angle);

            // Velocidad del coche en la dirección del impacto
            const carNormalVel = car.vx * Math.cos(angle) + car.vy * Math.sin(angle);

            // Establecer la nueva velocidad normal del balón como la del coche más el impulso de rebote (evita arrastres)
            const newNormalVel = carNormalVel + impulse;
            ball.vx = ballTangentX + Math.cos(angle) * newNormalVel;
            ball.vy = ballTangentY + Math.sin(angle) * newNormalVel;
            
            // ELEVACIÓN EJE Z (Efecto aéreo para juego aéreo fluido)
            if (ball.vz !== undefined) {
                // Usar Math.max no aditivo para evitar la elevación infinita por toques consecutivos
                const hitLift = impulse * 0.11 + (zLift * 0.55);
                ball.vz = Math.max(ball.vz || 0, Math.min(6.5, hitLift));
            }

            // Transferencia de rotación/giro (spin) según el punto de impacto relativo al chasis
            const hitAngleDifference = angle - car.angle;
            ball.spin = Math.sin(hitAngleDifference) * (impulse * 0.08);
            
            // Guía direccional
            ball.vx += forwardX * (carSpeedMag * 0.3) * timeScale;
            ball.vy += forwardY * (carSpeedMag * 0.3) * timeScale;

            // TRANSFERENCIA DE MASA: El coche pierde inercia vectorial
            if (carSpeedMag > 0.5) {
                const brakeFactor = (dotFront > 0.5) ? 0.85 : 0.95;
                car.vx *= brakeFactor;
                car.vy *= brakeFactor;
            }
            
            const maxBallSpeed = CONST.CONFIG.BALL_MAX_SPEED;
            const currentBallSpeed = Math.sqrt(ball.vx**2 + ball.vy**2);
            if (currentBallSpeed > maxBallSpeed) {
                ball.vx = (ball.vx / currentBallSpeed) * maxBallSpeed;
                ball.vy = (ball.vy / currentBallSpeed) * maxBallSpeed;
            }
            
            ball.onWallTimer = 8; 
            playSound('ball_hit', 1.0);
        }
        touchHistory.push({ car, time: gameTime });
        if (touchHistory.length > 10) touchHistory.shift();
    }
}

export function checkCarCarCollision(carA, carB, explosionParticles) {
    if (carA.isExploded || carB.isExploded) return;

    // --- VERIFICACIÓN DE ALTURA EN EJE Z ---
    // Si un coche salta por encima del otro, no colisionan horizontalmente
    const heightDiff = Math.abs(carA.z - carB.z);
    if (heightDiff > 40) return;

    const dx = carB.x - carA.x;
    const dy = carB.y - carA.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const minDist = carA.radius + carB.radius;

    if (dist < minDist) {
        const angle = Math.atan2(dy, dx);
        
        const overlap = (minDist - dist) / 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);

        // --- LÓGICA DE DEMOLICIÓN DE RIVALES (Regla del 80% de velocidad con boost) ---
        const speedA = Math.sqrt(carA.vx * carA.vx + carA.vy * carA.vy);
        const speedB = Math.sqrt(carB.vx * carB.vx + carB.vy * carB.vy);
        const combinedSpeed = speedA + speedB;
        const maxBoostSpeed = CONST.CONFIG.CAR_MAX_BOOST_SPEED;
        const demoThreshold = maxBoostSpeed * 0.80; // 80% de la velocidad máxima con boost
        
        const isRival = (carA.color !== carB.color);
        const relVx = carA.vx - carB.vx;
        const relVy = carA.vy - carB.vy;
        const relSpeedNormal = relVx * nx + relVy * ny; // > 0 si A se mueve hacia B

        let isDemolition = false;
        let attacker = null;
        let victim = null;

        if (isRival) {
            if (relSpeedNormal > 0.05) {
                // A es el atacante
                if (speedA >= demoThreshold || combinedSpeed >= demoThreshold) {
                    isDemolition = true;
                    attacker = carA;
                    victim = carB;
                }
            } else if (relSpeedNormal < -0.05) {
                // B es el atacante
                if (speedB >= demoThreshold || combinedSpeed >= demoThreshold) {
                    isDemolition = true;
                    attacker = carB;
                    victim = carA;
                }
            }
        }

        if (isDemolition && attacker && victim) {
            demolishCar(victim, explosionParticles);
            addFeedMessage('demolition', attacker, victim); // Añadimos mensaje al feed
            if (attacker.isPlayer || victim.isPlayer) {
                addScreenShake(15);
                if (attacker.isPlayer) addHitStop(4); // Hit-stop solo si yo exploto a alguien
            }
            attacker.speed *= 0.6;
            return;
        }

        // Separación física si no hay demolición (los coches rebotan)
        carA.x -= nx * overlap; carA.y -= ny * overlap;
        carB.x += nx * overlap; carB.y += ny * overlap;

        // Intercambio de impulsos (Rebote con conservación de momento lineal)
        const relVx = carA.vx - carB.vx;
        const relVy = carA.vy - carB.vy;
        const relSpeedNormal = relVx * nx + relVy * ny;

        if (relSpeedNormal > 0) {
            // Aumentar ligeramente el coeficiente para un rebote horizontal más visible y satisfactorio
            const restitution = CONST.CONFIG.CAR_ELASTICITY; 
            const elasticMultiplier = 1.35 + restitution * 0.8;
            const impulse = -elasticMultiplier * relSpeedNormal;
            
            if (Math.abs(impulse) > 2 && (carA.isPlayer || carB.isPlayer)) {
                addScreenShake(Math.abs(impulse) * 0.65);
            }

            const j = impulse / 2; // Asumimos masas iguales para un comportamiento de choque limpio
            
            carA.vx += j * nx; 
            carA.vy += j * ny;
            carB.vx -= j * nx; 
            carB.vy -= j * ny;

            // --- ELEVACIÓN EN Z (Trayectoria parabólica en el aire) ---
            if (relSpeedNormal > 0.35) {
                // Elevación proporcional a la velocidad relativa de impacto
                const lift = Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 0.8, relSpeedNormal * 0.72 + 0.3);
                
                carA.vz = Math.max(carA.vz || 0, lift);
                carB.vz = Math.max(carB.vz || 0, lift);
                
                // Forzar inicio de elevación si estaban pegados al suelo
                if (carA.z === 0) carA.z = 0.1;
                if (carB.z === 0) carB.z = 0.1;
                
                // Cancelar cualquier estado previo de salto o flip para física aérea limpia
                carA.isJumping = false; carA.isFlipping = false;
                carB.isJumping = false; carB.isFlipping = false;
            }
            
            // Solo reproducir sonido si el impacto es lo suficientemente fuerte (>0.5)
            if (relSpeedNormal > 0.5) {
                playSound('car_hit', Math.min(1.0, relSpeedNormal * 0.5));
            }
        }
    }
}

function demolishCar(car, explosionParticles) {
    car.isExploded = true;
    car.respawnTimer = 180; // 3 segundos a 60fps
    car.speed = 0;
    car.vx = 0; car.vy = 0;
    
    // Generar partículas de explosión reales
    if (explosionParticles) {
        for (let i = 0; i < 20; i++) {
            explosionParticles.push(new ExplosionParticle(car.x, car.y, Math.random() * 50 - 25));
        }
    }
    playSound('goal', 0.8); // Usamos el sonido de gol como base para la explosión
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

/**
 * IA DE LOS BOTS - CORE PRODUCTION (Ex Experimental V11)
 */
/**
 * IA DE LOS BOTS AVANZADA (V14 - COMPETITIVE)
 * Implementa predicción, rotación defensiva y control de boost inteligente.
 */
export function updateCarAI(ai, ball, boostPads, gameState, keysPressed, allCars) { 
    if (gameState !== 'playing' && gameState !== 'countdown') return;

    const controls = ai.controls;
    keysPressed[controls.up] = false; keysPressed[controls.down] = false;
    keysPressed[controls.left] = false; keysPressed[controls.right] = false;
    keysPressed[controls.boost] = false; keysPressed[controls.drift] = false;

    if (gameState === 'countdown') return;

    // --- 1. MÁQUINA DE ESTADOS ANTI-ATASCOS (Bomba Arcade) ---
    // Si la velocidad es casi nula y no estamos desatascándonos, sumar contador
    if (Math.abs(ai.speed) < 0.3 && !ai.isUnsticking) {
        ai.stuckTimer = (ai.stuckTimer || 0) + 1;
        if (ai.stuckTimer > 20) { // Si lleva ~0.3s parado
            ai.isUnsticking = true;
            ai.unstickFrames = 45; // Obligamos a hacer 45 frames ininterrumpidos de maniobra
        }
    } else if (Math.abs(ai.speed) >= 0.3 && !ai.isUnsticking) {
        ai.stuckTimer = 0;
    }

    // Si está en Modo Pánico, ejecutamos maniobra evasiva ciega
    if (ai.isUnsticking) {
        ai.unstickFrames--;
        keysPressed[controls.down] = true; // Marcha atrás a fondo
        
        // Girar para hacer un arco y salir de la trampa
        // Usamos el ID del coche o un patrón para que no todos giren al mismo lado siempre
        if ((ai.unstickFrames % 30) < 15) {
            keysPressed[controls.left] = true;
        } else {
            keysPressed[controls.right] = true;
        }

        if (ai.unstickFrames <= 0) {
            ai.isUnsticking = false;
            ai.stuckTimer = 0;
        }
        return; // IGNORAR TODA LA IA MIENTRAS SE DESATASCA
    }

    // --- 2. OBJETIVOS Y ROLES (Arcade Style) ---
    const isBlue = ai.color === '#5ad';
    const myGoal = isBlue ? CONST.CONFIG.GOAL_TOP : CONST.CONFIG.GOAL_BOTTOM;
    const enemyGoal = isBlue ? CONST.CONFIG.GOAL_BOTTOM : CONST.CONFIG.GOAL_TOP;

    let tx = ball.x + ball.vx * 15; // Predicción simple
    let ty = ball.y + ball.vy * 15;
    let role = 'ATTACK';
    
    const teammate = allCars.find(c => c.color === ai.color && c !== ai);
    const distToBall = Math.hypot(ball.x - ai.x, ball.y - ai.y);
    const ballToMyGoal = Math.hypot(ball.x - myGoal.x, ball.y - myGoal.y);
    
    if (teammate) {
        const tDist = Math.hypot(ball.x - teammate.x, ball.y - teammate.y);
        if (tDist < distToBall - 30 && ballToMyGoal > 800) {
            role = 'SUPPORT';
        }
    }
    if (ballToMyGoal < 700 && distToBall > 300) {
        role = 'DEFEND';
    }

    // --- 3. COORDENADAS OBJETIVO ---
    if (role === 'ATTACK') {
        // Encarar siempre desde detrás del balón para empujar a portería
        const dxGoal = enemyGoal.x - ball.x;
        const dyGoal = enemyGoal.y - ball.y;
        const dGoal = Math.max(1, Math.hypot(dxGoal, dyGoal));
        tx = ball.x - (dxGoal / dGoal) * 80;
        ty = ball.y - (dyGoal / dGoal) * 80;
    } else if (role === 'DEFEND') {
        // Ponerse en línea
        tx = myGoal.x + (ball.x - myGoal.x) * 0.3;
        ty = myGoal.y + (ball.y - myGoal.y) * 0.3;
    } else if (role === 'SUPPORT') {
        tx = (ball.x + myGoal.x) / 2;
        ty = (ball.y + myGoal.y) / 2;
        // Si hay poco boost, desviarse
        if (ai.boost < 30) {
            const activePads = boostPads.filter(p => p.active);
            if (activePads.length > 0) {
                let best = activePads[0];
                let min = Infinity;
                activePads.forEach(p => {
                    const d = Math.hypot(p.x - ai.x, p.y - ai.y);
                    if (d < min) { min = d; best = p; }
                });
                tx = best.x; ty = best.y;
            }
        }
    }

    // --- 3.5. EVASIÓN INTELIGENTE DE PAREDES (IA) ---
    // Si el bot está tocando una pared/rampa o estuvo en contacto reciente
    if (ai.wallTractionTimer > 0 && ai.lastWallNormal) {
        // Comprobar si el objetivo tx, ty nos forzaría a empujar directamente hacia fuera del campo (contra el muro)
        const toTargetX = tx - ai.x;
        const toTargetY = ty - ai.y;
        const distToTarget = Math.hypot(toTargetX, toTargetY);
        
        if (distToTarget > 20) {
            const dxNorm = toTargetX / distToTarget;
            const dyNorm = toTargetY / distToTarget;
            // Producto punto entre el vector del objetivo y la normal hacia el interior del campo (apunta hacia adentro)
            const dotWall = dxNorm * ai.lastWallNormal.x + dyNorm * ai.lastWallNormal.y;
            
            // Si el objetivo está detrás del muro (dotWall < -0.15)
            if (dotWall < -0.15) {
                // Tangente a la pared: perpendicular a la normal
                const txTan = -ai.lastWallNormal.y;
                const tyTan = ai.lastWallNormal.x;
                
                // Determinar qué dirección de la tangente nos acerca más al objetivo real
                const dotTan = toTargetX * txTan + toTargetY * tyTan;
                const tangentSign = dotTan >= 0 ? 1 : -1;
                
                // Redirigir el objetivo del bot a lo largo de la pared (deslizamiento tangente) 
                // e introducir un leve vector hacia el interior del campo (normal de la pared)
                tx = ai.x + txTan * tangentSign * 160 + ai.lastWallNormal.x * 60;
                ty = ai.y + tyTan * tangentSign * 160 + ai.lastWallNormal.y * 60;
            }
        }

        // Salida de Emergencia por Atasco Crítico: si lleva tiempo parado contra la pared, forzar salida directa al centro
        if (ai.stuckTimer > 10) {
            tx = ai.x + ai.lastWallNormal.x * 320;
            ty = ai.y + ai.lastWallNormal.y * 320;
        }
    }

    // --- 4. CONDUCCIÓN IMPLACABLE ---
    const dx = tx - ai.x;
    const dy = ty - ai.y;
    const distToTarget = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = ai.angle - Math.PI / 2;
    
    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const absDiff = Math.abs(angleDiff);

    // --- 4. CONDUCCIÓN INTELIGENTE ---
    let shouldAccelerate = true;

    // Si el defensor ya está en zona defensiva cercana al objetivo, se detiene
    if (role === 'DEFEND' && distToTarget < 70) {
        shouldAccelerate = false;
        if (ai.speed > 0.1) {
            keysPressed[controls.down] = true; // Freno activo
        }
    } else if (distToTarget < 35) {
        // En cualquier rol, si estamos a punto de llegar exactamente al objetivo, desaceleramos
        shouldAccelerate = false;
        if (ai.speed > 0.1) {
            keysPressed[controls.down] = true; // Frenar suavemente
        }
    }

    if (shouldAccelerate) {
        // Maniobra inteligente: Marcha atrás si el objetivo está detrás y a corta distancia
        if (absDiff > Math.PI * 0.7 && distToTarget < 180) {
            keysPressed[controls.down] = true; // Retroceder
            
            // Dirección inversa en reversa
            if (absDiff > 0.15) {
                if (angleDiff > 0) {
                    keysPressed[controls.left] = true;
                } else {
                    keysPressed[controls.right] = true;
                }
            }
        } else {
            keysPressed[controls.up] = true; // Acelerar
            
            // Dirección hacia el objetivo
            if (absDiff > 0.15 && distToTarget > 20) {
                if (angleDiff > 0) {
                    keysPressed[controls.right] = true;
                } else {
                    keysPressed[controls.left] = true;
                }
            }
        }
    }

    // Derrape mágico para hacer giros en U rápidos sin atascarse (solo si vamos hacia adelante)
    if (shouldAccelerate && !keysPressed[controls.down] && absDiff > 1.2 && Math.abs(ai.speed) > 1.0) {
        keysPressed[controls.drift] = true;
    }

    // Usar turbo a muerte si apuntamos al objetivo de ataque y no estamos frenando
    if (shouldAccelerate && !keysPressed[controls.down] && absDiff < 0.3 && ai.boost > 0 && distToTarget > 150) {
        keysPressed[controls.boost] = true;
    }
}

