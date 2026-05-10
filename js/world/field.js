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
    ensureBgImage(); 

    ctx.save();
    
    // 1. Imagen de Fondo
    if (bgImage.complete && bgImage.naturalWidth > 0) {
        // En este nuevo estadio, queremos que la imagen ocupe todo el espacio de juego
        ctx.drawImage(bgImage, 0, 0, CONST.WORLD_W, CONST.WORLD_H);
    } else {
        ctx.fillStyle = '#0a2a0a'; 
        ctx.fillRect(0, 0, CONST.WORLD_W, CONST.WORLD_H);
    }

    // 2. Porterías Laterales
    const drawGoal = (g, color) => {
        const isLeftGoal = (g.x < CONST.WORLD_W / 2);
        
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
    drawGoal(CONST.GOAL_TOP, '#5ad'); 
    drawGoal(CONST.GOAL_BOTTOM, '#f90');

    ctx.restore();
}
