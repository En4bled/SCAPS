import * as CONST from './core/constants.js';
import { Car } from './entities/car.js';
import { Ball } from './entities/ball.js';
import { BoostPad } from './entities/boost.js';
import { ExplosionParticle, ConfettiParticle } from './fx/particles.js';
import { setupInput } from './core/input.js';
import { drawField, drawGoalNets, createGrassDetails } from './world/field.js';
import { drawHUD, drawCarNames } from './ui/hud.js';
import { showScoreboard, hideScoreboard } from './ui/scoreboard.js';
import { checkCarBallCollision, checkCarCarCollision, updateCarAI, checkGoalPhysics } from './world/physics.js';
import { initAudio, updateAudio, playSound, setBoostSound, toggleMusic, setMusicVolume, setSFXVolume, nextSong, prevSong, getCurrentSongInfo, togglePlayPause } from './fx/audio.js';
import { initPhysicsEditor } from './ui/physics_editor.js';

// CONFIGURACIÓN DE USUARIO (USER.CONFIG)
const USER_CONFIG = {
    playerName: 'PILOTO_01',
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
    bannerPos: { left: 220, bottom: 100 }
};

function loadUserConfig() {
    const saved = localStorage.getItem('SCAPS_USER_CONFIG');
    if (saved) {
        try { Object.assign(USER_CONFIG, JSON.parse(saved)); } catch(e) {}
    }
    setMusicVolume(USER_CONFIG.musicVolume / 100);
    setSFXVolume(USER_CONFIG.sfxVolume / 100);
    applyBannerPosition();
    
    // Sincronizar UI inicial
    const inputName = document.getElementById('input-player-name');
    if (inputName) inputName.value = USER_CONFIG.playerName;
    const inputAvatarBg = document.getElementById('input-avatar-bg');
    if (inputAvatarBg) inputAvatarBg.value = USER_CONFIG.playerAvatarBg;
    selectedCarP1 = USER_CONFIG.playerCar;
    updatePlayerBanner();
}

function updatePlayerBanner() {
    const banner = document.getElementById('player-banner');
    if (!banner) return;
    
    const avatarImg = document.getElementById('player-banner-avatar');
    const avatarFrame = document.getElementById('player-banner-avatar-frame');
    const nameSpan = document.getElementById('player-banner-name');

    if (avatarImg) avatarImg.src = USER_CONFIG.playerAvatar;
    if (avatarFrame) avatarFrame.style.background = USER_CONFIG.playerAvatarBg;
    if (nameSpan) nameSpan.innerText = USER_CONFIG.playerName;
    
    // Solo se muestra si estamos en el menú principal inicial
    const isMainInitial = (menuInitial && menuInitial.style.display !== 'none');
    banner.style.display = (gameState === 'menu' && isMainInitial) ? 'flex' : 'none';
    banner.style.opacity = (gameState === 'menu' && isMainInitial) ? '1' : '0';
}

function saveUserConfig() {
    localStorage.setItem('SCAPS_USER_CONFIG', JSON.stringify(USER_CONFIG));
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
const AVATARS_PER_PAGE = 9;
const MAPS_PER_PAGE = 1;
const BALLS_PER_PAGE = 10;
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

async function init() {
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
                if (gameState === 'playing' || gameState === 'countdown') {
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

            if (e.code === 'Escape' && gameState !== 'menu') { togglePause(); }
        });

        window.addEventListener('mousemove', (e) => {
            if (gameState === 'menu' || introPhase < 3) { mouseX = (e.clientX / window.innerWidth) - 0.5; mouseY = (e.clientY / window.innerHeight) - 0.5; }
        });

        // Listeners de Pausa
        const pContinue = getEl('btn-pause-continue'); if (pContinue) pContinue.onclick = () => togglePause();
        const pRestart = getEl('btn-pause-restart'); if (pRestart) pRestart.onclick = () => { score = { blue: 0, orange: 0 }; gameTime = 60; togglePause(); resetAfterGoal(); };
        const pExit = getEl('btn-pause-exit'); if (pExit) pExit.onclick = () => { isPaused = false; const pm = getEl('pause-menu'); if (pm) pm.style.display = 'none'; gameState = 'menu'; showMenuScreen('initial'); if (mainMenuEl) { mainMenuEl.classList.remove('hidden'); mainMenuEl.style.display = 'flex'; const videoBg = document.getElementById('menu-video-bg'); if (videoBg) videoBg.style.opacity = '1'; } };
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
    currentCamX += (targetX - currentCamX) * camLerp;
    currentCamY += (targetY - currentCamY) * camLerp;
    currentVOffset += (vOffset - currentVOffset) * 0.05;
    let rd = targetRot - currentRotation; rd = (rd + Math.PI) % (Math.PI * 2) - Math.PI; currentRotation += rd * 0.1;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + currentVOffset);
    ctx.rotate(currentRotation);
    
    // Aplicar Zoom Dinámico (Cinemática de inicio)
    ctx.scale(currentZoom, currentZoom);
    
    ctx.translate(-currentCamX, -currentCamY);

    drawAll();

    // Solo dibujar nombres y HUD si estamos en partida
    if (gameState !== 'menu' && gameState !== 'intro') {
        drawCarNames(ctx, allCars, player1, cameraMode, gameState);
        drawHUD(ctx, canvas, gameTime, score, player1, cameraMode);
    }

    ctx.restore();
}

function updateAll(dt) {
    if (gameState === 'playing' || gameState === 'countdown') {
        // Actualizar IA de cada bot de forma independiente
        updateCarAI(player1_teammate, ball, boostPads, gameState, player1_teammate.aiKeys, allCars);
        updateCarAI(player2, ball, boostPads, gameState, player2.aiKeys, allCars);
        updateCarAI(player2_teammate, ball, boostPads, gameState, player2_teammate.aiKeys, allCars);

        // El jugador usa keysPressed (teclado), los bots usan sus aiKeys
        player1.update(keysPressed, gameState, particles, skidMarks);
        player1_teammate.update(player1_teammate.aiKeys, gameState, particles, skidMarks);
        player2.update(player2.aiKeys, gameState, particles, skidMarks);
        player2_teammate.update(player2_teammate.aiKeys, gameState, particles, skidMarks);

        ball.update(gameState, explosionParticles);
        boostPads.forEach(pad => pad.update());

        checkCollisions();
    }

    [particles, explosionParticles, confettiParticles, skidMarks].forEach(arr => {
        for (let i = arr.length - 1; i >= 0; i--) { arr[i].update(); if (arr[i].lifespan <= 0) arr.splice(i, 1); }
    });

    animationFrameCounter++;
    updateAudio();
    if (player1) setBoostSound(player1.isBoosting);
    updateUI(dt);
}

function checkCollisions() {
    if (gameState !== 'playing') return;

    for (let i = 0; i < allCars.length; i++) {
        const car = allCars[i];
        checkCarBallCollision(car, ball, touchHistory, gameTime);
        for (let j = i + 1; j < allCars.length; j++) {
            checkCarCarCollision(car, allCars[j]);
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

    const scorer = ball.checkGoal();
    if (scorer) handleGoal(scorer);
}

function handleGoal(scorer) {
    if (scorer === 'blue') score.blue++; else score.orange++;
    gameState = 'goalScored';
    
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
    spawnGoalEffects(ball.x, ball.y);
    if (goalTextEl) goalTextEl.style.display = 'block';
    setTimeout(() => { if (goalTextEl) goalTextEl.style.display = 'none'; }, 2500);
    setTimeout(resetAfterGoal, 5000);
}

function spawnGoalEffects(x, y) {
    for (let i = 0; i < 120; i++) explosionParticles.push(new ExplosionParticle(x, y, Math.random() * 50 - 25));
    for (let i = 0; i < 150; i++) confettiParticles.push(new ConfettiParticle(x, y));
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
        const dist = Math.sqrt(dx*dx + dy*dy);
        // Umbral reducido para un encuadre perfecto antes de empezar
        if (dist < 10) {
            resetAfterGoal(); // Esto pone gameState = 'countdown'
        }
    }
    if (gameState === 'playing') { 
        gameTime -= dt; 
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
        
        playSound('goal'); // Reutilizamos el sonido de gol para el final
    }
}

function drawAll() {
    drawField(ctx);

    // Si estamos en el menú o intro, solo dibujamos el campo como fondo
    if (gameState === 'menu' || gameState === 'intro') return;

    skidMarks.forEach(s => s.draw(ctx));
    boostPads.forEach(pad => pad.draw(ctx));
    particles.forEach(p => p.draw(ctx));
    ball.draw(ctx, animationFrameCounter);
    allCars.forEach(car => car.draw(ctx));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; explosionParticles.forEach(ep => ep.draw(ctx)); ctx.restore();
    ctx.save(); confettiParticles.forEach(cp => cp.draw(ctx)); ctx.restore();

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
function togglePause() { isPaused = !isPaused; const pm = document.getElementById('pause-menu'); if (pm) pm.style.display = isPaused ? 'flex' : 'none'; }
function applySpawns() { allCars.forEach((car, i) => { const sp = CONST.CONFIG.SPAWN_POINTS[i] || { x: 500, y: 500, a: 0 }; car.x = sp.x; car.y = sp.y; car.angle = sp.a; }); }

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
                initAudio(player1, allCars);

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
        btn.onclick = () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const target = btn.dataset.tab;
            document.querySelectorAll('.custom-pane').forEach(p => p.classList.remove('active'));
            document.getElementById('pane-' + target).classList.add('active');
            playSound('menu_click');
            
            if (target === 'perfil') renderAvatars();
            if (target === 'vehiculo') renderCarSelection();
            if (target === 'balon') renderBallSelection();
            if (target === 'boost') { renderBoostSelection(); startCustomPreview('boost'); }
            if (target === 'explosion') { renderExplosionSelection(); startCustomPreview('explosion'); }
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
}

function renderAvatars() {
    const container = document.getElementById('avatar-list');
    const pageInfo = document.getElementById('avatar-page-info');
    if (!container) return;
    container.innerHTML = '';
    
    // Generar lista de 100 avatares
    const totalAvatars = 100;
    const avatars = [];
    for(let i=1; i<=totalAvatars; i++) {
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
        item.style.borderRadius = '4px';
        
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
    for(let i=1; i<=10; i++) carImages.push(`recursos/Car${i}.png`);

    list.innerHTML = '';
    
    // Renderizar los 10 coches reales
    carImages.forEach(img => {
        const item = document.createElement('div');
        item.className = 'selectable-item' + (USER_CONFIG.playerCar === img ? ' selected' : '');
        item.innerHTML = `<img src="${img}">`;
        item.onclick = () => {
            USER_CONFIG.playerCar = img;
            selectedCarP1 = img;
            if (previewImg) previewImg.src = img;
            saveUserConfig();
            renderCarSelection();
            playSound('menu_click');
        };
        list.appendChild(item);
    });

    // Añadir botón "PROXIMAMENTE" (Ocupando 2 huecos)
    const nextItem = document.createElement('div');
    nextItem.className = 'selectable-item';
    nextItem.style.background = 'rgba(0,0,0,0.3)';
    nextItem.style.borderStyle = 'dashed';
    nextItem.style.opacity = '0.5';
    nextItem.style.gridColumn = 'span 2'; // Ocupa 2 columnas
    nextItem.innerHTML = `<span style="font-size: 11px; font-weight: bold; color: #5ad; text-align: center; padding: 5px; letter-spacing: 2px;">PROXIMAMENTE</span>`;
    list.appendChild(nextItem);

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
    for(let i=1; i<=totalBalls; i++) {
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
        item.innerHTML = `<img src="${url}" style="width: 75%; height: 75%; object-fit: contain;">`;
        item.onclick = () => {
            USER_CONFIG.playerBall = url;
            saveUserConfig();
            renderBallSelection();
            playSound('menu_click');
        };
        container.appendChild(item);
    });
}

const BOOST_DEFS = {
    'classic': { name: 'ESTÁNDAR', color: '#5ad', particles: ['#5ad', '#fff'] },
    'fire': { name: 'FUEGO INFERNAL', color: '#f50', particles: ['#f50', '#f90', '#ff0'] },
    'neon': { name: 'NEÓN VAPOR', color: '#f0f', particles: ['#f0f', '#0ff'] },
    'plasma': { name: 'PLASMA CORE', color: '#a0f', particles: ['#a0f', '#fff'] }
};

const EXPLOSION_DEFS = {
    'classic': { name: 'CLÁSICA', color: '#5ad' },
    'nuclear': { name: 'NUCLEAR', color: '#fff' },
    'confetti': { name: 'FIESTA', color: '#f90' }
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
            <div style="font-size: 24px; margin-bottom: 5px;">🔥</div>
            <div style="font-size: 10px; color: ${def.color}; font-weight: bold;">${def.name}</div>
        `;
        item.onclick = () => {
            USER_CONFIG.playerBoost = key;
            const tag = document.getElementById('boost-name-tag');
            if (tag) tag.innerText = def.name;
            saveUserConfig();
            renderBoostSelection();
            playSound('menu_click');
        };
        list.appendChild(item);
    });
}

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
            <div style="font-size: 24px; margin-bottom: 5px;">💥</div>
            <div style="font-size: 10px; color: ${def.color}; font-weight: bold;">${def.name}</div>
        `;
        item.onclick = () => {
            USER_CONFIG.playerExplosion = key;
            const tag = document.getElementById('explosion-name-tag');
            if (tag) tag.innerText = def.name;
            saveUserConfig();
            renderExplosionSelection();
            playSound('menu_click');
            // Forzar una explosión de prueba
            if (currentPreviewMode === 'explosion') triggerPreviewExplosion();
        };
        list.appendChild(item);
    });
}

let customPreviewActive = false;
let currentPreviewMode = null; // 'boost' o 'explosion'
let previewParticles = [];
let previewTimer = 0;

function startCustomPreview(mode) {
    currentPreviewMode = mode;
    previewParticles = [];
    if (customPreviewActive) return;
    
    customPreviewActive = true;
    requestAnimationFrame(updateCustomPreview);
}

function updateCustomPreview() {
    if (!customPreviewActive || gameState !== 'menu') {
        customPreviewActive = false;
        return;
    }

    const canvas = document.getElementById(currentPreviewMode === 'boost' ? 'canvas-boost-preview' : 'canvas-explosion-preview');
    if (!canvas) {
        customPreviewActive = false;
        return;
    }

    const pctx = canvas.getContext('2d');
    pctx.fillStyle = '#000';
    pctx.fillRect(0, 0, canvas.width, canvas.height);

    if (currentPreviewMode === 'boost') {
        // Generar partículas de boost
        const def = BOOST_DEFS[USER_CONFIG.playerBoost] || BOOST_DEFS.classic;
        if (Math.random() > 0.3) {
            previewParticles.push({
                x: 50, y: 75,
                vx: (Math.random() - 0.5) * 2 - 5,
                vy: (Math.random() - 0.5) * 2,
                life: 1.0,
                color: def.particles[Math.floor(Math.random() * def.particles.length)],
                size: Math.random() * 4 + 2
            });
        }
    } else {
        // Lógica de explosión: Disparar periódicamente
        previewTimer++;
        if (previewTimer > 100) {
            triggerPreviewExplosion();
            previewTimer = 0;
        }
    }

    // Actualizar y dibujar partículas
    for (let i = previewParticles.length - 1; i >= 0; i--) {
        const p = previewParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        
        if (p.life <= 0) {
            previewParticles.splice(i, 1);
            continue;
        }

        pctx.globalAlpha = p.life;
        pctx.fillStyle = p.color;
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        pctx.fill();
    }
    pctx.globalAlpha = 1.0;

    requestAnimationFrame(updateCustomPreview);
}

function triggerPreviewExplosion() {
    const canvas = document.getElementById('canvas-explosion-preview');
    if (!canvas) return;
    
    const def = EXPLOSION_DEFS[USER_CONFIG.playerExplosion] || EXPLOSION_DEFS.classic;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    if (USER_CONFIG.playerExplosion === 'confetti') {
        for(let i=0; i<30; i++) {
            previewParticles.push({
                x: centerX, y: centerY,
                vx: (Math.random() - 0.5) * 10,
                vy: (Math.random() - 0.5) * 10,
                life: 1.0,
                color: `hsl(${Math.random()*360}, 100%, 50%)`,
                size: Math.random() * 5 + 2
            });
        }
    } else if (USER_CONFIG.playerExplosion === 'nuclear') {
        for(let i=0; i<60; i++) {
            previewParticles.push({
                x: centerX, y: centerY,
                vx: (Math.random() - 0.5) * 15,
                vy: (Math.random() - 0.5) * 15,
                life: 1.5,
                color: Math.random() > 0.5 ? '#fff' : '#ff0',
                size: Math.random() * 8 + 4
            });
        }
    } else {
        // Clásica
        for(let i=0; i<25; i++) {
            previewParticles.push({
                x: centerX, y: centerY,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                life: 1.0,
                color: def.color,
                size: Math.random() * 4 + 2
            });
        }
    }
}

function showMenuScreen(screenId) {
    [menuInitial, menuCredits, menuCustom, menuSettings].forEach(m => { if (m) m.style.display = 'none'; });
    
    const logo = document.getElementById('menu-logo');
    if (logo) logo.style.display = (screenId === 'initial') ? 'block' : 'none';
    
    const btnMapEditor = document.getElementById('btn-map-editor');
    if (btnCredits) btnCredits.style.display = (screenId === 'initial') ? 'block' : 'none';
    if (btnMapEditor) btnMapEditor.style.display = (screenId === 'initial') ? 'block' : 'none';

    if (screenId === 'initial' && menuInitial) menuInitial.style.display = 'flex';
    else if (screenId === 'credits' && menuCredits) menuCredits.style.display = 'flex';
    else if (screenId === 'custom' && menuCustom) {
        menuCustom.style.display = 'flex';
        // Reset a la primera pestaña
        document.querySelector('.custom-tab-btn[data-tab="perfil"]').click();
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
            card.style.height = "340px";
            card.style.zIndex = isCenter ? "10" : "5";
            card.style.opacity = isCenter ? "1" : "0.6";
            card.style.transform = isCenter ? "scale(1) translateZ(0)" : `scale(0.9) translateZ(-100px) translateX(${offset * 35}px) rotateY(${offset * -20}deg)`;
            card.style.transition = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
            card.style.cursor = "pointer";
            card.style.background = "#0a0a19";
            card.style.borderRadius = "12px";
            card.style.padding = "10px";
            card.style.display = "flex";
            card.style.flexDirection = "column";
            card.style.boxSizing = "border-box";
            card.style.margin = "0 -35px"; 
            
            if (isCenter) {
                card.style.boxShadow = "0 15px 50px rgba(0,0,0,0.8), 0 0 30px rgba(90,173,237,0.3)";
            }

            card.innerHTML = `
                <div class="pixel-border" style="width: 100%; height: 240px; overflow: hidden; background: #000; border: ${isCenter ? '4px solid #5ad' : '2px solid #333'} !important;">
                    <img src="recursos/Map${idx + 1}.png" style="width: 100%; height: 100%; object-fit: cover;">
                </div>
                <div style="display: flex; flex-direction: column; align-items: center; margin-top: 15px; opacity: ${isCenter ? 1 : 0}; transition: opacity 0.3s; pointer-events: none;">
                    <div style="background: #5ad; color: #000; font-size: 12px; padding: 5px 25px; font-weight: bold; font-family: 'Share Tech Mono', monospace; clip-path: polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%); letter-spacing: 2px;">
                        ${displayName}
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
    }
    if (player1_teammate) {
        player1_teammate.imgUrl = USER_CONFIG.playerCar;
        player1_teammate.hue = USER_CONFIG.playerCarHue;
        player1_teammate.saturate = USER_CONFIG.playerCarSaturate;
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
                        try { await img.decode(); } catch(e) { console.warn("Error decoding img", src); }
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
        } catch(e) { console.warn("Warm-up render failed", e); }

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

// Ejecutar el inicio del juego
init();
