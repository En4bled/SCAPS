import * as CONST from '../core/constants.js';

/**
 * Inteligencia Artificial de los bots de SCAPS.
 * IA Conservadora con Roles Dinámicos y Físicas Avanzadas.
 */
export function updateCarAI(ai, ball, allCars, boostPads, controls, keysPressed) {
    // 1. Limpiar pulsaciones anteriores
    Object.values(controls).forEach(k => keysPressed[k] = false);

    if (ai.isExploded) return;

    // --- MANEJO DE DESATASCO (Si ya está activo) ---
    // En lugar de ir marcha atrás (que puede bloquearlos contra la pared), 
    // aceleran hacia delante mientras giran con fuerza para pivotar y zafarse.
    if (ai.isUnsticking) {
        ai.unstickFrames--;
        keysPressed[controls.up] = true; 
        if ((ai.unstickFrames % 30) < 15) keysPressed[controls.left] = true;
        else keysPressed[controls.right] = true;

        if (ai.unstickFrames <= 0) {
            ai.isUnsticking = false;
            ai.stuckTimer = 0;
        }
        return; 
    }

    // --- ROLES DINÁMICOS ---
    const isBlue = ai.color === '#5ad';
    const myGoal = isBlue ? CONST.CONFIG.GOAL_TOP : CONST.CONFIG.GOAL_BOTTOM;
    const enemyGoal = isBlue ? CONST.CONFIG.GOAL_BOTTOM : CONST.CONFIG.GOAL_TOP;

    let role = 'ATTACK';
    
    // Buscar compañeros
    const teammates = allCars.filter(c => c.color === ai.color && c !== ai);
    
    if (teammates.length > 0) {
        const teammate = teammates[0];
        
        // Evaluar posiciones respecto a nuestra portería (eje X, ya que el campo es horizontal)
        const aiDistToOwnGoal = Math.abs(ai.x - myGoal.x);
        const teammateDistToOwnGoal = Math.abs(teammate.x - myGoal.x);
        
        // Si el compañero (jugador humano u otro bot) está por delante de mí (más lejos de mi portería)
        // entonces yo me quedo atrás a defender de forma conservadora.
        if (teammateDistToOwnGoal > aiDistToOwnGoal + 200) {
            role = 'DEFEND';
        } else if (Math.abs(teammateDistToOwnGoal - aiDistToOwnGoal) <= 200) {
            // Si estamos paralelos, el más cercano a la pelota ataca
            const aiDistToBall = Math.hypot(ball.x - ai.x, ball.y - ai.y);
            const tmDistToBall = Math.hypot(ball.x - teammate.x, ball.y - teammate.y);
            if (tmDistToBall < aiDistToBall) {
                role = 'DEFEND';
            }
        }
    }

    // Si la pelota está críticamente cerca de nuestra portería, TODOS defienden
    const ballDistToOwnGoal = Math.hypot(ball.x - myGoal.x, ball.y - myGoal.y);
    if (ballDistToOwnGoal < 800) {
        role = 'DEFEND';
    }

    // --- NAVEGACIÓN Y COORDENADAS OBJETIVO ---
    let tx, ty;
    if (role === 'ATTACK') {
        const dxGoal = enemyGoal.x - ball.x;
        const dyGoal = enemyGoal.y - ball.y;
        const dGoal = Math.max(1, Math.hypot(dxGoal, dyGoal));
        
        const dxBotToBall = ball.x - ai.x;
        const dyBotToBall = ball.y - ai.y;
        const distBotToBall = Math.max(1, Math.hypot(dxBotToBall, dyBotToBall));
        
        const dotProduct = ((dxBotToBall / distBotToBall) * (dxGoal / dGoal)) + ((dyBotToBall / distBotToBall) * (dyGoal / dGoal));
        
        // Si está bien alineado para chutar, va directo a la pelota (prediciendo su trayectoria)
        if (dotProduct > 0.6) {
            tx = ball.x + (ball.vx || 0) * 15;
            ty = ball.y + (ball.vy || 0) * 15;
        } else {
            // Si no, rota alrededor para posicionarse detrás de la pelota
            tx = ball.x - (dxGoal / dGoal) * 150;
            ty = ball.y - (dyGoal / dGoal) * 150;
        }
    } else { // DEFEND
        // Se posiciona entre el balón y la portería, a una distancia prudencial
        const dxBall = ball.x - myGoal.x;
        const dyBall = ball.y - myGoal.y;
        const dBall = Math.max(1, Math.hypot(dxBall, dyBall));
        
        tx = myGoal.x + (dxBall / dBall) * 400; 
        ty = myGoal.y + (dyBall / dBall) * 400;

        // Si está posicionado defendiendo y le falta turbo, aprovecha para agarrar pastillas cercanas
        if (ai.boost < 30 && Math.hypot(tx - ai.x, ty - ai.y) < 200) {
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
        
        // Si el balón está en la zona roja de peligro, sale de la portería para despejar agresivamente
        if (ballDistToOwnGoal < 600) {
            tx = ball.x;
            ty = ball.y;
        }
    }

    // --- CONDUCCIÓN Y GIRO ---
    const dx = tx - ai.x;
    const dy = ty - ai.y;
    const distToTarget = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    const currentAngle = ai.angle - Math.PI / 2;
    
    let angleDiff = targetAngle - currentAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    const absDiff = Math.abs(angleDiff);

    let shouldAccelerate = true;
    
    // Parar si ya está bien colocado en defensa y la pelota no está cerca (deceleración natural)
    if (role === 'DEFEND' && distToTarget < 50 && ballDistToOwnGoal > 600) {
        shouldAccelerate = false;
    }

    if (shouldAccelerate) {
        // Los bots ya NO van marcha atrás para evitar bucles de bloqueo.
        // Siempre giran e intentan ir hacia delante.
        keysPressed[controls.up] = true; // Acelerar
        if (absDiff > 0.15) {
            if (angleDiff > 0) keysPressed[controls.right] = true;
            else keysPressed[controls.left] = true;
        }
    }

    // Derrape Conservador
    if (shouldAccelerate && absDiff > 1.2 && Math.abs(ai.speed) > 1.5) {
        keysPressed[controls.drift] = true;
    }

    // Boost (Solo si está bien alineado y hay distancia)
    if (shouldAccelerate && absDiff < 0.4 && ai.boost > 0 && distToTarget > 200) {
        keysPressed[controls.boost] = true;
    }

    // --- FÍSICAS AVANZADAS: SALTOS Y FLIPS (CONSERVADORES) ---
    const distToBallReal = Math.hypot(ball.x - ai.x, ball.y - ai.y);
    const ballIsAirborne = ball.z > ai.z + 40;
    
    // 1. Salto Básico Defensivo / Intercepción
    // Solo salta si el balón viene por el aire y está muy cerca
    if (distToBallReal < 180 && ballIsAirborne && absDiff < 0.5 && ai.z < 10) {
        keysPressed[controls.jump] = true;
        if (ball.z > 100 && ai.boost > 0) keysPressed[controls.boost] = true;
    }

    // 2. Front Flip (Doble salto) para chute potente
    // Si ya está en el aire (pequeño salto inicial o bache), y el balón está a la altura correcta
    if (ai.z > 10 && ai.z < 80 && !ballIsAirborne) {
        if (distToBallReal < 150 && absDiff < 0.3) {
            if (!ai.aiJumpPulse) {
                ai.aiJumpPulse = true;
                keysPressed[controls.jump] = false; // Soltamos el salto para registrar el doble tap en el siguiente frame
            } else {
                keysPressed[controls.jump] = true; // Segundo salto = Flip
                keysPressed[controls.up] = true; // Hacia delante
            }
        }
    } else {
        ai.aiJumpPulse = false;
    }

    // --- EVALUAR SI ESTAMOS ATASCADOS ---
    if (shouldAccelerate && Math.abs(ai.speed) < 0.3) {
        ai.stuckTimer = (ai.stuckTimer || 0) + 1;
        if (ai.stuckTimer > 40) { // 40 frames (~0.6s) intentando acelerar sin éxito
            ai.isUnsticking = true;
            ai.unstickFrames = 45;
        }
    } else {
        ai.stuckTimer = 0;
    }
}
