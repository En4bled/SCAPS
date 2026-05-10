import * as CONST from '../core/constants.js';

let bgImage = new Image();
let currentBgSrc = '';
let netImageTop = new Image(), netImageBottom = new Image();
let currentNetSrcT = '', currentNetSrcB = '';

function ensureAssets() {
    const src = CONST.CONFIG.BG_IMG_PATH;
    if (src !== currentBgSrc) {
        currentBgSrc = src;
        bgImage = new Image();
        bgImage.src = src;
    }
    const srcT = CONST.CONFIG.GOAL_TOP.img;
    if (srcT && srcT !== currentNetSrcT) {
        currentNetSrcT = srcT;
        netImageTop = new Image();
        netImageTop.src = srcT;
    }
    const srcB = CONST.CONFIG.GOAL_BOTTOM.img;
    if (srcB && srcB !== currentNetSrcB) {
        currentNetSrcB = srcB;
        netImageBottom = new Image();
        netImageBottom.src = srcB;
    }
}

export function createGrassDetails() {
    return [];
}

export function drawField(ctx) {
    ensureAssets(); 

    ctx.save();
    
    // 1. Imagen de Fondo
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        const worldW = CONST.CONFIG.WORLD_W;
        const worldH = CONST.CONFIG.WORLD_H;
        const scale = CONST.CONFIG.BG_SCALE;
        const ox = CONST.CONFIG.BG_OFFSET_X;
        const oy = CONST.CONFIG.BG_OFFSET_Y;
        
        const iw = worldW * scale;
        const ih = worldH * scale;
        const dx = (worldW - iw) / 2 + ox;
        const dy = (worldH - ih) / 2 + oy;

        ctx.drawImage(bgImage, dx, dy, iw, ih);
    } else {
        ctx.fillStyle = '#0a2a0a'; 
        ctx.fillRect(0, 0, CONST.CONFIG.WORLD_W, CONST.CONFIG.WORLD_H);
    }

    // 2. Porterías Laterales
    const drawGoal = (g, color) => {
        const isLeftGoal = (g.x < CONST.CONFIG.WORLD_W / 2);
        
        // Área interior de la portería
        ctx.fillStyle = 'rgba(20, 20, 20, 0.4)';
        const startX = isLeftGoal ? g.x - g.d : g.x;
        ctx.fillRect(startX, g.y - g.w/2, g.d, g.w);
        
        // Postes y travesaño lateral
        ctx.strokeStyle = color;
        ctx.lineWidth = 15;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        if (isLeftGoal) {
            ctx.moveTo(g.x, g.y - g.w/2); 
            ctx.lineTo(g.x - g.d, g.y - g.w/2);
            ctx.lineTo(g.x - g.d, g.y + g.w/2); 
            ctx.lineTo(g.x, g.y + g.w/2);
        } else {
            ctx.moveTo(g.x, g.y - g.w/2); 
            ctx.lineTo(g.x + g.d, g.y - g.w/2);
            ctx.lineTo(g.x + g.d, g.y + g.w/2); 
            ctx.lineTo(g.x, g.y + g.w/2);
        }
        ctx.stroke();
    };

    // Azul a la Izquierda, Naranja a la Derecha
    drawGoal(CONST.CONFIG.GOAL_TOP, '#5ad'); 
    drawGoal(CONST.CONFIG.GOAL_BOTTOM, '#f90');

    ctx.restore();
}

export function drawGoalNets(ctx) {
    const drawNet = (g, img) => {
        if (!img.complete || !img.src) return;
        ctx.save();
        ctx.translate(g.x, g.y);
        const isLeft = g.x < CONST.CONFIG.WORLD_W / 2;
        const dx = isLeft ? -g.d : 0;
        ctx.drawImage(img, dx, -g.w/2, g.d, g.w);
        ctx.restore();
    };
    drawNet(CONST.CONFIG.GOAL_TOP, netImageTop);
    drawNet(CONST.CONFIG.GOAL_BOTTOM, netImageBottom);
}
