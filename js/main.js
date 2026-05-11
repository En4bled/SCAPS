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
import { initAudio, updateAudio, playSound, setBoostSound, toggleMusic, setMusicVolume, nextSong, prevSong, getCurrentSongInfo } from './fx/audio.js';
import { initPhysicsEditor } from './ui/physics_editor.js';

let canvas, ctx;
let countdownEl, goalTextEl, cameraModeEl, scoreboardEl, mainMenuEl;
let btnPlay, btnSettings, btnCredits, btnCustom, menuInitial, menuCredits, menuCustom, menuSettings;
let setupOverlay, btnStartGame, btnExitSetup, mapListContainer;
let selectedMap = '', selectedMode = '';
let gameOverOverlay, gameOverWinner, finalScoreBlue, finalScoreOrange;
let selectedCarP1 = 'res/Car1.png', selectedCarP2 = 'res/Car2.png';
let currentMapPage = 1, currentCarPageP1 = 1, currentCarPageP2 = 1;
const MAPS_PER_PAGE = 3, CARS_PER_PAGE = 8;
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
        const defaultMapResp = await fetch('maps/Principal.json?t=' + Date.now());
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
        player1 = new Car(0, 0, '#5ad', { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', drift: 'Space', isPlayer: true }, "JUGADOR 1", 'res/Car1.png');
        player1_teammate = new Car(0, 0, '#5ad', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Chiclanaman", 'res/Car2.png');
        player2 = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Aitawer", 'res/Car3.png');
        player2_teammate = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT Croquetas", 'res/Car4.png');

        // Inicializar objetos de teclas para los bots y asignar roles
        player1_teammate.aiState = { role: 'defender', targetBoostPad: null };
        player2.aiState = { role: 'attacker', targetBoostPad: null };
        player2_teammate.aiState = { role: 'support', targetBoostPad: null };

        [player1_teammate, player2, player2_teammate].forEach(bot => { bot.aiKeys = {}; });
        allCars = [player1, player1_teammate, player2, player2_teammate];
        ball = new Ball(CONST.CONFIG.WORLD_W / 2, CONST.CONFIG.WORLD_H / 2, 'res/Ball1.png');

        grassDetails = createGrassDetails(1500);
        setupBoostPads();

        // Listeners de botones con salvaguardas
        if (btnPlay) btnPlay.onclick = () => { initAudio(player1, allCars); startGame(); };
        if (btnCustom) btnCustom.onclick = () => { showMenuScreen('custom'); };
        if (btnSettings) btnSettings.onclick = () => showMenuScreen('settings');
        if (btnCredits) btnCredits.onclick = () => showMenuScreen('credits');

        ['btn-custom-back', 'btn-settings-back', 'btn-credits-back'].forEach(id => {
            const el = getEl(id); if (el) el.onclick = () => showMenuScreen('initial');
        });

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

            if ((e.code === 'Backquote' || e.key === 'º')) {
                const p = getEl('physics-editor-panel');
                if (p) p.classList.toggle('active');
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
function showMenuScreen(screenId) {
    [menuInitial, menuCredits, menuCustom, menuSettings].forEach(m => { if (m) m.style.display = 'none'; });
    
    const logo = document.getElementById('menu-logo');
    if (logo) logo.style.display = (screenId === 'initial') ? 'block' : 'none';

    if (screenId === 'initial' && menuInitial) menuInitial.style.display = 'flex';
    else if (screenId === 'credits' && menuCredits) menuCredits.style.display = 'flex';
    else if (screenId === 'custom' && menuCustom) {
        menuCustom.style.display = 'flex';
        renderCarSelection();
    }
    else if (screenId === 'settings' && menuSettings) menuSettings.style.display = 'flex';
}

function renderCarSelection() {
    const listP1 = document.getElementById('custom-car-p1-list');
    const listP2 = document.getElementById('custom-car-p2-list');
    if (!listP1 || !listP2) return;

    const carImages = [
        'res/Car1.png', 'res/Car2.png', 'res/Car3.png', 'res/Car4.png', 'res/Car5.png',
        'res/Car6.png', 'res/Car7.png', 'res/Car8.png', 'res/Car9.png', 'res/Car10.png'
    ];

    const totalPages = Math.ceil(carImages.length / CARS_PER_PAGE);

    // Actualizar Paginación P1
    const infoP1 = document.getElementById('car-p1-page-info');
    if (infoP1) infoP1.innerText = currentCarPageP1;
    const btnP1Prev = document.getElementById('btn-car-p1-prev');
    const btnP1Next = document.getElementById('btn-car-p1-next');
    if (btnP1Prev) { btnP1Prev.disabled = (currentCarPageP1 === 1); btnP1Prev.style.opacity = (currentCarPageP1 === 1) ? '0.3' : '1'; }
    if (btnP1Next) { btnP1Next.disabled = (currentCarPageP1 === totalPages); btnP1Next.style.opacity = (currentCarPageP1 === totalPages) ? '0.3' : '1'; }

    // Actualizar Paginación P2
    const infoP2 = document.getElementById('car-p2-page-info');
    if (infoP2) infoP2.innerText = currentCarPageP2;
    const btnP2Prev = document.getElementById('btn-car-p2-prev');
    const btnP2Next = document.getElementById('btn-car-p2-next');
    if (btnP2Prev) { btnP2Prev.disabled = (currentCarPageP2 === 1); btnP2Prev.style.opacity = (currentCarPageP2 === 1) ? '0.3' : '1'; }
    if (btnP2Next) { btnP2Next.disabled = (currentCarPageP2 === totalPages); btnP2Next.style.opacity = (currentCarPageP2 === totalPages) ? '0.3' : '1'; }

    // Renderizar Listas
    listP1.innerHTML = '';
    listP2.innerHTML = '';

    const startIdxP1 = (currentCarPageP1 - 1) * CARS_PER_PAGE;
    const pageCarsP1 = carImages.slice(startIdxP1, startIdxP1 + CARS_PER_PAGE);

    const startIdxP2 = (currentCarPageP2 - 1) * CARS_PER_PAGE;
    const pageCarsP2 = carImages.slice(startIdxP2, startIdxP2 + CARS_PER_PAGE);

    pageCarsP1.forEach(img => {
        const card = createCarCard(img, selectedCarP1 === img, '#5ad');
        card.onclick = () => { selectedCarP1 = img; renderCarSelection(); playSound('menu_click'); };
        listP1.appendChild(card);
    });

    pageCarsP2.forEach(img => {
        const card = createCarCard(img, selectedCarP2 === img, '#f90');
        card.onclick = () => { selectedCarP2 = img; renderCarSelection(); playSound('menu_click'); };
        listP2.appendChild(card);
    });
}

function createCarCard(imgUrl, isSelected, neonColor) {
    const card = document.createElement('div');
    card.style.cssText = `
        background: rgba(255,255,255,0.05);
        border: 2px solid ${isSelected ? neonColor : 'rgba(255,255,255,0.1)'};
        border-radius: 8px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: ${isSelected ? '0 0 10px ' + neonColor : 'none'};
        height: 60px;
    `;
    card.onmouseover = () => { if (!isSelected) card.style.borderColor = 'rgba(255,255,255,0.3)'; };
    card.onmouseout = () => { if (!isSelected) card.style.borderColor = 'rgba(255,255,255,0.1)'; };
    
    const img = document.createElement('img');
    img.src = imgUrl;
    img.style.width = 'auto';
    img.style.height = '100%';
    img.style.maxHeight = '50px';
    img.style.filter = isSelected ? 'none' : 'grayscale(0.5) brightness(0.7)';
    
    card.appendChild(img);
    return card;
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
        const resp = await fetch('get_maps.php');
        let maps = await resp.json();
        
        // Asegurar al menos 10 mapas para la demostración de paginación si faltan
        while (maps.length < 10) maps.push(`MAPA ${maps.length + 1}`);

        const totalPages = Math.ceil(maps.length / MAPS_PER_PAGE);
        if (currentMapPage > totalPages) currentMapPage = totalPages;
        if (currentMapPage < 1) currentMapPage = 1;

        // Actualizar UI de paginación
        const pageInfo = document.getElementById('map-page-info');
        if (pageInfo) pageInfo.innerText = currentMapPage;
        
        const btnPrev = document.getElementById('btn-map-prev');
        const btnNext = document.getElementById('btn-map-next');
        if (btnPrev) { btnPrev.disabled = (currentMapPage === 1); btnPrev.style.opacity = (currentMapPage === 1) ? '0.3' : '1'; }
        if (btnNext) { btnNext.disabled = (currentMapPage === totalPages); btnNext.style.opacity = (currentMapPage === totalPages) ? '0.3' : '1'; }

        // Filtrar mapas por página
        const startIdx = (currentMapPage - 1) * MAPS_PER_PAGE;
        const pageMaps = maps.slice(startIdx, startIdx + MAPS_PER_PAGE);

        mapListContainer.innerHTML = '';
        
        const mapLabels = {
            'Principal': 'Estadio Urbano',
            'Volcan': 'Cráter del Volcán',
            'Espacio': 'Plataforma Espacial'
        };

        pageMaps.forEach((m, localIdx) => {
            const globalIdx = startIdx + localIdx;
            const displayName = mapLabels[m] || m.toUpperCase();
            
            const container = document.createElement('div');
            container.className = 'setup-map-item pixel-border';
            container.style.cursor = 'pointer';
            container.style.position = 'relative';
            container.style.border = (selectedMap === m) ? '4px solid #5ad' : '4px solid rgba(255,255,255,0.1)';
            container.style.background = '#1a1a2e';
            container.style.width = '160px';
            container.style.height = '210px';
            container.style.display = 'flex';
            container.style.flexDirection = 'column';
            container.style.margin = '0 auto';
            if (selectedMap === m) container.style.boxShadow = '0 0 20px rgba(90, 173, 237, 0.6)';

            // Usar miniatura basada en el índice global
            const thumbUrl = `res/map${(globalIdx % 10) + 1}.png`;

            container.innerHTML = `
                <div style="flex: 1; overflow: hidden; border-bottom: 2px solid rgba(255,255,255,0.05); padding: 5px;">
                    <img src="${thumbUrl}" style="width: 100%; height: 100%; object-fit: cover; display: block; border-radius: 8px; filter: ${selectedMap === m ? 'none' : 'grayscale(0.6) brightness(0.6)'};">
                </div>
                <div style="background: rgba(0,0,0,0.4); color: #fff; font-size: 12px; text-align: center; padding: 10px 5px; font-weight: bold; font-family: 'Rajdhani', sans-serif; letter-spacing: 1px;">
                    ${displayName}
                </div>
            `;

            container.onclick = () => {
                // Mapas no disponibles (del 4 en adelante)
                const globalIdx = startIdx + localIdx;
                if (globalIdx >= 3) {
                    showInGameNotification("MAPA BLOQUEADO: PRÓXIMAMENTE", "#f90", "🔒");
                    playSound('menu_error');
                    return;
                }

                selectedMap = m;
                loadSetupMaps();
                playSound('menu_click');
                validateMatchSetup();
            };
            mapListContainer.appendChild(container);
        });
    } catch (e) { console.error("Error load setup maps:", e); }
}

function validateMatchSetup() {
    const isValidMap = ['Principal', 'Estadio2', 'Mapa3'].includes(selectedMap);
    const isValidMode = ['2vs2', '3vs3'].includes(selectedMode);
    
    if (btnStartGame) {
        btnStartGame.disabled = !(isValidMap && isValidMode);
        btnStartGame.style.opacity = btnStartGame.disabled ? '0.3' : '1';
        btnStartGame.style.filter = btnStartGame.disabled ? 'grayscale(1)' : 'none';
        btnStartGame.style.cursor = btnStartGame.disabled ? 'not-allowed' : 'pointer';
    }
}

function showInGameNotification(text, color = "#f33", icon = "⚠️") {
    const hud = document.getElementById('game-notification-hud');
    const txtEl = document.getElementById('notif-text');
    const iconEl = document.getElementById('notif-icon');
    if (!hud || !txtEl) return;

    txtEl.innerText = text;
    iconEl.innerText = icon;
    hud.style.borderColor = color;
    hud.style.boxShadow = `0 10px 40px rgba(0,0,0,0.5), 0 0 20px ${color}44`;
    
    hud.style.opacity = '1';
    hud.style.transform = 'translateX(-50%) translateY(20px)';

    setTimeout(() => {
        hud.style.opacity = '0';
        hud.style.transform = 'translateX(-50%) translateY(-100px)';
    }, 3000);
}

async function finalizeStartGame() {
    const trans = document.getElementById('match-transition'); 
    const fill = document.getElementById('loading-bar-fill');
    
    if (trans) trans.classList.add('active');
    if (setupOverlay) setupOverlay.style.display = 'none';

    // Función para actualizar la barra visualmente
    const updateBar = (p) => { if (fill) fill.style.width = p + '%'; };
    updateBar(10);

    // Aplicar personalización a los coches (referencias de textura)
    if (player1) player1.imgUrl = selectedCarP1;
    if (player1_teammate) player1_teammate.imgUrl = selectedCarP1;
    if (player2) player2.imgUrl = selectedCarP2;
    if (player2_teammate) player2_teammate.imgUrl = selectedCarP2;

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
});

init();
