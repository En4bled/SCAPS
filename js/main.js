import * as CONST from './core/constants.js';
import { Car } from './entities/car.js';
import { Ball } from './entities/ball.js';
import { BoostPad } from './entities/boost.js';
import { ExplosionParticle, ConfettiParticle } from './fx/particles.js';
import { setupInput } from './core/input.js';
import { drawField, drawGoalNets, createGrassDetails } from './world/field.js';
import { drawHUD, drawCarNames } from './ui/hud.js';
import { showScoreboard, hideScoreboard } from './ui/scoreboard.js';
import { checkCarBallCollision, checkCarCarCollision, updateCarAI, checkGoalPhysics, applyTirePhysics, applyGlobalFriction } from './world/physics.js';
import { initAudio, updateAudio, stopAllMotors, playSound, setBoostSound, toggleMusic, setMusicVolume, setSFXVolume, nextSong, prevSong, getCurrentSongInfo, togglePlayPause } from './fx/audio.js';
import { initPhysicsEditor } from './ui/physics_editor.js';
import { BOOST_DEFS } from './fx/boost_definitions.js';
import { EXPLOSION_DEFS } from './fx/explosion_definitions.js';
import { ReplaySystem } from './core/replay.js';
import { drawDynamicShadows, drawAmbientLighting, updateLights, drawWallShadows } from './ui/lighting.js';

// CONFIGURACIÓN DE USUARIO (USER.CONFIG)
const USER_CONFIG = {
    playerName: 'PILOTO_01',
    playerTitle: 'ALPHA TESTER',
    playerBanner: 'banner-style-default',
    playerAvatar: 'recursos/Car1.png',
    playerCar: 'recursos/Car1.png',
    playerCarHue: 0,
    playerCarSaturate: 100,
    playerBall: 'recursos/Ball1.png',
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

// Exportar para acceso desde UI tras inicialización
window.musicVolume = USER_CONFIG.musicVolume / 100;
window.sfxVolume = USER_CONFIG.sfxVolume / 100;

function saveUserConfig() {
    localStorage.setItem('SCAPS_USER_CONFIG', JSON.stringify(USER_CONFIG));
}

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

function loadUserConfig() {
    const saved = localStorage.getItem('SCAPS_USER_CONFIG');
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            Object.assign(USER_CONFIG, parsed); 
            // Asegurar que stats existe (merge profundo simple para stats)
            if (parsed.stats) {
                USER_CONFIG.stats = { ...USER_CONFIG.stats, ...parsed.stats };
            }
        } catch (e) { console.error("Error cargando configuración:", e); }
    }
    setMusicVolume(USER_CONFIG.musicVolume / 100);
    setSFXVolume(USER_CONFIG.sfxVolume / 100);
    applyBannerPosition();

    // Actualizar Tag de Versión
    const versionTag = document.getElementById('game-version-tag');
    if (versionTag) versionTag.innerText = `VERSIÓN ${CONST.CONFIG.VERSION}`;

    // Sincronizar UI inicial
    const inputName = document.getElementById('input-player-name');
    if (inputName) inputName.value = USER_CONFIG.playerName;
    const inputAvatarBg = document.getElementById('input-avatar-bg');
    if (inputAvatarBg) {
        inputAvatarBg.value = USER_CONFIG.playerAvatarBg;
        inputAvatarBg.oninput = (e) => {
            USER_CONFIG.playerAvatarBg = e.target.value;
            saveUserConfig();
            updatePlayerBanner();
        };
    }
    
    // Sincronizar Checkboxes de Bloom
    isBloomEnabled = USER_CONFIG.bloomEnabled !== undefined ? USER_CONFIG.bloomEnabled : true;
    
    const settingsBloomEl = document.getElementById('settings-toggle-bloom');
    if (settingsBloomEl) {
        settingsBloomEl.checked = isBloomEnabled;
        settingsBloomEl.onchange = (e) => {
            USER_CONFIG.bloomEnabled = e.target.checked;
            isBloomEnabled = e.target.checked;
            saveUserConfig();
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

    if (avatarImg) avatarImg.src = USER_CONFIG.playerAvatar;
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

    if (previewAvatar) previewAvatar.src = USER_CONFIG.playerAvatar;
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
        banner.style.left = USER_CONFIG.bannerPos.left + 'px';
        banner.style.bottom = USER_CONFIG.bannerPos.bottom + 'px';
    }
}

function setupDraggableBanner() {
    const banner = document.getElementById('song-notification');
    if (!banner) return;
    let isDragging = false, startX, startY;
    banner.addEventListener('mousedown', (e) => {
        isDragging = true;
        startX = e.clientX - banner.offsetLeft;
        startY = e.clientY - (window.innerHeight - banner.offsetTop - banner.offsetHeight);
        banner.style.transition = 'none';
        e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        USER_CONFIG.bannerPos.left = e.clientX - startX;
        USER_CONFIG.bannerPos.bottom = Math.max(0, window.innerHeight - e.clientY - 25);
        applyBannerPosition();
    });
    window.addEventListener('mouseup', () => {
        if (isDragging) { isDragging = false; banner.style.transition = 'opacity 1s ease-in-out, transform 0.2s'; saveUserConfig(); }
    });
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
let selectedCarP1 = 'recursos/car1.png';
let selectedCarP2 = 'recursos/car2.png';
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
let isPaused = false;
let countdownTimer = 3;
let gameTime = 60;
let lastTime = 0;
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

function renderExplosionSelection() {
    const list = document.getElementById('custom-explosion-list');
    if (!list) return;
    list.innerHTML = '';

    Object.keys(EXPLOSION_DEFS).forEach(key => {
        const def = EXPLOSION_DEFS[key];
        const item = document.createElement('div');
        item.className = 'selectable-item' + (USER_CONFIG.playerExplosion === key ? ' selected' : '');
        item.style.flexDirection = 'column';
        item.innerHTML = `
            <div style="font-size: 1.5em; margin-bottom: 0.2em;">${def.icon}</div>
            <div style="font-size: 0.6em; color: ${def.color === 'multi' ? '#fff' : def.color}; font-weight: bold; text-align: center;">${def.name}</div>
        `;
        item.onclick = () => {
            USER_CONFIG.playerExplosion = key;
            const tag = document.getElementById('explosion-name-tag');
            if (tag) {
                tag.innerText = def.name;
                tag.style.color = def.color === 'multi' ? '#f90' : def.color;
            }
            saveUserConfig();
            renderExplosionSelection();
            playSound('menu_click');
            explosionPreviewManager.trigger();
        };
        list.appendChild(item);
    });
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

    Object.keys(BOOST_DEFS).forEach(key => {
        const def = BOOST_DEFS[key];
        const item = document.createElement('div');
        item.className = 'selectable-item' + (USER_CONFIG.playerBoost === key ? ' selected' : '');
        item.style.flexDirection = 'column';
        item.innerHTML = `
            <div style="font-size: 1.5em; margin-bottom: 0.2em;">${def.icon}</div>
            <div style="font-size: 0.6em; color: ${def.color === 'multi' ? '#fff' : def.color}; font-weight: bold; text-align: center;">${def.name}</div>
        `;
        item.onclick = () => {
            USER_CONFIG.playerBoost = key;
            updateBoostPreviewInfo(key);
            saveUserConfig();
            renderBoostSelection();
            playSound('menu_click');
        };
        list.appendChild(item);
    });
}

function updateBoostPreviewInfo(key) {
    const def = BOOST_DEFS[key];
    const nameTag = document.getElementById('boost-name-tag');
    const descBox = document.querySelector('.boost-description');
    if (nameTag) {
        nameTag.innerText = def.name;
        nameTag.style.color = def.color === 'multi' ? '#fff' : def.color;
        nameTag.style.borderColor = def.color === 'multi' ? '#fff' : def.color;
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
            'nature': 'Rastro de hojas y esencia botánica regenerativa.'
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
            } else if (p.type === 'bubbles' || p.type === 'toxic') {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.strokeStyle = p.color;
                ctx.stroke(); // Solo borde para burbujas
            } else if (p.type === 'sparkles' || p.type === 'gold') {
                const s = p.size;
                ctx.beginPath();
                ctx.moveTo(p.x, p.y - s);
                ctx.lineTo(p.x + s / 2, p.y);
                ctx.lineTo(p.x, p.y + s);
                ctx.lineTo(p.x - s / 2, p.y);
                ctx.closePath();
                ctx.fill();
            } else {
                // Default: Círculos suaves (fuego, humo, etc.)
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
        ctx.restore();

        if (this.carImg.src !== window.location.origin + '/' + USER_CONFIG.playerCar) {
            this.carImg.src = USER_CONFIG.playerCar;
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

        const getEl = (id) => document.getElementById(id);
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
        player1 = new Car(0, 0, '#5ad', { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', drift: 'Space', isPlayer: true }, "JUGADOR 1", 'recursos/Car1.png');
        player1.isPlayer = true;
        player1_teammate = new Car(0, 0, '#5ad', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Chiclanaman", 'recursos/Car2.png');
        player2 = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Aitawer", 'recursos/Car3.png');
        player2_teammate = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Croquetas", 'recursos/Car4.png');

        // Inicializar objetos de teclas para los bots y asignar roles
        player1_teammate.aiState = { role: 'defender', targetBoostPad: null };
        player2.aiState = { role: 'attacker', targetBoostPad: null };
        player2_teammate.aiState = { role: 'support', targetBoostPad: null };

        [player1_teammate, player2, player2_teammate].forEach(bot => { bot.aiKeys = {}; });
        allCars = [player1, player1_teammate, player2, player2_teammate];
        ball = new Ball(CONST.CONFIG.WORLD_W / 2, CONST.CONFIG.WORLD_H / 2, 'recursos/Ball1.png');

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
        if (sliderMusic) {
            sliderMusic.value = USER_CONFIG.musicVolume;
            sliderMusic.oninput = (e) => {
                const vol = parseInt(e.target.value);
                USER_CONFIG.musicVolume = vol;
                setMusicVolume(vol / 100);
                saveUserConfig();
            };
        }

        const sliderSFX = getEl('slider-settings-sfx');
        if (sliderSFX) {
            sliderSFX.value = USER_CONFIG.sfxVolume;
            sliderSFX.oninput = (e) => {
                const vol = parseInt(e.target.value);
                USER_CONFIG.sfxVolume = vol;
                setSFXVolume(vol / 100);
                saveUserConfig();
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

        ['btn-custom-back', 'btn-settings-back', 'btn-credits-back'].forEach(id => {
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
        if (btnMapPrev) btnMapPrev.onclick = () => { if (currentMapPage > 1) { currentMapPage--; loadSetupMaps(); playSound('menu_click'); } };
        if (btnMapNext) btnMapNext.onclick = () => { currentMapPage++; loadSetupMaps(); playSound('menu_click'); };

        if (btnExitSetup) btnExitSetup.onclick = () => {
            setupOverlay.style.display = 'none';
            if (mainMenuEl) mainMenuEl.style.display = 'flex';
        };

        document.querySelectorAll('.mode-option').forEach(btn => {
            btn.onclick = () => {
                if (btn.classList.contains('locked')) {
                    showInGameNotification("ACCESO DENEGADO: MODO EN DESARROLLO", "#f33", "🚫");
                    playSound('menu_error');
                    return;
                }
                document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMode = btn.dataset.mode;
                playSound('menu_click');
                validateMatchSetup();
            };
        });

        if (introPhase === 3 && mainMenuEl) {
            mainMenuEl.classList.remove('hidden');
            mainMenuEl.style.display = 'flex';
            showMenuScreen('initial');
        }

        window.addEventListener('keydown', (e) => {
            // Manejo de la Intro (Solo se puede saltar en la Escena 2)
            if (gameState === 'intro' && e.code === 'Space') {
                if (introPhase === 2) {
                    transitionToPhase(3);
                }
                return;
            }

            if (e.code === 'Tab') { e.preventDefault(); e.stopPropagation(); }
            if (e.code === 'Escape' && gameState !== 'menu') { togglePause(); }
        });

        window.addEventListener('mousemove', (e) => {
            if (gameState === 'menu' || introPhase < 3) { mouseX = (e.clientX / window.innerWidth) - 0.5; mouseY = (e.clientY / window.innerHeight) - 0.5; }
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

        // MP3 en Pausa
        const pPP = getEl('btn-pause-play-pause');
        if (pPP) pPP.onclick = () => { togglePlayPause(); syncPauseMenuAudioUI(); };
        const pPrev = getEl('btn-pause-prev');
        if (pPrev) pPrev.onclick = () => { prevSong(); syncPauseMenuAudioUI(); };
        const pNext = getEl('btn-pause-next');
        if (pNext) pNext.onclick = () => { nextSong(); syncPauseMenuAudioUI(); };

        const psMusic = getEl('slider-pause-music');
        if (psMusic) psMusic.oninput = (e) => { setMusicVolume(e.target.value / 100); };
        const psSFX = getEl('slider-pause-sfx');
        if (psSFX) psSFX.oninput = (e) => { setSFXVolume(e.target.value / 100); };

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
                const val = e.target.value;
                if (volValue) volValue.innerText = val + '%';
                setMusicVolume(val / 100);
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

    // --- EFECTO JUICE: HIT-STOP ---
    // Si hay un impacto masivo, congelamos el tiempo y el render para dar sensación de brutalidad
    if (hitStopFrames > 0) {
        hitStopFrames--;
        requestAnimationFrame(gameLoop);
        return;
    }

    if (!isPaused) {
        if (gameState !== 'menu' && gameState !== 'gameOver') {
            updateAll(dt);
        }
    }

    renderFrame();
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
    drawHUD(ctx, canvas, gameTime, score, player1, cameraMode);
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
        player1.update(keysPressed, gameState, particles, skidMarks, timeScale);
        applyTirePhysics(player1, timeScale);

        allCars.forEach(car => {
            if (car !== player1) {
                const aiKeys = {};
                updateCarAI(car, ball, boostPads, gameState, aiKeys, allCars);
                car.update(aiKeys, gameState, particles, skidMarks, timeScale);
                applyTirePhysics(car, timeScale);
            }
        });

        ball.update(gameState, particles, timeScale);
        
        // 2. Colisiones Ball/Car
        allCars.forEach(car => {
            checkCarBallCollision(car, ball, touchHistory, gameTime, timeScale);
        });

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

        checkCollisions();
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

    [particles, explosionParticles, confettiParticles, skidMarks].forEach(arr => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const obj = arr[i];
            if (obj && typeof obj.update === 'function') {
                obj.update();
            }
            if (obj.lifespan <= 0) arr.splice(i, 1);
        }
    });

    animationFrameCounter++;
    updateAudio();
    if (player1) setBoostSound(player1.isBoosting);
    updateUI(dt);
}

function checkCollisions() {
    // Permitimos que corra durante goalScored para que los coches puedan moverse (car.move)
    if (gameState !== 'playing' && gameState !== 'goalScored') return;

    for (let i = 0; i < allCars.length; i++) {
        const car = allCars[i];
        checkCarBallCollision(car, ball, touchHistory, gameTime);
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
        // Factor de 0.006 para una duración algo más ágil pero fluida
        currentZoom += (targetZoom - currentZoom) * 0.006;
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
        gameTime -= dt;
        // Acumular tiempo de juego real
        if (USER_CONFIG.stats) {
            USER_CONFIG.stats.playTime = (USER_CONFIG.stats.playTime || 0) + dt;
        }
        if (gameTime <= 0) {
            gameTime = 0;
            showGameOver();
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
    allCars.forEach(car => { car.speed = 0; car.vx = 0; car.vy = 0; car.boost = 33; });
    ball.x = CONST.CONFIG.WORLD_W / 2; ball.y = CONST.CONFIG.WORLD_H / 2;
    ball.vx = 0; ball.vy = 0; ball.onWallTimer = 0;
    ball.isFireball = false; ball.fireballTimer = 0; ball.visualRadius = ball.radius; ball.targetRadius = ball.radius;
    skidMarks = []; particles = []; confettiParticles = []; touchHistory = [];
    countdownTimer = 3; gameState = 'countdown';
    targetZoom = 0.85; // Resetear zoom de cámara
    if (countdownEl) countdownEl.style.display = 'block';
    if (gameOverOverlay) gameOverOverlay.style.display = 'none';
    playSound('countdown');
}

function showGameOver() {
    gameState = 'gameOver';
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

        // --- ACTUALIZAR ESTADÍSTICAS PERSISTENTES ---
        if (USER_CONFIG.stats) {
            const stats = USER_CONFIG.stats;
            stats.totalMatches = (stats.totalMatches || 0) + 1;
            stats.totalGoals = (stats.totalGoals || 0) + player1.goals;

            let earnedXP = 500; // Base por partido terminado
            earnedXP += player1.goals * 100;
            earnedXP += player1.assists * 50;

            if (score.blue > score.orange) {
                stats.matchesWon = (stats.matchesWon || 0) + 1;
                earnedXP += 250; // Bonus victoria
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
            syncPauseMenuAudioUI();
        }
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

function startIntro() {
    introPhase = 1;
    const slide1 = document.getElementById('intro-slide-1');
    const introScreen = document.getElementById('intro-screen');

    if (introScreen) introScreen.style.display = 'flex';

    // Escena 1: Logo (Fade In automático por CSS al añadir active)
    setTimeout(() => {
        if (slide1) slide1.classList.add('active');
    }, 100);

    // Tras 3 segundos, iniciamos el Fade Out de la Escena 1 y pasamos a la 2
    setTimeout(() => {
        if (introPhase === 1) transitionToPhase(2);
    }, 3500);
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
        // Ignorar el botón de cerrar/guardar de la lógica de pestañas
        if (btn.classList.contains('btn-close-custom')) return;

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

    // Sliders de Tinte
    const hueSlider = document.getElementById('slider-car-hue');
    const satSlider = document.getElementById('slider-car-saturate');
    const previewImg = document.getElementById('car-preview-img');

    const updatePreview = () => {
        USER_CONFIG.playerCarHue = hueSlider.value;
        USER_CONFIG.playerCarSaturate = satSlider.value;
        if (previewImg) {
            previewImg.style.filter = `hue-rotate(${USER_CONFIG.playerCarHue}deg) saturate(${USER_CONFIG.playerCarSaturate}%) drop-shadow(0 0 15px rgba(90,173,237,0.5))`;
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

function renderAvatars() {
    const container = document.getElementById('avatar-list');
    const pageInfo = document.getElementById('avatar-page-info');
    if (!container) return;
    container.innerHTML = '';

    // Generar lista de 100 avatares
    const totalAvatars = 100;
    const avatars = [];
    for (let i = 1; i <= totalAvatars; i++) {
        avatars.push(`recursos/avatar/avatar (${i}).png`);
    }

    const totalPages = Math.ceil(totalAvatars / AVATARS_PER_PAGE);
    if (currentAvatarPage > totalPages) currentAvatarPage = totalPages;
    if (currentAvatarPage < 1) currentAvatarPage = 1;

    if (pageInfo) pageInfo.innerText = `${currentAvatarPage} / ${totalPages}`;

    const startIdx = (currentAvatarPage - 1) * AVATARS_PER_PAGE;
    const pageItems = avatars.slice(startIdx, startIdx + AVATARS_PER_PAGE);

    pageItems.forEach(url => {
        const item = document.createElement('div');
        item.className = 'selectable-item' + (USER_CONFIG.playerAvatar === url ? ' selected' : '');
        // Aplicamos fondo personalizado
        item.style.background = USER_CONFIG.playerAvatarBg;

        item.innerHTML = `<img src="${url}" style="width: 85%; height: 85%; object-fit: contain;">`;
        item.onclick = () => {
            USER_CONFIG.playerAvatar = url;
            saveUserConfig();
            renderAvatars();
            updatePlayerBanner();
            playSound('menu_click');
        };
        container.appendChild(item);
    });
}

function renderCarSelection() {
    const list = document.getElementById('custom-car-list');
    const previewImg = document.getElementById('car-preview-img');
    if (!list) return;

    const carImages = [];
    for (let i = 1; i <= 10; i++) carImages.push(`recursos/Car${i}.png`);

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
                if (previewImg) previewImg.src = img;
                saveUserConfig();
                renderCarSelection();
                playSound('menu_click');
            };
        }
        list.appendChild(item);
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
        previewImg.src = USER_CONFIG.playerCar;
        previewImg.style.filter = `hue-rotate(${USER_CONFIG.playerCarHue}deg) saturate(${USER_CONFIG.playerCarSaturate}%) drop-shadow(0 0 15px rgba(90,173,237,0.5))`;
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
        item.className = 'selectable-item' + (USER_CONFIG.playerBall === url ? ' selected' : '');
        item.innerHTML = `<img src="${url}">`;
        item.onclick = () => {
            USER_CONFIG.playerBall = url;
            saveUserConfig();
            renderBallSelection();
            playSound('menu_click');
        };
        container.appendChild(item);
    });
}

function setupTitleSelect() {
    const select = document.getElementById('select-player-title');
    if (!select) return;

    const titles = [
        "Su ilustrísima", "Random noob", "Alpha Tester", "Beta Tester",
        "Leyenda Urbana", "Maestro del Balón", "Turboadicto",
        "Goleador Nato", "Rey del Aire", "Developer"
    ];

    select.innerHTML = '';
    titles.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.innerText = t.toUpperCase();
        if (USER_CONFIG.playerTitle === t) opt.selected = true;
        select.appendChild(opt);
    });

    select.onchange = (e) => {
        USER_CONFIG.playerTitle = e.target.value;
        saveUserConfig();
        updatePlayerBanner();
        playSound('menu_click');
    };
}



function showMenuScreen(screenId) {
    // Asegurar que el contenedor principal esté visible
    if (mainMenuEl) {
        mainMenuEl.style.display = 'flex';
        mainMenuEl.classList.remove('hidden');
    }

    [menuInitial, menuCredits, menuCustom, menuSettings].forEach(m => { if (m) m.style.display = 'none'; });

    const logo = document.getElementById('menu-logo');
    if (logo) logo.style.display = (screenId === 'initial') ? 'block' : 'none';

    const btnMapEditor = document.getElementById('btn-map-editor');
    if (btnCredits) btnCredits.style.display = (screenId === 'initial') ? 'block' : 'none';
    if (btnMapEditor) btnMapEditor.style.display = (screenId === 'initial') ? 'block' : 'none';

    if (screenId === 'initial' && menuInitial) {
        menuInitial.style.display = 'flex';
        // Asegurar que el fondo de vídeo sea visible en el menú inicial
        const videoBg = document.getElementById('menu-video-bg');
        if (videoBg) videoBg.style.opacity = '1';
    }
    else if (screenId === 'credits' && menuCredits) menuCredits.style.display = 'flex';
    else if (screenId === 'custom' && menuCustom) {
        menuCustom.style.display = 'flex';
        updateStatsUI();
        // Reset a la primera pestaña y sub-pestaña
        const profileTab = document.querySelector('.custom-tab-btn[data-tab="perfil"]');
        if (profileTab) profileTab.click();
        
        const dataSubTab = document.querySelector('.subtab-btn[data-sub="datos"]');
        if (dataSubTab) dataSubTab.click();
    }
    else if (screenId === 'settings' && menuSettings) menuSettings.style.display = 'flex';

    updatePlayerBanner();
}

async function startGame() {
    if (mainMenuEl) mainMenuEl.style.display = 'none';
    if (setupOverlay) {
        setupOverlay.style.display = 'flex';
        loadSetupMaps();
    }
}

async function loadSetupMaps() {
    if (!mapListContainer) return;
    try {
        const resp = await fetch('php/get_maps.php');
        let maps = await resp.json();

        // Asegurar al menos 10 mapas para la demostración de paginación si faltan
        while (maps.length < 10) maps.push(`MAPA ${maps.length + 1}`);

        const MAPS_LIST = ['URBAN', 'ATLANTIS', 'VOLCANO', 'WINTER'];
        const totalMaps = MAPS_LIST.length;

        // El currentMapPage ahora actuará como el índice del mapa central (1 a totalMaps)
        if (currentMapPage > totalMaps) currentMapPage = totalMaps;
        if (currentMapPage < 1) currentMapPage = 1;

        const centerIdx = currentMapPage - 1;
        const pageInfo = document.getElementById('map-page-info');
        if (pageInfo) pageInfo.innerText = `${currentMapPage} / ${totalMaps}`;

        const btnPrev = document.getElementById('btn-map-prev');
        const btnNext = document.getElementById('btn-map-next');
        if (btnPrev) { btnPrev.disabled = (currentMapPage === 1); btnPrev.style.opacity = (currentMapPage === 1) ? '0.3' : '1'; }
        if (btnNext) { btnNext.disabled = (currentMapPage === totalMaps); btnNext.style.opacity = (currentMapPage === totalMaps) ? '0.3' : '1'; }

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

            // Estilos dinámicos para el efecto 3D
            card.style.width = isCenter ? "280px" : "180px";
            card.style.height = "fit-content !important"; // Forzar ajuste al contenido
            card.style.minHeight = "0";
            card.style.zIndex = isCenter ? "10" : "5";
            card.style.opacity = isCenter ? "1" : "0.6";
            card.style.transform = isCenter ? "scale(1) translateZ(0)" : `scale(0.9) translateZ(-100px) translateX(${offset * 35}px) rotateY(${offset * -20}deg)`;
            card.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
            card.style.cursor = "pointer";
            card.style.background = "#0a0a19";
            card.style.borderRadius = "12px";
            card.style.padding = "10px 10px 10px 10px"; // Padding uniforme
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.boxSizing = "border-box";
            card.style.margin = "0 -35px";

            if (isCenter) {
                card.style.boxShadow = "0 15px 50px rgba(0,0,0,0.8), 0 0 30px rgba(90,173,237,0.3)";
            }

            card.innerHTML = `
                <div class="pixel-border" style="width: 100%; height: 290px; overflow: hidden; background: #000; border: ${isCenter ? '4px solid #5ad' : '2px solid #333'} !important; position: relative;">
                    <img src="recursos/Map${idx + 1}.png" style="width: 100%; height: 100%; object-fit: cover;">
                    <div style="position: absolute; bottom: 0; left: 0; width: 100%; height: 60%; background: linear-gradient(to top, rgba(10,10,25,1) 0%, rgba(10,10,25,0.7) 40%, transparent 100%); opacity: ${isCenter ? 1 : 0}; transition: opacity 0.3s;"></div>
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; margin-top: -35px; opacity: ${isCenter ? 1 : 0}; transition: all 0.4s ease; pointer-events: none; z-index: 20; transform: ${isCenter ? 'translateY(0)' : 'translateY(15px)'}">
                    <!-- Etiqueta Cyberpunk Neon Tag -->
                    <div style="background: rgba(5, 5, 15, 0.9); border: 2px solid #5ad; padding: 4px 25px; box-shadow: 0 0 20px rgba(90, 173, 237, 0.4); position: relative; display: flex; align-items: center; justify-content: center; clip-path: polygon(10% 0, 100% 0, 90% 100%, 0 100%);">
                        <span style="color: #5ad; font-family: 'Rajdhani', sans-serif; font-size: 16px; font-weight: 900; letter-spacing: 5px; text-transform: uppercase; text-shadow: 0 0 10px rgba(90, 173, 237, 0.8);">
                            ${displayName}
                        </span>
                    </div>
                </div>
            `;

            card.onclick = () => {
                if (!isCenter) {
                    currentMapPage = idx + 1;
                    loadSetupMaps();
                }
                selectedMap = m;
                validateMatchSetup();
                playSound('menu_click');
            };

            mapListContainer.appendChild(card);
        });
    } catch (e) { console.error("Error load setup maps:", e); }
}

function validateMatchSetup() {
    // Normalizamos nombres para evitar errores de comparación
    const currentMap = String(selectedMap).toLowerCase();
    const currentMode = String(selectedMode).toLowerCase();

    const validMaps = ['urban', 'atlantis', 'volcano', 'winter'];
    const isValidMap = validMaps.includes(currentMap);
    const isValidMode = (currentMode === '2vs2');

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

    if (overlay && msg) {
        msg.innerText = text;
        if (ico) ico.innerText = icon;
        if (title) title.style.color = color;

        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');

        playSound('menu_error');
    }
}

async function finalizeStartGame() {
    // IMPORTANTE: Resumir audio context por gesto de usuario
    const { audioCtx } = await import('./fx/audio.js');
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

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
                img.src = src;
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
                allCars = [player1, player1_teammate, player2, player2_teammate];
                initAudio(player1, allCars);
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

    // Listeners para Modos de Juego
    document.querySelectorAll('.mode-option').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.classList.contains('locked')) {
                showInGameNotification("MODO BLOQUEADO: PRÓXIMAMENTE", "#f90", "🔒");
                return;
            }

            // Seleccionar modo válido
            document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            selectedMode = btn.getAttribute('data-mode');

            playSound('menu_click');
            validateMatchSetup();
        });
    });

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
