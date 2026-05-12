// ===== INTERACCIONES =====
function canvasToWorld(cx, cy) {
    const W = canvas.width, H = canvas.height;
    const z = S.zoom;
    const ox = (W - S.worldW * z) / 2, oy = (H - S.worldH * z) / 2;
    return { 
        x: Math.round((cx - ox - S.panX) / z), 
        y: Math.round((cy - oy - S.panY) / z) 
    };
}

canvas.addEventListener('mousedown', e => {
    // Click derecho o central para PAN
    if (e.button === 1 || e.button === 2) {
        S.isPanning = true;
        S.lastMouse = { x: e.clientX, y: e.clientY };
        canvas.style.cursor = 'grabbing';
        return;
    }

    if (e.button !== 0) return; // Solo clic izquierdo para editar
    
    const r = canvas.getBoundingClientRect();
    const wp = canvasToWorld(e.clientX - r.left, e.clientY - r.top);
    
    if (S.mode === 'poly') {
        let found = -1;
        S.poly.forEach((p, i) => {
            const d = Math.sqrt((p.x-wp.x)**2 + (p.y-wp.y)**2);
            if (d < 30 / S.zoom) found = i;
        });
        if (found !== -1) { S.selectedPoint = found; }
        else { S.poly.push(wp); S.selectedPoint = S.poly.length - 1; }
    } else if (S.mode === 'spawn') {
        S.spawns[S.selectedSpawn].x = wp.x;
        S.spawns[S.selectedSpawn].y = wp.y;
    } else if (S.mode === 'boost') {
        if (S.selectedBoost !== -1) {
            S.boosts[S.selectedBoost].x = wp.x;
            S.boosts[S.selectedBoost].y = wp.y;
        }
    } else if (S.mode === 'ball') {
        S.ball.x = wp.x; S.ball.y = wp.y;
    }
    render();
});

canvas.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (S.isPanning) return; // Si estábamos paneando, no borrar

    const r = canvas.getBoundingClientRect();
    const wp = canvasToWorld(e.clientX - r.left, e.clientY - r.top);
    
    if (S.mode === 'poly') {
        let found = -1;
        S.poly.forEach((p, i) => {
            const d = Math.sqrt((p.x-wp.x)**2 + (p.y-wp.y)**2);
            if (d < 30 / S.zoom) found = i;
        });
        if (found !== -1) {
            S.poly.splice(found, 1);
            S.selectedPoint = -1;
            render();
        }
    }
});

canvas.addEventListener('mousemove', e => {
    if (S.isPanning) {
        const dx = e.clientX - S.lastMouse.x;
        const dy = e.clientY - S.lastMouse.y;
        S.panX += dx;
        S.panY += dy;
        S.lastMouse = { x: e.clientX, y: e.clientY };
        render();
        return;
    }

    const r = canvas.getBoundingClientRect();
    const wp = canvasToWorld(e.clientX - r.left, e.clientY - r.top);
    infoBar.textContent = `Mundo: ${wp.x}, ${wp.y} | Zoom: ${Math.round(S.zoom*100)}% | Modo: ${S.mode}`;

    if (e.buttons === 1 && S.mode === 'poly' && S.selectedPoint !== -1) {
        S.poly[S.selectedPoint] = wp;
        render();
    }
});

window.addEventListener('mouseup', () => {
    S.isPanning = false;
    canvas.style.cursor = 'default';
});

canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const oldZoom = S.zoom;
    if (e.deltaY < 0) S.zoom *= 1.1; else S.zoom /= 1.1;
    S.zoom = Math.max(0.05, Math.min(S.zoom, 5));
    render();
}, { passive: false });
