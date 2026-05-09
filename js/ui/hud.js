import * as CONST from '../core/constants.js';

export function drawHUD(ctx, canvas, gameTime, score, player1, cameraMode) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    
    const minutes = Math.floor(gameTime / 60);
    const seconds = Math.floor(gameTime % 60);
    const timeStr = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    const centerX = canvas.width / 2;
    const topY = 0;
    const height = 70;
    const centerW = 200;
    const sideW = 130;
    const slant = 25;
    const gap = 4;

    // --- MARCADOR SUPERIOR ---
    
    // Caja Central (Tiempo)
    ctx.fillStyle = 'rgba(15, 20, 25, 0.9)';
    ctx.beginPath();
    ctx.moveTo(centerX - centerW/2, topY);
    ctx.lineTo(centerX + centerW/2, topY);
    ctx.lineTo(centerX + centerW/2 - slant, height);
    ctx.lineTo(centerX - centerW/2 + slant, height);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 55px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 5;
    ctx.fillText(timeStr, centerX, height / 2 + 5);

    // Caja Azul
    const blueGradient = ctx.createLinearGradient(centerX - centerW/2 - gap, topY, centerX - centerW/2 - gap - sideW, topY);
    blueGradient.addColorStop(0, 'rgba(20, 50, 200, 0.9)');
    blueGradient.addColorStop(1, 'rgba(50, 100, 255, 0.9)');
    ctx.fillStyle = blueGradient;
    ctx.beginPath();
    ctx.moveTo(centerX - centerW/2 - gap, topY);
    ctx.lineTo(centerX - centerW/2 - gap - sideW, topY);
    ctx.quadraticCurveTo(centerX - centerW/2 - gap - sideW - 10, topY, centerX - centerW/2 - gap - sideW - 10, 10);
    ctx.lineTo(centerX - centerW/2 - gap - sideW - 10 + slant, height - 10);
    ctx.quadraticCurveTo(centerX - centerW/2 - gap - sideW - 10 + slant + 2, height, centerX - centerW/2 - gap - sideW + slant, height);
    ctx.lineTo(centerX - centerW/2 - gap + slant, height);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.font = 'bold 60px Rajdhani, sans-serif';
    ctx.fillText(score.blue, centerX - centerW/2 - gap - sideW/2, height / 2 + 5);

    // Caja Naranja
    const orangeGradient = ctx.createLinearGradient(centerX + centerW/2 + gap, topY, centerX + centerW/2 + gap + sideW, topY);
    orangeGradient.addColorStop(0, 'rgba(200, 70, 0, 0.9)');
    orangeGradient.addColorStop(1, 'rgba(255, 120, 30, 0.9)');
    ctx.fillStyle = orangeGradient;
    ctx.beginPath();
    ctx.moveTo(centerX + centerW/2 + gap, topY);
    ctx.lineTo(centerX + centerW/2 + gap + sideW, topY);
    ctx.quadraticCurveTo(centerX + centerW/2 + gap + sideW + 10, topY, centerX + centerW/2 + gap + sideW + 10, 10);
    ctx.lineTo(centerX + centerW/2 + gap + sideW + 10 - slant, height - 10);
    ctx.quadraticCurveTo(centerX + centerW/2 + gap + sideW + 10 - slant - 2, height, centerX + centerW/2 + gap + sideW - slant, height);
    ctx.lineTo(centerX + centerW/2 + gap - slant, height);
    ctx.fill();
    ctx.fillStyle = 'white';
    ctx.fillText(score.orange, centerX + centerW/2 + gap + sideW/2, height / 2 + 5);

    // --- ETIQUETA DE CÁMARA (Abajo Izquierda) ---
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 18px Rajdhani, sans-serif';
    ctx.letterSpacing = '1px';
    const camText = (cameraMode === 'rotating') ? 'VISTA DINÁMICA (COCHE)' : 'VISTA ESTÁTICA (CAMPO)';
    ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
    ctx.fillText('MODO: ' + camText, 40, canvas.height - 40);
    ctx.shadowBlur = 0;

    // --- MEDIDOR DE BOOST (Abajo Derecha) ---
    const boostX = canvas.width - 160;
    const boostY = canvas.height - 140;
    const boostRadius = 100;
    const startAngle = Math.PI * 0.75; 
    const endAngle = Math.PI * 2.25; 
    const angleRange = endAngle - startAngle;

    // Fondo Sombreado Pro (Backdrop)
    ctx.beginPath();
    ctx.arc(boostX, boostY, boostRadius + 20, 0, Math.PI * 2);
    const bgGlow = ctx.createRadialGradient(boostX, boostY, boostRadius - 40, boostX, boostY, boostRadius + 40);
    bgGlow.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    bgGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = bgGlow;
    ctx.fill();

    // Fondo Glow Rojo
    const glow = ctx.createRadialGradient(boostX, boostY, 0, boostX, boostY, boostRadius);
    glow.addColorStop(0, 'rgba(255, 30, 30, 0.3)');
    glow.addColorStop(1, 'rgba(255, 30, 30, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(boostX, boostY, boostRadius, 0, Math.PI * 2);
    ctx.fill();

    // Líneas y segmentos
    ctx.beginPath();
    ctx.arc(boostX, boostY, boostRadius - 20, startAngle, endAngle);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();

    const currentEndAngle = startAngle + (player1.boost / 100) * angleRange;
    ctx.beginPath();
    ctx.arc(boostX, boostY, boostRadius - 20, startAngle, currentEndAngle);
    ctx.strokeStyle = player1.isBoosting ? '#fff' : '#f90';
    ctx.lineWidth = 4;
    ctx.stroke();

    const maxSegments = 25;
    const segmentGap = 0.04;
    const segmentAngle = (angleRange / maxSegments) - segmentGap;
    const activeSegments = Math.floor((player1.boost / 100) * maxSegments);

    for (let i = 0; i < maxSegments; i++) {
        const sAngle = startAngle + i * (segmentAngle + segmentGap);
        const eAngle = sAngle + segmentAngle;
        ctx.beginPath();
        ctx.arc(boostX, boostY, boostRadius, sAngle, eAngle);
        if (i < activeSegments) {
            ctx.strokeStyle = i > 18 ? '#ffd700' : '#ff8c00';
            ctx.lineWidth = 18;
            ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
        } else {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            ctx.lineWidth = 12;
            ctx.shadowBlur = 0;
        }
        ctx.stroke();
    }

    ctx.shadowBlur = 0; 
    ctx.fillStyle = 'white';
    ctx.font = 'bold 90px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(player1.boost), boostX, boostY - 10);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 22px Rajdhani, sans-serif';
    ctx.letterSpacing = '2px';
    ctx.fillText("BOOST", boostX, boostY + 45);

    ctx.restore();
}

export function drawCarNames(ctx, allCars, player1, cameraMode, gameState) {
    ctx.save();
    ctx.font = 'bold 22px Rajdhani, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 5;

    allCars.forEach(car => {
        if (car === player1 && cameraMode === 'rotating' && gameState !== 'goalScored' && gameState !== 'gameOver') return;
        ctx.fillStyle = car === player1 ? 'rgba(220, 230, 255, 0.9)' : (car.color === '#5ad' ? 'rgba(180, 200, 235, 0.8)' : 'rgba(235, 200, 180, 0.8)');
        ctx.fillText(car.name, car.x, car.y - car.radius - 15);
    });
    ctx.restore();
}
