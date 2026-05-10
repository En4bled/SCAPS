// Manejador de Audio para SCAPS (Música, Motores y Efectos Sintéticos)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let musicAudio = null;
let motorAudios = [];
let isMusicMuted = false;
let musicVolume = 0.5;
const TOTAL_SONGS = 8;
const songMetadata = [
    { title: "NEON VELOCITY", artist: "SYNTHWAVE PRO" },
    { title: "CYBER DRIVE", artist: "DIGITAL GHOST" },
    { title: "TURBO BLITZ", artist: "ELECTRO RUSH" },
    { title: "QUANTUM PITCH", artist: "NEURAL LINK" },
    { title: "SHADOW STRIKER", artist: "MIDNIGHT PULSE" },
    { title: "GRAVITY SHIFT", artist: "ORBITAL SOUND" },
    { title: "SONIC OVERDRIVE", artist: "VELOCITY X" },
    { title: "FINAL LAP", artist: "MEGA DRIVE" }
];
let currentSongIdx = Math.floor(Math.random() * TOTAL_SONGS) + 1;
let playlistOrder = [];
let playlistPointer = 0;

function shufflePlaylist() {
    playlistOrder = Array.from({length: TOTAL_SONGS}, (_, i) => i + 1);
    for (let i = playlistOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlistOrder[i], playlistOrder[j]] = [playlistOrder[j], playlistOrder[i]];
    }
}
shufflePlaylist();
let playerCarRef = null;
let isInitialized = false;

export function toggleMusic() {
    isMusicMuted = !isMusicMuted;
    if (musicAudio) {
        musicAudio.muted = isMusicMuted;
    }
    return isMusicMuted;
}

export function setMusicVolume(vol) {
    musicVolume = vol;
    if (musicAudio) {
        musicAudio.volume = musicVolume;
    }
}

export function initAudio(playerCar, allCars) {
    if (isInitialized) return;
    
    // Iniciar contexto de audio si estaba suspendido (política de navegadores)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    playerCarRef = playerCar;
    isInitialized = true;

    // 1. Música de fondo (Playlist secuencial)
    playPlaylist();

    // 2. Motores para todos los coches
    allCars.forEach(car => {
        const motor = new Audio('sound/motor.mp3');
        motor.loop = true;
        motor.volume = 0; 
        motor.preservesPitch = false; // Permite cambiar el pitch con el playbackRate
        motor.play().catch(e => console.log("Motor bloqueado:", e));
        motorAudios.push({ car: car, audio: motor });
    });
}

export function updateAudio() {
    if (!isInitialized || !playerCarRef) return;
    
    motorAudios.forEach(item => {
        const car = item.car;
        const audio = item.audio;
        
        // Calcular el pitch basado en la velocidad (de 0 a ~25)
        const speedPercent = Math.min(Math.abs(car.speed) / 25, 1.0);
        const pitch = 0.8 + (speedPercent * 1.5); // Rango de 0.8x a 2.3x pitch
        
        // Evitar errores con el playbackRate
        if (isFinite(pitch)) {
            audio.playbackRate = Math.max(0.5, Math.min(pitch, 3.0));
        }
        
        // Calcular volumen basado en distancia y propiedad del coche
        if (car === playerCarRef) {
            audio.volume = 0.3 + (speedPercent * 0.2); // El jugador siempre se escucha
        } else {
            const dx = car.x - playerCarRef.x;
            const dy = car.y - playerCarRef.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            
            // Atenuación espacial (se deja de escuchar a los 1500px de distancia)
            const maxDist = 1500;
            let vol = 1.0 - (dist / maxDist);
            if (vol < 0) vol = 0;
            
            audio.volume = vol * 0.2 * (0.5 + speedPercent * 0.5);
        }
    });
}

// Efectos de Sonido Generados Dinámicamente (Web Audio API)
export function playSound(type, intensity = 1.0) {
    if (!isInitialized || audioCtx.state !== 'running') return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;

    if (type === 'menu_click') {
        const clickSnd = new Audio('sound/Modern2.wav');
        clickSnd.volume = 0.5;
        clickSnd.play().catch(e => {});
        return;
    } 
    if (type === 'countdown') {
        const cdSnd = new Audio('sound/Countdown.mp3');
        cdSnd.volume = 0.6;
        cdSnd.play().catch(e => console.log("Countdown sound blocked:", e));
        return;
    }
    if (type === 'menu_hover') {
        const hoverSnd = new Audio('sound/Minimalist8.wav');
        hoverSnd.volume = 0.3;
        hoverSnd.play().catch(e => {});
        return;
    }
    else if (type === 'ball_hit') {
        osc.type = 'triangle';
        const baseFreq = 80 + (intensity * 120);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        
        // Aumentamos el volumen del golpeo (antes era 0.6)
        gainNode.gain.setValueAtTime(1.5 * intensity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
    }
    else if (type === 'wall_hit') {
        osc.type = 'sine';
        const baseFreq = 60 + (intensity * 60);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        
        gainNode.gain.setValueAtTime(0.4 * intensity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.15);
    }
    else if (type === 'goal') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(400, now + 0.5);
        osc.frequency.linearRampToValueAtTime(150, now + 1.5);
        
        gainNode.gain.setValueAtTime(0.4, now);
        gainNode.gain.linearRampToValueAtTime(0.7, now + 0.2);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 2.0);
        
        osc.start(now);
        osc.stop(now + 2.0);
    }
}

// Sonido Contínuo de Boost
let boostNoise = null;
let boostGain = null;

export function setBoostSound(active) {
    if (!isInitialized || audioCtx.state !== 'running') return;
    
    if (active && !boostNoise) {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        
        boostNoise = audioCtx.createBufferSource();
        boostNoise.buffer = buffer;
        boostNoise.loop = true;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        
        boostGain = audioCtx.createGain();
        boostGain.gain.value = 0.15;
        
        boostNoise.connect(filter);
        filter.connect(boostGain);
        boostGain.connect(audioCtx.destination);
        boostNoise.start();
    } else if (!active && boostNoise) {
        boostGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        setTimeout(() => {
            if (boostNoise) {
                boostNoise.stop();
                boostNoise.disconnect();
                boostNoise = null;
            }
        }, 150);
    }
}
function playPlaylist() {
    if (musicAudio) {
        musicAudio.pause();
        musicAudio.onended = null;
    }

    currentSongIdx = playlistOrder[playlistPointer];
    musicAudio = new Audio(`music/song${currentSongIdx}.mp3`);
    musicAudio.volume = musicVolume;
    musicAudio.muted = isMusicMuted;
    
    musicAudio.play().then(() => {
        showSongNotification();
    }).catch(e => console.log("Música bloqueada:", e));

    musicAudio.onended = () => {
        playlistPointer++;
        if (playlistPointer >= TOTAL_SONGS) {
            playlistPointer = 0;
            shufflePlaylist();
        }
        playPlaylist();
    };
}

function showSongNotification() {
    if (isMusicMuted) return;

    const el = document.getElementById('song-notification');
    const nameEl = document.getElementById('song-name');
    const artistEl = document.getElementById('song-artist');
    if (!el || !nameEl) return;

    const info = songMetadata[currentSongIdx - 1];
    nameEl.innerText = info.title;
    if (artistEl) artistEl.innerText = info.artist;
    
    el.style.display = 'flex';
    
    // Forzar reflow para la animación
    el.offsetHeight;
    el.style.transform = 'translateX(0)';

    setTimeout(() => {
        el.style.transform = 'translateX(-150%)';
        setTimeout(() => {
            el.style.display = 'none';
        }, 600);
    }, 5000);
}
