import * as CONST from '../core/constants.js';

/**
 * Inteligencia Artificial de los bots de SCAPS.
 * Mueve los controles virtuales del bot basándose en la posición del balón y los objetivos.
 */
export function updateCarAI(ai, ball, allCars, boostPads, controls, keysPressed) {
    // 1. Limpiar pulsaciones anteriores
    Object.values(controls).forEach(k => keysPressed[k] = false);

    // --- 1.5. SISTEMA ANTI-ATASCO MEJORADO ---
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

    // --- 2. OBJETIVOS Y ROLES ---
    const isBlue = ai.color === '#5ad';
    const myGoal = isBlue ? CONST.CONFIG.GOAL_TOP : CONST.CONFIG.GOAL_BOTTOM;
    const enemyGoal = isBlue ? CONST.CONFIG.GOAL_BOTTOM : CONST.CONFIG.GOAL_TOP;

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
    let tx, ty;
    if (role === 'ATTACK') {
        const dxGoal = enemyGoal.x - ball.x;
        const dyGoal = enemyGoal.y - ball.y;
        const dGoal = Math.max(1, Math.hypot(dxGoal, dyGoal));
        
        const dxBotToBall = ball.x - ai.x;
        const dyBotToBall = ball.y - ai.y;
        const distBotToBall = Math.max(1, Math.hypot(dxBotToBall, dyBotToBall));
        
        const dotProduct = ((dxBotToBall / distBotToBall) * (dxGoal / dGoal)) + ((dyBotToBall / distBotToBall) * (dyGoal / dGoal));
        
        if (dotProduct > 0.85) {
            tx = ball.x + (ball.vx || 0) * 12;
            ty = ball.y + (ball.vy || 0) * 12;
        } else {
            tx = ball.x - (dxGoal / dGoal) * 80;
            ty = ball.y - (dyGoal / dGoal) * 80;
        }
    } else if (role === 'DEFEND') {
        tx = myGoal.x + (ball.x - myGoal.x) * 0.3;
        ty = myGoal.y + (ball.y - myGoal.y) * 0.3;
    } else if (role === 'SUPPORT') {
        tx = (ball.x + myGoal.x) / 2;
        ty = (ball.y + myGoal.y) / 2;
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
    if (ai.wallTractionTimer > 0 && ai.lastWallNormal) {
        const toTargetX = tx - ai.x;
        const toTargetY = ty - ai.y;
        const distToTarget = Math.hypot(toTargetX, toTargetY);
        
        if (distToTarget > 20) {
            const dxNorm = toTargetX / distToTarget;
            const dyNorm = toTargetY / distToTarget;
            const dotWall = dxNorm * ai.lastWallNormal.x + dyNorm * ai.lastWallNormal.y;
            
            if (dotWall < -0.15) {
                const txTan = -ai.lastWallNormal.y;
                const tyTan = ai.lastWallNormal.x;
                const dotTan = toTargetX * txTan + toTargetY * tyTan;
                const tangentSign = dotTan >= 0 ? 1 : -1;
                tx = ai.x + txTan * tangentSign * 160 + ai.lastWallNormal.x * 60;
                ty = ai.y + tyTan * tangentSign * 160 + ai.lastWallNormal.y * 60;
            }
        }

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

    let shouldAccelerate = true;
    if (role === 'DEFEND' && distToTarget < 70) {
        shouldAccelerate = false;
        if (ai.speed > 0.1) {
            keysPressed[controls.down] = true;
        }
    } else if (role !== 'ATTACK' && distToTarget < 35) {
        shouldAccelerate = false;
        if (ai.speed > 0.1) {
            keysPressed[controls.down] = true;
        }
    }

    if (shouldAccelerate) {
        if (absDiff > Math.PI * 0.7 && distToTarget < 180) {
            keysPressed[controls.down] = true; // Retroceder
            if (absDiff > 0.15) {
                if (angleDiff > 0) keysPressed[controls.left] = true;
                else keysPressed[controls.right] = true;
            }
        } else {
            keysPressed[controls.up] = true; // Acelerar
            if (absDiff > 0.15 && distToTarget > 20) {
                if (angleDiff > 0) keysPressed[controls.right] = true;
                else keysPressed[controls.left] = true;
            }
        }
    }

    // Derrape
    if (shouldAccelerate && !keysPressed[controls.down] && absDiff > 1.2 && Math.abs(ai.speed) > 1.0) {
        keysPressed[controls.drift] = true;
    }

    // Boost
    if (shouldAccelerate && !keysPressed[controls.down] && absDiff < 0.3 && ai.boost > 0 && distToTarget > 150) {
        keysPressed[controls.boost] = true;
    }
}
