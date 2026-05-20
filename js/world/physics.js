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
            
            const isBall = (entity.onWallTimer !== undefined);
            if (!isBall) {
                // Rampa 3D: Permitir que el coche penetre la valla visualmente a medida que sube en Z
                const allowedPenetration = Math.min(30, (entity.z || 0) * 0.65);
                const actualOverlap = Math.max(0, overlap - allowedPenetration);
                entity.x += nx * actualOverlap;
                entity.y += ny * actualOverlap;

                // Tracción e información de contacto con la pared
                entity.wallTractionTimer = 15;
                entity.lastWallNormal = { x: nx, y: ny };
            } else {
                entity.x += nx * overlap;
                entity.y += ny * overlap;
            }

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
            const isBall = (entity.onWallTimer !== undefined);
            const bounce = isBall ? CONST.CONFIG.BALL_BOUNCINESS : 0.18; // Rebote elástico ligero para coche (no se queda pegado)
            const friction = isBall ? 0.98 : 0.92; // Deslizamiento controlado por la rampa

            // Componente Normal (Rebote)
            const vNormalX = closestNormal.x * dot;
            const vNormalY = closestNormal.y * dot;

            // Componente Tangencial (Deslizamiento)
            const vTangentX = entity.vx - vNormalX;
            const vTangentY = entity.vy - vNormalY;

            // Aplicar rebote y fricción tangencial
            entity.vx = vTangentX * friction - vNormalX * bounce;
            entity.vy = vTangentY * friction - vNormalY * bounce;

            if (isBall) {
                entity.onWallTimer = CONST.CONFIG.BALL_WALL_DURATION;
                entity.targetRadius = entity.radius * CONST.CONFIG.BALL_WALL_VISUAL_MULTIPLIER;
                // Añadir un pequeño bote en Z al chocar contra la pared (más suave y controlado)
                if (entity.vz !== undefined) {
                    const wallBounceZ = Math.abs(vNormalX * bounce + vNormalY * bounce) * 0.04 + 0.3;
                    entity.vz = Math.min(2.5, entity.vz + wallBounceZ);
                }
                if (Math.abs(dot) > 8) addScreenShake(Math.abs(dot) * 0.3);
                playSound('wall_hit', 0.5);
            } else if (entity.speed !== undefined) {
                entity.speed = Math.sqrt(entity.vx**2 + entity.vy**2);
                
                // Rampa 3D: Convertir la inercia normal del choque frontal en impulso vertical Z
                const wallClimbForce = Math.abs(dot) * 0.72;
                entity.vz = Math.min(CONST.CONFIG.CAR_JUMP_FORCE * 1.15, (entity.vz || 0) + wallClimbForce);
                if (entity.z === 0) entity.z = 0.5;

                // No modificar el ángulo del chasis para conservar orientación al rebotar
                if (Math.abs(dot) > 4) addScreenShake(Math.abs(dot) * 0.4);
                playSound('wall_hit', 0.3); // Sonido sutil para la rampa
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
                ball.targetRadius = ball.radius * 1.8;
                zLift = 3.6;
                if (car.isPlayer) addHitStop(4); // Pausa dramática al golpear con Flip
            } else if (dotFront > 0.7) { // Impacto frontal estándar
                hitForceMultiplier = 1.6;
                ball.targetRadius = ball.radius * 1.5;
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
                ball.vz += impulse * 0.15 + (zLift * 0.7);
                if (ball.vz > 10.5) ball.vz = 10.5; // Límite de altura elevado para mejores saltos
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
        
        // --- LÓGICA DE DEMOLICIÓN ---
        // Si A es supersónico y B no es del mismo equipo (o fuego amigo desactivado), B explota.
        // Simplificamos: si alguien es supersónico, el otro explota (SOLO RIVALES)
        if (carA.isSupersonic && !carB.isSupersonic && carA.color !== carB.color) {
            demolishCar(carB, explosionParticles);
            addFeedMessage('demolition', carA, carB); // Añadimos mensaje al feed
            if (carA.isPlayer || carB.isPlayer) {
                addScreenShake(15);
                if (carA.isPlayer) addHitStop(4); // Hit-stop solo si yo exploto a alguien
            }
            carA.speed *= 0.6;
            return;
        } else if (carB.isSupersonic && !carA.isSupersonic && carA.color !== carB.color) {
            demolishCar(carA, explosionParticles);
            addFeedMessage('demolition', carB, carA);
            if (carA.isPlayer || carB.isPlayer) {
                addScreenShake(15);
                if (carB.isPlayer) addHitStop(4);
            }
            carB.speed *= 0.6;
            return;
        }

        const overlap = (minDist - dist) / 2;
        const nx = Math.cos(angle);
        const ny = Math.sin(angle);

        // Separación física
        carA.x -= nx * overlap; carA.y -= ny * overlap;
        carB.x += nx * overlap; carB.y += ny * overlap;

        // Intercambio de impulsos (Rebote con conservación de momento lineal)
        const relVx = carA.vx - carB.vx;
        const relVy = carA.vy - carB.vy;
        const relSpeedNormal = relVx * nx + relVy * ny;

        if (relSpeedNormal > 0) {
            // Restitución elástica controlada en base a la constante de configuración
            const restitution = CONST.CONFIG.CAR_ELASTICITY; 
            const impulse = -(1 + restitution) * relSpeedNormal;
            
            if (impulse > 3 && (carA.isPlayer || carB.isPlayer)) {
                addScreenShake(impulse * 0.8);
            }

            const j = impulse / 2; // Asumimos masas iguales para un comportamiento de choque limpio
            
            carA.vx += j * nx; 
            carA.vy += j * ny;
            carB.vx -= j * nx; 
            carB.vy -= j * ny;
            
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

