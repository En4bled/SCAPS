import * as CONST from '../core/constants.js';

let isEditorActive = false;
let onToggleCallback = null;

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

export function initPhysicsEditor(toggleCallback) {
    onToggleCallback = toggleCallback;
    const overlay = document.getElementById('physics-editor-overlay');
    const container = document.getElementById('physics-controls-container');
    const btnApply = document.getElementById('btn-physics-apply');
    const btnReset = document.getElementById('btn-physics-reset');

    if (!overlay || !container) return;

    // Guardar valores iniciales
    EDITABLE_PARAMS.forEach(param => {
        DEFAULT_VALUES[param.key] = CONST.CONFIG[param.key];
    });

    // Generar UI
    container.innerHTML = '';
    EDITABLE_PARAMS.forEach(param => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; flex-direction: column; gap: 2px; background: rgba(255,255,255,0.02); padding: 5px 10px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05);';

        const header = document.createElement('div');
        header.style.cssText = 'display: flex; justify-content: space-between; align-items: center; color: rgba(255,255,255,0.7); font-family: "Rajdhani", sans-serif; font-weight: bold; font-size: 11px;';
        
        const label = document.createElement('span');
        label.textContent = param.label;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.id = `val-${param.key}`;
        valueDisplay.style.cssText = 'color: #5ad; font-family: "Share Tech Mono", monospace; font-size: 11px;';
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
        slider.style.cssText = 'flex: 1; accent-color: #f90; cursor: pointer; height: 12px;';

        const resetBtn = document.createElement('button');
        resetBtn.innerHTML = '↺';
        resetBtn.style.cssText = 'background: none; border: 1px solid rgba(255,153,0,0.3); color: #f90; cursor: pointer; font-size: 9px; padding: 1px 4px; border-radius: 2px; transition: all 0.3s ease; opacity: 0; visibility: hidden;';
        resetBtn.title = 'Reset';
        resetBtn.onmouseover = () => { resetBtn.style.borderColor = '#f90'; resetBtn.style.background = 'rgba(255,153,0,0.1)'; };
        resetBtn.onmouseout = () => { resetBtn.style.borderColor = 'rgba(255,153,0,0.3)'; resetBtn.style.background = 'none'; };

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

    if (btnApply) btnApply.addEventListener('click', () => toggleEditor(false));
    
    if (btnReset) {
        btnReset.addEventListener('click', () => {
            if(confirm("¿Restablecer TODOS los parámetros a sus valores originales?")) {
                EDITABLE_PARAMS.forEach(param => {
                    const def = DEFAULT_VALUES[param.key];
                    CONST.CONFIG[param.key] = def;
                    const s = document.getElementById(`slider-${param.key}`);
                    const d = document.getElementById(`val-${param.key}`);
                    if(s) s.value = def;
                    if(d) d.textContent = def.toFixed(param.step < 0.01 ? 3 : 2);
                    // Como no tenemos acceso directo a cada updateResetVisibility aquí de forma limpia,
                    // una reinicialización rápida de la UI es lo más efectivo si hay muchos cambios.
                });
                initPhysicsEditor(); // Regenerar para actualizar visibilidades
            }
        });
    }

    // Lógica Importar/Exportar
    const btnExport = document.getElementById('btn-physics-export');
    const btnImport = document.getElementById('btn-physics-import');
    const configArea = document.getElementById('physics-config-io');

    if (btnExport && configArea) {
        btnExport.onclick = async () => {
            const config = {};
            EDITABLE_PARAMS.forEach(p => config[p.key] = CONST.CONFIG[p.key]);
            const json = JSON.stringify(config, null, 2);
            configArea.value = json;
            
            try {
                await navigator.clipboard.writeText(json);
                btnExport.innerText = "¡COPIADO!";
                btnExport.style.borderColor = "#fff";
            } catch (err) {
                configArea.select();
                btnExport.innerText = "SELECCIONADO";
            }
            
            setTimeout(() => { 
                btnExport.innerText = "COPIAR AJUSTES"; 
                btnExport.style.borderColor = "#5ad";
            }, 2000);
        };
    }

    if (btnImport && configArea) {
        btnImport.onclick = () => {
            try {
                const config = JSON.parse(configArea.value);
                EDITABLE_PARAMS.forEach(p => {
                    if (config[p.key] !== undefined) {
                        const val = parseFloat(config[p.key]);
                        CONST.CONFIG[p.key] = val;
                        const s = document.getElementById(`slider-${p.key}`);
                        const d = document.getElementById(`val-${p.key}`);
                        if (s) s.value = val;
                        if (d) d.textContent = val.toFixed(p.step < 0.01 ? 3 : 2);
                    }
                });
                btnImport.innerText = "¡APLICADO!";
                btnImport.style.borderColor = "#fff";
                setTimeout(() => { 
                    btnImport.innerText = "APLICAR PEGADO"; 
                    btnImport.style.borderColor = "#4CAF50";
                }, 2000);
            } catch(e) {
                alert("Error: El formato de configuración no es válido.");
            }
        };
    }

    // Escuchar la tecla º
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Backquote' || e.key === 'º' || e.key === '`') {
            // Solo permitir abrir si estamos jugando o si el editor ya está abierto
            if (!isEditorActive && typeof onToggleCallback === 'function') {
                const canOpen = onToggleCallback(true);
                if (canOpen) toggleEditor(true);
            } else if (isEditorActive) {
                toggleEditor(false);
            }
        }
    });
}

export function toggleEditor(show) {
    isEditorActive = show;
    const overlay = document.getElementById('physics-editor-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
        
        if (show) {
            // Sincronizar UI por si algo cambió externamente
            EDITABLE_PARAMS.forEach(param => {
                const slider = document.getElementById(`slider-${param.key}`);
                const display = document.getElementById(`val-${param.key}`);
                if (slider && display) {
                    slider.value = CONST.CONFIG[param.key];
                    display.textContent = CONST.CONFIG[param.key];
                }
            });
        }
    }
    
    if (!show && typeof onToggleCallback === 'function') {
        onToggleCallback(false); // Avisar al juego para quitar pausa
    }
}
