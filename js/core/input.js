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
            onScoreboardToggle(true);
        }

        if (e.code === 'ShiftLeft' || e.code === 'ControlLeft') { e.preventDefault(); }
    });

    window.addEventListener('keyup', (e) => { 
        keysPressed[e.code] = false; 
        
        if (e.code === 'Tab') {
            e.preventDefault();
            onScoreboardToggle(false);
        }
    });
}

let lastButtonsState = {};

/**
 * Escanea los gamepads conectados y mapea sus botones al objeto keysPressed.
 * Utilizamos KeyboardEvents para que el mando actúe exactamente como un teclado,
 * evitando problemas de persistencia en las teclas.
 */
export function pollGamepad(keysPressed, gameState, introPhase) {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    // Buscar el primer mando disponible (no nulo)
    const gp = Array.from(gamepads).find(g => g && g.connected);
    
    if (!gp) return;

    // --- RESTRICCIÓN POR ESCENA: INTRO (NOTAS DE DESARROLLO) ---
    if (gameState === 'intro') {
        const modalAlert = document.getElementById('modal-alert-overlay');
        const isModalVisible = modalAlert && modalAlert.style.display === 'flex';

        // 1. Procesar Botón START (Siempre para saltar intro)
        const startButtonIndex = 9;
        const isStartPressed = gp.buttons[startButtonIndex].pressed;
        if (isStartPressed && !lastButtonsState[startButtonIndex]) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', key: ' ', keyCode: 32, bubbles: true, cancelable: true }));
            keysPressed['Space'] = true;
        } else if (!isStartPressed && lastButtonsState[startButtonIndex]) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space', key: ' ', keyCode: 32, bubbles: true, cancelable: true }));
            keysPressed['Space'] = false;
        }
        lastButtonsState[startButtonIndex] = isStartPressed;

        // 2. Procesar Botón A (Solo si hay un modal visible)
        if (isModalVisible) {
            const aButtonIndex = 0;
            const isAPressed = gp.buttons[aButtonIndex].pressed;
            if (isAPressed && !lastButtonsState[aButtonIndex]) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
                keysPressed['Enter'] = true;
            } else if (!isAPressed && lastButtonsState[aButtonIndex]) {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
                keysPressed['Enter'] = false;
            }
            lastButtonsState[aButtonIndex] = isAPressed;
        }

        // Mantener actualizado el estado de los demás botones para evitar disparos al cambiar de escena
        for (let i = 0; i < gp.buttons.length; i++) {
            if (i !== 9 && i !== 0) lastButtonsState[i] = gp.buttons[i].pressed;
        }
        return;
    }

    const deadzone = 0.3;

    // --- Definición de Mapeo Dinámico ---
    const mapping = {
        12: 'ArrowUp',
        13: 'ArrowDown',
        14: 'ArrowLeft',
        15: 'ArrowRight'
    };

    if (gameState === 'menu' || gameState === 'settings') {
        mapping[0] = 'Enter';
        mapping[1] = 'Escape';
        mapping[2] = 'KeyX';
        mapping[3] = 'KeyY';
        mapping[4] = 'KeyL';       // LB -> Pista Anterior
        mapping[5] = 'KeyR';       // RB -> Pista Siguiente
        mapping[6] = 'KeyQ';       // LT -> Mapa Anterior (En menú)
        mapping[7] = 'KeyE';       // RT -> Mapa Siguiente (En menú)
        mapping[8] = 'KeyC';
        mapping[9] = 'Space';
    } else {
        mapping[7] = 'ArrowUp';    // RT -> Acelerar (Solo en juego)
        mapping[6] = 'ArrowDown';  // LT -> Frenar (Solo en juego)
        mapping[0] = 'Space';
        mapping[2] = 'ShiftLeft';
        mapping[3] = 'KeyV';
        mapping[9] = 'Escape';
    }

    // --- Procesar Botones ---
    Object.keys(mapping).forEach(btnIndex => {
        const isPressed = gp.buttons[btnIndex].pressed;
        const keyCode = mapping[btnIndex];

        if (isPressed && !lastButtonsState[btnIndex]) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: keyCode, key: keyCode, bubbles: true, cancelable: true }));
            keysPressed[keyCode] = true;
        } else if (!isPressed && lastButtonsState[btnIndex]) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: keyCode, key: keyCode, bubbles: true, cancelable: true }));
            keysPressed[keyCode] = false;
        }
        lastButtonsState[btnIndex] = isPressed;
    });

    // --- Procesar Joystick Izquierdo (Ejes) ---
    const stickLeft = gp.axes[0] < -deadzone;
    const stickRight = gp.axes[0] > deadzone;

    if (stickLeft && !lastButtonsState['stickLeft']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true, cancelable: true }));
        keysPressed['ArrowLeft'] = true;
    } else if (!stickLeft && lastButtonsState['stickLeft']) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowLeft', key: 'ArrowLeft', bubbles: true, cancelable: true }));
        keysPressed['ArrowLeft'] = false;
    }
    lastButtonsState['stickLeft'] = stickLeft;

    if (stickRight && !lastButtonsState['stickRight']) {
        window.dispatchEvent(new KeyboardEvent('keydown', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true, cancelable: true }));
        keysPressed['ArrowRight'] = true;
    } else if (!stickRight && lastButtonsState['stickRight']) {
        window.dispatchEvent(new KeyboardEvent('keyup', { code: 'ArrowRight', key: 'ArrowRight', bubbles: true, cancelable: true }));
        keysPressed['ArrowRight'] = false;
    }
    lastButtonsState['stickRight'] = stickRight;
}
