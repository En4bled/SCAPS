import * as CONST from './core/constants.js';
import { getAssetPath } from './core/constants.js';
import { assetsManager } from './core/assets.js';
import { Car } from './entities/car.js';
import { Ball } from './entities/ball.js';
import { BoostPad } from './entities/boost.js';
import { ExplosionParticle, ConfettiParticle } from './fx/particles.js';
import { setupInput, pollGamepad } from './core/input.js';
import { drawField, drawGoalNets, createGrassDetails } from './world/field.js';
import { drawHUD, drawCarNames } from './ui/hud.js';
import { showScoreboard, hideScoreboard } from './ui/scoreboard.js';
import { checkCarBallCollision, checkCarCarCollision, checkGoalPhysics, applyTirePhysics, applyGlobalFriction } from './world/physics.js';
import { updateCarAI } from './ai/bot.js';
import { initAudio, updateAudio, stopAllMotors, playSound, setBoostSound, setDriftSound, toggleMusic, setMusicVolume, setSFXVolume, nextSong, prevSong, getCurrentSongInfo, togglePlayPause, isMusicPaused, getAudioVisualData } from './fx/audio.js';
import { initPhysicsEditor, toggleEditor } from './ui/physics_editor.js';
import { BOOST_DEFS } from './fx/boost_definitions.js';
import { EXPLOSION_DEFS } from './fx/explosion_definitions.js';
import { ReplaySystem } from './core/replay.js';
import { drawDynamicShadows, drawAmbientLighting, updateLights, drawWallShadows } from './ui/lighting.js';

// CONFIGURACIÓN DE USUARIO (USER.CONFIG)
const USER_CONFIG = {
    playerName: 'PILOTO_01',
    playerTitle: 'ALPHA TESTER',
    playerBanner: 'banner-style-default',
    playerAvatar: 'recursos/cars/car1.png',
    playerCar: 'recursos/cars/car1.png',
    playerCarHue: 0,
    playerCarSaturate: 100,
    playerBall: 'recursos/balls/ball_1.png',
    playerAvatarBg: '#222222',
    playerBoost: 'classic',
    playerExplosion: 'classic',
    musicVolume: 50,
    sfxVolume: 80,
    bannerPos: { left: 220, bottom: 100 },
    // Nuevas propiedades del diseñador avanzado
    bannerBgColor1: '#2d6096',
    bannerBgColor2: '#1a1a4a',
    bannerBorderColor: '#ffffff',
    bannerTextColor: '#ffffff',
    bannerType: 'gradient',
    bannerAngle: 90,
    bannerPattern: 'none',
    bannerBorderStyle: 'simple',
    bloomEnabled: true,
    uiTheme: 'blue',
    stats: {
        totalGoals: 0,
        matchesWon: 0,
        matchesLost: 0,
        totalMatches: 0,
        playTime: 0, // Segundos
        xp: 0,
        level: 1
    }
};

const getEl = (id) => document.getElementById(id);

// Exportar para acceso desde UI tras inicialización
window.musicVolume = USER_CONFIG.musicVolume / 100;
window.sfxVolume = USER_CONFIG.sfxVolume / 100;
window.getAssetPath = getAssetPath;

function saveUserConfig() {
    localStorage.setItem('SCAPS_USER_CONFIG', JSON.stringify(USER_CONFIG));
}

function syncThemeUI() {
    const isOrange = USER_CONFIG.uiTheme === 'orange';
    document.body.classList.toggle('theme-orange', isOrange);
    
    const btnThemeBlue = document.getElementById('btn-theme-blue');
    const btnThemeOrange = document.getElementById('btn-theme-orange');
    if (btnThemeBlue && btnThemeOrange) {
        if (isOrange) {
            btnThemeOrange.classList.add('active');
            btnThemeBlue.classList.remove('active');
        } else {
            btnThemeBlue.classList.add('active');
            btnThemeOrange.classList.remove('active');
        }
    }
    if (typeof syncCustomColorPickerButtons === 'function') {
        syncCustomColorPickerButtons();
    }
}

window.hasCustomizationChanges = () => {
    if (!window.USER_CONFIG_BACKUP) return false;
    const fields = [
        'playerName', 'playerTitle', 'playerBanner', 'playerAvatar',
        'playerCar', 'playerCarHue', 'playerCarSaturate', 'playerBall',
        'playerAvatarBg', 'playerBoost', 'playerExplosion',
        'bannerBgColor1', 'bannerBgColor2', 'bannerBorderColor', 'bannerTextColor',
        'bannerType', 'bannerAngle', 'bannerPattern', 'bannerBorderStyle'
    ];
    return fields.some(f => USER_CONFIG[f] !== window.USER_CONFIG_BACKUP[f]);
};

window.tryDiscardCustomization = () => {
    if (window.hasCustomizationChanges()) {
        const overlay = document.getElementById('custom-discard-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.remove('hidden');
            window.customDiscardConfirmOpen = true;
            const cancelBtn = document.getElementById('btn-custom-discard-cancel');
            if (cancelBtn) cancelBtn.focus();
        }
        playSound('menu_click');
    } else {
        window.discardCustomization();
    }
};

window.confirmDiscardCustomization = () => {
    const overlay = document.getElementById('custom-discard-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    window.customDiscardConfirmOpen = false;
    window.discardCustomization();
};

window.cancelDiscardCustomization = () => {
    const overlay = document.getElementById('custom-discard-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    window.customDiscardConfirmOpen = false;
    playSound('menu_click');
};

// Función global para cerrar el menú de personalización y guardar cambios
window.closeCustomization = () => {
    console.log("SCAPS: Guardando y cerrando personalización...");
    const inputName = document.getElementById('input-player-name');
    if (inputName) {
        USER_CONFIG.playerName = inputName.value;
    }
    saveUserConfig();
    if (typeof showMenuScreen === 'function') {
        showMenuScreen('initial');
    }
    playSound('menu_click');
};

// Función global para descartar cambios en el menú de personalización
window.discardCustomization = () => {
    console.log("SCAPS: Descartando cambios y cerrando personalización...");
    if (window.USER_CONFIG_BACKUP) {
        Object.assign(USER_CONFIG, window.USER_CONFIG_BACKUP);
        saveUserConfig();
        
        // Re-renderizar todos los selectores para reflejar el estado restaurado
        if (typeof renderAvatars === 'function') renderAvatars();
        if (typeof renderCarSelection === 'function') renderCarSelection();
        if (typeof renderBallSelection === 'function') renderBallSelection();
        if (typeof renderBoostSelection === 'function') renderBoostSelection();
        if (typeof renderExplosionSelection === 'function') renderExplosionSelection();
        if (typeof updatePlayerBanner === 'function') updatePlayerBanner();
        if (typeof setupTitleSelect === 'function') setupTitleSelect();
        if (typeof setupAdvancedBannerDropdowns === 'function') setupAdvancedBannerDropdowns();
        
        // Restaurar sliders de tinte del coche en el DOM
        const hueSlider = document.getElementById('slider-car-hue');
        const satSlider = document.getElementById('slider-car-saturate');
        const previewImg = document.getElementById('car-preview-img');
        if (hueSlider) hueSlider.value = USER_CONFIG.playerCarHue || 0;
        if (satSlider) satSlider.value = USER_CONFIG.playerCarSaturate || 100;
        if (previewImg) {
            previewImg.style.filter = `hue-rotate(${USER_CONFIG.playerCarHue || 0}deg) saturate(${USER_CONFIG.playerCarSaturate || 100}%) drop-shadow(0 0 15px var(--theme-glow-color))`;
        }
        
        // Restaurar input de nombre e input de fondo de avatar
        const inputName = document.getElementById('input-player-name');
        if (inputName) inputName.value = USER_CONFIG.playerName || "Piloto";
        const inputAvatarBg = document.getElementById('input-avatar-bg');
        if (inputAvatarBg) inputAvatarBg.value = USER_CONFIG.playerAvatarBg || "#0a0a19";
        syncThemeUI();
    }
    if (typeof showMenuScreen === 'function') {
        showMenuScreen('initial');
    }
    playSound('menu_click');
};

function loadUserConfig() {
    const saved = localStorage.getItem('SCAPS_USER_CONFIG');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            Object.assign(USER_CONFIG, parsed); 
            
            // Sanitización y migración de rutas antiguas almacenadas en localStorage a minúsculas y nuevas carpetas
            if (typeof USER_CONFIG.playerCar === 'string') {
                let car = USER_CONFIG.playerCar.toLowerCase();
                // Migrar de la raíz recursos/ a recursos/cars/ si es necesario
                if (car.includes('recursos/') && !car.includes('recursos/cars/')) {
                    car = car.replace('recursos/', 'recursos/cars/');
                }
                USER_CONFIG.playerCar = car;
            }
            if (typeof USER_CONFIG.playerAvatar === 'string') {
                let avatar = USER_CONFIG.playerAvatar.toLowerCase();
                avatar = avatar.replace('recursos/ui/avatar/', 'recursos/avatar/');
                avatar = avatar.replace(/avatar\s*\((\d+)\)\.png/, 'avatar_$1.png');
                USER_CONFIG.playerAvatar = avatar;
            }
            if (typeof USER_CONFIG.playerBall === 'string') {
                let ball = USER_CONFIG.playerBall.toLowerCase();
                // Migrar de recursos/ball1.png o recursos/balls/ball1.png a recursos/balls/ball_1.png
                if (ball.includes('recursos/ball') && !ball.includes('recursos/balls/ball_')) {
                    const match = ball.match(/ball(\d+)\.png/);
                    if (match) {
                        ball = `recursos/balls/ball_${match[1]}.png`;
                    }
                }
                USER_CONFIG.playerBall = ball;
            }

            // Asegurar que stats existe (merge profundo simple para stats)
            if (parsed.stats) {
                USER_CONFIG.stats = { ...USER_CONFIG.stats, ...parsed.stats };
            }
        } catch (e) { console.error("Error cargando configuración:", e); }
    }
    syncThemeUI();
    setMusicVolume(USER_CONFIG.musicVolume / 100);
    setSFXVolume(USER_CONFIG.sfxVolume / 100);
    applyBannerPosition();
    if (ball) ball.imgUrl = USER_CONFIG.playerBall;

    // Actualizar Tag de Versión
    const versionTag = document.getElementById('game-version-tag');
    if (versionTag) versionTag.innerText = `VERSIÓN ${CONST.CONFIG.VERSION}`;

    // Sincronizar UI inicial
    const inputName = document.getElementById('input-player-name');
    if (inputName) inputName.value = USER_CONFIG.playerName;
    const inputAvatarBg = document.getElementById('input-avatar-bg');
    if (inputAvatarBg) {
        inputAvatarBg.value = USER_CONFIG.playerAvatarBg;
    }
    
    // Sincronizar Checkboxes de Bloom
    isBloomEnabled = USER_CONFIG.bloomEnabled !== undefined ? USER_CONFIG.bloomEnabled : true;
    
    const settingsBloomEl = document.getElementById('settings-toggle-bloom');
    if (settingsBloomEl) {
        settingsBloomEl.checked = isBloomEnabled;
        settingsBloomEl.onchange = (e) => {
            USER_CONFIG.bloomEnabled = e.target.checked;
            isBloomEnabled = e.target.checked;
            settingsChanged = true;
            applyBloomSetting();
            const pauseBloomEl = document.getElementById('toggle-bloom');
            if (pauseBloomEl) pauseBloomEl.checked = isBloomEnabled;
        };
    }
    
    const pauseBloomEl = document.getElementById('toggle-bloom');
    if (pauseBloomEl) {
        pauseBloomEl.checked = isBloomEnabled;
        // Event listener para el de pausa ya está en la inicialización principal, 
        // pero podemos sobreescribirlo aquí para que guarde en USER_CONFIG
        pauseBloomEl.onchange = (e) => {
            USER_CONFIG.bloomEnabled = e.target.checked;
            isBloomEnabled = e.target.checked;
            saveUserConfig();
            applyBloomSetting();
            if (settingsBloomEl) settingsBloomEl.checked = isBloomEnabled;
        };
    }

    // Eventos del Diseñador de Banner Avanzado
    const bannerInputs = [
        { id: 'input-banner-bg1', prop: 'bannerBgColor1' },
        { id: 'input-banner-bg2', prop: 'bannerBgColor2' },
        { id: 'input-banner-border', prop: 'bannerBorderColor' },
        { id: 'input-banner-text', prop: 'bannerTextColor' },
        { id: 'select-banner-type', prop: 'bannerType' },
        { id: 'select-banner-pattern', prop: 'bannerPattern' }
    ];

    bannerInputs.forEach(item => {
        const el = document.getElementById(item.id);
        if (el) {
            el.value = USER_CONFIG[item.prop];
            el.oninput = (e) => {
                USER_CONFIG[item.prop] = e.target.value;
                saveUserConfig();
                updatePlayerBanner();
            };
            if (el.tagName === 'SELECT' || el.type === 'number') {
                el.onchange = (e) => {
                    USER_CONFIG[item.prop] = e.target.value;
                    saveUserConfig();
                    updatePlayerBanner();
                };
            }
        }
    });

    selectedCarP1 = USER_CONFIG.playerCar;
    setupTitleSelect(); // Activar títulos
    setupAdvancedBannerDropdowns(); // Activar Relleno y Patrón

    // Cerrar desplegables al hacer click fuera
    document.addEventListener('click', () => {
        document.querySelectorAll('.custom-dropdown-content').forEach(c => {
            c.style.display = 'none';
        });
    });

    updatePlayerBanner();

    applyBloomSetting();
}

export function applyBloomSetting() {
    const wrapper = document.getElementById('game-wrapper');
    if (!wrapper) return;
    if (isBloomEnabled) {
        wrapper.style.filter = `saturate(1.2) contrast(1.1) brightness(1.05) drop-shadow(0 0 10px rgba(100, 200, 255, 0.2))`;
    } else {
        wrapper.style.filter = 'none';
    }
}

function updatePlayerBanner() {
    const banner = document.getElementById('player-banner');
    if (!banner) return;

    const avatarImg = document.getElementById('player-banner-avatar');
    const avatarFrame = document.getElementById('player-banner-avatar-frame');
    const nameSpan = document.getElementById('player-banner-name');
    const titleSpan = document.getElementById('player-banner-title');
    const infoBox = banner.querySelector('.player-banner-info');

    // Sincronizar Avatar y Textos
    const applyTextEffect = (el) => {
        if (!el) return;
        el.style.color = USER_CONFIG.bannerTextColor;
        el.style.setProperty('text-shadow', '1px 1px 2px #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000', 'important');
        el.style.fontWeight = 'bold';
    };

    if (avatarImg) avatarImg.src = getAssetPath(USER_CONFIG.playerAvatar);
    if (avatarFrame) avatarFrame.style.background = USER_CONFIG.playerAvatarBg;
    if (nameSpan) {
        nameSpan.innerText = USER_CONFIG.playerName;
        applyTextEffect(nameSpan);
    }
    if (titleSpan) {
        titleSpan.innerText = USER_CONFIG.playerTitle || '';
        applyTextEffect(titleSpan);
    }

    // Vista previa dentro del menú de personalización
    const previewBanner = document.getElementById('custom-banner-preview');
    const previewAvatar = document.getElementById('custom-banner-avatar');
    const previewFrame = document.getElementById('custom-banner-avatar-frame');
    const previewName = document.getElementById('custom-banner-name');
    const previewTitle = document.getElementById('custom-banner-title');
    const previewInfo = previewBanner ? previewBanner.querySelector('.player-banner-info') : null;

    if (previewAvatar) previewAvatar.src = getAssetPath(USER_CONFIG.playerAvatar);
    if (previewFrame) previewFrame.style.background = USER_CONFIG.playerAvatarBg;
    if (previewName) {
        previewName.innerText = USER_CONFIG.playerName;
        applyTextEffect(previewName);
    }
    if (previewTitle) {
        previewTitle.innerText = USER_CONFIG.playerTitle || '';
        applyTextEffect(previewTitle);
    }

    // APLICAR ESTILO DINÁMICO
    const applyStyle = (el) => {
        if (!el) return;

        // Reset previo
        el.style.backgroundSize = 'auto';
        el.style.backgroundRepeat = 'repeat';

        // Fondo (Relleno) Simplificado
        let fillCSS = '';
        if (USER_CONFIG.bannerType === 'gradient') {
            fillCSS = `linear-gradient(${USER_CONFIG.bannerAngle}deg, ${USER_CONFIG.bannerBgColor1}, ${USER_CONFIG.bannerBgColor2})`;
        } else if (USER_CONFIG.bannerType === 'radial') {
            fillCSS = `radial-gradient(circle at center, ${USER_CONFIG.bannerBgColor1}, ${USER_CONFIG.bannerBgColor2})`;
        } else {
            fillCSS = `linear-gradient(0deg, ${USER_CONFIG.bannerBgColor1}, ${USER_CONFIG.bannerBgColor1})`;
        }

        // Patrón (Superpuesto al fondo) Minimalista
        let patternCSS = '';
        let patternSize = 'auto';

        if (USER_CONFIG.bannerPattern === 'grid') {
            patternCSS = `linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)`;
            patternSize = '20px 20px';
        } else if (USER_CONFIG.bannerPattern === 'diagonal') {
            patternCSS = `linear-gradient(45deg, rgba(255,255,255,0.05) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.05) 75%, transparent 75%, transparent)`;
            patternSize = '10px 10px';
        } else if (USER_CONFIG.bannerPattern === 'dots') {
            patternCSS = `radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)`;
            patternSize = '15px 15px';
        } else if (USER_CONFIG.bannerPattern === 'cross') {
            patternCSS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 16 16'%3E%3Cpath d='M7 0h2v16H7zM0 7h16v2H0z' fill='white' fill-opacity='0.05'/%3E%3C/svg%3E")`;
            patternSize = '16px 16px';
        } else if (USER_CONFIG.bannerPattern === 'chevron') {
            patternCSS = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20' viewBox='0 0 40 20'%3E%3Cpath d='M0 0 L20 10 L40 0' fill='none' stroke='white' stroke-opacity='0.05' stroke-width='2'/%3E%3C/svg%3E")`;
            patternSize = '40px 20px';
        }

        // Aplicar con prioridad
        if (patternCSS) {
            el.style.setProperty('background-image', `${patternCSS}, ${fillCSS}`, 'important');
            el.style.setProperty('background-size', `${patternSize}, auto`, 'important');
        } else {
            el.style.setProperty('background-image', fillCSS, 'important');
            el.style.setProperty('background-size', '100% 100%', 'important');
        }
        
        el.style.setProperty('background-color', USER_CONFIG.bannerBgColor1, 'important');

        // Borde
        el.style.setProperty('border-color', USER_CONFIG.bannerBorderColor, 'important');

        // Estilo de Borde
        if (USER_CONFIG.bannerBorderStyle === 'neon') {
            el.style.setProperty('box-shadow', `0 0 15px ${USER_CONFIG.bannerBorderColor}66`, 'important');
            el.style.setProperty('border-width', '1px', 'important');
        } else if (USER_CONFIG.bannerBorderStyle === 'double') {
            el.style.setProperty('box-shadow', `inset 0 0 0 2px rgba(0,0,0,0.3)`, 'important');
            el.style.setProperty('border-width', '4px', 'important');
        } else {
            el.style.setProperty('box-shadow', 'none', 'important');
            el.style.setProperty('border-width', '1px', 'important');
        }
    };

    applyStyle(infoBox);
    applyStyle(previewInfo);

    // Solo se muestra si estamos en el menú principal inicial
    const isMainInitial = (menuInitial && menuInitial.style.display !== 'none');
    banner.style.display = (gameState === 'menu' && isMainInitial) ? 'flex' : 'none';
    banner.style.opacity = (gameState === 'menu' && isMainInitial) ? '1' : '0';

    updateStatsUI();
}

export function updateStatsUI() {
    const getEl = (id) => document.getElementById(id);
    if (!getEl('stat-total-goals')) return;

    getEl('stat-total-goals').innerText = USER_CONFIG.stats.totalGoals;
    getEl('stat-matches-won').innerText = USER_CONFIG.stats.matchesWon;
    getEl('stat-matches-lost').innerText = USER_CONFIG.stats.matchesLost;
    getEl('stat-total-matches').innerText = USER_CONFIG.stats.totalMatches;
    
    const minutes = Math.floor(USER_CONFIG.stats.playTime / 60);
    getEl('stat-play-time').innerText = minutes + 'm';

    // Nivel y XP
    const level = USER_CONFIG.stats.level || 1;
    const xp = USER_CONFIG.stats.xp || 0;
    const xpToNext = level * 1000;
    const progress = (xp / xpToNext) * 100;

    getEl('stat-level').innerText = level;
    getEl('stat-xp-info').innerText = `${xp} / ${xpToNext} XP`;
    getEl('stat-xp-fill').style.width = progress + '%';

    // Actualizar también el nivel en el banner principal
    const bannerLevel = document.querySelector('#player-banner .player-banner-level span');
    if (bannerLevel) bannerLevel.innerText = level;
    
    const bannerExpFill = document.querySelector('#player-banner .player-banner-exp-fill');
    if (bannerExpFill) bannerExpFill.style.width = progress + '%';
}




function applyBannerPosition() {
    const banner = document.getElementById('song-notification');
    if (banner) {
        banner.style.left = '20px';
        banner.style.top = '20px';
        banner.style.bottom = 'auto';
    }
}



function setupDraggableBanner() {
    // Eliminada la opción de arrastrar el banner durante el juego a petición del usuario.
}



export let shakeMagnitude = 0;
export let hitStopFrames = 0;
export let isBloomEnabled = true;

export function addScreenShake(magnitude) {
    shakeMagnitude = Math.min(shakeMagnitude + magnitude, 25);
}

export function addHitStop(frames) {
    hitStopFrames = Math.max(hitStopFrames, frames);
}

let canvas, ctx;
let countdownEl, goalTextEl, cameraModeEl, scoreboardEl, mainMenuEl;
let btnPlay, btnSettings, btnCredits, btnCustom, menuInitial, menuCredits, menuCustom, menuSettings;
let setupOverlay, btnStartGame, btnExitSetup, mapListContainer;
let gameOverOverlay, gameOverWinner, finalScoreBlue, finalScoreOrange;
let selectedMap = 'URBAN';
let selectedMode = null;
let selectedCarP1 = 'recursos/cars/car1.png';
let selectedCarP2 = 'recursos/cars/car2.png';
let settingsChanged = false;
let settingsFocusIndex = 0; // 0: Música, 1: SFX, 2: Bloom
const SETTINGS_CONTROLS_COUNT = 3;
let currentMapPage = 1, currentCarPageP1 = 1, currentCarPageP2 = 1, currentBallPage = 1;
let currentAvatarPage = 1;
const CARS_PER_PAGE = 12;
const AVATARS_PER_PAGE = 12;
const MAPS_PER_PAGE = 1;
const BALLS_PER_PAGE = 12; // 6 columnas x 2 filas
let currentZoom = 1.0, targetZoom = 0.85;
let currentVOffset = 0;

let score = { blue: 0, orange: 0 };
let gameState = 'intro';
let isTrainingMode = false;
let isPaused = false;
let countdownTimer = 3;
let gameTime = 60;
let lastTime = 0;
let fps = 60;
window.SCAPS_LOD_LEVEL = 1.0;
let keysPressed = {};
let animationFrameCounter = 0;
let cameraMode = 'fixed';
let touchHistory = [];
let grassDetails = [];
let particles = [];
let explosionParticles = [];
let confettiParticles = [];
let boostPads = [];
let skidMarks = [];
let mouseX = 0, mouseY = 0;
let currentCamX = 0, currentCamY = 0, currentRotation = 0;

let player1, player1_teammate, player2, player2_teammate, allCars, ball;
let introPhase = 1; // 1: Logo, 2: Legal, 3: Menu
let replaySystem = new ReplaySystem();

// Registro global de animaciones miniatura activas para boost y explosiones
let activeMiniPreviews = [];
let miniPreviewAnimationId = null;

function animateMiniPreviews() {
    activeMiniPreviews.forEach(item => {
        const { canvas, ctx, type, particles, color } = item;
        
        // Comprobar que el canvas siga visible en el DOM
        if (!canvas.offsetParent) return; 

        // Limpiar lienzo con fondo semi-transparente
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Generar partículas continuamente si hay pocas
        if (particles.length < 7) {
            if (type === 'boost') {
                // Flujo horizontal (de izquierda a derecha)
                particles.push({
                    x: 10,
                    y: canvas.height / 2 + (Math.random() - 0.5) * 12,
                    vx: Math.random() * 1.5 + 1.2,
                    vy: (Math.random() - 0.5) * 0.6,
                    size: Math.random() * 3 + 2,
                    alpha: 1,
                    decay: Math.random() * 0.035 + 0.02
                });
            } else {
                // Explosiones radiales desde el centro
                if (particles.length === 0 || Math.random() < 0.25) {
                    const count = Math.random() * 3 + 2;
                    for (let i = 0; i < count; i++) {
                        const angle = Math.random() * Math.PI * 2;
                        const speed = Math.random() * 1.2 + 0.4;
                        particles.push({
                            x: canvas.width / 2,
                            y: canvas.height / 2,
                            vx: Math.cos(angle) * speed,
                            vy: Math.sin(angle) * speed,
                            size: Math.random() * 3.5 + 2.5,
                            alpha: 1,
                            decay: Math.random() * 0.045 + 0.02
                        });
                    }
                }
            }
        }

        // Actualizar y dibujar partículas
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;
            p.size *= 0.96;

            if (p.alpha <= 0 || p.size <= 0.5) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            
            let drawColor = color;
            if (color === 'multi') {
                const hues = [0, 60, 120, 180, 240, 300];
                const index = Math.floor((Date.now() / 120) + p.x) % hues.length;
                drawColor = `hsl(${hues[index]}, 100%, 60%)`;
            }
            ctx.fillStyle = drawColor;
            ctx.shadowBlur = p.size * 1.5;
            ctx.shadowColor = drawColor;
            ctx.fill();
            ctx.restore();
        }
    });

    miniPreviewAnimationId = requestAnimationFrame(animateMiniPreviews);
}

function renderExplosionSelection() {
    const list = document.getElementById('custom-explosion-list');
    if (!list) return;
    list.innerHTML = '';

    // Filtrar previsualizaciones anteriores de explosiones
    activeMiniPreviews = activeMiniPreviews.filter(p => p.type !== 'explosion');

    Object.keys(EXPLOSION_DEFS).forEach(key => {
        const def = EXPLOSION_DEFS[key];
        const item = document.createElement('div');
        const requiredLevel = getExplosionUnlockLevel(key);
        const isLocked = (USER_CONFIG.stats.level || 1) < requiredLevel;

        item.className = 'selectable-item' + (USER_CONFIG.playerExplosion === key ? ' selected' : '');
        item.tabIndex = 0;
        item.style.flexDirection = 'column';

        if (isLocked) {
            item.classList.add('locked-item');
            item.innerHTML = `
                <div style="width: 100%; height: 58%; background: #111; display: flex; align-items: center; justify-content: center; margin-bottom: 0.3em; position: relative;">
                    <span style="font-size: 2em; filter: grayscale(1); opacity: 0.3;">${def.icon || '💥'}</span>
                    <div class="lock-icon" style="position: absolute; font-size: 0.8em; font-weight: bold; color: #ff3333;">🔒 Lvl ${requiredLevel}</div>
                </div>
                <div style="font-size: 0.85em; color: #888; font-family: 'Share Tech Mono', monospace; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 0.2em;">${def.name}</div>
            `;
            item.onclick = () => {
                showInGameNotification(`ESTE EFECTO DE GOL SE DESBLOQUEA AL NIVEL ${requiredLevel}`, "#f33", "🚫");
                playSound('menu_error');
            };
        } else {
            item.innerHTML = `
                <canvas class="mini-particle-canvas" style="width: 100%; height: 58%; background: #000000; margin-bottom: 0.3em;"></canvas>
                <div style="font-size: 0.85em; color: #fff; font-family: 'Share Tech Mono', monospace; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 0.2em;">${def.name}</div>
            `;
            item.onclick = () => {
                USER_CONFIG.playerExplosion = key;
                const tag = document.getElementById('explosion-name-tag');
                if (tag) {
                    tag.innerText = def.name;
                    tag.style.color = '#fff';
                }
                saveUserConfig();
                renderExplosionSelection();
                playSound('menu_click');
                explosionPreviewManager.trigger();
            };
        }

        list.appendChild(item);

        if (USER_CONFIG.playerExplosion === key) {
            setTimeout(() => {
                item.focus();
            }, 10);
        }

        // Inicializar canvas miniatura si no está bloqueado
        if (!isLocked) {
            const canvas = item.querySelector('.mini-particle-canvas');
            if (canvas) {
                canvas.width = 100;
                canvas.height = 58;
                const ctx = canvas.getContext('2d');
                activeMiniPreviews.push({
                    canvas: canvas,
                    ctx: ctx,
                    type: 'explosion',
                    effectKey: key,
                    particles: [],
                    color: def.color
                });
            }
        }
    });

    // Iniciar bucle de animación si no está corriendo
    if (!miniPreviewAnimationId && activeMiniPreviews.length > 0) {
        animateMiniPreviews();
    }
}

const explosionPreviewManager = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,
    lastTime: 0,

    init() {
        this.canvas = document.getElementById('canvas-explosion-preview');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.start();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    },

    trigger() {
        this.particles = [];
        const def = EXPLOSION_DEFS[USER_CONFIG.playerExplosion] || EXPLOSION_DEFS.classic;
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;

        for (let i = 0; i < def.count; i++) {
            let color = def.color;
            if (color === 'multi') {
                const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff'];
                color = colors[Math.floor(Math.random() * colors.length)];
            }

            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;

            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0,
                size: Math.random() * 6 + 2,
                color: color,
                type: def.particles,
                duration: def.duration
            });
        }
    },

    start() {
        if (this.animationId) return;
        const loop = (time) => {
            this.update(time);
            this.draw();
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    },

    update(time) {
        const dt = time - this.lastTime;
        this.lastTime = time;

        // Auto-loop: Si no hay partículas, disparar de nuevo
        if (this.particles.length === 0) {
            this.trigger();
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.98;
            p.vy *= 0.98;
            p.life -= (1000 / p.duration / 60);
            p.size *= 0.99;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;

            if (p.type === 'squares' || p.type === 'big_pixels') {
                ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            } else if (p.type === 'shards') {
                ctx.beginPath();
                ctx.moveTo(p.x, p.y - p.size);
                ctx.lineTo(p.x + p.size, p.y + p.size);
                ctx.lineTo(p.x - p.size, p.y + p.size);
                ctx.closePath();
                ctx.fill();
            } else if (p.type === 'sakura') {
                ctx.beginPath();
                ctx.ellipse(p.x, p.y, p.size, p.size * 0.55, Math.PI / 4, 0, Math.PI * 2);
                ctx.fill();
            } else if (p.type === 'bubbles') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            } else {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();
    }
};

function renderBoostSelection() {
    const list = document.getElementById('custom-boost-list');
    if (!list) return;
    list.innerHTML = '';

    // Filtrar previsualizaciones anteriores de boost
    activeMiniPreviews = activeMiniPreviews.filter(p => p.type !== 'boost');

    Object.keys(BOOST_DEFS).forEach(key => {
        const def = BOOST_DEFS[key];
        const item = document.createElement('div');
        const requiredLevel = getBoostUnlockLevel(key);
        const isLocked = (USER_CONFIG.stats.level || 1) < requiredLevel;

        item.className = 'selectable-item' + (USER_CONFIG.playerBoost === key ? ' selected' : '');
        item.tabIndex = 0;
        item.style.flexDirection = 'column';

        if (isLocked) {
            item.classList.add('locked-item');
            item.innerHTML = `
                <div style="width: 100%; height: 58%; background: #111; display: flex; align-items: center; justify-content: center; margin-bottom: 0.3em; position: relative;">
                    <span style="font-size: 2em; filter: grayscale(1); opacity: 0.3;">${def.icon || '💨'}</span>
                    <div class="lock-icon" style="position: absolute; font-size: 0.8em; font-weight: bold; color: #ff3333;">🔒 Lvl ${requiredLevel}</div>
                </div>
                <div style="font-size: 0.85em; color: #888; font-family: 'Share Tech Mono', monospace; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 0.2em;">${def.name}</div>
            `;
            item.onclick = () => {
                showInGameNotification(`ESTE PROPULSOR SE DESBLOQUEA AL NIVEL ${requiredLevel}`, "#f33", "🚫");
                playSound('menu_error');
            };
        } else {
            item.innerHTML = `
                <canvas class="mini-particle-canvas" style="width: 100%; height: 58%; background: #000000; margin-bottom: 0.3em;"></canvas>
                <div style="font-size: 0.85em; color: #fff; font-family: 'Share Tech Mono', monospace; font-weight: bold; text-align: center; text-transform: uppercase; margin-bottom: 0.2em;">${def.name}</div>
            `;
            item.onclick = () => {
                USER_CONFIG.playerBoost = key;
                updateBoostPreviewInfo(key);
                saveUserConfig();
                renderBoostSelection();
                playSound('menu_click');
            };
        }

        list.appendChild(item);

        if (USER_CONFIG.playerBoost === key) {
            setTimeout(() => {
                item.focus();
            }, 10);
        }

        // Inicializar canvas miniatura si no está bloqueado
        if (!isLocked) {
            const canvas = item.querySelector('.mini-particle-canvas');
            if (canvas) {
                canvas.width = 100;
                canvas.height = 58;
                const ctx = canvas.getContext('2d');
                activeMiniPreviews.push({
                    canvas: canvas,
                    ctx: ctx,
                    type: 'boost',
                    effectKey: key,
                    particles: [],
                    color: def.color
                });
            }
        }
    });

    // Iniciar bucle de animación si no está corriendo
    if (!miniPreviewAnimationId && activeMiniPreviews.length > 0) {
        animateMiniPreviews();
    }
}

function updateBoostPreviewInfo(key) {
    const def = BOOST_DEFS[key];
    const nameTag = document.getElementById('boost-name-tag');
    const descBox = document.querySelector('.boost-description');
    if (nameTag) {
        nameTag.innerText = def.name;
        nameTag.style.color = '#fff';
        nameTag.style.borderColor = '#fff';
    }
    if (descBox) {
        const descriptions = {
            'classic': 'Propulsión mediante combustión de nitrógeno estándar.',
            'fire': 'Llamaradas de alta temperatura que incineran el asfalto.',
            'neon': 'Rastro de partículas de neón con estética ochentera.',
            'plasma': 'Energía ionizada de alta intensidad purpura.',
            'toxic': 'Emisión de gases radioactivos altamente corrosivos.',
            'glitch': 'Distorsión de la realidad en fragmentos digitales.',
            'gold': 'Lluvia de partículas de oro puro fundido.',
            'ice': 'Congelación instantánea del aire circundante.',
            'void': 'Consumo total de luz en una estela de oscuridad.',
            'rainbow': 'Espectro completo de luz refractada en movimiento.',
            'cyber': 'Filamentos de datos de alta velocidad en red.',
            'nature': 'Rastro de hojas y esencia botánica regenerativa.',
            'bubble': 'Torrente continuo de burbujas jabonosas e iridiscentes.',
            'matrix': 'Cascada de código binario verde fluyendo a través del espacio.',
            'lava': 'Flujo denso de magma ardiente y brasas volcánicas incandescentes.',
            'cosmic': 'Estela de polvo estelar y nebulosas magentas cósmicas.'
        };
        descBox.innerText = descriptions[key] || 'Efecto de propulsión avanzado.';
    }
}

const boostPreviewManager = {
    canvas: null,
    ctx: null,
    particles: [],
    animationId: null,
    lastTime: 0,
    carImg: new Image(),

    init() {
        this.canvas = document.getElementById('canvas-boost-preview');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        this.start();
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = this.canvas.offsetWidth;
        this.canvas.height = this.canvas.offsetHeight;
    },

    start() {
        if (this.animationId) return;
        const loop = (time) => {
            this.update(time);
            this.draw();
            this.animationId = requestAnimationFrame(loop);
        };
        this.animationId = requestAnimationFrame(loop);
    },

    update(time) {
        if (!this.canvas || this.canvas.width === 0) return;
        const dt = time - this.lastTime;
        this.lastTime = time;

        const boost = BOOST_DEFS[USER_CONFIG.playerBoost] || BOOST_DEFS.classic;

        // Generar partículas desde la parte trasera del coche (centrado)
        if (Math.random() < 0.3 * boost.density) {
            this.particles.push(this.createParticle(boost));
        }

        // Actualizar partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x -= p.vx;
            p.y += p.vy;
            p.life -= 0.015 * boost.speed;
            p.size *= 0.985;
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    },

    createParticle(boost) {
        const canvasMidY = this.canvas.height / 2;
        const canvasMidX = this.canvas.width * 0.7;

        let color = boost.color;
        if (color === 'multi') {
            const hues = [0, 60, 120, 180, 240, 300];
            color = `hsl(${hues[Math.floor(Math.random() * hues.length)]}, 100%, 50%)`;
        }

        return {
            x: canvasMidX - 20,
            y: canvasMidY + (Math.random() - 0.5) * 10,
            vx: Math.random() * 5 + 2,
            vy: (Math.random() - 0.5) * 2,
            life: 1.0,
            size: Math.random() * 5 + 3,
            color: color,
            secondary: boost.secondary,
            type: boost.particles
        };
    },

    draw() {
        if (!this.ctx) return;
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        ctx.save();
        this.particles.forEach(p => {
            ctx.globalAlpha = p.life;
            ctx.shadowBlur = 15;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;

            if (p.type === 'squares' || p.type === 'glitch') {
                ctx.fillRect(p.x, p.y, p.size, p.size);
            } else if (p.type === 'lines' || p.type === 'cyber') {
                ctx.lineWidth = 2;
                ctx.strokeStyle = p.color;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x + p.size * 4, p.y);
                ctx.stroke();
            } else if (p.type === 'bubbles' || p.type === 'toxic' || p.type === 'bubbles') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.stroke(); // Solo borde para burbujas
            } else if (p.type === 'sparkles' || p.type === 'gold' || p.type === 'cosmic') {
                const s = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y - s);
                ctx.lineTo(p.x + s / 2, p.y);
                ctx.lineTo(p.x, p.y + s);
                ctx.lineTo(p.x - s / 2, p.y);
                ctx.closePath();
                ctx.fill();
            } else if (p.type === 'binary') {
                ctx.font = `bold ${Math.floor(p.size * 1.6 + 5)}px monospace`;
                ctx.fillText(Math.random() < 0.5 ? '0' : '1', p.x, p.y);
            } else {
                // Default: Círculos suaves (fuego, humo, etc.)
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        const resolvedCarSrc = getAssetPath(USER_CONFIG.playerCar);
        if (!this.carImg.src.includes(resolvedCarSrc)) {
            this.carImg.src = resolvedCarSrc;
        }

        ctx.save();
        const carSize = 80;
        const posX = this.canvas.width * 0.7;
        const posY = this.canvas.height / 2;
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.filter = `hue-rotate(${USER_CONFIG.playerCarHue}deg) saturate(${USER_CONFIG.playerCarSaturate}%)`;
        ctx.translate(posX, posY);
        ctx.rotate(Math.PI / 2); // Rotar 90 grados

        // Calcular altura proporcional para mantener aspect ratio
        const aspect = this.carImg.width / this.carImg.height;
        const h = carSize / aspect;

        ctx.drawImage(this.carImg, -carSize / 2, -h / 2, carSize, h);
        ctx.restore();
    }
};

window.addEventListener('resize', () => {
    boostPreviewManager.resize();
    explosionPreviewManager.resize();
});

async function init() {
    if (window.SCAPS_ENGINE_LOADED) return;
    window.SCAPS_ENGINE_LOADED = true;
    
    console.log("SCAPS: Inicializando motor...");
    // Cargar mapa PRINCIPAL por defecto al inicio
    try {
        const defaultMapResp = await fetch('maps/URBAN.json?t=' + Date.now());
        if (defaultMapResp.ok) {
            const defaultMapData = await defaultMapResp.json();
            applyMapConfig(defaultMapData);
            console.log("Mapa PRINCIPAL cargado al inicio");
        }
    } catch (e) { console.warn("Error cargando mapa inicial:", e); }

    try {
        canvas = document.getElementById('gameCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        countdownEl = getEl('countdown-overlay');
        goalTextEl = getEl('goal-text-overlay');
        cameraModeEl = getEl('camera-mode-overlay');
        scoreboardEl = getEl('scoreboard-overlay');
        mainMenuEl = getEl('main-menu');
        btnPlay = getEl('btn-play');
        btnSettings = getEl('btn-settings');
        btnCredits = getEl('btn-credits');
        btnCustom = getEl('btn-custom');
        menuInitial = getEl('menu-initial');
        menuCredits = getEl('menu-credits');

        // Listener Modal Alerta
        const btnModalOk = document.getElementById('btn-modal-alert-ok');
        if (btnModalOk) {
            btnModalOk.onclick = () => {
                const overlay = document.getElementById('modal-alert-overlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                    setTimeout(() => overlay.style.display = 'none', 300);
                    playSound('menu_click');
                }
            };
        }
        menuCustom = getEl('menu-custom');
        menuSettings = getEl('menu-settings');
        setupOverlay = getEl('match-setup-overlay');
        btnStartGame = getEl('setup-btn-play');
        btnExitSetup = getEl('setup-btn-exit');
        mapListContainer = getEl('setup-map-list');
        gameOverOverlay = getEl('game-over-overlay');
        gameOverWinner = getEl('game-over-winner');
        finalScoreBlue = getEl('final-score-blue');
        finalScoreOrange = getEl('final-score-orange');

        // IMPORTANTE: Pasar callbacks correctos
        setupInput(keysPressed, toggleCamera, toggleScoreboard);

        // Iniciar Editor de Físicas
        initPhysicsEditor((isOpening) => {
            if (isOpening) {
                if (gameState === 'playing' || gameState === 'countdown' || gameState === 'goalScored' || gameState === 'gameOver' || gameState === 'panning' || gameState === 'zooming') {
                    isPaused = true;
                    return true;
                }
                return false;
            } else {
                isPaused = false;
                lastTime = performance.now();
                return true;
            }
        });

        // Crear entidades usando posiciones del mapa (se cargarán de verdad en resetAfterGoal)
        player1 = new Car(0, 0, '#5ad', { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', drift: 'KeyE', jump: 'Space', isPlayer: true }, "JUGADOR 1", 'recursos/cars/car1.png');
        player1.isPlayer = true;
        player1_teammate = new Car(0, 0, '#5ad', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift', jump: 'jump' }, "BOT Chiclanaman", 'recursos/cars/car2.png');
        player2 = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift', jump: 'jump' }, "BOT Aitawer", 'recursos/cars/car3.png');
        player2_teammate = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift', jump: 'jump' }, "BOT Croquetas", 'recursos/cars/car4.png');

        // Inicializar objetos de teclas para los bots y asignar roles
        player1_teammate.aiState = { role: 'defender', targetBoostPad: null };
        player2.aiState = { role: 'attacker', targetBoostPad: null };
        player2_teammate.aiState = { role: 'support', targetBoostPad: null };

        [player1_teammate, player2, player2_teammate].forEach(bot => { bot.aiKeys = {}; });
        allCars = [player1, player1_teammate, player2, player2_teammate];
        ball = new Ball(CONST.CONFIG.WORLD_W / 2, CONST.CONFIG.WORLD_H / 2, 'recursos/balls/ball_1.png');

        grassDetails = createGrassDetails(1500);
        setupBoostPads();

        setupCustomizationMenu();
        loadUserConfig();
        setupDraggableBanner();

        // Inicializar Previsualizaciones
        boostPreviewManager.init();
        updateBoostPreviewInfo(USER_CONFIG.playerBoost);
        explosionPreviewManager.init();

        // Listeners de botones con salvaguardas
        if (btnPlay) btnPlay.onclick = () => { initAudio(player1, allCars); startGame(); };
        if (btnCustom) btnCustom.onclick = () => { showMenuScreen('custom'); };
        if (btnSettings) btnSettings.onclick = () => showMenuScreen('settings');
        if (btnCredits) btnCredits.onclick = () => showMenuScreen('credits');

        const btnMapEditor = getEl('btn-map-editor');
        const editorOverlay = getEl('editor-confirm-overlay');
        const btnEditorConfirm = getEl('btn-editor-confirm');
        const btnEditorCancel = getEl('btn-editor-cancel');

        if (btnMapEditor && editorOverlay) {
            btnMapEditor.onmouseover = () => playSound('menu_hover');
            btnMapEditor.onclick = () => {
                editorOverlay.style.display = 'flex';
                playSound('menu_click');
            };
        }

        if (btnEditorConfirm) {
            btnEditorConfirm.onclick = () => {
                window.open('editor.html', '_blank');
                if (editorOverlay) editorOverlay.style.display = 'none';
                playSound('menu_click');
            };
        }

        if (btnEditorCancel) {
            btnEditorCancel.onclick = () => {
                if (editorOverlay) editorOverlay.style.display = 'none';
                playSound('menu_click');
            };
        }

        // Sliders de Volumen
        const sliderMusic = getEl('slider-settings-vol');
        const volLabel = getEl('settings-vol-label');
        if (sliderMusic) {
            sliderMusic.value = USER_CONFIG.musicVolume;
            if (volLabel) volLabel.innerText = sliderMusic.value + '%';
            sliderMusic.oninput = (e) => {
                const vol = parseInt(e.target.value);
                if (volLabel) volLabel.innerText = vol + '%';
                setMusicVolume(vol / 100);
                USER_CONFIG.musicVolume = vol;
                settingsChanged = true;
            };
        }

        const sliderSFX = getEl('slider-settings-sfx');
        const sfxLabel = getEl('settings-sfx-label');
        if (sliderSFX) {
            sliderSFX.value = USER_CONFIG.sfxVolume;
            if (sfxLabel) sfxLabel.innerText = sliderSFX.value + '%';
            sliderSFX.oninput = (e) => {
                const vol = parseInt(e.target.value);
                if (sfxLabel) sfxLabel.innerText = vol + '%';
                setSFXVolume(vol / 100);
                USER_CONFIG.sfxVolume = vol;
                settingsChanged = true;
            };
        }

        // Botón Aceptar en Ajustes
        const btnSettingsApply = getEl('btn-settings-apply');
        if (btnSettingsApply) {
            btnSettingsApply.onclick = () => {
                saveUserConfig();
                settingsChanged = false;
                showMenuScreen('initial');
                playSound('menu_click');
            };
        }

        // Modal Descartar Cambios
        const btnDiscardConfirm = getEl('btn-settings-discard-confirm');
        const btnDiscardCancel = getEl('btn-settings-discard-cancel');
        const discardOverlay = getEl('settings-discard-overlay');

        if (btnDiscardConfirm) {
            btnDiscardConfirm.onclick = () => {
                loadUserConfig(); // Recargar de localStorage
                settingsChanged = false;
                if (discardOverlay) discardOverlay.style.display = 'none';
                showMenuScreen('initial');
                playSound('menu_click');
            };
        }

        if (btnDiscardCancel) {
            btnDiscardCancel.onclick = () => {
                if (discardOverlay) discardOverlay.style.display = 'none';
                playSound('menu_click');
            };
        }


        // Menú de Pausa
        const btnPauseContinue = getEl('btn-pause-continue');
        const btnPauseExit = getEl('btn-pause-exit');
        if (btnPauseContinue) btnPauseContinue.onclick = () => togglePause();
        if (btnPauseExit) btnPauseExit.onclick = () => {
            isPaused = false;
            const pm = getEl('pause-menu');
            if (pm) pm.style.display = 'none';
            gameState = 'menu';
            showMenuScreen('initial');
            if (mainMenuEl) {
                mainMenuEl.classList.remove('hidden');
                mainMenuEl.style.display = 'flex';
            }
            stopAllMotors();
            playSound('menu_click');
        };

        const btnSettingsBack = getEl('btn-settings-back');
        if (btnSettingsBack) {
            btnSettingsBack.onclick = () => {
                if (settingsChanged) {
                    const discardOverlay = getEl('settings-discard-overlay');
                    if (discardOverlay) discardOverlay.style.display = 'flex';
                } else {
                    showMenuScreen('initial');
                }
                playSound('menu_click');
            };
        }

        ['btn-custom-back', 'btn-credits-back'].forEach(id => {
            const el = getEl(id); if (el) el.onclick = () => showMenuScreen('initial');
        });

        // Lógica de Salir
        const btnExit = getEl('btn-exit');
        const exitOverlay = getEl('exit-confirm-overlay');
        const btnExitConfirm = getEl('btn-exit-confirm');
        const btnExitCancel = getEl('btn-exit-cancel');

        if (btnExit) btnExit.onclick = () => {
            if (exitOverlay) exitOverlay.style.display = 'flex';
            playSound('menu_click');
        };

        if (btnExitCancel) btnExitCancel.onclick = () => {
            if (exitOverlay) exitOverlay.style.display = 'none';
            playSound('menu_click');
        };

        if (btnExitConfirm) btnExitConfirm.onclick = () => {
            playSound('menu_click');
            window.location.reload();
        };

        // Listeners del selector
        if (btnStartGame) {
            btnStartGame.onclick = () => {
                if (btnStartGame.disabled) return;
                playSound('menu_click');
                score = { blue: 0, orange: 0 };
                gameTime = 60;
                replaySystem.reset();
                finalizeStartGame();
            };
            validateMatchSetup();
        }

        const btnCustomBack = getEl('btn-custom-back');
        if (btnCustomBack) btnCustomBack.onclick = () => {
            const inputName = getEl('input-player-name');
            if (inputName && player1) player1.name = inputName.value.toUpperCase();
            showMenuScreen('initial');
            playSound('menu_click');
        };

        const btnRematch = getEl('btn-gameover-rematch');
        const btnModeSelect = getEl('btn-gameover-mode');
        const btnExitGameOver = getEl('btn-gameover-exit');

        if (btnRematch) btnRematch.onclick = () => {
            if (gameOverOverlay) gameOverOverlay.style.display = 'none';
            score = { blue: 0, orange: 0 };
            gameTime = 60;
            replaySystem.reset();
            finalizeStartGame();
            playSound('menu_click');
        };

        if (btnModeSelect) btnModeSelect.onclick = () => {
            if (gameOverOverlay) gameOverOverlay.style.display = 'none';
            startGame();
            playSound('menu_click');
        };

        if (btnExitGameOver) btnExitGameOver.onclick = () => {
            if (gameOverOverlay) gameOverOverlay.style.display = 'none';
            gameState = 'menu';
            showMenuScreen('initial');
            if (mainMenuEl) {
                mainMenuEl.classList.remove('hidden');
                mainMenuEl.style.display = 'flex';
                const videoBg = document.getElementById('menu-video-bg');
                if (videoBg) videoBg.style.opacity = '1';
            }
            stopAllMotors();
            playSound('menu_click');
        };

        // Listeners Paginación Coches
        const btnP1Prev = getEl('btn-car-p1-prev');
        const btnP1Next = getEl('btn-car-p1-next');
        const btnP2Prev = getEl('btn-car-p2-prev');
        const btnP2Next = getEl('btn-car-p2-next');

        if (btnP1Prev) btnP1Prev.onclick = () => { if (currentCarPageP1 > 1) { currentCarPageP1--; renderCarSelection(); playSound('menu_click'); } };
        if (btnP1Next) btnP1Next.onclick = () => { if (currentCarPageP1 < 2) { currentCarPageP1++; renderCarSelection(); playSound('menu_click'); } };
        if (btnP2Prev) btnP2Prev.onclick = () => { if (currentCarPageP2 > 1) { currentCarPageP2--; renderCarSelection(); playSound('menu_click'); } };
        if (btnP2Next) btnP2Next.onclick = () => { if (currentCarPageP2 < 2) { currentCarPageP2++; renderCarSelection(); playSound('menu_click'); } };

        const btnMapConfirm = getEl('setup-map-confirm');
        if (btnMapConfirm) btnMapConfirm.onclick = () => finalizeStartGame();

        const btnMapPrev = getEl('btn-map-prev');
        const btnMapNext = getEl('btn-map-next');
        if (btnMapPrev) btnMapPrev.onclick = () => { if (currentMapPage > 1) { changeMap(currentMapPage - 1); playSound('menu_click'); } };
        if (btnMapNext) btnMapNext.onclick = () => { changeMap(currentMapPage + 1); playSound('menu_click'); };

        if (btnExitSetup) btnExitSetup.onclick = () => {
            setupOverlay.style.display = 'none';
            setupOverlay.classList.add('hidden');
            showMenuScreen('initial');
        };

        let lastModeClickTime = 0;
        document.querySelectorAll('.mode-option').forEach(btn => {
            btn.onclick = () => {
                const now = Date.now();
                if (now - lastModeClickTime < 300) {
                    console.log("Ignorando click duplicado por antirebote 3D.");
                    return;
                }
                lastModeClickTime = now;

                if (btn.classList.contains('locked')) {
                    showInGameNotification("ACCESO DENEGADO: MODO EN DESARROLLO", "#f33", "🚫");
                    playSound('menu_error');
                    return;
                }
                
                const isAlreadySelected = btn.classList.contains('selected');
                
                // Limpiar selección de todos
                document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('selected'));
                
                if (isAlreadySelected) {
                    // Deseleccionar
                    selectedMode = null;
                    playSound('menu_click');
                    console.log("Modo deseleccionado.");
                } else {
                    // Seleccionar
                    btn.classList.add('selected');
                    selectedMode = btn.dataset.mode;
                    playSound('menu_click');
                    console.log("Modo seleccionado:", selectedMode);
                }
                
                validateMatchSetup();
            };
        });

        if (introPhase === 3 && mainMenuEl) {
            mainMenuEl.classList.remove('hidden');
            mainMenuEl.style.display = 'flex';
            showMenuScreen('initial');
        }

        window.addEventListener('keydown', (e) => {
            // --- Lógica Específica para NOTAS DE DESARROLLO ---
            const creditsPanel = getEl('menu-credits');
            if (creditsPanel && creditsPanel.style.display === 'flex') {
                const scrollContainer = getEl('credits-scroll-container');
                if (scrollContainer) {
                    if (e.code === 'ArrowUp') { scrollContainer.scrollTop -= 40; e.preventDefault(); return; }
                    if (e.code === 'ArrowDown') { scrollContainer.scrollTop += 40; e.preventDefault(); return; }
                }
                // Solo permitimos Escape (Botón B) para salir
                if (e.code === 'Escape') {
                    const btn = getEl('btn-credits-back');
                    if (btn) btn.click();
                    e.preventDefault();
                }
                // Bloqueamos TODO lo demás mientras los créditos están abiertos
                return;
            }

            // --- Lógica Específica para CONFIRMACIÓN SALIDA ---
            const exitOverlay = getEl('exit-confirm-overlay');
            if (exitOverlay && exitOverlay.style.display === 'flex') {
                if (e.code === 'Enter') {
                    const btn = getEl('btn-exit-confirm');
                    if (btn) btn.click();
                    e.preventDefault();
                }
                if (e.code === 'Escape') {
                    const btn = getEl('btn-exit-cancel');
                    if (btn) btn.click();
                    e.preventDefault();
                }
                return;
            }

            // --- Lógica Específica para CONFIRMACIÓN EDITOR ---
            const editorOverlay = getEl('editor-confirm-overlay');
            if (editorOverlay && editorOverlay.style.display === 'flex') {
                if (e.code === 'Enter') {
                    const btn = getEl('btn-editor-confirm');
                    if (btn) btn.click();
                    e.preventDefault();
                }
                if (e.code === 'Escape') {
                    const btn = getEl('btn-editor-cancel');
                    if (btn) btn.click();
                    e.preventDefault();
                }
                return;
            }

            // --- Lógica PRIORITARIA para SELECTOR DE MAPA Y MODO ---
            const setupOverlay = document.getElementById('match-setup-overlay');
            if (setupOverlay && setupOverlay.style.display === 'flex' && !setupOverlay.classList.contains('hidden')) {
                // Cruceta: Navegación EXCLUSIVA de MODOS (Grid manual)
                if (e.code.startsWith('Arrow')) {
                    e.preventDefault();
                    const modes = Array.from(setupOverlay.querySelectorAll('.mode-option'));
                    let idx = modes.indexOf(document.activeElement);
                    if (idx === -1) {
                        if (modes[0]) modes[0].focus();
                    } else {
                        let nextIdx = idx;
                        // Fila 1: 0, 1, 2 | Fila 2: 3, 4, 5, 6
                        if (e.code === 'ArrowRight') nextIdx = (idx + 1) % modes.length;
                        if (e.code === 'ArrowLeft') nextIdx = (idx - 1 + modes.length) % modes.length;
                        if (e.code === 'ArrowDown') {
                            if (idx <= 2) nextIdx = Math.min(idx + 3, modes.length - 1);
                            else nextIdx = idx; // Se queda en la fila de abajo
                        }
                        if (e.code === 'ArrowUp') {
                            if (idx >= 3) nextIdx = Math.max(idx - 3, 0);
                            else nextIdx = idx; // Se queda en la fila de arriba
                        }
                        if (modes[nextIdx]) {
                            modes[nextIdx].focus();
                            // ELIMINADA AUTO-SELECCIÓN: Solo navegamos visualmente
                            // La selección verde (selectedMode) persiste hasta que se elija otro modo válido
                        }
                    }
                    return; // Bloqueo total para que no pase a la lógica de menús global
                }

                // A (Enter) en el Selector de Modos
                if (e.code === 'Enter') {
                    const focused = document.activeElement;
                    if (focused && focused.classList.contains('mode-option')) {
                        focused.click();
                        e.preventDefault();
                        return;
                    }
                }

                // LT (Q) y RT (E) para cambiar mapas (Con transiciones 3D fluidas)
                if (e.code === 'KeyQ') {
                    changeMap(currentMapPage - 1);
                    playSound('menu_click');
                    e.preventDefault();
                    return;
                }
                if (e.code === 'KeyE') {
                    changeMap(currentMapPage + 1);
                    playSound('menu_click');
                    e.preventDefault();
                    return;
                }
                // START (Space) para Jugar (si está habilitado)
                if (e.code === 'Space') {
                    const btnPlay = document.getElementById('setup-btn-play');
                    if (btnPlay && !btnPlay.disabled) {
                        btnPlay.click();
                        e.preventDefault();
                    }
                    return;
                }
                // B (Escape) para Volver
                if (e.code === 'Escape') {
                    const btnExit = document.getElementById('setup-btn-exit');
                    if (btnExit) btnExit.click();
                    e.preventDefault();
                    return;
                }
            }

            // --- LÓGICA PARA ESCENA DE PERSONALIZACIÓN ---
            if (gameState === 'customization') {
                const discardOverlay = document.getElementById('custom-discard-overlay');
                if (discardOverlay && discardOverlay.style.display === 'flex') {
                    if (e.code === 'Enter') {
                        const btnConfirm = document.getElementById('btn-custom-discard-confirm');
                        if (btnConfirm) btnConfirm.click();
                        e.preventDefault();
                    }
                    if (e.code === 'Escape') {
                        const btnCancel = document.getElementById('btn-custom-discard-cancel');
                        if (btnCancel) btnCancel.click();
                        e.preventDefault();
                    }
                    return;
                }

                // Obtener todos los conntroles enfocables dinámicamente
                let focusables = [];
                if (window.activeColorPopup) {
                    focusables = Array.from(window.activeColorPopup.querySelectorAll('.custom-color-swatch'));
                } else {
                    const activePane = document.querySelector('.custom-pane.active');
                    if (activePane) {
                        focusables = Array.from(activePane.querySelectorAll(
                            'button:not([disabled]):not(.custom-tab-btn), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
                        )).filter(el => {
                            // Excluir elementos ocultos o de tamaño cero (como subpestañas inactivas)
                            const rect = el.getBoundingClientRect();
                            if (rect.width === 0 || rect.height === 0) return false;

                            // Excluir inputs de color nativos ocultos
                            if (el.tagName === 'INPUT' && el.type === 'color') return false;
                            
                            // Excluir items de dropdown cerrado
                            const dropdownContent = el.closest('.custom-dropdown-content');
                            if (dropdownContent && dropdownContent.style.display !== 'block') {
                                return false;
                            }
                            return true;
                        });
                    }
                }

                if (window.customizationActiveMenuMode) {
                    // Manejo especial para desplegables (SELECT) con mando
                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'SELECT') {
                        if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
                            const dir = (e.code === 'ArrowRight') ? 1 : -1;
                            const nextIdx = (activeEl.selectedIndex + dir + activeEl.options.length) % activeEl.options.length;
                            activeEl.selectedIndex = nextIdx;
                            activeEl.dispatchEvent(new Event('change', { bubbles: true }));
                            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            playSound('menu_click');
                            e.preventDefault();
                            return;
                        }
                        if (e.code === 'Enter') {
                            const nextIdx = (activeEl.selectedIndex + 1) % activeEl.options.length;
                            activeEl.selectedIndex = nextIdx;
                            activeEl.dispatchEvent(new Event('change', { bubbles: true }));
                            activeEl.dispatchEvent(new Event('input', { bubbles: true }));
                            playSound('menu_click');
                            e.preventDefault();
                            return;
                        }
                    }

                    // --- MODO NAVEGACIÓN LIBRE POR EL PANEL ACTIVO ---
                    if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'ArrowUp' || e.code === 'ArrowLeft') {
                        if (focusables.length > 0) {
                            const nextTarget = getSpatialNavigationTarget(e.code, focusables);
                            if (nextTarget) {
                                nextTarget.focus();
                                playSound('menu_hover');
                            }
                        }
                        e.preventDefault();
                        return;
                    }
                    if (e.code === 'Enter') {
                        const activeEl = document.activeElement;
                        if (activeEl && (focusables.includes(activeEl) || activeEl.classList.contains('custom-color-swatch'))) {
                            activeEl.click();
                            playSound('menu_click');
                            e.preventDefault();
                        }
                        return;
                    }
                    if (e.code === 'Escape') {
                        // 1. Cerrar popup de color si está abierto
                        if (window.activeColorPopup) {
                            closeActiveColorPopup();
                            e.preventDefault();
                            return;
                        }
                        // 2. Cerrar dropdown (título, relleno, patrón) si está abierto
                        const openDropdown = Array.from(document.querySelectorAll('.custom-dropdown-content')).find(c => c.style.display === 'block');
                        if (openDropdown) {
                            openDropdown.style.display = 'none';
                            const dropdownContainer = openDropdown.closest('.custom-dropdown');
                            if (dropdownContainer) {
                                const dropdownBtn = dropdownContainer.querySelector('.custom-dropdown-btn');
                                if (dropdownBtn) dropdownBtn.focus();
                            }
                            playSound('menu_click');
                            e.preventDefault();
                            return;
                        }
                        // 3. Descartar cambios (abrir modal de confirmación)
                        if (typeof window.tryDiscardCustomization === 'function') {
                            window.tryDiscardCustomization();
                        }
                        e.preventDefault();
                        return;
                    }
                }
            }

            // --- LÓGICA PARA ESCENA DE AJUSTES ---
            if (gameState === 'settings') {
                const discardOverlay = getEl('settings-discard-overlay');
                if (discardOverlay && discardOverlay.style.display === 'flex') {
                    if (e.code === 'Enter') { getEl('btn-settings-discard-confirm').click(); e.preventDefault(); }
                    if (e.code === 'Escape') { getEl('btn-settings-discard-cancel').click(); e.preventDefault(); }
                    return;
                }

                if (e.code === 'ArrowUp') { updateSettingsFocus(-1); e.preventDefault(); }
                if (e.code === 'ArrowDown') { updateSettingsFocus(1); e.preventDefault(); }
                
                if (e.code === 'ArrowRight') { adjustFocusedSetting(1); e.preventDefault(); }
                if (e.code === 'ArrowLeft') { adjustFocusedSetting(-1); e.preventDefault(); }

                if (e.code === 'Enter') {
                    if (settingsFocusIndex === 2) { // Bloom toggle
                        const cb = getEl('settings-toggle-bloom');
                        if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
                    }
                    e.preventDefault();
                }

                if (e.code === 'Space') { // START: Aceptar
                    const btn = getEl('btn-settings-apply');
                    if (btn) btn.click();
                    e.preventDefault();
                }

                if (e.code === 'Escape') { // B: Cancelar
                    const btn = getEl('btn-settings-back');
                    if (btn) btn.click();
                    e.preventDefault();
                }

                // MP3 Controls
                if (e.code === 'KeyL') { // LB: Pista Anterior
                    prevSong();
                    syncSettingsAudioUI();
                    blinkSettingButton('btn-prev-song');
                    e.preventDefault();
                }
                if (e.code === 'KeyR') { // RB: Pista Siguiente
                    nextSong();
                    syncSettingsAudioUI();
                    blinkSettingButton('btn-next-song');
                    e.preventDefault();
                }
                if (e.code === 'KeyY') { // Y: Play/Pause
                    togglePlayPause();
                    syncSettingsAudioUI();
                    // Pequeño retardo para asegurar que el estado de pausa se ha actualizado
                    setTimeout(syncSettingsAudioUI, 100); 
                    e.preventDefault();
                }

                return;
            }

            // --- RESTO DE LÓGICA (Solo si no estamos en el Selector) ---
            if (gameState === 'menu' || gameState === 'intro') {
                if (e.code === 'ArrowUp' || e.code === 'ArrowLeft') { updateMenuFocus(-1); e.preventDefault(); }
                if (e.code === 'ArrowDown' || e.code === 'ArrowRight') { updateMenuFocus(1); e.preventDefault(); }
                
                // Atajos de Mando
                if (e.code === 'KeyY') { // Botón Y: Editor
                    const btn = document.getElementById('btn-map-editor');
                    if (btn && btn.style.display !== 'none') btn.click();
                }
                if (e.code === 'KeyC') { // Botón SELECT: Notas
                    const btn = document.getElementById('btn-credits');
                    if (btn && btn.style.display !== 'none') btn.click();
                }
                if (e.code === 'Escape') { // Botón B: Volver
                    handleMenuBack();
                    e.preventDefault();
                }
                if (e.code === 'Space' && gameState === 'menu') { // Botón START: Ajustes
                    const btn = document.getElementById('btn-settings');
                    if (btn && btn.style.display !== 'none') btn.click();
                }
                if (e.code === 'Enter' && (gameState === 'menu' || gameState === 'zooming')) { // Botón A: Confirmar (Incluir zooming para el popup inicial)
                    const focused = document.activeElement;
                    if (focused && typeof focused.click === 'function') {
                        focused.click();
                        e.preventDefault();
                    }
                }
            }

            // Cerrar Modal de Alerta con cualquier tecla (Space/Enter/Mando)
            const alertOverlay = document.getElementById('modal-alert-overlay');
            if (alertOverlay && alertOverlay.style.display === 'flex' && (e.code === 'Space' || e.code === 'Enter')) {
                alertOverlay.style.display = 'none';
                playSound('menu_click');
                return;
            }

            // Manejo de la Intro (Se puede saltar en cualquier momento con Space/START)
            if (gameState === 'intro' && e.code === 'Space') {
                transitionToPhase(3);
                return;
            }

            if (e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); }
            if (e.code === 'Escape' && gameState !== 'menu') { togglePause(); }

            // Comandos de Entrenamiento
            if (isTrainingMode && gameState === 'playing') {
                if (e.code === 'KeyR') { // Resetear balón
                    ball.x = CONST.CONFIG.WORLD_W / 2;
                    ball.y = CONST.CONFIG.WORLD_H / 2;
                    ball.vx = 0; ball.vy = 0;
                    playSound('menu_click');
                }
                if (e.code === 'KeyF') { // Lanzar balón (Pass)
                    const angle = Math.random() * Math.PI * 2;
                    const dist = 600;
                    ball.x = player1.x + Math.cos(angle) * dist;
                    ball.y = player1.y + Math.sin(angle) * dist;
                    ball.vx = (player1.x - ball.x) * 0.04; 
                    ball.vy = (player1.y - ball.y) * 0.04;
                    playSound('menu_click');
                }
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (gameState === 'menu' || introPhase < 3) { mouseX = (e.clientX / window.innerWidth) - 0.5; mouseY = (e.clientY / window.innerHeight) - 0.5; }
            
            // Detección de Entrada Activa: RATÓN/TECLADO (evitando temblores accidentales)
            if (Math.abs(e.movementX) > 1.5 || Math.abs(e.movementY) > 1.5) {
                if (!document.body.classList.contains('input-method-mouse')) {
                    document.body.classList.add('input-method-mouse');
                    document.body.classList.remove('input-method-gamepad');
                }
            }
        });

        window.addEventListener('mousedown', () => {
            if (!document.body.classList.contains('input-method-mouse')) {
                document.body.classList.add('input-method-mouse');
                document.body.classList.remove('input-method-gamepad');
            }
        });

        window.addEventListener('keydown', () => {
            if (!document.body.classList.contains('input-method-mouse')) {
                document.body.classList.add('input-method-mouse');
                document.body.classList.remove('input-method-gamepad');
            }
        });

        // Listeners de Pausa
        const pContinue = getEl('btn-pause-continue'); if (pContinue) pContinue.onclick = () => togglePause();
        
        const pRestart = getEl('btn-pause-restart'); 
        if (pRestart) pRestart.onclick = () => { 
            score = { blue: 0, orange: 0 }; 
            gameTime = 60; 
            if (typeof updateScoreboard === 'function') updateScoreboard(scoreboardEl, allCars, score);
            togglePause(); 
            resetAfterGoal(); 
        };

        // --- PANTALLA COMPLETA ---
        const fsToggle = getEl('fullscreen-toggle');
        if (fsToggle) {
            fsToggle.onclick = () => {
                playSound('menu_click');
                if (!document.fullscreenElement) {
                    document.documentElement.requestFullscreen().catch(err => {
                        console.error(`Error attempting to enable fullscreen: ${err.message}`);
                    });
                } else {
                    document.exitFullscreen();
                }
            };
        }

        document.addEventListener('fullscreenchange', () => {
            const fsIcon = getEl('fullscreen-icon');
            const fsText = getEl('fullscreen-text');
            const fsTitle = getEl('fullscreen-toggle');
            if (document.fullscreenElement) {
                if (fsIcon) fsIcon.innerText = '🗖';
                if (fsText) fsText.innerText = 'SALIR PANTALLA COMPLETA';
                if (fsTitle) fsTitle.title = 'SALIR PANTALLA COMPLETA';
            } else {
                if (fsIcon) fsIcon.innerText = '⛶';
                if (fsText) fsText.innerText = 'PANTALLA COMPLETA';
                if (fsTitle) fsTitle.title = 'PANTALLA COMPLETA';
            }
        });

        // --- DETECCIÓN DE MANDO (Gamepad API) ---
        const gpIndicator = getEl('gamepad-indicator');
        const gpText = getEl('gamepad-text');

        const checkInitialGamepads = () => {
            const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
            const gp = Array.from(gamepads).find(g => g && g.connected);
            if (gp && gpIndicator) {
                gpIndicator.style.filter = "grayscale(0%)";
                gpIndicator.style.opacity = "1";
                gpIndicator.title = "MANDO CONECTADO";
                if (gpText) gpText.innerText = "MANDO DETECTADO";
            } else if (gpIndicator) {
                gpIndicator.style.filter = "grayscale(100%)";
                gpIndicator.style.opacity = "0.5";
                gpIndicator.title = "MANDO DESCONECTADO";
                if (gpText) gpText.innerText = "MANDO NO DETECTADO";
            }
        };
        // Ejecución inmediata y retardada de control inicial
        checkInitialGamepads();
        setTimeout(checkInitialGamepads, 300);

        window.addEventListener("gamepadconnected", (e) => {
            console.log("SCAPS: Gamepad detectado ->", e.gamepad.id);
            if (gpIndicator) {
                gpIndicator.style.filter = "grayscale(0%)";
                gpIndicator.style.opacity = "1";
                gpIndicator.title = "MANDO CONECTADO";
            }
            if (gpText) gpText.innerText = "MANDO DETECTADO";
            if (typeof showInGameNotification === 'function') {
                showInGameNotification("MANDO DETECTADO: " + e.gamepad.id.substring(0, 20), "#2fb", "🎮");
            }
            if (gameState === 'menu') {
                playSound('menu_click');
                initAudio();
            }
            updatePauseGamepadStatus();
        });

        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("SCAPS: Gamepad desconectado");
            if (gpIndicator) {
                gpIndicator.style.filter = "grayscale(100%)";
                gpIndicator.style.opacity = "0.5";
                gpIndicator.title = "MANDO DESCONECTADO";
            }
            if (gpText) gpText.innerText = "MANDO NO DETECTADO";
            if (typeof showInGameNotification === 'function') {
                showInGameNotification("MANDO DESCONECTADO", "#f33", "🚫");
            }
            updatePauseGamepadStatus();
        });

        // Listener para cerrar el modal con click
        const modalOk = getEl('btn-modal-alert-ok');
        if (modalOk) {
            modalOk.onclick = () => {
                const overlay = getEl('modal-alert-overlay');
                if (overlay) overlay.style.display = 'none';
                playSound('menu_click');
            };
        }

        const pExit = getEl('btn-pause-exit');
        if (pExit) pExit.onclick = () => {
            isPaused = false;
            const pm = getEl('pause-menu');
            if (pm) pm.style.display = 'none';
            gameState = 'menu';
            showMenuScreen('initial');
            if (mainMenuEl) {
                mainMenuEl.classList.remove('hidden');
                mainMenuEl.style.display = 'flex';
                const videoBg = document.getElementById('menu-video-bg');
                if (videoBg) videoBg.style.opacity = '1';
            }
            stopAllMotors();
        };

        const btnPausePhysics = document.getElementById('btn-pause-physics');
        if (btnPausePhysics) {
            btnPausePhysics.onclick = () => {
                isPaused = false;
                const pm = getEl('pause-menu');
                if (pm) pm.style.display = 'none';
                toggleEditor(true);
            };
        }

        // MP3 en Ajustes
        const sPP = getEl('btn-play-pause');
        if (sPP) sPP.onclick = () => { togglePlayPause(); syncSettingsAudioUI(); };
        const sPrev = getEl('btn-prev-song');
        if (sPrev) sPrev.onclick = () => { prevSong(); syncSettingsAudioUI(); blinkSettingButton('btn-prev-song'); };
        const sNext = getEl('btn-next-song');
        if (sNext) sNext.onclick = () => { nextSong(); syncSettingsAudioUI(); blinkSettingButton('btn-next-song'); };

        // MP3 en Pausa
        const pPP = getEl('btn-pause-play-pause');
        if (pPP) pPP.onclick = () => { togglePlayPause(); syncPauseMenuAudioUI(); };
        const pPrev = getEl('btn-pause-prev');
        if (pPrev) pPrev.onclick = () => { prevSong(); syncPauseMenuAudioUI(); };
        const pNext = getEl('btn-pause-next');
        if (pNext) pNext.onclick = () => { nextSong(); syncPauseMenuAudioUI(); };

        const psMusic = getEl('slider-pause-music');
        if (psMusic) {
            psMusic.oninput = (e) => {
                const vol = parseInt(e.target.value);
                setMusicVolume(vol / 100);
                USER_CONFIG.musicVolume = vol;
                saveUserConfig();
            };
        }
        const psSFX = getEl('slider-pause-sfx');
        if (psSFX) {
            psSFX.oninput = (e) => {
                const vol = parseInt(e.target.value);
                setSFXVolume(vol / 100);
                USER_CONFIG.sfxVolume = vol;
                saveUserConfig();
            };
        }

        const pMusic = getEl('btn-toggle-music-pause');
        const syncMuteUI = (muted) => {
            if (pMusic) pMusic.innerText = muted ? '🔇' : '🔊';
            if (pMusic) pMusic.style.borderColor = muted ? '#555' : '#5ad';
        };

        if (pMusic) pMusic.onclick = () => syncMuteUI(toggleMusic());

        // Selector de Volumen
        const volSlider = getEl('slider-music-vol');
        const volValue = getEl('music-vol-value');
        if (volSlider) {
            volSlider.oninput = (e) => {
                const val = parseInt(e.target.value);
                if (volValue) volValue.innerText = val + '%';
                setMusicVolume(val / 100);
                USER_CONFIG.musicVolume = val;
                saveUserConfig();
            };
        }

        // Iniciar la secuencia de intro
        startIntro();

        // Sonido global para botones
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', () => playSound('menu_click'));
            btn.addEventListener('mouseenter', () => playSound('menu_hover'));
        });

        // Iniciar el loop principal
        requestAnimationFrame(gameLoop);
        console.log("SCAPS: Motor en marcha.");

    } catch (e) {
        console.error("SCAPS CRASH EN INIT:", e);
    }
}

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // Cap para evitar saltos enormes
    lastTime = timestamp;

    // Calcular FPS y ajustar dinámicamente el nivel de detalle (LOD) técnico
    if (dt > 0) {
        fps = fps * 0.95 + (1 / dt) * 0.05; // Suavizado exponencial
        if (fps < 54) {
            window.SCAPS_LOD_LEVEL = Math.max(0.25, window.SCAPS_LOD_LEVEL - 0.015);
        } else if (fps > 58) {
            window.SCAPS_LOD_LEVEL = Math.min(1.0, window.SCAPS_LOD_LEVEL + 0.015);
        }
    }

    // Actualizar estado del mando (Gamepad)
    pollGamepad(keysPressed, gameState, introPhase);

    // Detección inteligente de actividad física en el mando en tiempo real
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    let hasGamepadActivity = false;
    for (const gp of gamepads) {
        if (gp && gp.connected) {
            // Evaluar botones presionados (con un margen para triggers analógicos)
            if (gp.buttons.some(b => b.pressed || b.value > 0.15)) {
                hasGamepadActivity = true;
                break;
            }
            // Evaluar sticks analógicos fuera de la zona muerta estándar (0.22)
            if (gp.axes.some(a => Math.abs(a) > 0.22)) {
                hasGamepadActivity = true;
                break;
            }
        }
    }
    if (hasGamepadActivity) {
        if (!document.body.classList.contains('input-method-gamepad')) {
            document.body.classList.add('input-method-gamepad');
            document.body.classList.remove('input-method-mouse');
        }
    }

    // --- EFECTO JUICE: HIT-STOP ---
    // Si hay un impacto masivo, congelamos el tiempo y el render para dar sensación de brutalidad
    if (hitStopFrames > 0) {
        hitStopFrames--;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!isPaused) {
        const inMatch = ['playing', 'countdown', 'goalScored', 'replay', 'zooming', 'panning'].includes(gameState);
        if (inMatch) {
            updateAll(dt);
        }
    }

    renderFrame();
    if (gameState === 'settings') drawSettingsVisualizer();
    requestAnimationFrame(gameLoop);
}

function renderFrame() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Si estamos en la intro o en el menú, no dibujamos nada en el canvas.
    // Esto asegura una transición limpia a través de negro.
    if (gameState === 'intro' || gameState === 'menu') return;

    let targetX = player1.x, targetY = player1.y, targetRot = 0, vOffset = 0;
    if (gameState === 'zooming') {
        // Progreso del zoom de 0.1 a 0.85
        let progress = Math.min(1, Math.max(0, (currentZoom - 0.1) / (0.85 - 0.1)));
        if (progress < 0.6) {
            targetX = CONST.CONFIG.WORLD_W / 2;
            targetY = CONST.CONFIG.WORLD_H / 2;
        } else {
            // Mezcla suave hacia el jugador en el último 40% del zoom
            let mix = (progress - 0.6) / 0.4;
            let smoothMix = mix * mix * (3 - 2 * mix); // Ease in-out
            targetX = (CONST.CONFIG.WORLD_W / 2) * (1 - smoothMix) + player1.x * smoothMix;
            targetY = (CONST.CONFIG.WORLD_H / 2) * (1 - smoothMix) + player1.y * smoothMix;
        }
        targetRot = 0;
    } else if (gameState === 'panning' || gameState === 'menu') {
        targetX = player1.x + (gameState === 'menu' ? mouseX * 200 : 0);
        targetY = player1.y + (gameState === 'menu' ? mouseY * 200 : 0);
        targetRot = (gameState === 'menu' ? mouseX * 0.05 : 0);
    } else if (cameraMode === 'rotating') {
        targetRot = -player1.angle; vOffset = canvas.height * 0.3;
    }

    let camLerp = (gameState === 'zooming' || gameState === 'panning') ? 0.04 : 0.08;
    if (gameState === 'replay') {
        targetX = ball.x;
        targetY = ball.y;
        targetZoom = 1.15; 
        camLerp = 0.06;
    }
    currentCamX += (targetX - currentCamX) * camLerp;
    currentCamY += (targetY - currentCamY) * camLerp;
    currentVOffset += (vOffset - currentVOffset) * 0.05;
    let rd = targetRot - currentRotation; rd = (rd + Math.PI) % (Math.PI * 2) - Math.PI; currentRotation += rd * 0.1;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + currentVOffset);
    
    // --- EFECTO JUICE: SCREEN SHAKE ---
    if (shakeMagnitude > 0.5) {
        ctx.translate((Math.random() - 0.5) * shakeMagnitude, (Math.random() - 0.5) * shakeMagnitude);
        shakeMagnitude *= 0.85; // Decaimiento suave
    } else {
        shakeMagnitude = 0;
    }

    ctx.rotate(currentRotation);

    // --- EFECTO JUICE: FOV DINÁMICO ---
    let extraFOV = 0;
    if (gameState === 'playing' || gameState === 'goalScored') {
        const speedRatio = Math.abs(player1.speed) / CONST.CONFIG.CAR_MAX_SPEED;
        extraFOV = speedRatio * 0.15; 
    }
    
    // Suavizado del FOV (Zoom out = escala menor)
    if (typeof window.currentFOV === 'undefined') window.currentFOV = currentZoom;
    window.currentFOV += ((currentZoom - extraFOV) - window.currentFOV) * 0.05;

    ctx.scale(window.currentFOV, window.currentFOV);

    ctx.translate(-currentCamX, -currentCamY);

    drawAll();

    // Solo dibujar nombres y HUD si estamos en partida
    drawCarNames(ctx, allCars, player1, cameraMode, gameState);
    drawHUD(ctx, canvas, gameTime, score, player1, cameraMode, isTrainingMode, ball, {
        x: currentCamX,
        y: currentCamY,
        rot: currentRotation,
        fov: window.currentFOV,
        vOffset: currentVOffset
    });
    drawFeed(ctx, canvas);

    ctx.restore();
}

// --- SISTEMA DE NOTIFICACIONES (FEED) ---
let feedMessages = [];
export function addFeedMessage(type, actor, victim = null) {
    const msg = {
        type,
        actor: actor ? actor.name : 'Alguien',
        victim: victim ? victim.name : null,
        timer: 300, // 5 segundos
        color: actor ? actor.color : 'white'
    };
    feedMessages.unshift(msg);
    if (feedMessages.length > 4) feedMessages.pop();
}

function drawFeed(ctx, canvas) {
    ctx.save();
    ctx.font = 'bold 18px "Share Tech Mono"';
    const startX = canvas.width - 20;
    const startY = 80;
    const gap = 30;

    feedMessages.forEach((msg, i) => {
        const text = msg.type === 'goal'
            ? `⚽ GOL de ${msg.actor}`
            : `💥 ${msg.actor} explotó a ${msg.victim}`;

        ctx.textAlign = 'right';
        ctx.globalAlpha = Math.min(1, msg.timer / 60);

        // Sombra de texto
        ctx.fillStyle = 'black';
        ctx.fillText(text, startX + 2, startY + (i * gap) + 2);

        // Texto principal
        ctx.fillStyle = msg.color;
        ctx.fillText(text, startX, startY + (i * gap));

        msg.timer--;
    });

    feedMessages = feedMessages.filter(m => m.timer > 0);
    ctx.restore();
}

function updateAll(dt) {
    // Factor de escala basado en 60fps
    const timeScale = dt * 60;

    if (gameState === 'playing' || gameState === 'countdown' || gameState === 'goalScored') {
        // 1. Actualizar Entidades (Multiplicar por timeScale para físicas consistentes)
        const physicsOverlay = document.getElementById('physics-editor-overlay');
        const isPhysicsOpen = physicsOverlay && !physicsOverlay.classList.contains('hidden') && physicsOverlay.style.display !== 'none';
        const blockControls = isPhysicsOpen && !window.physicsIsFolded;
        const activeKeys = blockControls ? {} : keysPressed;

        player1.update(activeKeys, gameState, particles, skidMarks, timeScale);
        applyTirePhysics(player1, timeScale);

        allCars.forEach(car => {
            if (car !== player1) {
                const aiKeys = {};
                if (!isTrainingMode) {
                    updateCarAI(car, ball, allCars, boostPads, car.controls, aiKeys);
                }
                car.update(aiKeys, gameState, particles, skidMarks, timeScale);
                applyTirePhysics(car, timeScale);
            }
        });

        ball.update(gameState, particles, timeScale);
        applyGlobalFriction(ball, allCars, timeScale);
        boostPads.forEach(pad => pad.update());

        // Manejo de Respawn de coches explotados
        allCars.forEach((car, i) => {
            if (car.isExploded && car.respawnTimer <= 0) {
                // El jugador reaparece en su punto exacto inicial, los bots aleatoriamente en su lado
                let spIndex = i;
                if (!car.isPlayer) {
                    spIndex = (car.color === '#5ad') ? (Math.random() < 0.5 ? 0 : 1) : (Math.random() < 0.5 ? 2 : 3);
                }
                const sp = CONST.CONFIG.SPAWN_POINTS[spIndex] || { x: 500, y: 500, a: 0 };
                car.x = sp.x;
                car.y = sp.y;
                car.angle = sp.a || 0;
                car.speed = 0;
                car.vx = 0;
                car.vy = 0;
                car.boost = 33;
                car.isExploded = false;
                console.log(`Car ${car.name} respawned.`);
            }
        });

        checkCollisions(timeScale);
    }

    // --- LÓGICA DE REPLAY ---
    if (gameState === 'replay') {
        const stillPlaying = replaySystem.applyFrame(ball, allCars);
        if (!stillPlaying) {
            gameState = 'panning'; // Estado temporal para bloquear este bloque
            triggerTransition();
            setTimeout(resetAfterGoal, 400); 
        }
    } else if (gameState === 'playing' || gameState === 'goalScored') {
        // Seguimos grabando durante 'goalScored' para capturar el final
        replaySystem.record(ball, allCars);
    }

    // Actualizar objetos de partículas y skidmarks con LOD Dinámico
    const lodMultiplier = window.SCAPS_LOD_LEVEL || 1.0;
    [particles, explosionParticles, confettiParticles, skidMarks].forEach((arr, arrIdx) => {
        const isPerformanceIntensive = arrIdx < 3; // partículas (boost, explosión y confeti)
        for (let i = arr.length - 1; i >= 0; i--) {
            const obj = arr[i];
            if (obj && typeof obj.update === 'function') {
                obj.update();
                // Si el nivel de detalle (LOD) es bajo, aceleramos el decaimiento de las partículas
                if (isPerformanceIntensive && lodMultiplier < 0.95) {
                    obj.lifespan -= (1.0 - lodMultiplier) * 2;
                }
            }
            if (obj.lifespan <= 0) arr.splice(i, 1);
        }
    });

    // Pruning reactivo: Forzar límites máximos en arrays de partículas según el LOD
    const maxParticles = Math.round(250 * lodMultiplier);
    if (particles.length > maxParticles) particles.splice(0, particles.length - maxParticles);
    
    const maxExplosions = Math.round(150 * lodMultiplier);
    if (explosionParticles.length > maxExplosions) explosionParticles.splice(0, explosionParticles.length - maxExplosions);
    
    const maxConfetti = Math.round(200 * lodMultiplier);
    if (confettiParticles.length > maxConfetti) confettiParticles.splice(0, confettiParticles.length - maxConfetti);

    const maxSkidMarks = Math.round(350 * lodMultiplier);
    if (skidMarks.length > maxSkidMarks) skidMarks.splice(0, skidMarks.length - maxSkidMarks);

    animationFrameCounter++;
    updateAudio();
    if (player1) {
        setBoostSound(player1.isBoosting);
        setDriftSound(player1.isDrifting && player1.z === 0 && Math.abs(player1.speed) > 0.5);
    }
    updateUI(dt);
    if (gameState === 'settings') drawSettingsVisualizer();
}

function checkCollisions(timeScale = 1.0) {
    // Permitimos que corra durante goalScored para que los coches puedan moverse (car.move)
    if (gameState !== 'playing' && gameState !== 'goalScored') return;

    for (let i = 0; i < allCars.length; i++) {
        const car = allCars[i];
        checkCarBallCollision(car, ball, touchHistory, gameTime, timeScale);
        for (let j = i + 1; j < allCars.length; j++) {
            checkCarCarCollision(car, allCars[j], explosionParticles);
        }
        boostPads.forEach(pad => {
            if (pad.active) {
                const dx = car.x - pad.x, dy = car.y - pad.y;
                if (dx * dx + dy * dy < (pad.radius + car.radius) ** 2) pad.collect(car);
            }
        });
    }

    checkGoalPhysics(ball);
    allCars.forEach(car => car.move());

    // Solo detectar nuevos goles si estamos en modo juego
    if (gameState === 'playing') {
        const scorer = ball.checkGoal();
        if (scorer) handleGoal(scorer);
    }
}

function triggerTransition() {
    const stinger = document.getElementById('replay-transition');
    if (stinger) {
        stinger.classList.remove('active');
        void stinger.offsetWidth; // Force reflow
        stinger.classList.add('active');
        setTimeout(() => {
            stinger.classList.remove('active');
        }, 850); // Duración de la animación stinger
    }
}

function handleGoal(scorer) {
    if (scorer === 'blue') score.blue++; else score.orange++;
    
    if (isTrainingMode) {
        playSound('goal_explosion', 0.8);
        addScreenShake(15);
        resetAfterGoal();
        return;
    }

    gameState = 'goalScored';
    
    // Temblor de cámara inmenso y Hit-Stop brutal al marcar gol
    addScreenShake(25);
    addHitStop(6); // 100ms de pausa dramática

    // Atribuir gol y asistencia
    const teamColor = scorer === 'blue' ? '#5ad' : '#f90';
    let scoringCar = null;
    for (let i = touchHistory.length - 1; i >= 0; i--) {
        if (touchHistory[i].car.color === teamColor) {
            scoringCar = touchHistory[i].car;
            break;
        }
    }

    if (scoringCar) {
        scoringCar.goals++;
        scoringCar.score += 100;
        let assistCar = null;
        for (let i = touchHistory.length - 1; i >= 0; i--) {
            if (touchHistory[i].car.color === teamColor && touchHistory[i].car !== scoringCar) {
                assistCar = touchHistory[i].car;
                break;
            }
        }
        if (assistCar) {
            assistCar.assists++;
            assistCar.score += 50;
        }
    }

    playSound('goal');
    ball.isFireball = true; ball.fireballTimer = 180; ball.vx = 0; ball.vy = 0;

    // Usar efecto de explosión seleccionado por el usuario (si es el jugador quien marca)
    const explosionStyle = (scoringCar === player1) ? USER_CONFIG.playerExplosion : 'classic';
    spawnGoalEffects(ball.x, ball.y, teamColor, explosionStyle);

    // Añadir al feed
    addFeedMessage('goal', scoringCar);

    if (goalTextEl) {
        goalTextEl.innerText = scoringCar ? `¡GOL DE ${scoringCar.name.toUpperCase()}!` : "¡GOL!";
        goalTextEl.style.display = 'block';
    }
    setTimeout(() => { if (goalTextEl) goalTextEl.style.display = 'none'; }, 2500);
    
    // Dejamos que el sistema siga grabando durante 2 segundos (120 frames aprox)
    // para ver la reacción y el balón entrando en la red.
    setTimeout(() => {
        if (gameState === 'goalScored') {
            triggerTransition();
            setTimeout(() => {
                replaySystem.startPlayback();
                gameState = 'replay';
                if (goalTextEl) {
                    goalTextEl.innerText = "REPETICIÓN";
                    goalTextEl.style.display = 'block';
                    goalTextEl.style.color = teamColor;
                }
            }, 400); // Mitad de la cortinilla
        }
    }, 1500); 
}

function spawnGoalEffects(x, y, teamColor, styleKey = 'classic') {
    const config = EXPLOSION_DEFS[styleKey] || EXPLOSION_DEFS['classic'];
    const count = config.count || 50;

    // Efecto de partículas de explosión base
    for (let i = 0; i < count; i++) {
        explosionParticles.push(new ExplosionParticle(x, y, Math.random() * 50 - 25));
    }

    // Añadir confeti si el estilo lo pide o por defecto
    for (let i = 0; i < 150; i++) {
        confettiParticles.push(new ConfettiParticle(x, y));
    }
}

function updateUI(dt) {
    if (gameState === 'zooming') {
        // Factor de 0.04 para una duración ágil, dinámica y fluida (~1.5 segundos)
        currentZoom += (targetZoom - currentZoom) * 0.04;
        if (Math.abs(targetZoom - currentZoom) < 0.001) {
            currentZoom = targetZoom;
            gameState = 'panning';
        }
    }
    if (gameState === 'panning') {
        const dx = currentCamX - player1.x;
        const dy = currentCamY - player1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        // Umbral reducido para un encuadre perfecto antes de empezar
        if (dist < 10) {
            resetAfterGoal(); // Esto pone gameState = 'countdown'
        }
    }
    if (gameState === 'playing') {
        if (!isTrainingMode) {
            gameTime -= dt;
            if (gameTime <= 0) {
                gameTime = 0;
                showGameOver();
            }
        } else {
            player1.boost = 100; // Turbo infinito en entrenamiento
        }

        // Acumular tiempo de juego real
        if (USER_CONFIG.stats) {
            USER_CONFIG.stats.playTime = (USER_CONFIG.stats.playTime || 0) + dt;
        }
    }
    if (gameState === 'countdown') {
        countdownTimer -= dt;
        if (countdownTimer <= 0) {
            gameState = 'playing';
            if (countdownEl) countdownEl.style.display = 'none';
        } else {
            if (countdownEl) {
                countdownEl.style.display = 'block';
                countdownEl.innerText = Math.ceil(countdownTimer);
            }
        }
    }
}

function resetAfterGoal() {
    applySpawns();
    allCars.forEach(car => { car.speed = 0; car.vx = 0; car.vy = 0; car.boost = isTrainingMode ? 100 : 33; });
    ball.x = CONST.CONFIG.WORLD_W / 2; ball.y = CONST.CONFIG.WORLD_H / 2;
    ball.vx = 0; ball.vy = 0; ball.onWallTimer = 0;
    ball.isFireball = false; ball.fireballTimer = 0; ball.visualRadius = ball.radius; ball.targetRadius = ball.radius;
    skidMarks = []; particles = []; confettiParticles = []; touchHistory = [];
    
    if (isTrainingMode) {
        gameState = 'playing';
        if (countdownEl) countdownEl.style.display = 'none';
    } else {
        countdownTimer = 3; 
        gameState = 'countdown';
        if (countdownEl) countdownEl.style.display = 'block';
        playSound('countdown');
    }
    
    targetZoom = 0.85; 
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';
}

function showGameOver() {
    gameState = 'gameOver';
    stopAllMotors();
    if (gameOverOverlay) {
        gameOverOverlay.style.display = 'flex';

        if (finalScoreBlue) finalScoreBlue.innerText = score.blue;
        if (finalScoreOrange) finalScoreOrange.innerText = score.orange;

        let winnerText = "¡EMPATE!";
        let winnerColor = "#fff";

        if (score.blue > score.orange) {
            winnerText = "GANADOR: EQUIPO AZUL";
            winnerColor = "#5ad";
        } else if (score.orange > score.blue) {
            winnerText = "GANADOR: EQUIPO NARANJA";
            winnerColor = "#f90";
        }

        if (gameOverWinner) {
            gameOverWinner.innerText = winnerText;
            gameOverWinner.style.color = winnerColor;
            gameOverWinner.style.textShadow = `0 0 15px ${winnerColor}`;
        }

        // --- ACTUALIZAR TABLA DE JUGADORES ---
        const scoreboardList = document.getElementById('gameover-scoreboard-list');
        if (scoreboardList) {
            scoreboardList.innerHTML = '';
            
            // Ordenar por puntuación individual
            const sortedCars = [...allCars].sort((a, b) => {
                return (b.score || 0) - (a.score || 0);
            });
            
            sortedCars.forEach(car => {
                const color = car.color === '#5ad' ? '#5ad' : '#f90';
                const isPlayer = (car === player1);
                const nameStyle = isPlayer ? `color: #fff; font-weight: bold; text-shadow: 0 0 8px ${color};` : `color: ${color};`;
                const bgStyle = isPlayer ? `background: rgba(255,255,255,0.15); border-left: 3px solid ${color};` : `border-left: 3px solid transparent;`;
                
                const html = `
                    <div style="display: flex; font-size: 14px; padding: 6px 10px; border-radius: 4px; ${bgStyle} transition: background 0.3s; align-items: center;">
                        <div style="flex: 2; ${nameStyle} white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 6px;">
                            ${isPlayer ? '<span style="font-size:10px; background:#2fb; color:#000; padding:1px 4px; border-radius:2px;">TÚ</span>' : ''} ${car.name || 'JUGADOR'}
                        </div>
                        <div style="flex: 1; text-align: center; color: #2fb; font-weight: bold;">${car.score || 0}</div>
                        <div style="flex: 1; text-align: center; color: #fff; font-weight: bold;">${car.goals || 0}</div>
                        <div style="flex: 1; text-align: center; color: #ccc;">${car.assists || 0}</div>
                    </div>
                `;
                scoreboardList.insertAdjacentHTML('beforeend', html);
            });
        }

        // --- CÁLCULO Y ANIMACIÓN DE XP ---
        let earnedXP = 500; // Base por partido terminado
        if (player1) {
            earnedXP += (player1.goals || 0) * 100;
            earnedXP += (player1.assists || 0) * 50;
            if ((score.blue > score.orange && player1.color === '#5ad') || (score.orange > score.blue && player1.color === '#f90')) {
                earnedXP += 250; // Victoria
            }
        }

        const xpEl = document.getElementById('gameover-stats-xp');
        const xpLabelEl = document.getElementById('gameover-stats-xp-label');
        if (xpEl) {
            xpEl.innerText = '0 XP';
            xpEl.style.transform = 'scale(1)';
            if (xpLabelEl) xpLabelEl.innerText = 'Sumando experiencia...';
            
            let currentXP = 0;
            const duration = 1200; // 1.2s
            const interval = 30;
            const steps = duration / interval;
            const increment = earnedXP / steps;
            
            const xpInterval = setInterval(() => {
                if (gameState !== 'gameOver') {
                    clearInterval(xpInterval);
                    return;
                }
                currentXP += increment;
                if (currentXP >= earnedXP) {
                    currentXP = earnedXP;
                    clearInterval(xpInterval);
                    xpEl.style.transform = 'scale(1.15)';
                    setTimeout(() => xpEl.style.transform = 'scale(1)', 200);
                    if (xpLabelEl) xpLabelEl.innerText = '¡Experiencia Obtenida!';
                    playSound('menu_click');
                } else {
                    if (Math.random() > 0.6) playSound('menu_hover');
                }
                xpEl.innerText = `+${Math.floor(currentXP)} XP`;
            }, interval);
        }

        // --- ACTUALIZAR ESTADÍSTICAS PERSISTENTES ---
        if (USER_CONFIG.stats) {
            const stats = USER_CONFIG.stats;
            stats.totalMatches = (stats.totalMatches || 0) + 1;
            stats.totalGoals = (stats.totalGoals || 0) + (player1 ? player1.goals : 0);

            if (score.blue > score.orange) {
                stats.matchesWon = (stats.matchesWon || 0) + 1;
            } else if (score.orange > score.blue) {
                stats.matchesLost = (stats.matchesLost || 0) + 1;
            }

            // Sistema de Nivel (XP)
            stats.xp = (stats.xp || 0) + earnedXP;
            const xpToNext = stats.level * 1000;
            if (stats.xp >= xpToNext) {
                stats.xp -= xpToNext;
                stats.level = (stats.level || 1) + 1;
                console.log("¡LEVEL UP! Ahora eres nivel " + stats.level);
                // Aquí se podría disparar una notificación visual de Level Up
            }

            saveUserConfig();
            updateStatsUI();
        }

        playSound('goal'); // Reutilizamos el sonido de gol para el final
    }
}

function drawAll() {
    drawField(ctx);

    // Si estamos en el menú o intro, solo dibujamos el campo como fondo
    if (gameState === 'menu' || gameState === 'intro') return;

    // 0. Actualizar animaciones de luces
    updateLights(CONST.CONFIG.LIGHT_SOURCES, Date.now());

    // 0.1 Sombras de Muros y Porterías (Profundidad del estadio)
    drawWallShadows(ctx, CONST.CONFIG.FIELD_POLYGON, {top: CONST.CONFIG.GOAL_TOP, bottom: CONST.CONFIG.GOAL_BOTTOM}, CONST.CONFIG.LIGHT_SOURCES);

    // 1. Dibujar Sombras Dinámicas (antes que las entidades)

    drawDynamicShadows(ctx, [...allCars, ball], CONST.CONFIG.LIGHT_SOURCES);

    skidMarks.forEach(s => s.draw(ctx));
    boostPads.forEach(pad => pad.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    allCars.forEach(car => car.draw(ctx));
    ball.draw(ctx, animationFrameCounter);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; explosionParticles.forEach(ep => ep.draw(ctx)); ctx.restore();
    ctx.save(); confettiParticles.forEach(cp => cp.draw(ctx)); ctx.restore();

    // 2. Aplicar Iluminación Ambiental y Halos (Post-entidades para oscurecerlas)
    drawAmbientLighting(ctx, CONST.CONFIG.WORLD_W, CONST.CONFIG.WORLD_H, CONST.CONFIG.LIGHT_SOURCES);

    // Dibujar las redes por encima de todo para el efecto de profundidad
    drawGoalNets(ctx);
}

function setupBoostPads() { boostPads = []; CONST.CONFIG.BOOST_POSITIONS.forEach(pos => { boostPads.push(new BoostPad(pos.x, pos.y, !pos.isBig)); }); }
function toggleCamera() {
    cameraMode = (cameraMode === 'rotating') ? 'fixed' : 'rotating';
    if (cameraModeEl) {
        cameraModeEl.innerText = (cameraMode === 'rotating') ? 'CÁMARA ROTATIVA' : 'CÁMARA FIJA';
        cameraModeEl.style.display = 'block';
        cameraModeEl.style.opacity = '1';
        setTimeout(() => { cameraModeEl.style.opacity = '0'; setTimeout(() => { cameraModeEl.style.display = 'none'; }, 500); }, 2000);
    }
    playSound('menu_click');
}
function toggleScoreboard(show) { if (show) showScoreboard(scoreboardEl, allCars, score); else hideScoreboard(scoreboardEl, gameState); }
function togglePause() {
    isPaused = !isPaused;
    const pm = document.getElementById('pause-menu');
    if (pm) {
        pm.style.display = isPaused ? 'flex' : 'none';
        if (isPaused) {
            window.pauseFocusIndex = 0;
            if (typeof window.updatePauseFocus === 'function') {
                window.updatePauseFocus();
            }
            syncPauseMenuAudioUI();
            updatePauseGamepadStatus();
        }
    }
}

function updatePauseGamepadStatus() {
    const led = document.getElementById('pause-status-led');
    const txt = document.getElementById('pause-status-text');
    if (!led || !txt) return;

    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(gamepads).find(g => g && g.connected);

    if (gp) {
        led.style.background = '#2fb';
        led.style.boxShadow = '0 0 8px #2fb';
        led.style.animation = 'blink 1.2s infinite ease-in-out';
        txt.innerText = 'MANDO DETECTADO Y CONECTADO';
        txt.style.color = '#2fb';
    } else {
        led.style.background = '#ff4444';
        led.style.boxShadow = '0 0 8px #ff4444';
        led.style.animation = 'none';
        txt.innerText = 'TECLADO / MANDO DESCONECTADO';
        txt.style.color = '#ff4444';
    }
}

function syncPauseMenuAudioUI() {
    // Sincronizar el mini-reproductor de pausa
    const songName = document.getElementById('pause-song-name');
    const songInfo = document.getElementById('pause-song-info');
    const sMusic = document.getElementById('slider-pause-music');
    const sSFX = document.getElementById('slider-pause-sfx');

    const currentTrack = window.currentTrack || { name: 'SIN PISTA', artist: '---' };
    if (songName) songName.innerText = currentTrack.name;
    
    if (sMusic) sMusic.value = (window.musicVolume || 0.5) * 100;
    if (sSFX) sSFX.value = (window.sfxVolume || 0.8) * 100;

    const pPP = document.getElementById('btn-pause-play-pause-icon');
    if (pPP) {
        pPP.innerText = isMusicPaused() ? '⏸' : '▶';
    }
}
function applySpawns() {
    allCars.forEach((car, i) => {
        const sp = CONST.CONFIG.SPAWN_POINTS[i] || { x: 500, y: 500, a: 0 };
        car.x = sp.x;
        car.y = sp.y;
        car.angle = sp.a || 0;
        car.vx = 0;
        car.vy = 0;
        car.speed = 0;
        car.boost = 33;
    });
    if (ball) {
        ball.x = CONST.CONFIG.WORLD_W / 2;
        ball.y = CONST.CONFIG.WORLD_H / 2;
        ball.vx = 0;
        ball.vy = 0;
        ball.onWallTimer = 0;
        ball.isFireball = false;
        ball.fireballTimer = 0;
    }
    skidMarks = [];
    particles = [];
    explosionParticles = [];
    confettiParticles = [];
}

async function startIntro() {
    introPhase = 1;
    const slide1 = document.getElementById('intro-slide-1');
    const introScreen = document.getElementById('intro-screen');

    if (introScreen) introScreen.style.display = 'flex';

    // Escena 1: Logo (Fade In automático por CSS al añadir active)
    setTimeout(() => {
        if (slide1) slide1.classList.add('active');
    }, 100);

    // Configurar manejador de progreso en la barra de carga premium
    assetsManager.onProgress = (loaded, total, path) => {
        const percentage = Math.round((loaded / total) * 100);
        const textEl = document.getElementById('intro-loading-text');
        const fillEl = document.getElementById('intro-loading-bar-fill');
        if (textEl) textEl.innerText = `PREPARANDO RECURSOS (${percentage}%)`;
        if (fillEl) fillEl.style.width = `${percentage}%`;
    };

    // Crear lista de recursos a precargar
    const coreAssets = [
        'recursos/stadiums/estadio1.png',
        'recursos/cars/car1-down.png',
        ...Array.from({ length: 10 }, (_, i) => `recursos/cars/car${i + 1}.png`),
        ...Array.from({ length: 12 }, (_, i) => `recursos/balls/ball_${i + 1}.png`),
        ...Array.from({ length: 14 }, (_, i) => `recursos/avatar/avatar_${i + 1}.png`),
        'recursos/sound/modern2.wav',
        'recursos/sound/countdown.mp3',
        'recursos/sound/minimalist8.wav',
        'recursos/sound/car-explosion.mp3'
    ];

    try {
        // Precargar todos los recursos en paralelo
        const preloadPromises = coreAssets.map(path => {
            if (path.endsWith('.wav') || path.endsWith('.mp3')) {
                return assetsManager.preloadAudio(path);
            } else {
                return assetsManager.preloadImage(path);
            }
        });

        // Asegurar una duración visual mínima de la pantalla del logo de 2.2 segundos para fluidez
        const minDurationPromise = new Promise(resolve => setTimeout(resolve, 2200));

        await Promise.all([...preloadPromises, minDurationPromise]);

        const textEl = document.getElementById('intro-loading-text');
        if (textEl) textEl.innerText = '¡RECURSOS COMPLETADOS!';
        
        // Retraso de cortesía para mostrar la barra llena
        setTimeout(() => {
            if (introPhase === 1) transitionToPhase(2);
        }, 800);

    } catch (e) {
        console.warn("Error en la precarga de assets:", e);
        // Si falla algo, continuar de todos modos para que el juego arranque
        setTimeout(() => {
            if (introPhase === 1) transitionToPhase(2);
        }, 1000);
    }
}

async function transitionToPhase(newPhase) {
    if (newPhase <= introPhase) return; // Evitar transiciones repetidas

    const slide1 = document.getElementById('intro-slide-1');
    const slide2 = document.getElementById('intro-slide-2');
    const introScreen = document.getElementById('intro-screen');

    if (newPhase === 2) {
        introPhase = 2;
        // Fade out de la escena 1
        if (slide1) slide1.classList.remove('active');

        // Esperamos a que termine el fade out (1.5s en CSS) antes de mostrar la 2
        setTimeout(() => {
            if (introPhase === 2 && slide2) {
                slide2.classList.add('active');
                // NOTA: Eliminamos el setTimeout automático para que espere al ESPACIO
            }
        }, 1500);

    } else if (newPhase === 3) {
        introPhase = 3;
        // Fade out de cualquier slide activo
        if (slide1) slide1.classList.remove('active');
        if (slide2) slide2.classList.remove('active');

        // Esperamos el fade out final del contenedor negro
        if (introScreen) introScreen.style.opacity = '0';

        setTimeout(() => {
            if (introScreen) introScreen.style.display = 'none';

            // CAMBIO DE ESTADO AQUÍ: Solo cuando ya no se ve la intro
            gameState = 'menu';

            if (mainMenuEl) {
                mainMenuEl.classList.remove('hidden');
                mainMenuEl.style.display = 'flex';
                // La música comienza AQUÍ
                // initAudio ya se llama en finalizeStartGame para el ralentí
    // initAudio(player1, allCars);

                // CROSSFADE A VÍDEO ANIMADO
                setTimeout(() => {
                    const videoBg = document.getElementById('menu-video-bg');
                    if (videoBg) videoBg.style.opacity = '1';
                }, 2000);
            }
            showMenuScreen('initial');
        }, 1500);
    }
}
function setupCustomizationMenu() {
    // Manejo de Pestañas
    const tabBtns = document.querySelectorAll('.custom-tab-btn');
    tabBtns.forEach(btn => {
        // Ignorar los botones de cerrar/guardar y descartar de la lógica de pestañas
        if (btn.classList.contains('btn-close-custom') || btn.classList.contains('btn-discard-custom')) return;

        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.tab;
            document.querySelectorAll('.custom-pane').forEach(p => p.classList.remove('active'));
            document.getElementById('pane-' + target).classList.add('active');
            playSound('menu_click');

            if (target === 'perfil') {
                renderAvatars();
                setupTitleSelect();
            }
            if (target === 'vehiculo') renderCarSelection();
            if (target === 'balon') renderBallSelection();
            if (target === 'boost') {
                renderBoostSelection();
                updateBoostPreviewInfo(USER_CONFIG.playerBoost);
                setTimeout(() => boostPreviewManager.resize(), 50);
            }
            if (target === 'explosion') {
                renderExplosionSelection();
                setTimeout(() => explosionPreviewManager.resize(), 50);
            }

            // Forzar navegación en el panel y enfocar primer control visible
            window.customizationActiveMenuMode = true;
            setTimeout(() => {
                const activePane = document.getElementById('pane-' + target);
                if (activePane) {
                    const focusables = Array.from(activePane.querySelectorAll(
                        'button:not([disabled]):not(.custom-tab-btn), input:not([disabled]), select:not([disabled]), [tabindex="0"]'
                    )).filter(el => {
                        const rect = el.getBoundingClientRect();
                        if (rect.width === 0 || rect.height === 0) return false;
                        if (el.tagName === 'INPUT' && el.type === 'color') return false;
                        const dropdownContent = el.closest('.custom-dropdown-content');
                        if (dropdownContent && dropdownContent.style.display !== 'block') return false;
                        return true;
                    });
                    if (focusables.length > 0) {
                        focusables[0].focus();
                    }
                }
            }, 100);
        };
    });

    // Inputs de Perfil
    const inputName = document.getElementById('input-player-name');
    if (inputName) {
        inputName.oninput = (e) => {
            USER_CONFIG.playerName = e.target.value;
            saveUserConfig();
            updatePlayerBanner();
        };
    }

    // Botones de Selector de Tema de Color
    const btnThemeBlue = document.getElementById('btn-theme-blue');
    const btnThemeOrange = document.getElementById('btn-theme-orange');
    if (btnThemeBlue && btnThemeOrange) {
        btnThemeBlue.onclick = () => {
            USER_CONFIG.uiTheme = 'blue';
            saveUserConfig();
            syncThemeUI();
            playSound('menu_click');
        };
        btnThemeOrange.onclick = () => {
            USER_CONFIG.uiTheme = 'orange';
            saveUserConfig();
            syncThemeUI();
            playSound('menu_click');
        };
        // Sincronizar estado inicial
        syncThemeUI();
    }

    // Sliders de Tinte
    const hueSlider = document.getElementById('slider-car-hue');
    const satSlider = document.getElementById('slider-car-saturate');
    const previewImg = document.getElementById('car-preview-img');

    const updatePreview = () => {
        USER_CONFIG.playerCarHue = hueSlider.value;
        USER_CONFIG.playerCarSaturate = satSlider.value;
        if (previewImg) {
            previewImg.style.filter = `hue-rotate(${USER_CONFIG.playerCarHue}deg) saturate(${USER_CONFIG.playerCarSaturate}%) drop-shadow(0 0 15px var(--theme-glow-color))`;
        }
    };

    if (hueSlider) {
        hueSlider.oninput = updatePreview;
        hueSlider.onchange = saveUserConfig;
    }
    if (satSlider) {
        satSlider.oninput = updatePreview;
        satSlider.onchange = saveUserConfig;
    }

    const inputAvatarBg = document.getElementById('input-avatar-bg');
    if (inputAvatarBg) {
        inputAvatarBg.oninput = (e) => {
            USER_CONFIG.playerAvatarBg = e.target.value;
            renderAvatars();
            updatePlayerBanner();
        };
        inputAvatarBg.onchange = saveUserConfig;
    }

    // Botones de navegación de coches
    const btnPrev = document.getElementById('btn-car-prev');
    const btnNext = document.getElementById('btn-car-next');
    if (btnPrev) btnPrev.onclick = () => { if (currentCarPageP1 > 1) { currentCarPageP1--; renderCarSelection(); playSound('menu_click'); } };
    if (btnNext) btnNext.onclick = () => { currentCarPageP1++; renderCarSelection(); playSound('menu_click'); };

    // Botones de navegación de avatares
    const btnAvPrev = document.getElementById('btn-avatar-prev');
    const btnAvNext = document.getElementById('btn-avatar-next');
    if (btnAvPrev) btnAvPrev.onclick = () => { if (currentAvatarPage > 1) { currentAvatarPage--; renderAvatars(); playSound('menu_click'); } };
    if (btnAvNext) btnAvNext.onclick = () => { currentAvatarPage++; renderAvatars(); playSound('menu_click'); };

    // Reset de Tinte
    const btnResetHue = document.getElementById('reset-car-hue');
    const btnResetSat = document.getElementById('reset-car-saturate');
    if (btnResetHue) btnResetHue.onclick = () => {
        const hueSlider = document.getElementById('slider-car-hue');
        if (hueSlider) { hueSlider.value = 0; USER_CONFIG.playerCarHue = 0; updatePreview(); saveUserConfig(); playSound('menu_click'); }
    };
    if (btnResetSat) btnResetSat.onclick = () => {
        const satSlider = document.getElementById('slider-car-saturate');
        if (satSlider) { satSlider.value = 100; USER_CONFIG.playerCarSaturate = 100; updatePreview(); saveUserConfig(); playSound('menu_click'); }
    };

    // Botones de navegación de balones
    const btnBallPrev = document.getElementById('btn-ball-prev');
    const btnBallNext = document.getElementById('btn-ball-next');
    if (btnBallPrev) btnBallPrev.onclick = () => { if (currentBallPage > 1) { currentBallPage--; renderBallSelection(); playSound('menu_click'); } };
    if (btnBallNext) btnBallNext.onclick = () => { if (currentBallPage < 4) { currentBallPage++; renderBallSelection(); playSound('menu_click'); } };

    // Sub-Pestañas de Perfil (Piloto vs Estadísticas)
    const subtabBtns = document.querySelectorAll('.subtab-btn');
    subtabBtns.forEach(btn => {
        btn.onclick = () => {
            subtabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.sub;
            document.querySelectorAll('.profile-subcontent').forEach(p => p.style.display = 'none');
            document.getElementById('subpane-' + target).style.display = 'flex';
            playSound('menu_click');
            
            if (target === 'stats') updateStatsUI();
        };
    });
}

// --- FUNCIONES AUXILIARES PARA EL SISTEMA DE DESBLOQUEO PROGRESIVO ---
function getAvatarUnlockLevel(url) {
    const match = url.match(/avatar_(\d+)\.png/);
    if (!match) return 1;
    const idx = parseInt(match[1]);
    if (idx <= 20) return 1;
    if (idx <= 40) return 5;
    if (idx <= 60) return 10;
    if (idx <= 80) return 20;
    if (idx <= 90) return 35;
    return 50;
}

function getBallUnlockLevel(url) {
    const match = url.match(/ball_(\d+)\.png/);
    if (!match) return 1;
    const idx = parseInt(match[1]);
    if (idx <= 10) return 1;
    if (idx <= 20) return 4;
    if (idx <= 30) return 8;
    if (idx <= 35) return 15;
    return 30;
}

function getBoostUnlockLevel(key) {
    const levels = {
        'classic': 1, 'bubble': 1, 'nature': 1,
        'toxic': 3, 'ice': 3,
        'neon': 6, 'fire': 6,
        'plasma': 10, 'lava': 10,
        'glitch': 15, 'cyber': 15,
        'rainbow': 20, 'matrix': 20,
        'void': 30, 'cosmic': 30,
        'gold': 45
    };
    return levels[key] || 1;
}

function getExplosionUnlockLevel(key) {
    const levels = {
        'classic': 1, 'bubble': 1, 'blossom': 1,
        'love': 4, 'frozen': 4,
        'confetti': 8, 'ghost': 8,
        'pixel': 12, 'magma': 12,
        'lightning': 18, 'cyber': 18,
        'gravity': 25, 'fireworks': 25,
        'nuclear': 35, 'blackhole': 35,
        'gold': 50
    };
    return levels[key] || 1;
}

function renderAvatars() {
    const container = document.getElementById('avatar-list');
    const pageInfo = document.getElementById('avatar-page-info');
    if (!container) return;
    container.innerHTML = '';

    // Generar lista de 100 avatares
    const totalAvatars = 100;
    const avatars = [];
    for (let i = 1; i <= totalAvatars; i++) {
        avatars.push(`recursos/avatar/avatar_${i}.png`);
    }

    const totalPages = Math.ceil(totalAvatars / AVATARS_PER_PAGE);
    if (currentAvatarPage > totalPages) currentAvatarPage = totalPages;
    if (currentAvatarPage < 1) currentAvatarPage = 1;

    if (pageInfo) pageInfo.innerText = `${currentAvatarPage} / ${totalPages}`;

    const startIdx = (currentAvatarPage - 1) * AVATARS_PER_PAGE;
    const pageItems = avatars.slice(startIdx, startIdx + AVATARS_PER_PAGE);

    pageItems.forEach(url => {
        const item = document.createElement('div');
        const requiredLevel = getAvatarUnlockLevel(url);
        const isLocked = (USER_CONFIG.stats.level || 1) < requiredLevel;

        item.className = 'selectable-item' + (USER_CONFIG.playerAvatar === url ? ' selected' : '');
        item.tabIndex = 0;

        if (isLocked) {
            item.classList.add('locked-item');
            item.innerHTML = `<img src="${url}" style="filter: brightness(0.2) grayscale(1); width: 85%; height: 85%; object-fit: contain;"><div class="lock-icon">🔒 Lvl ${requiredLevel}</div>`;
            item.onclick = () => {
                showInGameNotification(`ESTE AVATAR SE DESBLOQUEA AL NIVEL ${requiredLevel}`, "#f33", "🚫");
                playSound('menu_error');
            };
        } else {
            item.style.background = USER_CONFIG.playerAvatarBg;
            item.innerHTML = `<img src="${url}" style="width: 85%; height: 85%; object-fit: contain;">`;
            item.onclick = () => {
                USER_CONFIG.playerAvatar = url;
                saveUserConfig();
                renderAvatars();
                updatePlayerBanner();
                playSound('menu_click');
            };
        }

        container.appendChild(item);

        if (USER_CONFIG.playerAvatar === url) {
            setTimeout(() => {
                item.focus();
            }, 10);
        }
    });
}

function renderCarSelection() {
    const list = document.getElementById('custom-car-list');
    const previewImg = document.getElementById('car-preview-img');
    if (!list) return;

    const carImages = [];
    for (let i = 1; i <= 10; i++) carImages.push(`recursos/cars/car${i}.png`);

    list.innerHTML = '';

    // Renderizar los 10 coches reales con lógica de desbloqueo
    carImages.forEach((img, index) => {
        const carIndex = index + 1;
        const item = document.createElement('div');
        
        // Niveles de desbloqueo (Ejemplo progresivo)
        const unlockLevels = {
            5: 2, 6: 4, 7: 6, 8: 10, 9: 15, 10: 25
        };
        const requiredLevel = unlockLevels[carIndex] || 1;
        const isLocked = (USER_CONFIG.stats.level || 1) < requiredLevel;

        item.className = 'selectable-item' + (USER_CONFIG.playerCar === img ? ' selected' : '');
        item.tabIndex = 0;
        if (isLocked) {
            item.classList.add('locked-item');
            item.innerHTML = `<img src="${img}" style="filter: brightness(0.2) grayscale(1);"><div class="lock-icon">🔒 Lvl ${requiredLevel}</div>`;
            item.onclick = () => {
                showInGameNotification(`ESTE VEHÍCULO SE DESBLOQUEA AL NIVEL ${requiredLevel}`, "#f33", "🚫");
                playSound('menu_error');
            };
        } else {
            item.innerHTML = `<img src="${img}">`;
            item.onclick = () => {
                USER_CONFIG.playerCar = img;
                selectedCarP1 = img;
                if (previewImg) previewImg.src = getAssetPath(img);
                saveUserConfig();
                renderCarSelection();
                playSound('menu_click');
            };
        }
        list.appendChild(item);

        if (USER_CONFIG.playerCar === img && !isLocked) {
            setTimeout(() => {
                item.focus();
            }, 10);
        }
    });

    // Añadir 2 botones "PROXIMAMENTE" para completar la rejilla 4x3 (10 coches + 2 huecos = 12)
    for (let i = 0; i < 2; i++) {
        const nextItem = document.createElement('div');
        nextItem.className = 'selectable-item';
        nextItem.style.background = 'rgba(0,0,0,0.3)';
        nextItem.style.borderStyle = 'dashed';
        nextItem.style.opacity = '0.5';
        nextItem.innerHTML = ``; // Vacío para estética limpia
        list.appendChild(nextItem);
    }

    // Sincronizar sliders
    const hueSlider = document.getElementById('slider-car-hue');
    const satSlider = document.getElementById('slider-car-saturate');
    if (hueSlider) hueSlider.value = USER_CONFIG.playerCarHue;
    if (satSlider) satSlider.value = USER_CONFIG.playerCarSaturate;
    if (previewImg) {
        previewImg.src = getAssetPath(USER_CONFIG.playerCar);
        previewImg.style.filter = `hue-rotate(${USER_CONFIG.playerCarHue}deg) saturate(${USER_CONFIG.playerCarSaturate}%) drop-shadow(0 0 15px var(--theme-glow-color))`;
    }
}

function renderBallSelection() {
    const container = document.getElementById('ball-list');
    const pageInfo = document.getElementById('ball-page-info');
    if (!container) return;
    container.innerHTML = '';

    const totalBalls = 40;
    const balls = [];
    for (let i = 1; i <= totalBalls; i++) {
        balls.push(`recursos/balls/ball_${i}.png`);
    }

    const totalPages = Math.ceil(totalBalls / BALLS_PER_PAGE);
    if (currentBallPage > totalPages) currentBallPage = totalPages;
    if (currentBallPage < 1) currentBallPage = 1;

    if (pageInfo) pageInfo.innerText = `${currentBallPage} / ${totalPages}`;

    const startIdx = (currentBallPage - 1) * BALLS_PER_PAGE;
    const pageItems = balls.slice(startIdx, startIdx + BALLS_PER_PAGE);

    pageItems.forEach(url => {
        const item = document.createElement('div');
        const requiredLevel = getBallUnlockLevel(url);
        const isLocked = (USER_CONFIG.stats.level || 1) < requiredLevel;

        item.className = 'selectable-item' + (USER_CONFIG.playerBall === url ? ' selected' : '');
        item.tabIndex = 0;

        if (isLocked) {
            item.classList.add('locked-item');
            item.innerHTML = `<img src="${url}" style="filter: brightness(0.2) grayscale(1);"><div class="lock-icon">🔒 Lvl ${requiredLevel}</div>`;
            item.onclick = () => {
                showInGameNotification(`ESTE BALÓN SE DESBLOQUEA AL NIVEL ${requiredLevel}`, "#f33", "🚫");
                playSound('menu_error');
            };
        } else {
            item.innerHTML = `<img src="${url}">`;
            item.onclick = () => {
                USER_CONFIG.playerBall = url;
                if (ball) ball.imgUrl = url;
                saveUserConfig();
                renderBallSelection();
                playSound('menu_click');
            };
        }

        container.appendChild(item);

        if (USER_CONFIG.playerBall === url) {
            setTimeout(() => {
                item.focus();
            }, 10);
        }
    });
}

function setupTitleSelect() {
    const dropdown = document.getElementById('custom-title-dropdown');
    const dropdownBtn = document.getElementById('custom-title-dropdown-btn');
    const dropdownText = document.getElementById('custom-title-dropdown-text');
    const dropdownContent = document.getElementById('custom-title-dropdown-content');
    
    if (!dropdown || !dropdownBtn || !dropdownContent) return;

    const titles = [
        "Su ilustrísima", "Random noob", "Alpha Tester", "Beta Tester",
        "Leyenda Urbana", "Maestro del Balón", "Turboadicto",
        "Goleador Nato", "Rey del Aire", "Developer"
    ];

    // Establecer título inicial activo
    const activeTitle = USER_CONFIG.playerTitle || titles[0];
    if (dropdownText) dropdownText.innerText = activeTitle.toUpperCase();

    // Renderizar opciones personalizadas en el desplegable
    dropdownContent.innerHTML = '';
    titles.forEach(t => {
        const item = document.createElement('div');
        item.className = 'custom-dropdown-item' + (activeTitle === t ? ' active' : '');
        item.innerText = t.toUpperCase();
        item.tabIndex = 0;
        item.onclick = (e) => {
            e.stopPropagation();
            USER_CONFIG.playerTitle = t;
            saveUserConfig();
            updatePlayerBanner();
            if (dropdownText) dropdownText.innerText = t.toUpperCase();
            
            // Cerrar menú y marcar activo
            dropdownContent.style.display = 'none';
            dropdownContent.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('active'));
            item.classList.add('active');
            
            playSound('menu_click');
            dropdownBtn.focus();
        };
        dropdownContent.appendChild(item);
    });

    // Abrir/Cerrar al hacer click en el botón
    dropdownBtn.onclick = (e) => {
        e.stopPropagation();
        const isOpen = dropdownContent.style.display === 'block';
        
        // Cerrar todos los demás dropdowns
        document.querySelectorAll('.custom-dropdown-content').forEach(c => {
            if (c !== dropdownContent) c.style.display = 'none';
        });

        dropdownContent.style.display = isOpen ? 'none' : 'block';
        playSound('menu_click');
    };
}

function setupAdvancedBannerDropdowns() {
    // 1. Relleno Dropdown
    const typeBtn = document.getElementById('custom-banner-type-btn');
    const typeText = document.getElementById('custom-banner-type-text');
    const typeContent = document.getElementById('custom-banner-type-content');
    if (typeBtn && typeContent) {
        const types = [
            { value: 'solid', label: 'SÓLIDO' },
            { value: 'gradient', label: 'LINEAL' },
            { value: 'radial', label: 'RADIAL' }
        ];
        const activeType = USER_CONFIG.bannerType || 'gradient';
        const found = types.find(t => t.value === activeType) || types[0];
        if (typeText) typeText.innerText = found.label;

        typeContent.innerHTML = '';
        types.forEach(t => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (activeType === t.value ? ' active' : '');
            item.innerText = t.label;
            item.tabIndex = 0;
            item.onclick = (e) => {
                e.stopPropagation();
                USER_CONFIG.bannerType = t.value;
                saveUserConfig();
                updatePlayerBanner();
                if (typeText) typeText.innerText = t.label;
                typeContent.style.display = 'none';
                
                typeContent.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                playSound('menu_click');
                typeBtn.focus();
            };
            typeContent.appendChild(item);
        });

        typeBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = typeContent.style.display === 'block';
            
            // Cerrar todos los demás dropdowns
            document.querySelectorAll('.custom-dropdown-content').forEach(c => {
                if (c !== typeContent) c.style.display = 'none';
            });

            typeContent.style.display = isOpen ? 'none' : 'block';
            playSound('menu_click');
        };
    }

    // 2. Patrón Dropdown
    const patternBtn = document.getElementById('custom-banner-pattern-btn');
    const patternText = document.getElementById('custom-banner-pattern-text');
    const patternContent = document.getElementById('custom-banner-pattern-content');
    if (patternBtn && patternContent) {
        const patterns = [
            { value: 'none', label: 'NINGUNO' },
            { value: 'grid', label: 'REJILLA' },
            { value: 'diagonal', label: 'DIAGONAL' },
            { value: 'dots', label: 'PUNTOS' },
            { value: 'cross', label: 'CRUCES' },
            { value: 'chevron', label: 'CHEVRÓN' }
        ];
        const activePattern = USER_CONFIG.bannerPattern || 'none';
        const found = patterns.find(p => p.value === activePattern) || patterns[0];
        if (patternText) patternText.innerText = found.label;

        patternContent.innerHTML = '';
        patterns.forEach(p => {
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item' + (activePattern === p.value ? ' active' : '');
            item.innerText = p.label;
            item.tabIndex = 0;
            item.onclick = (e) => {
                e.stopPropagation();
                USER_CONFIG.bannerPattern = p.value;
                saveUserConfig();
                updatePlayerBanner();
                if (patternText) patternText.innerText = p.label;
                patternContent.style.display = 'none';
                
                patternContent.querySelectorAll('.custom-dropdown-item').forEach(el => el.classList.remove('active'));
                item.classList.add('active');
                playSound('menu_click');
                patternBtn.focus();
            };
            patternContent.appendChild(item);
        });

        patternBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = patternContent.style.display === 'block';
            
            // Cerrar todos los demás dropdowns
            document.querySelectorAll('.custom-dropdown-content').forEach(c => {
                if (c !== patternContent) c.style.display = 'none';
            });

            patternContent.style.display = isOpen ? 'none' : 'block';
            playSound('menu_click');
        };
    }
}



function showMenuScreen(screenId) {
    // Iniciar música en el menú si no ha empezado (requiere interacción previa)
    initAudio();

    // Asegurar que el contenedor principal esté visible
    if (mainMenuEl) {
        mainMenuEl.style.display = 'flex';
        mainMenuEl.classList.remove('hidden');
    }

    // Identificar de qué menú o pantalla estamos saliendo antes de ocultar
    let exitingSubmenu = null;
    if (menuSettings && menuSettings.style.display !== 'none') exitingSubmenu = 'settings';
    else if (menuCustom && menuCustom.style.display !== 'none') exitingSubmenu = 'custom';
    else if (setupOverlay && setupOverlay.style.display !== 'none') exitingSubmenu = 'play';
    else if (gameState === 'game' || (typeof isPlaying !== 'undefined' && isPlaying) || (document.getElementById('pause-menu') && document.getElementById('pause-menu').style.display !== 'none')) exitingSubmenu = 'game';

    [menuInitial, menuCredits, menuCustom, menuSettings, setupOverlay].forEach(m => { if (m) m.style.display = 'none'; });

    const logo = document.getElementById('menu-logo');
    if (logo) logo.style.display = (screenId === 'initial') ? 'block' : 'none';

    const btnMapEditor = document.getElementById('btn-map-editor');
    if (btnCredits) btnCredits.style.display = (screenId === 'initial') ? 'block' : 'none';
    if (btnMapEditor) btnMapEditor.style.display = (screenId === 'initial') ? 'block' : 'none';

    let target = null;
    if (screenId === 'initial' && menuInitial) {
        menuInitial.style.display = 'flex';
        target = menuInitial;
        gameState = 'menu'; // CRITICAL: Reset state for gamepad to work
        const videoBg = document.getElementById('menu-video-bg');
        if (videoBg) videoBg.style.opacity = '1';
    }
    else if (screenId === 'credits' && menuCredits) {
        menuCredits.style.display = 'flex';
        target = menuCredits;
    }
    else if (screenId === 'custom' && menuCustom) {
        // Almacenar copia de seguridad inicial para poder descartar cambios
        window.USER_CONFIG_BACKUP = JSON.parse(JSON.stringify(USER_CONFIG));
        
        menuCustom.style.display = 'flex';
        target = menuCustom;
        gameState = 'customization';
        window.customizationActiveMenuMode = true;
        
        // Inicializar selectores de color premium
        if (typeof initCustomColorPickers === 'function') {
            initCustomColorPickers();
            syncCustomColorPickerButtons();
        }

        updateStatsUI();
        // Reset a la primera pestaña y sub-pestaña
        const profileTab = document.querySelector('.custom-tab-btn[data-tab="perfil"]');
        if (profileTab) profileTab.click();
        
        const dataSubTab = document.querySelector('.subtab-btn[data-sub="datos"]');
        if (dataSubTab) dataSubTab.click();
    }
    else if (screenId === 'settings' && menuSettings) {
        menuSettings.style.display = 'flex';
        target = menuSettings;
        gameState = 'settings';
        settingsChanged = false;
        settingsFocusIndex = 0;
        // Timeout para asegurar que el DOM está renderizado antes de aplicar el foco
        setTimeout(() => {
            updateSettingsFocus(0);
            syncSettingsAudioUI();
        }, 50);
    }

    if (target && screenId !== 'initial') {
        const firstBtn = target.querySelector('button:not([disabled])');
        if (firstBtn) firstBtn.focus();
    } else if (screenId === 'initial') {
        // Determinar qué botón del menú principal debe recibir el foco
        let btnToFocus = document.getElementById('btn-play'); // Por defecto
        if (exitingSubmenu === 'settings') {
            btnToFocus = document.getElementById('btn-settings');
        } else if (exitingSubmenu === 'custom') {
            btnToFocus = document.getElementById('btn-custom');
        } else if (exitingSubmenu === 'play' || exitingSubmenu === 'game') {
            btnToFocus = document.getElementById('btn-play');
        }

        if (btnToFocus) {
            setTimeout(() => {
                btnToFocus.focus();
            }, 50);
        } else {
            if (document.activeElement && typeof document.activeElement.blur === 'function') {
                document.activeElement.blur();
            }
        }
    }

    updatePlayerBanner();
}

function updateMenuFocus(direction) {
    const visibleMenus = ['menu-initial', 'menu-credits', 'menu-settings', 'match-setup-overlay', 'menu-custom', 'modal-alert-overlay', 'pause-menu', 'exit-confirm-overlay'];
    let activeMenu = null;
    for (const id of visibleMenus) {
        const el = getEl(id);
        if (el && el.style.display !== 'none' && !el.classList.contains('hidden') && el.offsetParent !== null) {
            activeMenu = el;
            break; 
        }
    }

    if (!activeMenu) return;

    // Selector expandido para incluir mapas, pestañas y elementos interactivos
    const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), .setup-map-item, .custom-tab-btn, .subtab-btn, [tabindex="0"]';
    
    // FILTRAR SOLO ELEMENTOS VISIBLES (Evita que el foco salte a paneles ocultos)
    const buttons = Array.from(activeMenu.querySelectorAll(focusableSelector))
        .filter(el => {
            const style = window.getComputedStyle(el);
            return el.offsetParent !== null && style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

    if (buttons.length === 0) return;

    let index = buttons.indexOf(document.activeElement);
    if (index === -1) {
        index = (direction > 0) ? 0 : buttons.length - 1;
    } else {
        index = (index + direction + buttons.length) % buttons.length;
    }
    
    buttons[index].focus();
    // Asegurar que el elemento esté a la vista
    buttons[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    if (typeof playSound === 'function') playSound('menu_hover');
}

function handleMenuBack() {
    // Lista de submenús que pueden cerrarse para volver al principal
    const subMenus = ['menu-credits', 'menu-settings', 'match-setup-overlay', 'menu-custom'];
    let backTriggered = false;

    for (const id of subMenus) {
        const el = getEl(id);
        if (el && el.style.display !== 'none' && !el.classList.contains('hidden')) {
            showMenuScreen('initial');
            playSound('menu_click');
            backTriggered = true;
            break;
        }
    }

    // Si no estábamos en un submenú, quizás cerrar un modal de alerta
    if (!backTriggered) {
        const alert = getEl('modal-alert-overlay');
        if (alert && alert.style.display === 'flex') {
            alert.style.display = 'none';
            playSound('menu_click');
        }
    }
}

async function startGame() {
    if (mainMenuEl) {
        mainMenuEl.style.display = 'flex';
        mainMenuEl.classList.remove('hidden');
    }
    // Ocultar botones iniciales, logo y créditos
    [menuInitial, menuCredits, menuCustom, menuSettings].forEach(m => { if (m) m.style.display = 'none'; });
    const logo = document.getElementById('menu-logo');
    if (logo) logo.style.display = 'none';
    const btnCredits = document.getElementById('btn-credits');
    const btnMapEditor = document.getElementById('btn-map-editor');
    if (btnCredits) btnCredits.style.display = 'none';
    if (btnMapEditor) btnMapEditor.style.display = 'none';

    if (setupOverlay) {
        setupOverlay.style.display = 'flex';
        setupOverlay.classList.remove('hidden');
        loadSetupMaps();
        
        // Limpiar cualquier selección previa de modos al abrir la pantalla para iniciar de forma limpia e imparcial
        selectedMode = null;
        document.querySelectorAll('.mode-option').forEach(b => {
            b.classList.remove('selected');
            b.blur(); // Garantiza la remoción de cualquier foco visual
        });
        
        validateMatchSetup(); // Recalcular la validación para bloquear el botón CONFIRMAR Y JUGAR
    }
}

let lastMapIndex = 0;
let isMapChanging = false;

async function changeMap(targetPage) {
    if (isMapChanging || !mapListContainer) return;
    isMapChanging = true;
    
    const totalMaps = 4; // URBAN, ATLANTIS, VOLCANO, WINTER
    let newPage = targetPage;
    if (newPage > totalMaps) newPage = 1;
    if (newPage < 1) newPage = totalMaps;
    
    // Si no hay cambio real de página, saltamos
    if (newPage === currentMapPage) {
        isMapChanging = false;
        return;
    }
    
    const direction = (newPage > currentMapPage || (currentMapPage === totalMaps && newPage === 1)) ? 'next' : 'prev';
    // Caso de borde para rotación infinita hacia atrás
    let isInfiniteEdge = (currentMapPage === 1 && newPage === totalMaps);
    const finalDirection = isInfiniteEdge ? 'prev' : direction;
    
    // Aplicar animación de salida rápida a las cartas actualmente en pantalla
    const cards = mapListContainer.querySelectorAll('.setup-map-item');
    cards.forEach(c => {
        c.classList.remove('slide-next', 'slide-prev', 'enter-next', 'enter-prev');
        c.classList.add(finalDirection === 'next' ? 'exit-next' : 'exit-prev');
    });
    
    lastMapIndex = currentMapPage - 1;
    currentMapPage = newPage;
    
    // Esperamos 200ms a que termine la animación de salida por deslizamiento antes de recrear el DOM
    setTimeout(async () => {
        await loadSetupMaps(finalDirection);
        isMapChanging = false;
        
        // Restaurar foco al nuevo centro tras la animación
        setTimeout(() => {
            const newCenter = mapListContainer.querySelector('.center');
            if (newCenter) newCenter.focus();
        }, 50);
    }, 200);
}

async function loadSetupMaps(forcedDirection = '') {
    if (!mapListContainer) return;
    let maps = [];
    try {
        try {
            const resp = await fetch('php/get_maps.php');
            if (resp.ok) {
                maps = await resp.json();
            }
        } catch (fetchErr) {
            console.warn("SCAPS: Entorno estático detectado, usando fallback local para mapas.");
        }

        // Asegurar al menos 10 mapas para la demostración de paginación si faltan
        while (maps.length < 10) maps.push(`MAPA ${maps.length + 1}`);

        const MAPS_LIST = ['URBAN', 'VOLCANO', 'ATLANTIS', 'JUNGLE'];
        const totalMaps = MAPS_LIST.length;

        // El currentMapPage ahora actuará como el índice del mapa central (1 a totalMaps)
        if (currentMapPage > totalMaps) currentMapPage = 1;
        if (currentMapPage < 1) currentMapPage = totalMaps;

        const centerIdx = currentMapPage - 1;
        const pageInfo = document.getElementById('map-page-info');
        if (pageInfo) pageInfo.innerText = `${currentMapPage} / ${totalMaps}`;

        const btnPrev = document.getElementById('btn-map-prev');
        const btnNext = document.getElementById('btn-map-next');
        if (btnPrev) { btnPrev.disabled = (currentMapPage === 1); btnPrev.style.opacity = (currentMapPage === 1) ? '0.3' : '1'; }
        if (btnNext) { btnNext.disabled = (currentMapPage === totalMaps); btnNext.style.opacity = (currentMapPage === totalMaps) ? '0.3' : '1'; }

        // Detectar dirección del cambio de mapa para la animación de entrada
        let directionClass = '';
        if (forcedDirection) {
            directionClass = (forcedDirection === 'next') ? 'enter-next' : 'enter-prev';
        }
        lastMapIndex = centerIdx;

        mapListContainer.innerHTML = '';
        mapListContainer.style.perspective = "1000px";
        mapListContainer.style.display = "flex";
        mapListContainer.style.alignItems = "center";
        mapListContainer.style.justifyContent = "center";
        mapListContainer.style.gap = "0px";

        // Renderizamos 3 posiciones: Izquierda, Centro, Derecha (Carrusel Infinito)
        [-1, 0, 1].forEach(offset => {
            // Cálculo del índice circular
            let idx = (centerIdx + offset) % totalMaps;
            if (idx < 0) idx = totalMaps + idx;

            const m = MAPS_LIST[idx];
            const isCenter = (offset === 0);
            const displayName = m.toUpperCase();

            const card = document.createElement('div');
            card.className = `setup-map-item coverflow-card ${isCenter ? 'center' : 'side'}`;
            
            // Inyectar clase de transición de entrada direccional y auto-limpiarla para que no interfiera con hover TCG
            if (directionClass) {
                card.classList.add(directionClass);
                setTimeout(() => {
                    card.classList.remove('enter-next', 'enter-prev');
                }, 500); // 500ms de limpieza justa tras asentarse
            }

            // Estilos dinámicos para el efecto 3D
            card.style.width = isCenter ? "22em" : "14.5em";
            card.style.height = "29em"; // Altura compacta y uniforme para el mazo
            card.style.minHeight = "0";
            card.style.zIndex = isCenter ? "10" : "5";
            card.style.opacity = isCenter ? "1" : "0.6";
            card.style.transform = isCenter ? "scale(1) translateZ(0)" : `scale(0.9) translateZ(-100px) translateX(${offset * 3.0}em) rotateY(${offset * -20}deg)`;
            card.style.transition = "all 0.3s cubic-bezier(0.23, 1, 0.32, 1)"; // Transición ágil
            card.style.cursor = "pointer";
            card.style.background = "none"; /* Quitar fondos del contenedor principal para que los stack-back se encarguen */
            card.style.borderRadius = "0px";
            card.style.padding = "0px"; /* Cero paddings para evitar desplazamientos extraños */
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.boxSizing = "border-box";
            card.style.margin = "0 -2.9em"; /* Mantener encabalgado de forma compacta en em */
            card.tabIndex = 0; // Enfocable para mando

            if (isCenter) {
                card.style.boxShadow = "0 15px 50px rgba(0,0,0,0.8), 0 0 30px var(--theme-glow)";
                
                let rect = null;
                
                card.onmouseenter = () => {
                    // Capturar el rect original estático antes de aplicar cualquier deformación 3D
                    rect = card.getBoundingClientRect();
                    // Eliminar la transición durante el movimiento para un rastreo instantáneo y sin temblores
                    card.style.transition = "none";
                };
                
                // Efecto interactivo de oscilación 3D estilo carta TCG
                card.onmousemove = (e) => {
                    if (!rect) rect = card.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    const maxRotate = 16; // Grados máximos de oscilación
                    const rotateY = ((x - centerX) / centerX) * maxRotate;
                    const rotateX = ((centerY - y) / centerY) * maxRotate;
                    
                    card.style.transform = `scale(1.05) translateZ(30px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
                    
                    // Brillo/Resplandor dinámico reactivo a la posición física del cursor
                    const glowX = ((x - centerX) / centerX) * 20;
                    const glowY = ((y - centerY) / centerY) * 20;
                    card.style.boxShadow = `${-glowX}px ${-glowY}px 40px var(--theme-glow-strong), 0 20px 60px rgba(0, 0, 0, 0.85)`;
                    
                    // Calcular porcentajes relativos de posición para el Foil Holográfico
                    const percentX = (x / rect.width) * 100;
                    const percentY = (y / rect.height) * 100;
                    card.style.setProperty('--glow-x', `${percentX}%`);
                    card.style.setProperty('--glow-y', `${percentY}%`);
                };
 
                card.onmouseleave = () => {
                    rect = null;
                    // Restauración fluida a la posición y sombra original reactivando la transición suave de retorno
                    card.style.transition = "all 0.5s cubic-bezier(0.23, 1, 0.32, 1)";
                    card.style.transform = "scale(1) translateZ(0) rotateX(0deg) rotateY(0deg)";
                    card.style.boxShadow = "0 15px 50px rgba(0,0,0,0.8), 0 0 30px var(--theme-glow)";
                };
            } else {
                // Hover reactivo con iluminación y acercamiento para tarjetas laterales (side)
                card.onmouseenter = () => {
                    card.style.opacity = "1";
                    card.style.transform = `scale(0.94) translateZ(-80px) translateX(${offset * 3.0}em) rotateY(${offset * -20}deg)`;
                    
                    const front = card.querySelector('.card-stack-front');
                    if (front) {
                        front.style.borderColor = "var(--theme-color)";
                        front.style.boxShadow = "0 0 25px var(--theme-glow-strong)";
                    }
                };
 
                card.onmouseleave = () => {
                    card.style.opacity = "0.6";
                    card.style.transform = `scale(0.9) translateZ(-100px) translateX(${offset * 3.0}em) rotateY(${offset * -20}deg)`;
                    
                    const front = card.querySelector('.card-stack-front');
                    if (front) {
                        front.style.borderColor = "#333";
                        front.style.boxShadow = "none";
                    }
                };
            }
 
            // HTML Dinámico de mazo apilado concéntrico en 3 capas del DOM (Diseño TCG Premium)
            card.innerHTML = `
                <!-- Capa 3: Carta de fondo del mazo -->
                <div class="card-stack-back-2 pixel-border" style="border-radius: 0px !important;"></div>
                <!-- Capa 2: Carta intermedia del mazo -->
                <div class="card-stack-back-1 pixel-border" style="border-radius: 0px !important;"></div>
                
                <!-- Capa 1: Carta frontal (Diseño TCG Premium de alta fidelidad) -->
                <div class="card-stack-front tcg-card-design pixel-border" style="border-radius: 0px !important; border: ${isCenter ? '4px solid var(--theme-color)' : '2px solid #333'} !important;">
                    ${m !== 'URBAN' ? `<div class="tcg-coming-soon-banner">PRÓXIMAMENTE</div>` : ''}
                    
                    <!-- Brillo de Foil Holográfico TCG (Flotante y Personalizado por Elemento) -->
                    <div class="tcg-shine shine-${displayName.toLowerCase()}"></div>
                    
                    <!-- 1. Cabecera (Header) de la Carta TCG -->
                    <div class="tcg-header">
                        <!-- Icono izquierdo (Gema de Rombo) -->
                        <div class="tcg-icon-left">
                            <div class="tcg-diamond-inner"></div>
                        </div>
                        
                        <!-- Banner central con nombre del mapa -->
                        <div class="tcg-title-banner">
                            <span class="tcg-map-name">${displayName}</span>
                        </div>
                        
                        <!-- Icono derecho (Hexágono) -->
                        <div class="tcg-icon-right">
                            <div class="tcg-hexagon-inner"></div>
                        </div>
                    </div>
                    
                    <!-- 2. Ilustración principal del Estadio (Enmarcada) -->
                    <div class="tcg-artwork-container">
                        <img src="recursos/maps/map${idx + 1}.png" class="tcg-map-img">
                        <div class="tcg-artwork-overlay"></div>
                    </div>
                    
                    <!-- 3. Caja de información del cromo (Sección Inferior) -->
                    <div class="tcg-info-box">
                        <div class="tcg-info-border-line"></div>
                        
                        <!-- Estadísticas y detalles estéticos del mapa -->
                        <div class="tcg-stats-content">
                            <div class="tcg-stat-row">
                                <span class="tcg-stat-label">TIPO:</span>
                                <span class="tcg-stat-value">
                                    ${idx === 0 ? 'ESTADIO PÍXEL' : 
                                      idx === 1 ? 'ESTADIO VOLCÁNICO' : 
                                      idx === 2 ? 'TIPO SUMERGIDO' : 'TIPO JUNGLA'}
                                </span>
                            </div>
                            <div class="tcg-stat-row">
                                <span class="tcg-stat-label">CAPACIDAD:</span>
                                <span class="tcg-stat-value">${idx === 0 ? '45,000 ESP' : idx === 1 ? '38,000 ESP' : idx === 2 ? '52,000 ESP' : '29,000 ESP'}</span>
                            </div>
                            <div class="tcg-stat-row">
                                <span class="tcg-stat-label">DIFICULTAD:</span>
                                <span class="tcg-stat-value" style="color: ${idx === 1 ? '#ff4d4d' : idx === 2 ? '#00ffcc' : idx === 3 ? '#00ff55' : '#ffffff'}">
                                    ${idx === 0 ? '★☆☆' : idx === 1 ? '★★☆' : idx === 2 ? '★★★' : '★★☆'}
                                </span>
                            </div>
                        </div>
                        
                        <!-- Pie de página TCG con seriales retro y créditos -->
                        <div class="tcg-footer">
                            <span class="tcg-serial">№ 00${idx + 1} / 004</span>
                            <span class="tcg-author">SCAPS TCG • HR EIST ARTIST</span>
                        </div>
                    </div>
                </div>
            `;

            const selectMap = (silent = false) => {
                if (m !== 'URBAN') {
                    selectedMap = null;
                    validateMatchSetup();
                    if (!silent) {
                        playSound('menu_error');
                        showInGameNotification("ESTE ESTADIO ESTARÁ DISPONIBLE PRÓXIMAMENTE EN LA VERSIÓN COMPLETA DE SCAPS.", "#ff4d4d", "🔒");
                    }
                    return;
                }
                selectedMap = m;
                validateMatchSetup();
                if (!silent) playSound('menu_click');
            };

            card.onfocus = () => {
                if (!isCenter) {
                    changeMap(idx + 1);
                } else {
                    selectMap(true);
                }
            };

            card.onclick = () => {
                if (!isCenter) {
                    changeMap(idx + 1);
                }
                selectMap(false);
            };

            card.onkeydown = (e) => {
                if (e.code === 'Enter' || e.code === 'Space') {
                    selectMap(false);
                }
            };

            mapListContainer.appendChild(card);
        });
    } catch (e) { console.error("Error load setup maps:", e); }
}

function validateMatchSetup() {
    // Normalizamos nombres para evitar errores de comparación
    const currentMap = String(selectedMap).toLowerCase();
    const currentMode = String(selectedMode).toLowerCase();

    const validMaps = ['urban'];
    const isValidMap = validMaps.includes(currentMap);
    const isValidMode = (currentMode === '2vs2' || currentMode === 'practica');

    console.log("Validando Setup:", { map: currentMap, mode: currentMode, isValid: (isValidMap && isValidMode) });

    const btnPlay = document.getElementById('setup-btn-play');
    if (btnPlay) {
        btnPlay.disabled = !(isValidMap && isValidMode);
    }
}

function showInGameNotification(text, color = "#5ad", icon = "🔒") {
    const overlay = document.getElementById('modal-alert-overlay');
    const msg = document.getElementById('modal-alert-message');
    const ico = document.getElementById('modal-alert-icon');
    const title = document.getElementById('modal-alert-title');
    
    // Guardar el elemento que tenía el foco para restaurarlo luego
    const lastFocus = document.activeElement;

    if (overlay && msg) {
        msg.innerText = text;
        if (ico) ico.innerText = icon;
        if (title) title.style.color = color;

        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');

        // Poner foco en el botón OK para cerrar con mando
        const okBtn = document.getElementById('btn-modal-alert-ok');
        if (okBtn) {
            okBtn.focus();
            // Sobrescribir el onclick para restaurar foco
            const originalClick = okBtn.onclick;
            okBtn.onclick = () => {
                if (typeof originalClick === 'function') originalClick();
                overlay.style.display = 'none';
                if (lastFocus) lastFocus.focus();
                playSound('menu_click');
            };
        }

        playSound('menu_error');
    }
}

let menuFadeActive = true;
async function finalizeStartGame() {
    // IMPORTANTE: Resumir audio context por gesto de usuario
    const { audioCtx, stopMusicFadeOut, startMatchMusic } = await import('./fx/audio.js');
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    // Detener suavemente la música del menú
    menuFadeActive = true;
    stopMusicFadeOut(1000, () => {
        menuFadeActive = false;
    });

    const trans = document.getElementById('match-transition');
    const fill = document.getElementById('loading-bar-fill');

    if (trans) trans.classList.add('active');
    if (setupOverlay) setupOverlay.style.display = 'none';

    // Función para actualizar la barra visualmente
    const updateBar = (p) => { if (fill) fill.style.width = p + '%'; };
    updateBar(10);

    // Aplicar personalización a los coches
    if (player1) {
        player1.name = USER_CONFIG.playerName;
        player1.imgUrl = USER_CONFIG.playerCar;
        player1.hue = USER_CONFIG.playerCarHue;
        player1.saturate = USER_CONFIG.playerCarSaturate;
        player1.boostType = USER_CONFIG.playerBoost; // Sincronizar Boost
    }
    if (player1_teammate) {
        player1_teammate.imgUrl = USER_CONFIG.playerCar;
        player1_teammate.hue = USER_CONFIG.playerCarHue;
        player1_teammate.saturate = USER_CONFIG.playerCarSaturate;
        player1_teammate.boostType = USER_CONFIG.playerBoost;
    }
    // Para los oponentes, podemos dejar el car2 por defecto o añadir lógica similar
    if (player2) player2.imgUrl = selectedCarP2;
    if (player2_teammate) player2_teammate.imgUrl = selectedCarP2;

    if (ball) ball.imgUrl = USER_CONFIG.playerBall;

    try {
        // 1. Cargar el JSON del mapa seleccionado
        const resp = await fetch(`maps/${selectedMap}.json?t=${Date.now()}`);
        if (resp.ok) {
            const mapData = await resp.json();
            applyMapConfig(mapData);
        }
        updateBar(40);

        // 2. Pre-carga y DECODIFICACIÓN de texturas
        // Esto es vital para evitar los microcortes. El navegador decodifica las imágenes base64
        // antes de que el motor de renderizado las necesite por primera vez.
        const assets = [
            CONST.CONFIG.BG_IMG_PATH,
            CONST.CONFIG.GOAL_TOP.img,
            CONST.CONFIG.GOAL_BOTTOM.img
        ].filter(src => src && src.length > 0);

        const preloadTask = assets.map(src => {
            return new Promise(resolve => {
                const img = new Image();
                img.onload = async () => {
                    if (img.decode) {
                        try { await img.decode(); } catch (e) { console.warn("Error decoding img", src); }
                    }
                    resolve();
                };
                img.onerror = () => { console.warn("Failed to load asset", src); resolve(); };
                img.src = getAssetPath(src);
            });
        });

        await Promise.all(preloadTask);
        updateBar(90);

        // 3. WARM-UP: Dibujamos el escenario una vez (invisible bajo la transición)
        // Esto fuerza a la GPU a subir las texturas a la VRAM antes de que empiece el zoom.
        try {
            ctx.save();
            ctx.globalAlpha = 0.01; // Casi invisible por si acaso
            drawField(ctx);
            drawGoalNets(ctx);
            ctx.restore();
        } catch (e) { console.warn("Warm-up render failed", e); }

        // 4. Pequeño margen para que el DOM respire y el fade-out sea suave
        setTimeout(() => {
            updateBar(100);

            setTimeout(() => {
                if (mainMenuEl) mainMenuEl.classList.add('hidden');
                if (trans) trans.classList.remove('active');

                // Configurar inicio de partida
                currentZoom = 0.1;
                targetZoom = 0.85;
                currentCamX = CONST.CONFIG.WORLD_W / 2;
                currentCamY = CONST.CONFIG.WORLD_H / 2;
                currentRotation = 0;

                gameState = 'zooming';
                isTrainingMode = (selectedMode === 'practica');
                allCars = [player1, player1_teammate, player2, player2_teammate];
                initAudio(player1, allCars);
                
                // Iniciar la música de partido aleatoria asegurando que el fadeout concluyó
                if (menuFadeActive) {
                    setTimeout(() => {
                        if (gameState !== 'menu') startMatchMusic();
                    }, 200);
                } else {
                    startMatchMusic();
                }
                
                applySpawns();
            }, 500);
        }, 300);

    } catch (err) {
        console.error("SCAPS: Error crítico durante la carga:", err);
        if (trans) trans.classList.remove('active');
        gameState = 'menu';
    }
}

function applyMapConfig(c) {
    if (!c) return;
    CONST.applyExternalConfig(c);
    setupBoostPads();
    console.log("Mapa aplicado:", { goals: c.goals, spawns: c.spawns?.length, boosts: c.boosts?.length });
}



// EVENTOS DE AUDIO Y REPRODUCTOR MP3
document.addEventListener('DOMContentLoaded', () => {
    const sliderVol = document.getElementById('slider-settings-vol');
    const btnMute = document.getElementById('btn-settings-mute');
    const btnPrev = document.getElementById('btn-prev-song');
    const btnNext = document.getElementById('btn-next-song');

    if (sliderVol) {
        sliderVol.addEventListener('input', (e) => {
            setMusicVolume(e.target.value / 100);
        });
        // Click opcional para feedback
        sliderVol.addEventListener('change', () => playSound('menu_click'));
    }

    if (btnMute) {
        btnMute.addEventListener('click', () => {
            const muted = toggleMusic();
            btnMute.innerText = muted ? '🔇' : '🔊';
            playSound('menu_click');
        });
    }

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            prevSong();
            playSound('menu_click');
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            nextSong();
            playSound('menu_click');
        });
    }

    const btnPlayPause = document.getElementById('btn-play-pause');
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', () => {
            const isPlaying = togglePlayPause();
            btnPlayPause.style.borderColor = isPlaying ? '#5ad' : '#fff';
            playSound('menu_click');
        });
    }

    // Toda la lógica de clics de modos se encuentra centralizada de forma segura en el manejador principal (línea 1348)

    const volIcon = document.getElementById('settings-vol-icon');
    if (volIcon) {
        volIcon.addEventListener('click', () => {
            const muted = toggleMusic();
            volIcon.innerText = muted ? '🔇' : '🔊';
            playSound('menu_click');
        });
    }
});

// Inicializar el gestor de boost cuando sea necesario
// (Esto se llamará dentro de init() o al abrir el panel)

// Ejecutar el inicio del juego
init();
function updateSettingsFocus(dir) {
    settingsFocusIndex = (settingsFocusIndex + dir + SETTINGS_CONTROLS_COUNT) % SETTINGS_CONTROLS_COUNT;
    
    // Quitar focus visual previo
    const controls = [
        getEl('slider-settings-vol'),
        getEl('slider-settings-sfx'),
        getEl('settings-toggle-bloom')
    ];

    controls.forEach((c, idx) => {
        if (!c) return;
        const parent = c.parentElement;
        if (idx === settingsFocusIndex) {
            parent.style.border = '2px solid #5ad'; // Cambiado a Azul
            parent.style.boxShadow = '0 0 15px rgba(90, 173, 237, 0.4)';
            c.focus();
        } else {
            parent.style.border = '1px solid rgba(255,255,255,0.1)';
            parent.style.borderColor = 'rgba(90, 173, 237, 0.2)';
            parent.style.boxShadow = 'none';
        }
    });
}

function adjustFocusedSetting(dir) {
    if (settingsFocusIndex === 0) { // Music
        const s = getEl('slider-settings-vol');
        if (s) { s.value = parseInt(s.value) + dir * 5; s.dispatchEvent(new Event('input')); }
    } else if (settingsFocusIndex === 1) { // SFX
        const s = getEl('slider-settings-sfx');
        if (s) { s.value = parseInt(s.value) + dir * 5; s.dispatchEvent(new Event('input')); }
    }
}

function syncSettingsAudioUI() {
    const btnPP = getEl('btn-play-pause');
    if (!btnPP) return;

    const paused = isMusicPaused();

    if (paused) {
        btnPP.innerHTML = `⏸ <span class="gamepad-badge gp-y" style="margin: 0; width: 1.4em !important; height: 1.4em !important;"></span>`;
        btnPP.style.borderColor = '#f33'; // Rojo
        btnPP.style.color = '#f33';
    } else {
        btnPP.innerHTML = `▶ <span class="gamepad-badge gp-y" style="margin: 0; width: 1.4em !important; height: 1.4em !important;"></span>`;
        btnPP.style.borderColor = '#2fb'; // Verde
        btnPP.style.color = '#2fb';
    }
}

function drawSettingsVisualizer() {
    const canvas = getEl('settings-audio-visualizer');
    if (!canvas) return;
    const ctxV = canvas.getContext('2d');
    const data = getAudioVisualData();
    
    ctxV.clearRect(0, 0, canvas.width, canvas.height);
    
    const barCount = 20;
    const barWidth = canvas.width / barCount;
    
    for (let i = 0; i < barCount; i++) {
        // Usar los primeros 20 bins del analizador
        const val = data[i] || 0;
        const barHeight = (val / 255) * canvas.height;
        
        // Efecto de color degradado basado en frecuencia
        ctxV.fillStyle = `hsl(${200 + (val/5)}, 80%, 60%)`;
        ctxV.fillRect(i * barWidth, canvas.height - barHeight, barWidth - 1, barHeight);
    }
}

function blinkSettingButton(id) {
    const el = getEl(id);
    if (!el) return;
    const originalBorder = el.style.borderColor;
    el.style.borderColor = '#fff';
    el.style.boxShadow = '0 0 20px rgba(255,255,255,0.8)';
    setTimeout(() => {
        el.style.borderColor = originalBorder;
        el.style.boxShadow = 'none';
    }, 150);
}

// --- SISTEMA DE PERSONALIZACIÓN Y NAVEGACIÓN ESPACIAL 2D ---
window.activeColorPopup = null;

function closeActiveColorPopup() {
    if (window.activeColorPopup) {
        const parentBtn = window.activeColorPopup.triggerButton;
        window.activeColorPopup.remove();
        window.activeColorPopup = null;
        if (parentBtn) parentBtn.focus();
        playSound('menu_click');
    }
}

function openColorPickerPopup(button, input) {
    if (window.activeColorPopup && window.activeColorPopup.triggerButton === button) {
        closeActiveColorPopup();
        return;
    }
    if (window.activeColorPopup) {
        closeActiveColorPopup();
    }

    const popup = document.createElement('div');
    popup.className = 'custom-color-popup';
    popup.triggerButton = button;
    
    // Inyectar estilos del popup y swatch si no existen
    if (!document.getElementById('custom-color-picker-styles')) {
        const style = document.createElement('style');
        style.id = 'custom-color-picker-styles';
        style.textContent = `
            .custom-color-popup {
                position: absolute;
                background: #0b0b1a;
                border: 3px solid #5ad;
                padding: 8px;
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                z-index: 10000;
                box-shadow: 0 0 20px rgba(90, 173, 237, 0.7);
                border-radius: 6px;
            }
            .custom-color-swatch {
                width: 28px;
                height: 28px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                cursor: pointer;
                border-radius: 4px;
                box-sizing: border-box;
                transition: transform 0.15s ease, border-color 0.15s ease;
            }
            .custom-color-swatch:focus,
            .custom-color-swatch:hover {
                outline: none;
                border-color: #22ffbb !important;
                box-shadow: 0 0 10px #22ffbb !important;
                transform: scale(1.2);
            }
            .custom-color-picker-btn {
                transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
            }
            .custom-color-picker-btn:focus,
            .custom-color-picker-btn:hover {
                outline: none;
                border-color: #22ffbb !important;
                box-shadow: 0 0 10px #22ffbb !important;
                transform: scale(1.05);
            }
        `;
        document.head.appendChild(style);
    }

    const colors = [
        "#ff0000", "#00ff00", "#0000ff", "#ffff00", 
        "#ff00ff", "#00ffff", "#ffffff", "#000000", 
        "#55aadd", "#22ffbb", "#ff9900", "#333333", 
        "#aaaaaa"
    ];

    colors.forEach(color => {
        const swatch = document.createElement('div');
        swatch.className = 'custom-color-swatch';
        swatch.style.background = color;
        swatch.tabIndex = 0;
        swatch.onclick = (e) => {
            e.stopPropagation();
            input.value = color;
            button.style.background = color;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            popup.remove();
            window.activeColorPopup = null;
            button.focus();
            playSound('menu_click');
        };
        swatch.onkeydown = (e) => {
            if (e.key === 'Enter') {
                swatch.click();
                e.preventDefault();
            }
        };
        popup.appendChild(swatch);
    });

    document.body.appendChild(popup);
    window.activeColorPopup = popup;

    const rect = button.getBoundingClientRect();
    popup.style.left = `${rect.left + window.scrollX}px`;
    popup.style.top = `${rect.bottom + window.scrollY + 6}px`;

    const firstSwatch = popup.querySelector('.custom-color-swatch');
    if (firstSwatch) firstSwatch.focus();

    playSound('menu_click');
}

function initCustomColorPickers() {
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        let btn = document.getElementById(`btn-picker-for-${input.id}`);
        if (btn) return;

        input.style.display = 'none';

        btn = document.createElement('button');
        btn.type = 'button';
        btn.id = `btn-picker-for-${input.id}`;
        btn.className = 'custom-color-picker-btn custom-color-picker-small';
        btn.style.background = input.value || '#ffffff';
        btn.style.width = '100%';
        btn.style.height = '25px';
        btn.style.border = '2px solid rgba(255,255,255,0.2)';
        btn.style.cursor = 'pointer';
        btn.style.boxSizing = 'border-box';
        btn.style.borderRadius = '4px';
        btn.tabIndex = 0;

        btn.onclick = (e) => {
            e.stopPropagation();
            openColorPickerPopup(btn, input);
        };

        input.parentNode.insertBefore(btn, input);
    });

    if (!window.customColorPickerGlobalClickRegistered) {
        window.customColorPickerGlobalClickRegistered = true;
        document.addEventListener('click', (e) => {
            if (window.activeColorPopup && !window.activeColorPopup.contains(e.target) && !window.activeColorPopup.triggerButton.contains(e.target)) {
                closeActiveColorPopup();
            }
        });
    }
}

function syncCustomColorPickerButtons() {
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        const btn = document.getElementById(`btn-picker-for-${input.id}`);
        if (btn) {
            btn.style.background = input.value;
        }
    });
}

function getSpatialNavigationTarget(direction, focusables) {
    const current = document.activeElement;
    if (!current || !focusables.includes(current)) {
        return focusables[0];
    }

    const currentRect = current.getBoundingClientRect();
    const currentX = currentRect.left + currentRect.width / 2;
    const currentY = currentRect.top + currentRect.height / 2;

    let bestTarget = null;
    let minScore = Infinity;

    focusables.forEach(elem => {
        if (elem === current) return;

        const rect = elem.getBoundingClientRect();
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        const dx = targetX - currentX;
        const dy = targetY - currentY;

        let isCorrectDirection = false;
        let score = 0;

        // Tolerancia de 8px para evitar que subpixel rendering confunda filas/columnas
        const threshold = 8;

        switch (direction) {
            case 'ArrowRight':
                isCorrectDirection = dx > threshold;
                score = Math.abs(dx) + Math.abs(dy) * 4;
                break;
            case 'ArrowLeft':
                isCorrectDirection = dx < -threshold;
                score = Math.abs(dx) + Math.abs(dy) * 4;
                break;
            case 'ArrowDown':
                isCorrectDirection = dy > threshold;
                score = Math.abs(dy) + Math.abs(dx) * 4;
                break;
            case 'ArrowUp':
                isCorrectDirection = dy < -threshold;
                score = Math.abs(dy) + Math.abs(dx) * 4;
                break;
        }

        if (isCorrectDirection) {
            if (score < minScore) {
                minScore = score;
                bestTarget = elem;
            }
        }
    });

    return bestTarget || current;
}
