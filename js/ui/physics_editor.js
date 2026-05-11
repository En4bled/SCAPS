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
    EDITABLE_PARAMS.forEach(param => {
        const item = document.createElement('div');
        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.gap = '5px';

        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.color = '#fff';
        header.style.fontFamily = "'Rajdhani', sans-serif";
        header.style.fontWeight = 'bold';
        
        const label = document.createElement('span');
        label.textContent = param.label;
        
        const valueDisplay = document.createElement('span');
        valueDisplay.id = `val-${param.key}`;
        valueDisplay.style.color = '#5ad';
        valueDisplay.textContent = CONST.CONFIG[param.key];

        header.appendChild(label);
        header.appendChild(valueDisplay);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = param.min;
        slider.max = param.max;
        slider.step = param.step;
        slider.value = CONST.CONFIG[param.key];
        slider.id = `slider-${param.key}`;
        slider.style.width = '100%';
        slider.style.accentColor = '#f90';

        slider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            valueDisplay.textContent = val.toFixed(param.step < 0.01 ? 3 : 2);
            CONST.CONFIG[param.key] = val; // ACTUALIZACIÓN EN TIEMPO REAL
        });

        item.appendChild(header);
        item.appendChild(slider);
        container.appendChild(item);
    });

    btnApply.addEventListener('click', () => toggleEditor(false));
    
    btnReset.addEventListener('click', () => {
        EDITABLE_PARAMS.forEach(param => {
            CONST.CONFIG[param.key] = DEFAULT_VALUES[param.key];
            const slider = document.getElementById(`slider-${param.key}`);
            const display = document.getElementById(`val-${param.key}`);
            if(slider) slider.value = DEFAULT_VALUES[param.key];
            if(display) display.textContent = DEFAULT_VALUES[param.key];
        });
    });

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
