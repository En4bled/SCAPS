import * as CONST from './core/constants.js';
import { Car } from './entities/car.js';
import { Ball } from './entities/ball.js';
import { BoostPad } from './entities/boost.js';
import { ExplosionParticle, ConfettiParticle } from './fx/particles.js';
import { setupInput } from './core/input.js';
import { drawField, createGrassDetails } from './world/field.js';
import { drawHUD, drawCarNames } from './ui/hud.js';
import { showScoreboard, hideScoreboard } from './ui/scoreboard.js';
import { checkCarBallCollision, checkCarCarCollision, updateCarAI, checkGoalPhysics } from './world/physics.js';
import { initAudio, updateAudio, playSound, setBoostSound, toggleMusic } from './fx/audio.js';

let canvas, ctx;
let countdownEl, goalTextEl, cameraModeEl, scoreboardEl, mainMenuEl;
let btnPlay, btnSettings, btnCredits, btnCustom, menuInitial, menuCredits, menuCustom, menuSettings;

let score = { blue: 0, orange: 0 };
let gameState = 'menu'; 
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

        // IMPORTANTE: Pasar callbacks correctos
        setupInput(keysPressed, toggleCamera, toggleScoreboard);

        // Crear entidades con posiciones de spawn seguras
        player1 = new Car(1400, 2500, '#5ad', { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', boost: 'ShiftLeft', drift: 'Space' }, "JUGADOR 1", 'res/Car1.png');
        player1_teammate = new Car(1200, 2200, '#5ad', {}, "BOT AZUL", 'res/Car2.png');
        player2 = new Car(1400, 1100, '#f90', {}, "BOT NARANJA 1", 'res/Car3.png');
        player2_teammate = new Car(1600, 1300, '#f90', {}, "BOT NARANJA 2", 'res/Car4.png');
        allCars = [player1, player1_teammate, player2, player2_teammate];
        ball = new Ball(CONST.WORLD_W / 2, CONST.WORLD_H / 2);

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

        if (introPhase === 3 && mainMenuEl) {
            mainMenuEl.classList.remove('hidden');
            mainMenuEl.style.display = 'flex';
            showMenuScreen('initial');
        }

        window.addEventListener('keydown', (e) => {
            // Manejo de la Intro (Salto suave al menú)
            if (introPhase < 3 && e.code === 'Space') {
                transitionToPhase(3);
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
        const pExit = getEl('btn-pause-exit'); if (pExit) pExit.onclick = () => { isPaused = false; const pm = getEl('pause-menu'); if(pm) pm.style.display = 'none'; gameState = 'menu'; showMenuScreen('initial'); if (mainMenuEl) { mainMenuEl.classList.remove('hidden'); mainMenuEl.style.display = 'flex'; } };
        const pMusic = getEl('btn-toggle-music-pause');
        if (pMusic) {
            pMusic.onclick = () => {
                const muted = toggleMusic();
                pMusic.innerText = muted ? '🎵 MÚSICA: OFF' : '🎵 MÚSICA: ON';
                const floatBtn = getEl('mute-float-btn');
                if (floatBtn) floatBtn.innerText = muted ? '🔇' : '🔊';
            };
        }

        // Iniciar la secuencia de intro
        startIntro();

        // Sonido global para botones
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', () => playSound('menu_click'));
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
    drawCarNames(ctx, allCars, player1, cameraMode, gameState);
    
    ctx.restore();
    
    drawHUD(ctx, canvas, gameTime, score, player1, cameraMode);
}

function updateAll(dt) {
    if (gameState === 'playing' || gameState === 'countdown') {
        updateCarAI(player1_teammate, ball, boostPads, gameState, keysPressed); 
        updateCarAI(player2, ball, boostPads, gameState, keysPressed); 
        updateCarAI(player2_teammate, ball, boostPads, gameState, keysPressed); 
        allCars.forEach(car => car.update(keysPressed, gameState, particles, skidMarks));
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
                if (dx*dx + dy*dy < (pad.radius + car.radius)**2) pad.collect(car);
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
    ball.x = CONST.WORLD_W / 2; ball.y = CONST.WORLD_H / 2;
    ball.vx = 0; ball.vy = 0; ball.onWallTimer = 0; 
    skidMarks = []; particles = []; confettiParticles = []; touchHistory = []; 
    countdownTimer = 3; gameState = 'countdown'; 
    if (countdownEl) countdownEl.style.display = 'block'; 
}

function drawAll() {
    drawField(ctx); 
    skidMarks.forEach(s => s.draw(ctx)); 
    boostPads.forEach(pad => pad.draw(ctx)); 
    particles.forEach(p => p.draw(ctx)); 
    ball.draw(ctx, animationFrameCounter);
    allCars.forEach(car => car.draw(ctx));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; explosionParticles.forEach(ep => ep.draw(ctx)); ctx.restore();
    ctx.save(); confettiParticles.forEach(cp => cp.draw(ctx)); ctx.restore(); 
}

function setupBoostPads() { boostPads = []; CONST.BOOST_POSITIONS.forEach(pos => { boostPads.push(new BoostPad(pos.x, pos.y, !pos.isBig)); }); }
function toggleCamera() { cameraMode = (cameraMode === 'rotating') ? 'fixed' : 'rotating'; }
function toggleScoreboard(show) { if (show) showScoreboard(scoreboardEl, allCars, score); else hideScoreboard(scoreboardEl, gameState); }
function togglePause() { isPaused = !isPaused; const pm = document.getElementById('pause-menu'); if (pm) pm.style.display = isPaused ? 'flex' : 'none'; }
function applySpawns() { allCars.forEach((car, i) => { const sp = CONST.SPAWN_POINTS[i] || { x: 500, y: 500, a: 0 }; car.x = sp.x; car.y = sp.y; car.angle = sp.a; }); }

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
                // Programamos el paso a la Escena 3 (Menú)
                setTimeout(() => {
                    if (introPhase === 2) transitionToPhase(3);
                }, 5000); // La nota legal se lee más lento
            }
        }, 1500);

    } else if (newPhase === 3) {
        introPhase = 3;
        // Fade out de cualquier slide activo
        if (slide1) slide1.classList.remove('active');
        if (slide2) slide2.classList.remove('active');

        // Esperamos el fade out final
        setTimeout(() => {
            if (introScreen) introScreen.style.display = 'none';
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
    [menuInitial, menuCredits, menuCustom, menuSettings].forEach(m => { if(m) m.style.display = 'none'; });
    if (screenId === 'initial' && menuInitial) menuInitial.style.display = 'flex';
    else if (screenId === 'credits' && menuCredits) menuCredits.style.display = 'flex';
    else if (screenId === 'custom' && menuCustom) menuCustom.style.display = 'flex';
    else if (screenId === 'settings' && menuSettings) menuSettings.style.display = 'flex';
}

async function startGame() {
    const trans = document.getElementById('match-transition'); if (trans) trans.classList.add('active');
    
    // Cargar mapa PRINCIPAL por defecto
    try {
        const resp = await fetch(`maps/Principal.json?t=${Date.now()}`);
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
    // Las claves del JSON del editor: poly, spawns, boosts, goals, bgUrl, bgScale, bgOX, bgOY, worldW, worldH
    if (c.goals) {
        CONST.setConfig('GOAL_TOP', c.goals.top);
        CONST.setConfig('GOAL_BOTTOM', c.goals.bottom);
    }
    if (c.spawns) CONST.setConfig('SPAWN_POINTS', c.spawns);
    if (c.boosts) {
        // El editor usa 'big', el motor usa 'isBig'
        const normalizedBoosts = c.boosts.map(b => ({ x: b.x, y: b.y, isBig: b.big }));
        CONST.setConfig('BOOST_POSITIONS', normalizedBoosts);
    }
    if (c.poly) CONST.setConfig('FIELD_POLYGON', c.poly);
    if (c.worldW) CONST.setConfig('WORLD_W', c.worldW);
    if (c.worldH) CONST.setConfig('WORLD_H', c.worldH);
    if (c.bgUrl) CONST.setConfig('BG_IMG_PATH', c.bgUrl);
    if (c.bgScale) CONST.setConfig('BG_SCALE', c.bgScale);
    if (c.bgOX !== undefined) CONST.setConfig('BG_OFFSET_X', c.bgOX);
    if (c.bgOY !== undefined) CONST.setConfig('BG_OFFSET_Y', c.bgOY);
    
    setupBoostPads();
    console.log("Mapa aplicado:", { goals: c.goals, spawns: c.spawns?.length, boosts: c.boosts?.length });
}

init();
