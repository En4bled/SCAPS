import { playSound } from '../fx/audio.js';

export function setupInput(keysPressed, onCameraToggle, onScoreboardToggle) {
    window.addEventListener('keydown', (e) => {
        if(e.repeat) return; 

        // Si el modal de confirmación de reset de físicas está activo
        if (window.physicsResetConfirmOpen) {
            if (e.code === 'Enter') {
                e.preventDefault();
                const confirmBtn = document.getElementById('btn-physics-confirm-reset');
                if (confirmBtn) confirmBtn.click();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                const cancelBtn = document.getElementById('btn-physics-cancel-reset');
                if (cancelBtn) cancelBtn.click();
            }
            return;
        }

        // Si el editor de físicas está activo, bloqueamos otras teclas y Tab pliega/despliega
        const physicsOverlay = document.getElementById('physics-editor-overlay');
        const isPhysicsOpen = physicsOverlay && !physicsOverlay.classList.contains('hidden') && physicsOverlay.style.display !== 'none';

        if (isPhysicsOpen) {
            if (e.code === 'Tab') {
                e.preventDefault();
                if (typeof window.togglePhysicsFold === 'function') {
                    window.togglePhysicsFold();
                }
                return;
            }
            if (!window.physicsIsFolded) {
                return; // Bloquear teclado para el coche
            }
        }

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
        if (window.physicsResetConfirmOpen) {
            if (e.code === 'Enter' || e.code === 'Escape') { e.preventDefault(); }
            return;
        }

        const physicsOverlay = document.getElementById('physics-editor-overlay');
        const isPhysicsOpen = physicsOverlay && !physicsOverlay.classList.contains('hidden') && physicsOverlay.style.display !== 'none';
        
        if (isPhysicsOpen) {
            if (e.code === 'Tab') { 
                e.preventDefault(); 
                return;
            }
            if (!window.physicsIsFolded) {
                keysPressed[e.code] = false;
                return; // Bloquear teclado para el coche
            }
        }

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

    // --- RESTRICCIÓN POR EDITOR DE FÍSICAS ACTIVO ---
    const physicsOverlay = document.getElementById('physics-editor-overlay');
    const isPhysicsOpen = physicsOverlay && !physicsOverlay.classList.contains('hidden') && physicsOverlay.style.display !== 'none';

    if (isPhysicsOpen) {
        // 1. SELECT (Botón 8) -> Toggle Plegar/Desplegar (siempre disponible)
        const selectPressed = gp.buttons[8].pressed;
        if (selectPressed && !lastButtonsState[8]) {
            if (typeof window.togglePhysicsFold === 'function') {
                window.togglePhysicsFold();
            }
        }
        lastButtonsState[8] = selectPressed;

        // Si está plegado, NO interceptamos el mando para el editor, permitimos que vaya a conducir el coche!
        if (window.physicsIsFolded) {
            for (let i = 0; i < gp.buttons.length; i++) {
                if (i !== 8) lastButtonsState[i] = gp.buttons[i].pressed;
            }
        } else {
            // Si está desplegado, interceptamos el mando para el editor
            if (window.physicsResetConfirmOpen) {
                const aPressed = gp.buttons[0].pressed;
                const bPressed = gp.buttons[1].pressed;

                if (aPressed && !lastButtonsState[0]) {
                    const confirmBtn = document.getElementById('btn-physics-confirm-reset');
                    if (confirmBtn) confirmBtn.click();
                }
                if (bPressed && !lastButtonsState[1]) {
                    const cancelBtn = document.getElementById('btn-physics-cancel-reset');
                    if (cancelBtn) cancelBtn.click();
                }

                lastButtonsState[0] = aPressed;
                lastButtonsState[1] = bPressed;
                for (let i = 2; i < gp.buttons.length; i++) {
                    lastButtonsState[i] = gp.buttons[i].pressed;
                }
                return;
            }

            const now = performance.now();
            if (!window.lastPhysicsDpadTime) window.lastPhysicsDpadTime = 0;
            const cooldown = 180; // milisegundos de retraso para D-pad

            if (window.physicsFocusIndex === undefined) {
                window.physicsFocusIndex = 0;
            }
            if (window.physicsEditMode === undefined) {
                window.physicsEditMode = false;
            }


        // 2. BOTÓN A (Botón 0) -> Activar/Desactivar EditMode o Click en Botón
        const aPressed = gp.buttons[0].pressed;
        if (aPressed && !lastButtonsState[0]) {
            const idx = window.physicsFocusIndex;
            // 0 a 9 son sliders
            if (idx >= 0 && idx <= 9) {
                window.physicsEditMode = !window.physicsEditMode;
                playSound('menu_click');
                if (typeof window.updatePhysicsFocus === 'function') {
                    window.updatePhysicsFocus();
                }
            } else {
                // 10 a 13 son botones
                const elementIds = [
                    'btn-physics-export',
                    'btn-physics-paste',
                    'btn-physics-apply',
                    'btn-physics-reset'
                ];
                const btnId = elementIds[idx - 10];
                const btn = document.getElementById(btnId);
                if (btn) btn.click();
            }
        }
        lastButtonsState[0] = aPressed;

        // 3. BOTÓN B (Botón 1) -> Cancelar EditMode o Cerrar Editor
        const bPressed = gp.buttons[1].pressed;
        if (bPressed && !lastButtonsState[1]) {
            if (window.physicsEditMode) {
                window.physicsEditMode = false;
                playSound('menu_click');
                if (typeof window.updatePhysicsFocus === 'function') {
                    window.updatePhysicsFocus();
                }
            } else {
                // Cerrar editor
                const applyBtn = document.getElementById('btn-physics-apply');
                if (applyBtn) applyBtn.click();
            }
        }
        lastButtonsState[1] = bPressed;

        // Navegación en rejilla 2D (Arriba/Abajo/Izquierda/Derecha) -> Solo si NO estamos en editMode
        if (!window.physicsEditMode && (now - window.lastPhysicsDpadTime > cooldown)) {
            const upPressed = gp.buttons[12].pressed;
            const downPressed = gp.buttons[13].pressed;
            const leftPressed = gp.buttons[14].pressed;
            const rightPressed = gp.buttons[15].pressed;

            if (upPressed || downPressed || leftPressed || rightPressed) {
                const len = 12; // 10 sliders + 2 botones (exportar y pegar)
                let idx = window.physicsFocusIndex;

                if (upPressed) {
                    idx = (idx - 2 + len) % len;
                } else if (downPressed) {
                    idx = (idx + 2) % len;
                } else if (leftPressed) {
                    // Alternar a la columna de la izquierda si estamos en la de la derecha
                    if (idx % 2 === 1) idx = idx - 1;
                } else if (rightPressed) {
                    // Alternar a la columna de la derecha si estamos en la de la izquierda
                    if (idx % 2 === 0) idx = idx + 1;
                }

                if (idx !== window.physicsFocusIndex) {
                    window.physicsFocusIndex = idx;
                    playSound('menu_hover');
                    if (typeof window.updatePhysicsFocus === 'function') {
                        window.updatePhysicsFocus();
                    }
                    window.lastPhysicsDpadTime = now;
                }
            }
        }

        // Modificación de Sliders (D-pad Izquierda/Derecha) -> Solo si ESTAMOS en editMode
        if (window.physicsEditMode && (now - window.lastPhysicsDpadTime > cooldown)) {
            const leftPressed = gp.buttons[14].pressed;
            const rightPressed = gp.buttons[15].pressed;

            if (leftPressed || rightPressed) {
                const idx = window.physicsFocusIndex;
                if (idx >= 0 && idx <= 9) {
                    const paramKeys = [
                        'CAR_MAX_SPEED', 'CAR_MAX_BOOST_SPEED', 'CAR_ACCEL',
                        'CAR_TURN_SPEED', 'CAR_DRIFT_TURN_MULTIPLIER', 'CAR_FRICTION',
                        'BALL_MAX_SPEED', 'BALL_HIT_FORCE', 'BALL_FRICTION', 'BALL_BOUNCINESS'
                    ];
                    const key = paramKeys[idx];
                    const slider = document.getElementById(`slider-${key}`);
                    if (slider) {
                        const currentVal = parseFloat(slider.value);
                        const step = parseFloat(slider.step || 0.01);
                        const min = parseFloat(slider.min || 0);
                        const max = parseFloat(slider.max || 100);
                        
                        let newVal = currentVal;
                        if (leftPressed) {
                            newVal = Math.max(min, currentVal - step);
                        } else if (rightPressed) {
                            newVal = Math.min(max, currentVal + step);
                        }

                        if (newVal !== currentVal) {
                            slider.value = newVal;
                            slider.dispatchEvent(new Event('input'));
                            playSound('menu_hover');
                        }
                    }
                }
                window.lastPhysicsDpadTime = now;
            }
        }

        // 4. Resetear Todo con Y (Botón 3) (emular click en reset)
        const yPressed = gp.buttons[3].pressed;
        if (yPressed && !lastButtonsState[3] && !window.physicsEditMode) {
            const resetBtn = document.getElementById('btn-physics-reset');
            if (resetBtn) resetBtn.click();
        }
        lastButtonsState[3] = yPressed;

        // 5. Guardar y Cerrar con START (Botón 9)
        const startPressed = gp.buttons[9].pressed;
        if (startPressed && !lastButtonsState[9] && !window.physicsEditMode) {
            const applyBtn = document.getElementById('btn-physics-apply');
            if (applyBtn) applyBtn.click();
        }
        lastButtonsState[9] = startPressed;

        // Actualizar estados de botones de control general
        for (let i = 0; i < gp.buttons.length; i++) {
            if (i !== 8 && i !== 0 && i !== 1 && i !== 3 && i !== 9) {
                lastButtonsState[i] = gp.buttons[i].pressed;
            }
        }
        } // Cierre del else (line 115)
        if (!window.physicsIsFolded) {
            return;
        }
    }

    // --- RESTRICCIÓN POR PAUSA (JUEGO PAUSADO) ---
    const pauseMenu = document.getElementById('pause-menu');
    const isPauseMenuOpen = pauseMenu && pauseMenu.style.display === 'flex';

    if (isPauseMenuOpen) {
        if (window.pauseFocusIndex === undefined) {
            window.pauseFocusIndex = 0;
        }

        if (window.updatePauseFocus === undefined) {
            window.updatePauseFocus = function() {
                const controls = [
                    document.getElementById('slider-pause-music'),
                    document.getElementById('slider-pause-sfx'),
                    document.getElementById('btn-pause-continue'),
                    document.getElementById('btn-pause-restart'),
                    document.getElementById('btn-pause-exit')
                ];

                controls.forEach((c, idx) => {
                    if (!c) return;
                    
                    let targetEl = c;
                    let isParent = false;
                    if (c.id === 'slider-pause-music' || c.id === 'slider-pause-sfx') {
                        targetEl = c.parentElement;
                        isParent = true;
                    }

                    if (idx === window.pauseFocusIndex) {
                        targetEl.style.borderColor = '#5ad';
                        targetEl.style.borderWidth = '2px';
                        targetEl.style.borderStyle = 'solid';
                        targetEl.style.boxShadow = '0 0 15px rgba(90, 173, 237, 0.6)';
                        if (!isParent) {
                            targetEl.style.color = '#5ad';
                        }
                        c.focus();
                    } else {
                        if (c.id === 'btn-pause-continue') {
                            targetEl.style.borderColor = '';
                            targetEl.style.boxShadow = '';
                            targetEl.style.color = '';
                        } else if (c.id === 'btn-pause-restart') {
                            targetEl.style.borderColor = '#f90';
                            targetEl.style.boxShadow = '';
                            targetEl.style.color = '#f90';
                        } else if (c.id === 'btn-pause-exit') {
                            targetEl.style.borderColor = '#f33';
                            targetEl.style.boxShadow = '';
                            targetEl.style.color = '#f33';
                        } else if (isParent) {
                            targetEl.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                            targetEl.style.borderWidth = '1px';
                            targetEl.style.boxShadow = '';
                        }
                    }
                });
            };
            window.updatePauseFocus();
        }

        // 1. Alternar Pausa con el botón START (Botón 9)
        const startPressed = gp.buttons[9].pressed;
        if (startPressed && !lastButtonsState[9]) {
            const btnContinue = document.getElementById('btn-pause-continue');
            if (btnContinue) btnContinue.click();
        }
        lastButtonsState[9] = startPressed;

        // Debounce para navegación
        if (window.lastPauseDpadTime === undefined) window.lastPauseDpadTime = 0;
        const now = Date.now();
        const canAction = now - window.lastPauseDpadTime > 180;

        // 2. Navegación Vertical con Cruceta (Arriba/Abajo)
        const dpadUp = gp.buttons[12].pressed;
        const dpadDown = gp.buttons[13].pressed;

        if (canAction) {
            if (dpadUp) {
                window.pauseFocusIndex = (window.pauseFocusIndex - 1 + 5) % 5;
                window.updatePauseFocus();
                window.lastPauseDpadTime = now;
                playSound('menu_hover');
            } else if (dpadDown) {
                window.pauseFocusIndex = (window.pauseFocusIndex + 1) % 5;
                window.updatePauseFocus();
                window.lastPauseDpadTime = now;
                playSound('menu_hover');
            }
        }

        // 3. Modificación de Sliders (Cruceta Izquierda/Derecha)
        const dpadLeft = gp.buttons[14].pressed;
        const dpadRight = gp.buttons[15].pressed;

        if (dpadLeft || dpadRight) {
            const step = 5;
            const dir = dpadLeft ? -1 : 1;
            const controls = [
                document.getElementById('slider-pause-music'),
                document.getElementById('slider-pause-sfx'),
                document.getElementById('btn-pause-continue'),
                document.getElementById('btn-pause-restart'),
                document.getElementById('btn-pause-exit')
            ];
            const focusedControl = controls[window.pauseFocusIndex];
            
            if (focusedControl && (focusedControl.id === 'slider-pause-music' || focusedControl.id === 'slider-pause-sfx')) {
                if (now - window.lastPauseDpadTime > 80) {
                    const currentVal = parseInt(focusedControl.value);
                    const newVal = Math.max(0, Math.min(100, currentVal + (dir * step)));
                    focusedControl.value = newVal;
                    
                    if (focusedControl.oninput) {
                        focusedControl.oninput({ target: focusedControl });
                    }
                    
                    window.lastPauseDpadTime = now;
                }
            }
        }

        // 4. Acción con Botón A (Botón 0)
        const aPressed = gp.buttons[0].pressed;
        if (aPressed && !lastButtonsState[0]) {
            const controls = [
                document.getElementById('slider-pause-music'),
                document.getElementById('slider-pause-sfx'),
                document.getElementById('btn-pause-continue'),
                document.getElementById('btn-pause-restart'),
                document.getElementById('btn-pause-exit')
            ];
            const focusedControl = controls[window.pauseFocusIndex];
            if (focusedControl) {
                if (focusedControl.click) {
                    focusedControl.click();
                }
            }
            window.lastPauseDpadTime = now;
        }
        lastButtonsState[0] = aPressed;

        // 5. MP3 Player Shortcuts (LT, RT, Y)
        const ltPressed = gp.buttons[6].pressed;
        if (ltPressed && !lastButtonsState[6]) {
            const btnPrev = document.getElementById('btn-pause-prev');
            if (btnPrev) btnPrev.click();
            window.lastPauseDpadTime = now;
        }
        lastButtonsState[6] = ltPressed;

        const rtPressed = gp.buttons[7].pressed;
        if (rtPressed && !lastButtonsState[7]) {
            const btnNext = document.getElementById('btn-pause-next');
            if (btnNext) btnNext.click();
            window.lastPauseDpadTime = now;
        }
        lastButtonsState[7] = rtPressed;

        const yPressed = gp.buttons[3].pressed;
        if (yPressed && !lastButtonsState[3]) {
            const btnPlayPause = document.getElementById('btn-pause-play-pause');
            if (btnPlayPause) btnPlayPause.click();
            window.lastPauseDpadTime = now;
        }
        lastButtonsState[3] = yPressed;

        // 6. Abrir Editor de Físicas desde Pausa con SELECT (Botón 8)
        const selectPressed = gp.buttons[8].pressed;
        if (selectPressed && !lastButtonsState[8]) {
            const btnPausePhysics = document.getElementById('btn-pause-physics');
            if (btnPausePhysics) btnPausePhysics.click();
            window.lastPauseDpadTime = now;
        }
        lastButtonsState[8] = selectPressed;

        for (let i = 0; i < gp.buttons.length; i++) {
            if (i !== 9 && i !== 0 && i !== 6 && i !== 7 && i !== 3 && i !== 8) {
                lastButtonsState[i] = gp.buttons[i].pressed;
            }
        }
        return;
    }

    // --- RESTRICCIÓN POR ESCENA: PERSONALIZACIÓN (CUSTOMIZATION) ---
    if (gameState === 'customization') {
        const discardOverlay = document.getElementById('custom-discard-overlay');
        const isDiscardModalOpen = discardOverlay && discardOverlay.style.display === 'flex';

        if (isDiscardModalOpen) {
            // En el modal de descarte de personalización:
            // Botón A (0) confirma el descarte
            const aPressed = gp.buttons[0].pressed;
            if (aPressed && !lastButtonsState[0]) {
                const btnConfirm = document.getElementById('btn-custom-discard-confirm');
                if (btnConfirm) btnConfirm.click();
            }
            lastButtonsState[0] = aPressed;

            // Botón B (1) cancela el descarte (vuelve)
            const bPressed = gp.buttons[1].pressed;
            if (bPressed && !lastButtonsState[1]) {
                const btnCancel = document.getElementById('btn-custom-discard-cancel');
                if (btnCancel) btnCancel.click();
            }
            lastButtonsState[1] = bPressed;

            // Bloquear el resto de botones de personalización cuando el modal está abierto
            for (let i = 0; i < gp.buttons.length; i++) {
                if (i !== 0 && i !== 1) {
                    lastButtonsState[i] = gp.buttons[i].pressed;
                }
            }
            return;
        }

        // --- Lógica normal de Personalización sin modal abierto ---
        
        // 1. Botón B (1) -> Descartar / Salir con comprobación de cambios (traducido a Escape para el handler de keydown)
        const bPressed = gp.buttons[1].pressed;
        if (bPressed && !lastButtonsState[1]) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Escape', key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
        } else if (!bPressed && lastButtonsState[1]) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Escape', key: 'Escape', keyCode: 27, bubbles: true, cancelable: true }));
        }
        lastButtonsState[1] = bPressed;

        // 2. LB (4) y RB (5) -> Cambiar pestañas (Se conserva para navegación rápida)
        const lbPressed = gp.buttons[4].pressed;
        const rbPressed = gp.buttons[5].pressed;

        if (lbPressed && !lastButtonsState[4]) {
            const tabBtns = Array.from(document.querySelectorAll('.custom-tab-btn:not(.btn-discard-custom):not(.btn-close-custom)'));
            const activeIdx = tabBtns.findIndex(btn => btn.classList.contains('active'));
            if (activeIdx !== -1) {
                const newIdx = (activeIdx - 1 + tabBtns.length) % tabBtns.length;
                tabBtns[newIdx].click();
            }
        }
        lastButtonsState[4] = lbPressed;

        if (rbPressed && !lastButtonsState[5]) {
            const tabBtns = Array.from(document.querySelectorAll('.custom-tab-btn:not(.btn-discard-custom):not(.btn-close-custom)'));
            const activeIdx = tabBtns.findIndex(btn => btn.classList.contains('active'));
            if (activeIdx !== -1) {
                const newIdx = (activeIdx + 1) % tabBtns.length;
                tabBtns[newIdx].click();
            }
        }
        lastButtonsState[5] = rbPressed;

        // 3. Botón A (0) -> Confirmar / Activar (Traducido a Enter)
        const aPressed = gp.buttons[0].pressed;
        if (aPressed && !lastButtonsState[0]) {
            window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Enter', key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
        } else if (!aPressed && lastButtonsState[0]) {
            window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter', key: 'Enter', keyCode: 13, bubbles: true, cancelable: true }));
        }
        lastButtonsState[0] = aPressed;

        // D-pad (12: Up, 13: Down, 14: Left, 15: Right)
        const dpadMap = { 12: 'ArrowUp', 13: 'ArrowDown', 14: 'ArrowLeft', 15: 'ArrowRight' };
        Object.keys(dpadMap).forEach(btn => {
            const isPressed = gp.buttons[btn].pressed;
            const key = dpadMap[btn];
            if (isPressed && !lastButtonsState[btn]) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: key, key: key, bubbles: true, cancelable: true }));
            } else if (!isPressed && lastButtonsState[btn]) {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: key, key: key, bubbles: true, cancelable: true }));
            }
            lastButtonsState[btn] = isPressed;
        });

        // Joystick Izquierdo (Ejes)
        const deadzone = 0.3;
        const stickLeft = gp.axes[0] < -deadzone;
        const stickRight = gp.axes[0] > deadzone;
        const stickUp = gp.axes[1] < -deadzone;
        const stickDown = gp.axes[1] > deadzone;

        const stickMap = {
            'stickLeft': { val: stickLeft, key: 'ArrowLeft' },
            'stickRight': { val: stickRight, key: 'ArrowRight' },
            'stickUp': { val: stickUp, key: 'ArrowUp' },
            'stickDown': { val: stickDown, key: 'ArrowDown' }
        };

        Object.keys(stickMap).forEach(stickKey => {
            const state = stickMap[stickKey];
            if (state.val && !lastButtonsState[stickKey]) {
                window.dispatchEvent(new KeyboardEvent('keydown', { code: state.key, key: state.key, bubbles: true, cancelable: true }));
            } else if (!state.val && lastButtonsState[stickKey]) {
                window.dispatchEvent(new KeyboardEvent('keyup', { code: state.key, key: state.key, bubbles: true, cancelable: true }));
            }
            lastButtonsState[stickKey] = state.val;
        });

        // Mantener actualizado el estado de los demás botones para evitar disparos accidentales
        for (let i = 0; i < gp.buttons.length; i++) {
            if (i !== 0 && i !== 1 && i !== 4 && i !== 5 && !dpadMap[i]) {
                lastButtonsState[i] = gp.buttons[i].pressed;
            }
        }
        return;
    }

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
        mapping[8] = 'Tab';        // SELECT -> Tab (Marcadores)
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
