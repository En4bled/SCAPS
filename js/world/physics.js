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
            const friction = (entity.onWallTimer !== undefined) ? 0.98 : 0.85; // Menos fricción para el balón

            // Componente Normal (Rebote)
            const vNormalX = closestNormal.x * dot;
            const vNormalY = closestNormal.y * dot;

            // Componente Tangencial (Deslizamiento)
            const vTangentX = entity.vx - vNormalX;
            const vTangentY = entity.vy - vNormalY;

            // Aplicar rebote y fricción tangencial
            entity.vx = vTangentX * friction - vNormalX * bounce;
            entity.vy = vTangentY * friction - vNormalY * bounce;

            if (entity.onWallTimer !== undefined) {
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
                entity.angle = Math.atan2(entity.vx, -entity.vy);
                if (Math.abs(dot) > 4) addScreenShake(Math.abs(dot) * 0.4);
                playSound('wall_hit', 0.4);
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
    
    // 1. Vectores de dirección del coche
    const forwardX = Math.sin(car.angle);
    const forwardY = -Math.cos(car.angle);
    const rightX = -forwardY;
    const rightY = forwardX;

    // 2. Descomponer velocidad actual
    const vx = Math.sin(car.angle) * car.speed;
    const vy = -Math.cos(car.angle) * car.speed;

    const lateralVel = vx * rightX + vy * rightY;
    const forwardVel = vx * forwardX + vy * forwardY;

    // 3. Aplicar agarre lateral (Fricción de neumáticos)
    // Si no derrapa, la velocidad lateral se anula rápidamente
    const lateralFriction = car.isDrifting ? 0.94 : 0.75; 
    const newLateralVel = lateralVel * Math.pow(lateralFriction, timeScale);

    // 4. Recomponer
    const nVx = forwardX * forwardVel + rightX * newLateralVel;
    const nVy = forwardY * forwardVel + rightY * newLateralVel;

    car.speed = Math.sqrt(nVx**2 + nVy**2);
    if (car.speed > 0.1) {
        car.angle = Math.atan2(nVx, -nVy);
    }
}

/**
 * Arrastre Atmosférico Global (Drag)
 */
export function applyGlobalFriction(ball, cars, timeScale) {
    const drag = Math.pow(0.999, timeScale); 
    ball.vx *= drag;
    ball.vy *= drag;
    cars.forEach(car => {
        if (!car.isExploded) car.speed *= drag;
    });
}

export function checkCarBallCollision(car, ball, touchHistory, gameTime, timeScale = 1.0) {
    if (car.isExploded || ball.onWallTimer > 15) return;

    const dx = ball.x - car.x;
    const dy = ball.y - car.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const minDist = car.radius + ball.radius;

    if (distance < minDist) {
        const angle = Math.atan2(dy, dx);
        const overlap = minDist - distance;
        ball.x += Math.cos(angle) * overlap;
        ball.y += Math.sin(angle) * overlap;

        const relativeVelX = ball.vx - (Math.sin(car.angle) * car.speed);
        const relativeVelY = ball.vy - (-Math.cos(car.angle) * car.speed);
        const dotProduct = relativeVelX * Math.cos(angle) + relativeVelY * Math.sin(angle);

        if (dotProduct < 0) {
            // --- IMPACTO POR ZONAS (Power Shot) ---
            const forwardX = Math.sin(car.angle);
            const forwardY = -Math.cos(car.angle);
            const dotFront = Math.cos(angle) * forwardX + Math.sin(angle) * forwardY;
            
            let hitForceMultiplier = 1.0;
            let zLift = 0;
            if (dotFront > 0.7) { // Impacto frontal puro (~45º)
                hitForceMultiplier = 1.6; // Aumentado significativamente el impacto frontal
                ball.targetRadius = ball.radius * 1.6;
                zLift = 2.2; // Mayor elevación
            } else if (dotFront > 0.3) { // Impacto diagonal
                hitForceMultiplier = 1.25;
                zLift = 1.0;
            }

            const carSpeedMag = Math.abs(car.speed);
            // Se ha aumentado la transferencia de momento por velocidad del coche (de 0.4 a 0.65)
            let impulse = ((CONST.CONFIG.BALL_HIT_FORCE * hitForceMultiplier) + (-dotProduct * 0.8) + (carSpeedMag * 0.65)) * timeScale;
            
            // --- PINCH LOGIC ---
            if (ball.onWallTimer > 0) {
                impulse *= 1.4; // Impulso extra si el balón está contra la pared o volando bajo
            }

            if (impulse > 5 && car.isPlayer) addScreenShake(impulse * 0.4);
            if (impulse > 8 && car.isPlayer) addHitStop(3); // Pausa dramática al golpear fortísimo el balón

            ball.vx += Math.cos(angle) * impulse;
            ball.vy += Math.sin(angle) * impulse;
            
            // ELEVACIÓN EJE Z (Efecto aéreo de balón pesado)
            if (ball.vz !== undefined) {
                ball.vz += impulse * 0.15 + (zLift * 0.7);
                if (ball.vz > 7) ball.vz = 7; // Límite de altura más bajo y pesado (antes 12)
            }
            
            // Guía direccional
            ball.vx += forwardX * (carSpeedMag * 0.3) * timeScale;
            ball.vy += forwardY * (carSpeedMag * 0.3) * timeScale;

            // TRANSFERENCIA DE MASA: El coche pierde inercia al golpear el balón pesado
            if (carSpeedMag > 0.5) {
                // Si el impacto es muy frontal, el coche se frena un 60%, si es de refilón un 25%
                car.speed *= (dotFront > 0.5) ? 0.4 : 0.75;
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

        // Intercambio de impulsos (Rebote con peso)
        const vAx = Math.sin(carA.angle) * carA.speed;
        const vAy = -Math.cos(carA.angle) * carA.speed;
        const vBx = Math.sin(carB.angle) * carB.speed;
        const vBy = -Math.cos(carB.angle) * carB.speed;

        const relVx = vAx - vBx;
        const relVy = vAy - vBy;
        const relSpeedNormal = relVx * nx + relVy * ny;

        if (relSpeedNormal > 0) {
            // Restitución elástica controlada
            const restitution = 0.6; 
            const impulse = -(1 + restitution) * relSpeedNormal;
            
            if (impulse > 3) addScreenShake(impulse * 0.8);

            const j = impulse / 2;
            
            // CORRECCIÓN CRÍTICA: Los signos deben ser + para A y - para B para repelerlos
            const nVAx = vAx + j * nx; 
            const nVAy = vAy + j * ny;
            const nVBx = vBx - j * nx; 
            const nVBy = vBy - j * ny;

            carA.speed = Math.sqrt(nVAx**2 + nVAy**2);
            carA.angle = Math.atan2(nVAx, -nVAy);
            carB.speed = Math.sqrt(nVBx**2 + nVBy**2);
            carB.angle = Math.atan2(nVBx, -nVBy);
            
            // Solo reproducir sonido si el impacto es lo suficientemente fuerte (>0.5)
            // Esto evita el petardeo cuando los coches se rozan a baja velocidad
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

    // En Arcade, el botón de acelerar va pegado con cinta
    keysPressed[controls.up] = true;

    // Si estamos lejos o muy desalineados, girar
    if (absDiff > 0.15 && distToTarget > 30) {
        if (angleDiff > 0) {
            keysPressed[controls.right] = true;
        } else {
            keysPressed[controls.left] = true;
        }
    }

    // Derrape mágico para hacer giros en U sin atascarse
    if (absDiff > 1.2 && Math.abs(ai.speed) > 1.0) {
        keysPressed[controls.drift] = true;
    }

    // Usar turbo a muerte si apuntamos al balón
    if (absDiff < 0.3 && ai.boost > 0 && distToTarget > 150) {
        keysPressed[controls.boost] = true;
    }
}

