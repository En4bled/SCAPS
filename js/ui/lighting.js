import * as CONST from '../core/constants.js';

/**
 * Sistema de Iluminación Dinámica Avanzado v3.0 - Wall & Depth Edition
 */

export function drawDynamicShadows(ctx, entities, lights) {
    if (!entities || !lights || !Array.isArray(entities) || !Array.isArray(lights)) return;
    ctx.save();
    entities.forEach(entity => {
        if (!entity || entity.isExploded) return;

        lights.forEach(light => {
            const dx = entity.x - light.x;
            const dy = entity.y - light.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const lRadius = light.radius || 1500;
            
            if (dist < lRadius) {
                if (light.type === 'spot') {
                    const angleToObj = Math.atan2(dy, dx);
                    let diff = angleToObj - (light.angle || 0);
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    if (Math.abs(diff) > (light.spread || 0.8)) return;
                }

                const angle = Math.atan2(dy, dx);
                const effIntensity = light.intensity || 1;
                
                // --- SOMBRAS DE SPRITE REFINADAS ---
                const shadowLen = (dist / 12) * (1.3 - Math.min(0.8, effIntensity * 0.3));
                const opacity = Math.min(0.35, (1 - (dist / lRadius)) * 0.4 * effIntensity);
                if (opacity <= 0.05) return;

                ctx.save();
                const offset = 8 + (dist / 120);
                ctx.translate(entity.x + Math.cos(angle) * offset, entity.y + Math.sin(angle) * offset);
                ctx.rotate(angle);
                
                // Inclinación suave
                ctx.transform(1, 0, shadowLen/120, 1, 0, 0);
                ctx.scale(1 + shadowLen/300, 1);
                
                // Filtro de silueta suave (Solo si hay imagen)
                if (entity.img && entity.img.complete) {
                    ctx.save();
                    const blurVal = 6 + (dist / 100);
                    ctx.filter = `brightness(0) blur(${blurVal}px)`;
                    ctx.globalAlpha = opacity;
                    
                    ctx.rotate(entity.angle - angle);
                    
                    if (entity.type === 'ball') {
                        // Sombra de balón más contenida
                        const r = (entity.radius || 30) * 0.7;
                        ctx.drawImage(entity.img, -r, -r, r * 2, r * 2);
                    } else {
                        const w = entity.width || 60, h = entity.height || 40;
                        ctx.drawImage(entity.img, -w/2, -h/2, w, h);
                    }
                    ctx.restore();
                } else {
                    // Fallback invisible o muy suave si no hay imagen
                    ctx.fillStyle = `rgba(0,0,0,${opacity * 0.5})`;
                    ctx.beginPath();
                    ctx.arc(0, 0, (entity.radius || 20) * 0.5, 0, Math.PI*2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        });
    });

    
    ctx.restore();
}

/**
 * Proyecta sombras desde los muros (polígono de campo) y porterías
 */
export function drawWallShadows(ctx, polygon, goals, lights) {
    if (!polygon || polygon.length < 2 || !lights || !Array.isArray(lights)) return;
    
    ctx.save();
    lights.forEach(light => {

        // 1. Sombras del Polígono de Campo
        for (let i = 0; i < polygon.length; i++) {
            const p1 = polygon[i];
            const p2 = polygon[(i + 1) % polygon.length];
            // Bajamos opacidad de 0.4 a 0.15 para mayor suavidad
            projectEdgeShadow(ctx, p1, p2, light, 0.15);
        }

        // 2. Sombras de las Porterías
        const drawGoalShadow = (g) => {

            const isLeft = g.x < 2000; // Referencia simple para ancho
            const x1 = g.x, x2 = isLeft ? g.x - g.d : g.x + g.d;
            const y1 = g.y - g.w/2, y2 = g.y + g.w/2;

            // Bordes de la portería como muros
            projectEdgeShadow(ctx, {x: x1, y: y1}, {x: x2, y: y1}, light, 0.5); // Travesaño superior
            projectEdgeShadow(ctx, {x: x1, y: y2}, {x: x2, y: y2}, light, 0.5); // Travesaño inferior
            projectEdgeShadow(ctx, {x: x2, y: y1}, {x: x2, y: y2}, light, 0.5); // Fondo
        };
        if (goals.top) drawGoalShadow(goals.top);
        if (goals.bottom) drawGoalShadow(goals.bottom);
    });
    ctx.restore();
}

function projectEdgeShadow(ctx, p1, p2, light, baseOpacity) {
    const dx1 = p1.x - light.x, dy1 = p1.y - light.y;
    const dx2 = p2.x - light.x, dy2 = p2.y - light.y;
    const dist1 = Math.sqrt(dx1*dx1 + dy1*dy1);
    const dist2 = Math.sqrt(dx2*dx2 + dy2*dy2);

    if (dist1 > light.radius && dist2 > light.radius) return;

    const angle1 = Math.atan2(dy1, dx1), angle2 = Math.atan2(dy2, dx2);

    if (light.type === 'spot') {
        const lightAngle = light.angle || 0;
        const lightSpread = light.spread || 0.78;
        
        let diff1 = angle1 - lightAngle;
        while(diff1 < -Math.PI) diff1 += Math.PI*2;
        while(diff1 > Math.PI) diff1 -= Math.PI*2;
        
        let diff2 = angle2 - lightAngle;
        while(diff2 < -Math.PI) diff2 += Math.PI*2;
        while(diff2 > Math.PI) diff2 -= Math.PI*2;
        
        if (Math.abs(diff1) > lightSpread && Math.abs(diff2) > lightSpread) return;
    }

    const shadowLen = 150 * (light.intensity || 0.5); 
    const opacity = Math.max(0, (1 - (Math.min(dist1, dist2) / light.radius)) * baseOpacity);
    if (opacity <= 0) return;


    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p2.x + Math.cos(angle2) * shadowLen, p2.y + Math.sin(angle2) * shadowLen);
    ctx.lineTo(p1.x + Math.cos(angle1) * shadowLen, p1.y + Math.sin(angle1) * shadowLen);
    ctx.closePath();

    const grad = ctx.createLinearGradient(
        (p1.x+p2.x)/2, (p1.y+p2.y)/2, 
        ((p1.x+p2.x)/2) + Math.cos((angle1+angle2)/2) * shadowLen, 
        ((p1.y+p2.y)/2) + Math.sin((angle1+angle2)/2) * shadowLen
    );
    grad.addColorStop(0, `rgba(0,0,0,${opacity})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    
    ctx.fillStyle = grad;
    ctx.fill();
}

export function updateLights(lights, time) {
    lights.forEach(l => {
        if (!l.baseIntensity) l.baseIntensity = l.intensity || 0.5;
        if (l.animation === 'pulse') {
            l.intensity = l.baseIntensity * (0.7 + Math.sin(time / 500) * 0.3);
        } else if (l.animation === 'flicker') {
            if (Math.random() > 0.93) l.intensity = l.baseIntensity * (Math.random() * 0.5);
            else l.intensity = l.baseIntensity;
        } else if (l.animation === 'rotate') {
            l.angle = (l.angle || 0) + 0.02;
        }
    });
}

export function drawAmbientLighting(ctx, width, height, lights) {
    if (!lights || !Array.isArray(lights)) return;
    const time = Date.now() / 1000;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    
    lights.forEach(light => {
        ctx.save();
        
        let intensity = (light.intensity || 1) * 2.2; // Aumentamos potencia base
        let radius = light.radius || 500;
        let angle = light.angle || 0;
        let spread = light.spread || 0.78;

        // --- Sistema de Animación ---
        const anim = light.anim || light.animation || 'none';
        if (anim === 'pulse') {
            intensity *= 0.8 + Math.sin(time * 4) * 0.2;
            radius *= 0.95 + Math.sin(time * 4) * 0.05;
        } else if (anim === 'flicker') {
            if (Math.random() > 0.92) intensity *= 0.3;
        } else if (anim === 'oscillation') {
            angle += Math.sin(time * 1.5) * 0.6;
        }

        let colorStr = light.color || '#ffffff';
        let rgba = 'rgba(255,255,255,1)';

        try {
            if (typeof colorStr === 'string' && colorStr.startsWith('#')) {
                const r = parseInt(colorStr.slice(1, 3), 16) || 255;
                const g = parseInt(colorStr.slice(3, 5), 16) || 255;
                const b = parseInt(colorStr.slice(5, 7), 16) || 255;
                rgba = `rgba(${r},${g},${b},${Math.min(1, intensity)})`;
            } else if (typeof colorStr === 'string' && colorStr.includes('rgba')) {
                rgba = colorStr.replace(/[\d.]+\)$/g, `${Math.min(1, intensity)})`);
            } else if (typeof colorStr === 'string' && colorStr.includes('rgb')) {
                rgba = colorStr.replace('rgb', 'rgba').replace(')', `, ${Math.min(1, intensity)})`);
            } else {
                rgba = `rgba(255,255,255,${Math.min(1, intensity)})`;
            }
        } catch (e) {
            rgba = `rgba(255,255,255,${Math.min(1, intensity)})`;
        }

        if (light.type === 'spot') {
            // --- NUEVA LÓGICA POTENCIADA Y SUAVE ---
            ctx.translate(light.x, light.y);
            ctx.rotate(angle);

            // 1. Capa de Brillo Atmosférico (Gran blur, baja opacidad)
            ctx.save();
            ctx.filter = `blur(${radius/8}px)`;
            ctx.globalAlpha = 0.5;
            const gradAtm = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradAtm.addColorStop(0, rgba);
            gradAtm.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradAtm;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0, radius, -spread, spread); ctx.fill();
            ctx.restore();

            // 2. Haz Central (Menos blur, más saturado)
            ctx.save();
            ctx.filter = `blur(${radius/20}px)`;
            const gradCore = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradCore.addColorStop(0, rgba);
            gradCore.addColorStop(0.5, rgba.replace(/[\d.]+\)$/g, '0.2)'));
            gradCore.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradCore;
            ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0, radius, -spread * 0.8, spread * 0.8); ctx.fill();
            ctx.restore();

            // 3. Origen Puntual (Efecto bombilla)
            ctx.globalAlpha = 0.8;
            const originGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
            originGrad.addColorStop(0, '#fff');
            originGrad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = originGrad;
            ctx.beginPath(); ctx.arc(0,0, 40, 0, Math.PI*2); ctx.fill();

            ctx.restore();
        } else {
            // --- OMNIDIRECCIONAL POTENCIADA ---
            const grad = ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, radius);
            grad.addColorStop(0, rgba);
            grad.addColorStop(0.4, rgba.replace(/[\d.]+\)$/g, '0.2)'));
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.arc(light.x, light.y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });
    ctx.restore();
}






