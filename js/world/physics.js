import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';
import { ExplosionParticle } from '../fx/particles.js';
import { addFeedMessage } from '../main.js';

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
                playSound('wall_hit', 0.5);
            } else if (entity.speed !== undefined) {
                entity.speed = Math.sqrt(entity.vx**2 + entity.vy**2);
                entity.angle = Math.atan2(entity.vx, -entity.vy);
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
            if (dotFront > 0.7) { // Impacto frontal (~45º)
                hitForceMultiplier = 1.35; // 35% más de fuerza
                ball.targetRadius = ball.radius * 1.5;
            }

            const carSpeedMag = Math.abs(car.speed);
            let impulse = ((CONST.CONFIG.BALL_HIT_FORCE * hitForceMultiplier) + (-dotProduct * 0.8) + (carSpeedMag * 0.4)) * timeScale;
            
            // --- PINCH LOGIC ---
            if (ball.onWallTimer > 0) {
                impulse *= 1.4; // Impulso extra si el balón está contra la pared o volando bajo
            }

            ball.vx += Math.cos(angle) * impulse;
            ball.vy += Math.sin(angle) * impulse;
            
            // Guía direccional
            ball.vx += forwardX * (carSpeedMag * 0.3) * timeScale;
            ball.vy += forwardY * (carSpeedMag * 0.3) * timeScale;
            
            const maxBallSpeed = 22;
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
            carA.speed *= 0.6;
            return;
        } else if (carB.isSupersonic && !carA.isSupersonic && carA.color !== carB.color) {
            demolishCar(carA, explosionParticles);
            addFeedMessage('demolition', carB, carA);
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
            // Factor de restitución (rebote) de 1.2 para que se sientan elásticos
            const restitution = 1.2;
            const impulse = -(restitution) * relSpeedNormal;
            
            // Aplicar el impulso a las velocidades
            const nVAx = vAx + (impulse * 0.8) * nx; 
            const nVAy = vAy + (impulse * 0.8) * ny;
            const nVBx = vBx - (impulse * 0.8) * nx; 
            const nVBy = vBy - (impulse * 0.8) * ny;

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

    // 1. PREDICCIÓN DE TRAYECTORIA (0.25s al futuro)
    const lookAhead = 15; 
    let tx = ball.x + ball.vx * lookAhead;
    let ty = ball.y + ball.vy * lookAhead;

    // 2. TÁCTICA DE EQUIPO Y ROLES
    const teammate = allCars.find(c => c.color === ai.color && c !== ai);
    const distToBall = Math.sqrt((ball.x - ai.x)**2 + (ball.y - ai.y)**2);
    const myGoal = (ai.color === '#5ad') ? CONST.CONFIG.GOAL_TOP : CONST.CONFIG.GOAL_BOTTOM;
    const enemyGoal = (ai.color === '#5ad') ? CONST.CONFIG.GOAL_BOTTOM : CONST.CONFIG.GOAL_TOP;
    
    let role = 'ATTACK'; // ATTACK, DEFEND, SHADOW, SUPPORT
    
    if (teammate) {
        const tDistToBall = Math.sqrt((ball.x - teammate.x)**2 + (ball.y - teammate.y)**2);
        const ballNearMyGoal = (Math.abs(ball.x - myGoal.x) < 400);

        if (tDistToBall < distToBall - 50) {
            role = ballNearMyGoal ? 'DEFEND' : 'SHADOW';
        } else if (ballNearMyGoal) {
            role = 'ATTACK'; // Soy el más cercano, debo despejar
        }
    }

    // 3. LÓGICA SEGÚN ROL
    if (role === 'DEFEND') {
        // Posicionarse en la línea de gol, un poco adelantado
        tx = myGoal.x + (ai.color === '#5ad' ? 100 : -100);
        ty = ball.y; // Seguir la altura del balón
        // Limitar ty al ancho de la portería
        ty = Math.max(myGoal.y - myGoal.w/2, Math.min(myGoal.y + myGoal.w/2, ty));
    } else if (role === 'SHADOW') {
        // Mantenerse a media distancia del compañero y del balón
        tx = (ball.x + myGoal.x) / 2;
        ty = (ball.y + myGoal.y) / 2;
        if (ai.boost < 30) { // Ir a por boost si hay sombra
            const activePads = boostPads.filter(p => p.active);
            if (activePads.length > 0) {
                const nearest = activePads.reduce((p, c) => 
                    Math.hypot(c.x-ai.x, c.y-ai.y) < Math.hypot(p.x-ai.x, p.y-ai.y) ? c : p);
                tx = nearest.x; ty = nearest.y;
            }
        }
    }

    // 4. CÁLCULO DE MANIOBRA
    const dx = tx - ai.x;
    const dy = ty - ai.y;
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = ai.angle - Math.PI / 2;
    
    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    const absDiff = Math.abs(angleDiff);

    // 5. CONTROL DE ENTRADAS
    if (absDiff > 0.1) {
        if (angleDiff > 0) keysPressed[controls.right] = true;
        else keysPressed[controls.left] = true;
    }

    // Aceleración inteligente
    if (absDiff < 0.5) {
        keysPressed[controls.up] = true;
        // Boost solo si estoy alineado y el balón está lejos o es ataque
        if (absDiff < 0.15 && (distToBall > 300 || role === 'ATTACK') && ai.boost > 10) {
            keysPressed[controls.boost] = true;
        }
    } else if (absDiff > 1.8 && distToBall < 200) {
        // Reversa si me he pasado el balón y está muy cerca
        keysPressed[controls.down] = true;
    } else {
        keysPressed[controls.up] = true;
        if (absDiff > 1.0) keysPressed[controls.drift] = true; // Derrape para giros cerrados
    }

    // 6. EVITAR ATASCOS
    if (Math.abs(ai.speed) < 0.2) {
        if (!ai.stuckTime) ai.stuckTime = 0;
        ai.stuckTime++;
        if (ai.stuckTime > 30) {
            keysPressed[controls.up] = false;
            keysPressed[controls.down] = true;
            keysPressed[controls.left] = (ai.x % 2 === 0);
            if (ai.stuckTime > 60) ai.stuckTime = 0;
        }
    } else {
        ai.stuckTime = 0;
    }
}
