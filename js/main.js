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
import { initAudio, updateAudio, playSound, setBoostSound, toggleMusic, setMusicVolume } from './fx/audio.js';

let canvas, ctx;
let countdownEl, goalTextEl, cameraModeEl, scoreboardEl, mainMenuEl;
let btnPlay, btnSettings, btnCredits, btnCustom, menuInitial, menuCredits, menuCustom, menuSettings;
let setupOverlay, btnStartGame, btnExitSetup, mapListContainer;
let selectedMap = 'Principal', selectedMode = 'online';
let selectedCarP1 = 'res/Car1.png', selectedCarP2 = 'res/Car2.png';
let currentMapPage = 1, currentCarPageP1 = 1, currentCarPageP2 = 1;
const MAPS_PER_PAGE = 3, CARS_PER_PAGE = 8;

let score = { blue: 0, orange: 0 };
let gameState = 'intro';
let isPaused = false;
let countdownTimer = 3;
let gameTime = 300;
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

        // IMPORTANTE: Pasar callbacks correctos
        setupInput(keysPressed, toggleCamera, toggleScoreboard);

        // Crear entidades usando posiciones del mapa (se cargarán de verdad en resetAfterGoal)
        player1 = new Car(0, 0, '#5ad', { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', drift: 'Space', isPlayer: true }, "JUGADOR 1", 'res/Car1.png');
        player1_teammate = new Car(0, 0, '#5ad', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT AZUL", 'res/Car2.png');
        player2 = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT NARANJA 1", 'res/Car3.png');
        player2_teammate = new Car(0, 0, '#f90', { up: 'up', down: 'down', left: 'left', right: 'right', boost: 'boost', drift: 'drift' }, "BOT NARANJA 2", 'res/Car4.png');

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
        if (btnStartGame) btnStartGame.onclick = () => finalizeStartGame();
        
        const btnCustomBack = getEl('btn-custom-back');
        if (btnCustomBack) btnCustomBack.onclick = () => {
            const inputName = getEl('input-player-name');
            if (inputName && player1) player1.name = inputName.value.toUpperCase();
            showMenuScreen('initial');
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
                document.querySelectorAll('.mode-option').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedMode = btn.dataset.mode;
                playSound('menu_click');
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
        const pRestart = getEl('btn-pause-restart'); if (pRestart) pRestart.onclick = () => { score = { blue: 0, orange: 0 }; gameTime = 300; togglePause(); resetAfterGoal(); };
        const pExit = getEl('btn-pause-exit'); if (pExit) pExit.onclick = () => { isPaused = false; const pm = getEl('pause-menu'); if (pm) pm.style.display = 'none'; gameState = 'menu'; showMenuScreen('initial'); if (mainMenuEl) { mainMenuEl.classList.remove('hidden'); mainMenuEl.style.display = 'flex'; } };
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
    if (gameState === 'menu') {
        targetX = player1.x + mouseX * 200; targetY = player1.y + mouseY * 200; targetRot = mouseX * 0.05;
    } else if (cameraMode === 'rotating') {
        targetRot = -player1.angle; vOffset = canvas.height * 0.3;
    }

    currentCamX += (targetX - currentCamX) * 0.08;
    currentCamY += (targetY - currentCamY) * 0.08;
    let rd = targetRot - currentRotation; rd = (rd + Math.PI) % (Math.PI * 2) - Math.PI; currentRotation += rd * 0.1;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2 + vOffset);
    ctx.rotate(currentRotation);
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
        updateCarAI(player1_teammate, ball, boostPads, gameState, player1_teammate.aiKeys);
        updateCarAI(player2, ball, boostPads, gameState, player2.aiKeys);
        updateCarAI(player2_teammate, ball, boostPads, gameState, player2_teammate.aiKeys);

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
    if (gameState === 'playing') { gameTime -= dt; if (gameTime < 0) { gameTime = 0; gameState = 'gameOver'; } }
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
    playSound('countdown');
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
function toggleCamera() { cameraMode = (cameraMode === 'rotating') ? 'fixed' : 'rotating'; }
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
            container.style.cursor = 'pointer';
            container.style.position = 'relative';
            container.style.border = (selectedMap === m) ? '3px solid #5ad' : '2px solid rgba(255,255,255,0.1)';
            container.style.borderRadius = '12px';
            container.style.overflow = 'hidden';
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
                selectedMap = m;
                loadSetupMaps();
                playSound('menu_click');
            };
            mapListContainer.appendChild(container);
        });
    } catch (e) { console.error("Error load setup maps:", e); }
}

async function finalizeStartGame() {
    const trans = document.getElementById('match-transition'); if (trans) trans.classList.add('active');
    if (setupOverlay) setupOverlay.style.display = 'none';

    // Aplicar personalización a los coches
    if (player1) player1.imgUrl = selectedCarP1;
    if (player1_teammate) player1_teammate.imgUrl = selectedCarP1;
    if (player2) player2.imgUrl = selectedCarP2;
    if (player2_teammate) player2_teammate.imgUrl = selectedCarP2;

    try {
        const resp = await fetch(`maps/${selectedMap}.json?t=${Date.now()}`);
        if (resp.ok) {
            const mapData = await resp.json();
            applyMapConfig(mapData);
            console.log("Mapa PRINCIPAL cargado correctamente");
        }
    } catch (e) {
        console.warn("No se pudo cargar el mapa PRINCIPAL, usando valores por defecto", e);
    }

    setTimeout(() => {
        if (mainMenuEl) mainMenuEl.classList.add('hidden');
        if (trans) trans.classList.remove('active');
        resetAfterGoal();
    }, 1000);
}

function applyMapConfig(c) {
    if (!c) return;
    CONST.applyExternalConfig(c);
    setupBoostPads();
    console.log("Mapa aplicado:", { goals: c.goals, spawns: c.spawns?.length, boosts: c.boosts?.length });
}

init();
