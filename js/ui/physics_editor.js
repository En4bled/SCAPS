import * as CONST from '../core/constants.js';
import { playSound } from '../fx/audio.js';

let isEditorActive = false;
let onToggleCallback = null;
let isFolded = false;

const EDITABLE_PARAMS = [
    { key: 'CAR_MAX_SPEED', label: 'Velocidad Max (Coche)', min: 0.5, max: 5.0, step: 0.1 },
    { key: 'CAR_MAX_BOOST_SPEED', label: 'Velocidad Turbo (Coche)', min: 1.0, max: 7.0, step: 0.1 },
    { key: 'CAR_ACCEL', label: 'Aceleración Base', min: 0.01, max: 0.2, step: 0.005 },
    { key: 'CAR_TURN_SPEED', label: 'Velocidad Giro (Coche)', min: 0.01, max: 0.2, step: 0.005 },
    { key: 'CAR_DRIFT_TURN_MULTIPLIER', label: 'Multiplicador Derrape', min: 1.0, max: 6.0, step: 0.1 },
    { key: 'CAR_FRICTION', label: 'Inercia Coche (Cercano a 1 = resbala)', min: 0.90, max: 0.999, step: 0.001 },
    { key: 'BALL_MAX_SPEED', label: 'Velocidad Max (Balón)', min: 3.0, max: 15.0, step: 0.1 },
    { key: 'BALL_HIT_FORCE', label: 'Fuerza Impacto (Balón)', min: 1.0, max: 15.0, step: 0.5 },
    { key: 'BALL_FRICTION', label: 'Inercia Balón', min: 0.95, max: 0.999, step: 0.001 },
    { key: 'BALL_BOUNCINESS', label: 'Rebote Balón', min: 0.5, max: 2.5, step: 0.1 }
];

// Copia de los valores originales para resetear
const DEFAULT_VALUES = {};

export function showToast(message, color = 'var(--theme-color)') {
    let toast = document.getElementById('scaps-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'scaps-toast';
        toast.style.cssText = 'position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #050515; border: 2px solid ' + color + '; padding: 10px 20px; color: #fff; font-family: "Share Tech Mono", monospace; font-size: 12px; letter-spacing: 1px; z-index: 99999; box-shadow: 0 0 15px ' + color + '; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; pointer-events: none; border-image: none;';
        toast.className = 'pixel-border';
        document.body.appendChild(toast);
    }
    toast.style.borderColor = color;
    toast.style.boxShadow = '0 0 15px ' + color;
    toast.innerText = message;

    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.bottom = '40px';
    }, 10);

    if (window.toastTimeout) clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.bottom = '20px';
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 2000);
}

export function toggleFold() {
    isFolded = !isFolded;
    window.physicsIsFolded = isFolded;
    const overlay = document.getElementById('physics-editor-overlay');
    const banner = document.getElementById('physics-editor-header-banner');
    const panel = document.getElementById('physics-editor-panel');

    if (overlay && banner && panel) {
        if (isFolded) {
            // PLEGADO (Juego Activo - coche puede moverse)
            overlay.style.background = 'transparent';
            overlay.style.backdropFilter = 'none';
            overlay.style.pointerEvents = 'none';

            banner.style.borderColor = '#a5f';
            banner.style.boxShadow = '0 0 15px rgba(165, 85, 255, 0.4)';
            banner.style.borderBottom = '3px solid #a5f';
            banner.style.pointerEvents = 'auto'; // Permitir interactuar con el banner si fuera necesario
            banner.innerHTML = 'EDITOR PLEGADO';

            panel.style.transform = 'scaleY(0)';
            panel.style.opacity = '0';
            panel.style.pointerEvents = 'none';
        } else {
            // DESPLEGADO (Editor en foco)
            overlay.style.background = 'rgba(0,0,0,0.8)';
            overlay.style.backdropFilter = 'blur(5px)';
            overlay.style.pointerEvents = 'auto';

            banner.style.borderColor = '#a5f';
            banner.style.boxShadow = '0 0 15px rgba(165, 85, 255, 0.4)';
            banner.style.borderBottom = 'none';
            banner.innerHTML = 'EDITOR DESPLEGADO';

            panel.style.transform = 'scaleY(1)';
            panel.style.opacity = '1';
            panel.style.pointerEvents = 'auto';

            // Re-enfocar active
            if (typeof window.updatePhysicsFocus === 'function') {
                window.updatePhysicsFocus();
            }
        }
    }
}

window.togglePhysicsFold = toggleFold;

export function initPhysicsEditor(toggleCallback) {
    if (toggleCallback) onToggleCallback = toggleCallback;
    const overlay = document.getElementById('physics-editor-overlay');
    const container = document.getElementById('physics-controls-container');
    const btnApply = document.getElementById('btn-physics-apply');
    const btnReset = document.getElementById('btn-physics-reset');

    if (!overlay || !container) return;

    // Guardar valores iniciales
    EDITABLE_PARAMS.forEach(param => {
        if (DEFAULT_VALUES[param.key] === undefined) {
            DEFAULT_VALUES[param.key] = CONST.CONFIG[param.key];
        }
    });

    // Generar UI
    container.innerHTML = '';
    EDITABLE_PARAMS.forEach((param, index) => {
        const item = document.createElement('div');
        item.id = `physics-row-${index}`;
        item.style.cssText = 'display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 5px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); transition: all 0.2s ease;';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.7); font-family: "Rajdhani", sans-serif; font-weight: bold; font-size: 13px;';

        const label = document.createElement('span');
        label.textContent = param.label;
        label.style.fontSize = '13px'; // Aumentado para mejor legibilidad

        const valueDisplay = document.createElement('span');
        valueDisplay.id = `val-${param.key}`;
        valueDisplay.style.cssText = 'color: #fff; font-family: "Share Tech Mono", monospace; font-size: 12px;';
        valueDisplay.textContent = CONST.CONFIG[param.key];

        header.appendChild(label);
        header.appendChild(valueDisplay);

        const controlRow = document.createElement('div');
        controlRow.style.cssText = 'display: flex; align-items: center; gap: 8px;';

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = param.min;
        slider.max = param.max;
        slider.step = param.step;
        slider.value = CONST.CONFIG[param.key];
        slider.id = `slider-${param.key}`;
        slider.style.cssText = 'flex: 1; accent-color: #fff; cursor: pointer; height: 12px; transition: outline 0.1s ease;';

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '↺';
        resetBtn.style.cssText = 'background: none; border: 1px solid rgba(255,255,255,0.3); color: #fff; cursor: pointer; font-size: 9px; padding: 1px 4px; border-radius: 2px; transition: all 0.3s ease; opacity: 0; visibility: hidden;';
        resetBtn.title = 'Reset';
        resetBtn.onmouseover = () => { resetBtn.style.borderColor = '#fff'; resetBtn.style.background = 'rgba(255,255,255,0.1)'; };
        resetBtn.onmouseout = () => { resetBtn.style.borderColor = 'rgba(255,255,255,0.3)'; resetBtn.style.background = 'none'; };

        const updateResetVisibility = () => {
            const isModified = Math.abs(CONST.CONFIG[param.key] - DEFAULT_VALUES[param.key]) > (param.step / 2);
            resetBtn.style.opacity = isModified ? '1' : '0';
            resetBtn.style.visibility = isModified ? 'visible' : 'hidden';
        };

        resetBtn.onclick = (e) => {
            e.stopPropagation();
            const def = DEFAULT_VALUES[param.key];
            CONST.CONFIG[param.key] = def;
            slider.value = def;
            valueDisplay.textContent = def.toFixed(param.step < 0.01 ? 3 : 2);
            updateResetVisibility();
        };

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.textContent = val.toFixed(param.step < 0.01 ? 3 : 2);
            CONST.CONFIG[param.key] = val;
            updateResetVisibility();
        });

        // Verificación inicial
        updateResetVisibility();

        controlRow.appendChild(slider);
        controlRow.appendChild(resetBtn);

        item.appendChild(header);
        item.appendChild(controlRow);
        container.appendChild(item);
    });

    if (btnApply) btnApply.onclick = () => toggleEditor(false);

    // Modal de Confirmación de Resetear Físicas
    const confirmOverlay = document.getElementById('physics-reset-confirm-overlay');
    const btnConfirmReset = document.getElementById('btn-physics-confirm-reset');
    const btnCancelReset = document.getElementById('btn-physics-cancel-reset');

    window.physicsResetConfirmOpen = false;

    if (btnReset && confirmOverlay && btnConfirmReset && btnCancelReset) {
        btnReset.onclick = () => {
            confirmOverlay.style.display = 'flex';
            confirmOverlay.classList.remove('hidden');
            window.physicsResetConfirmOpen = true;
            btnCancelReset.focus();
        };

        btnConfirmReset.onclick = () => {
            EDITABLE_PARAMS.forEach(param => {
                const def = DEFAULT_VALUES[param.key];
                CONST.CONFIG[param.key] = def;
                const s = document.getElementById(`slider-${param.key}`);
                const d = document.getElementById(`val-${param.key}`);
                if (s) s.value = def;
                if (d) d.textContent = def.toFixed(param.step < 0.01 ? 3 : 2);
            });
            initPhysicsEditor(); // Regenerar para actualizar visibilidades
            confirmOverlay.style.display = 'none';
            window.physicsResetConfirmOpen = false;
            showToast("FÍSICAS RESTABLECIDAS POR DEFECTO", "#f33");
            if (typeof window.updatePhysicsFocus === 'function') {
                window.updatePhysicsFocus();
            }
        };

        btnCancelReset.onclick = () => {
            confirmOverlay.style.display = 'none';
            window.physicsResetConfirmOpen = false;
            playSound('menu_click');
            if (typeof window.updatePhysicsFocus === 'function') {
                window.updatePhysicsFocus();
            }
        };
    }

    // Lógica Exportar
    const btnExport = document.getElementById('btn-physics-export');
    if (btnExport) {
        btnExport.onclick = async () => {
            const config = {};
            EDITABLE_PARAMS.forEach(p => config[p.key] = CONST.CONFIG[p.key]);
            const json = JSON.stringify(config, null, 2);

            try {
                await navigator.clipboard.writeText(json);
                btnExport.innerText = "¡COPIADO!";
                btnExport.style.borderColor = "#fff";
                showToast("CONFIGURACIÓN COPIADA EN PORTAPAPELES", "var(--theme-color)");
            } catch (err) {
                btnExport.innerText = "ERROR AL COPIAR";
            }

            setTimeout(() => {
                btnExport.innerText = "COPIAR AJUSTES AL PORTAPAPELES";
                btnExport.style.borderColor = "#fff";
            }, 2000);
        };
    }

    // Lógica Pegar Ajustes
    const btnPaste = document.getElementById('btn-physics-paste');
    if (btnPaste) {
        btnPaste.onclick = async () => {
            try {
                const text = await navigator.clipboard.readText();
                const config = JSON.parse(text);

                // Validar si tiene al menos algunos parámetros válidos
                let validParamsCount = 0;
                EDITABLE_PARAMS.forEach(p => {
                    if (config[p.key] !== undefined && !isNaN(parseFloat(config[p.key]))) {
                        validParamsCount++;
                    }
                });

                if (validParamsCount > 0) {
                    EDITABLE_PARAMS.forEach(p => {
                        if (config[p.key] !== undefined && !isNaN(parseFloat(config[p.key]))) {
                            const val = Math.max(p.min, Math.min(p.max, parseFloat(config[p.key])));
                            CONST.CONFIG[p.key] = val;
                            const s = document.getElementById(`slider-${p.key}`);
                            const d = document.getElementById(`val-${p.key}`);
                            if (s) s.value = val;
                            if (d) d.textContent = val.toFixed(p.step < 0.01 ? 3 : 2);
                        }
                    });
                    btnPaste.innerText = "¡PEGADO!";
                    btnPaste.style.borderColor = "#fff";
                    showToast("CONFIGURACIÓN APLICADA CON ÉXITO", "#4CAF50");
                    initPhysicsEditor(); // Regenerar
                } else {
                    showToast("CONFIGURACIÓN NO VALIDA", "#f33");
                }
            } catch (err) {
                showToast("CONFIGURACIÓN NO VALIDA", "#f33");
            }

            setTimeout(() => {
                btnPaste.innerText = "PEGAR AJUSTES DEL PORTAPAPELES";
                btnPaste.style.borderColor = "#fff";
            }, 2000);
        };
    }
}

window.updatePhysicsFocus = function () {
    const focusIdx = window.physicsFocusIndex || 0;
    const isEditing = window.physicsEditMode || false;

    EDITABLE_PARAMS.forEach((param, index) => {
        const item = document.getElementById(`physics-row-${index}`);
        const slider = document.getElementById(`slider-${param.key}`);
        if (item && slider) {
            if (index === focusIdx) {
                if (isEditing) {
                    // MODO EDICIÓN ACTIVO: Brillo dorado/amarillo cyber pulsante
                    item.style.borderColor = '#ffcc00';
                    item.style.background = 'rgba(255, 204, 0, 0.15)';
                    item.style.boxShadow = '0 0 15px rgba(255, 204, 0, 0.4)';
                    slider.style.outline = '2px solid #ffcc00';
                } else {
                    // EN FOCO PERO NAVEGACIÓN LIBRE
                    item.style.borderColor = '#a5f';
                    item.style.background = 'rgba(165, 85, 255, 0.05)';
                    item.style.boxShadow = 'none';
                    slider.style.outline = 'none';
                }
            } else {
                // NORMAL
                item.style.borderColor = 'rgba(255,255,255,0.05)';
                item.style.background = 'rgba(255,255,255,0.02)';
                item.style.boxShadow = 'none';
                slider.style.outline = 'none';
            }
        }
    });

    // Actualizar estados visuales de los botones en foco
    const buttonIds = [
        'btn-physics-export',
        'btn-physics-paste',
        'btn-physics-apply',
        'btn-physics-reset'
    ];

    buttonIds.forEach((btnId, btnIndex) => {
        const btn = document.getElementById(btnId);
        if (btn) {
            const actualIndex = btnIndex + 10;
            if (actualIndex === focusIdx) {
                if (btnId === 'btn-physics-export' || btnId === 'btn-physics-paste') {
                    btn.classList.add('selected');
                } else {
                    btn.style.background = '#fff';
                    btn.style.color = '#000';
                    btn.style.boxShadow = '0 0 15px rgba(255, 255, 255, 0.6)';
                    btn.style.borderColor = '#fff';
                }
            } else {
                if (btnId === 'btn-physics-export' || btnId === 'btn-physics-paste') {
                    btn.classList.remove('selected');
                } else {
                    btn.style.background = '';
                    btn.style.color = '';
                    btn.style.boxShadow = '';
                    if (btnId === 'btn-physics-apply') btn.style.borderColor = '#2e7d32';
                    else if (btnId === 'btn-physics-reset') btn.style.borderColor = '';
                }
            }
        }
    });
};

export function toggleEditor(show) {
    isEditorActive = show;
    const overlay = document.getElementById('physics-editor-overlay');
    const banner = document.getElementById('physics-editor-header-banner');
    const panel = document.getElementById('physics-editor-panel');

    if (overlay && banner && panel) {
        overlay.style.display = show ? 'flex' : 'none';

        if (show) {
            overlay.classList.remove('hidden'); // Asegurar que no hay clases bloqueando el display

            // Restablecer plegado al abrir
            isFolded = false;
            window.physicsIsFolded = false;
            overlay.style.background = 'rgba(0,0,0,0.8)';
            overlay.style.backdropFilter = 'blur(5px)';
            overlay.style.pointerEvents = 'auto';

            banner.style.borderColor = '#a5f';
            banner.style.boxShadow = '0 0 15px rgba(165, 85, 255, 0.4)';
            banner.style.borderBottom = 'none';
            banner.innerHTML = 'EDITOR DESPLEGADO';

            panel.style.transform = 'scaleY(1)';
            panel.style.opacity = '1';
            panel.style.pointerEvents = 'auto';

            // Sincronizar UI por si algo cambió externamente
            EDITABLE_PARAMS.forEach(param => {
                const slider = document.getElementById(`slider-${param.key}`);
                const display = document.getElementById(`val-${param.key}`);
                if (slider && display) {
                    slider.value = CONST.CONFIG[param.key];
                    display.textContent = CONST.CONFIG[param.key];
                }
            });

            // Seleccionar primer control
            window.physicsFocusIndex = 0;
            window.physicsEditMode = false;
            if (typeof window.updatePhysicsFocus === 'function') {
                window.updatePhysicsFocus();
            }
        }
    }

    if (!show && typeof onToggleCallback === 'function') {
        onToggleCallback(false); // Avisar al juego para quitar pausa
    }
}
