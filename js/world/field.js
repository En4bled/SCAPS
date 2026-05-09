import * as CONST from '../core/constants.js';

let bgImage = new Image();
let currentBgSrc = '';

function ensureBgImage() {
    const src = CONST.BG_IMG_PATH;
    if (src !== currentBgSrc) {
        currentBgSrc = src;
        bgImage = new Image();
        bgImage.onload = () => console.log('Campo cargado:', src);
        bgImage.onerror = () => console.error('Error cargando campo:', src);
        bgImage.src = src;
    }
}

export function createGrassDetails() {
    return [];
}

export function drawField(ctx) {
    ensureBgImage(); // Verifica si la imagen ha cambiado antes de cada frame

    ctx.save();
    
    // 1. Imagen de Fondo
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        const imgW = CONST.WORLD_W * CONST.BG_SCALE;
        const imgH = CONST.WORLD_H * CONST.BG_SCALE;
        const drawX = (CONST.WORLD_W - imgW) / 2 + CONST.BG_OFFSET_X;
        const drawY = (CONST.WORLD_H - imgH) / 2 + CONST.BG_OFFSET_Y;
        ctx.drawImage(bgImage, drawX, drawY, imgW, imgH);
    } else {
        ctx.fillStyle = '#0a2a0a'; 
        ctx.fillRect(0, 0, CONST.WORLD_W, CONST.WORLD_H);
    }

    // 2. Porterías
    const drawGoal = (g, color) => {
        ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
        const topY = g.y < CONST.WORLD_H / 2 ? g.y - g.d : g.y;
        ctx.fillRect(g.x - g.w/2, topY, g.w, g.d);
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.beginPath();
        if (g.y < CONST.WORLD_H / 2) {
            ctx.moveTo(g.x - g.w/2, g.y); ctx.lineTo(g.x - g.w/2, g.y - g.d);
            ctx.lineTo(g.x + g.w/2, g.y - g.d); ctx.lineTo(g.x + g.w/2, g.y);
        } else {
            ctx.moveTo(g.x - g.w/2, g.y); ctx.lineTo(g.x - g.w/2, g.y + g.d);
            ctx.lineTo(g.x + g.w/2, g.y + g.d); ctx.lineTo(g.x + g.w/2, g.y);
        }
        ctx.stroke();
    };

    drawGoal(CONST.GOAL_TOP, '#f90');
    drawGoal(CONST.GOAL_BOTTOM, '#5ad');

    ctx.restore();
}
