export function setupInput(keysPressed, onCameraToggle, onScoreboardToggle) {
    window.addEventListener('keydown', (e) => {
        if(e.repeat) return; 
        keysPressed[e.code] = true;
        
        if (e.code === 'KeyV') { 
            e.preventDefault();
            onCameraToggle();
        }
        
        if (e.code === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            onScoreboardToggle(true);
        }

        if (e.code === 'ShiftLeft' || e.code === 'ControlLeft') { e.preventDefault(); }
    });

    window.addEventListener('keyup', (e) => { 
        keysPressed[e.code] = false; 
        
        if (e.code === 'Tab') {
            e.preventDefault();
            e.stopPropagation();
            onScoreboardToggle(false);
        }
    });
}
