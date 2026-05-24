// Manejador de Audio para SCAPS (Música, Motores y Efectos Sintéticos)
import { getAssetPath } from '../core/constants.js';

export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// Nodo Maestro de Control
const masterGain = audioCtx.createGain();
const masterLimiter = audioCtx.createDynamicsCompressor();

// Configurar el limitador para evitar petardeos/clipping
masterLimiter.threshold.setValueAtTime(-3, audioCtx.currentTime);
masterLimiter.knee.setValueAtTime(40, audioCtx.currentTime);
masterLimiter.ratio.setValueAtTime(12, audioCtx.currentTime);
masterLimiter.attack.setValueAtTime(0, audioCtx.currentTime);
masterLimiter.release.setValueAtTime(0.25, audioCtx.currentTime);

masterGain.connect(masterLimiter);
masterLimiter.connect(audioCtx.destination);

let musicAudio = null;
const audioAnalyser = audioCtx.createAnalyser();
audioAnalyser.fftSize = 64; // Pequeño para efecto retro/pixelado
const analyserDataArray = new Uint8Array(audioAnalyser.frequencyBinCount);

export function getAudioVisualData() {
    audioAnalyser.getByteFrequencyData(analyserDataArray);
    return analyserDataArray;
}
let motorAudios = [];
let isMusicMuted = false;
let musicVolume = 0.5;
let sfxVolume = 0.8;
let activeSynthVoicesCount = 0;
const MAX_SYNTH_VOICES = 6;
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
    // Las canciones son del 1 al 8.
    // GRAVITY SHIFT es la canción 6 (índice 5 de songMetadata).
    playlistOrder = Array.from({length: TOTAL_SONGS}, (_, i) => i + 1);
    
    // Quitamos la canción 6 temporalmente para mezclar el resto
    const gsIndex = playlistOrder.indexOf(6);
    if (gsIndex > -1) {
        playlistOrder.splice(gsIndex, 1);
    }
    
    // Mezclamos las 7 canciones restantes
    for (let i = playlistOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [playlistOrder[i], playlistOrder[j]] = [playlistOrder[j], playlistOrder[i]];
    }
    
    // Colocamos GRAVITY SHIFT (canción 6) siempre en el primer puesto (índice 0)
    playlistOrder.unshift(6);
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

export function togglePlayPause() {
    if (!musicAudio) {
        initAudio();
        return true;
    }
    if (musicAudio.paused) {
        musicAudio.play().catch(e => console.log("Playback error:", e));
        return true;
    } else {
        musicAudio.pause();
        return false;
    }
}

export function isMusicPaused() {
    return musicAudio ? musicAudio.paused : true;
}

export function setSFXVolume(vol) {
    sfxVolume = vol;
    window.sfxVolume = vol;
    const sfxLabel = document.getElementById('settings-sfx-label');
    if (sfxLabel) sfxLabel.innerText = Math.round(vol * 100) + "%";
}
export function setMusicVolume(vol) {
    musicVolume = vol;
    window.musicVolume = vol;
    if (musicAudio) {
        musicAudio.volume = musicVolume;
    }
    const volLabel = document.getElementById('settings-vol-label');
    if (volLabel) volLabel.innerText = Math.round(vol * 100) + "%";
}

export function initAudio(playerCar = null, allCars = null) {
    if (isInitialized && !allCars) return;
    
    if (playerCar) playerCarRef = playerCar;
    
    // Asegurar que el contexto está activo (gesto del usuario)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
            console.log("AudioContext resumed successfully.");
        });
    }
    
    if (!isInitialized) {
        isInitialized = true;
        playPlaylist();
    }

    if (!allCars) return;

    // Motores Sintéticos de Alta Fidelidad (Arcade Overhaul)
    if (motorAudios.length > 0) {
        motorAudios.forEach(item => {
            try {
                item.masterEngineGain.gain.cancelScheduledValues(audioCtx.currentTime);
                item.osc1.stop();
                item.osc1.disconnect();
                item.osc2.stop();
                item.osc2.disconnect();
                item.noiseNode.stop();
                item.noiseNode.disconnect();
            } catch(e) {}
        });
        motorAudios = [];
    }

    function makeDistortionCurve(amount) {
        const k = amount;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; ++i) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }

    function createWhiteNoiseBuffer(ctx) {
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        return noiseBuffer;
    }

    // Motores Sintéticos de Alta Fidelidad
    motorAudios = [];
    allCars.forEach(car => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator(); 
        
        const waveShaper = audioCtx.createWaveShaper();
        waveShaper.oversample = '4x';
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';

        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = createWhiteNoiseBuffer(audioCtx);
        noiseNode.loop = true;
        
        const noiseFilter = audioCtx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.Q.value = 0.5;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.value = 0;

        const masterEngineGain = audioCtx.createGain();

        osc1.connect(waveShaper);
        osc2.connect(waveShaper);
        waveShaper.connect(filter);
        filter.connect(masterEngineGain);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(masterEngineGain);

        masterEngineGain.connect(masterGain);
        
        masterEngineGain.gain.value = 0;
        
        osc1.start();
        osc2.start();
        noiseNode.start();

        motorAudios.push({ car, osc1, osc2, waveShaper, filter, noiseNode, noiseFilter, noiseGain, masterEngineGain, makeDistortionCurve });
    });
}

export function stopAllMotors() {
    // Detener boost sound si está activo
    setBoostSound(false);

    motorAudios.forEach(item => {
        try {
            item.masterEngineGain.gain.cancelScheduledValues(audioCtx.currentTime);
            item.masterEngineGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            setTimeout(() => {
                item.osc1.stop();
                item.osc1.disconnect();
                item.osc2.stop();
                item.osc2.disconnect();
                item.noiseNode.stop();
                item.noiseNode.disconnect();
            }, 150);
        } catch(e) {}
    });
    motorAudios = [];
    isInitialized = false;
    playerCarRef = null;
    console.log("Audio: Motores detenidos correctamente.");
}

export function updateAudio() {
    // Si el contexto está suspendido, intentar resumir (pueden ser necesarios gestos)
    if (audioCtx.state === 'suspended' && isInitialized) audioCtx.resume();

    if (!isInitialized || !playerCarRef || motorAudios.length === 0) return;
    
    const now = audioCtx.currentTime;
    motorAudios.forEach(item => {
        const car = item.car;
        
        let perceivedSpeed = Math.abs(car.speed);
        if (car.isFlipping) perceivedSpeed = Math.min(perceivedSpeed, 2.0);
        const rpmPercent = Math.min(perceivedSpeed / 3.2, 1.0);
        
        let boostFactor = (car.isBoosting && !car.isFlipping) ? 1.15 : 1.0;
        if (car.isSupersonic && !car.isFlipping) boostFactor = 1.25;

        // Preset Daytona NASCAR Arcade (Hardcoded as best match for the game)
        // wave: 'sawtooth', grit: 800, noise: 50, baseFreq: 45, freqMult: 250, filterBase: 150, filterMult: 1200, detune: 25
        
        item.waveShaper.curve = item.makeDistortionCurve(800);
        item.osc1.type = 'sawtooth';
        item.osc2.type = 'sawtooth';
        
        item.osc1.detune.setTargetAtTime(0, now, 0.15);
        item.osc2.detune.setTargetAtTime(25, now, 0.15);

        // Se ha reducido el multiplicador de pitch (antes 250) a 120 para que no sea tan agudo al alcanzar vel. máxima
        // Reducimos el multiplicador de pitch aún más para un tono más grave y ronco
        const targetFreq = (50 + (rpmPercent * 70)) * boostFactor;
        item.osc1.frequency.setTargetAtTime(targetFreq, now, 0.15);
        item.osc2.frequency.setTargetAtTime(targetFreq * 1.01, now, 0.15);

        // Bajamos drásticamente el filtro pasa-bajos para eliminar los armónicos agudos de la distorsión
        const targetFilter = (100 + (rpmPercent * 300)) * boostFactor;
        item.filter.frequency.setTargetAtTime(targetFilter, now, 0.15);

        const exhaustVol = (40 / 100.0) * (0.2 + rpmPercent * 0.8) * 0.4;
        item.noiseGain.gain.setTargetAtTime(exhaustVol, now, 0.15);
        item.noiseFilter.frequency.setTargetAtTime(200 + (rpmPercent * 600), now, 0.15);

        let finalVol = 0;
        if (car.isExploded) {
            finalVol = 0;
        } else if (car === playerCarRef) {
            const baseVol = 0.3 + (rpmPercent * 0.2);
            finalVol = (car.isBoosting && !car.isFlipping) ? baseVol * 1.4 : baseVol;
        } else {
            const dx = car.x - playerCarRef.x;
            const dy = car.y - playerCarRef.y;
            const distSq = dx*dx + dy*dy;
            const maxDistSq = 1800 * 1800;
            
            let spatialMult = Math.max(0, 1.0 - (distSq / maxDistSq));
            const baseVol = spatialMult * 0.04 * (0.3 + rpmPercent * 0.2);
            finalVol = car.isBoosting ? baseVol * 1.4 : baseVol;
        }
        item.masterEngineGain.gain.setTargetAtTime(finalVol * sfxVolume, now, 0.15);
    });
}

export function playSound(type, intensity = 1.0) {
    if (!isInitialized || audioCtx.state !== 'running') return;

    // 1. Sonidos que usan muestras de audio pregrabadas (Audio HTML5) - Retornar antes de crear osciladores
    if (type === 'menu_click') {
        const clickSnd = new Audio(getAssetPath('recursos/sound/modern2.wav'));
        clickSnd.volume = 0.4 * sfxVolume;
        clickSnd.play().catch(e => {});
        return;
    } 
    if (type === 'menu_hover') {
        const hoverSnd = new Audio(getAssetPath('recursos/sound/minimalist8.wav'));
        hoverSnd.volume = 0.3 * sfxVolume;
        hoverSnd.play().catch(e => {});
        return;
    }
    if (type === 'menu_error') {
        const errorSnd = new Audio(getAssetPath('recursos/sound/modern2.wav'));
        errorSnd.volume = 0.45 * sfxVolume;
        errorSnd.playbackRate = 0.7; // Tono más grave/lento para indicar error
        errorSnd.play().catch(e => {});
        return;
    }
    if (type === 'countdown') {
        const cdSnd = new Audio(getAssetPath('recursos/sound/countdown.mp3'));
        cdSnd.volume = 0.6 * sfxVolume;
        cdSnd.play().catch(e => console.log("Countdown sound blocked:", e));
        return;
    }
    if (type === 'goal') {
        const goalSnd = new Audio(getAssetPath('recursos/sound/car-explosion.mp3'));
        goalSnd.volume = 0.8 * sfxVolume;
        goalSnd.play().catch(e => console.log("Goal sound blocked:", e));
        return;
    }

    // 2. Sonidos Sintéticos (Web Audio API)
    const isSynthetic = ['boost_pickup', 'car_hit', 'ball_hit', 'wall_hit'].includes(type);
    if (isSynthetic) {
        if (activeSynthVoicesCount >= MAX_SYNTH_VOICES) {
            // Si hay saturación, descartar sonidos suaves/menores (baja prioridad)
            if (intensity < 0.3) return;
        }
    }

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    gainNode.connect(masterGain); 
    osc.connect(gainNode);
    
    const now = audioCtx.currentTime;

    if (isSynthetic) {
        activeSynthVoicesCount++;
        osc.onended = () => {
            activeSynthVoicesCount = Math.max(0, activeSynthVoicesCount - 1);
        };
    }

    if (type === 'jump') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(130, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.15);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2200, now + 0.15);
        
        osc.disconnect(gainNode);
        osc.connect(filter);
        filter.connect(gainNode);
        
        gainNode.gain.setValueAtTime(0.36 * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        return;
    }
    if (type === 'flip') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(55, now + 0.25);
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.setValueAtTime(6.0, now);
        filter.frequency.setValueAtTime(950, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.25);
        
        osc.disconnect(gainNode);
        osc.connect(filter);
        filter.connect(gainNode);
        
        gainNode.gain.setValueAtTime(0.44 * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        return;
    }
    if (type === 'boost_pickup') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
        gainNode.gain.setValueAtTime(0.15 * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        return;
    }
    if (type === 'car_hit') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gainNode.gain.setValueAtTime(0.25 * intensity * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        return;
    }
    else if (type === 'ball_hit') {
        osc.type = 'triangle';
        const baseFreq = 80 + (intensity * 120);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        // Reducido el multiplicador de 1.5 a 0.38 para evitar clipping y distorsión digital
        gainNode.gain.setValueAtTime(0.38 * intensity * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
    }
    else if (type === 'wall_hit') {
        osc.type = 'sine';
        const baseFreq = 60 + (intensity * 60);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.15);
        gainNode.gain.setValueAtTime(0.4 * intensity * sfxVolume, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
    }
    else if (type === 'goal') {
        const goalSnd = new Audio(getAssetPath('recursos/sound/car-explosion.mp3'));
        goalSnd.volume = 0.8 * sfxVolume;
        goalSnd.play().catch(e => console.log("Goal sound blocked:", e));
        return;
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
        boostGain.gain.value = 0.05 * sfxVolume; // Reducido a 0.05 y adaptado a sfxVolume
        
        boostNoise.connect(filter);
        filter.connect(boostGain);
        boostGain.connect(masterGain); // Ruteado a masterGain en vez de destino directo
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

// Sonido Continuo de Derrape (Drift)
let driftNoise = null;
let driftGain = null;

export function setDriftSound(active) {
    if (!isInitialized || audioCtx.state !== 'running') return;
    
    if (active && !driftNoise) {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) { data[i] = Math.random() * 2 - 1; }
        
        driftNoise = audioCtx.createBufferSource();
        driftNoise.buffer = buffer;
        driftNoise.loop = true;
        
        // Filtro de paso banda para chirrido
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 850;
        filter.Q.value = 4.0;
        
        driftGain = audioCtx.createGain();
        driftGain.gain.value = 0.16 * sfxVolume;
        
        driftNoise.connect(filter);
        filter.connect(driftGain);
        driftGain.connect(masterGain);
        driftNoise.start();
        
        // Oscilador para chillido agudo característico de la goma
        const driftOsc = audioCtx.createOscillator();
        driftOsc.type = 'triangle';
        driftOsc.frequency.value = 1400;
        
        const oscGain = audioCtx.createGain();
        oscGain.gain.value = 0.035 * sfxVolume;
        
        // Modulación rápida FM para darle textura rugosa
        const modulator = audioCtx.createOscillator();
        modulator.frequency.value = 30;
        const modulatorGain = audioCtx.createGain();
        modulatorGain.gain.value = 100;
        
        modulator.connect(modulatorGain);
        modulatorGain.connect(driftOsc.frequency);
        
        driftOsc.connect(oscGain);
        oscGain.connect(masterGain);
        
        modulator.start();
        driftOsc.start();
        
        driftNoise._osc = driftOsc;
        driftNoise._modulator = modulator;
        driftNoise._oscGain = oscGain;
    } else if (!active && driftNoise) {
        const currentDriftNoise = driftNoise;
        const currentDriftGain = driftGain;
        
        driftNoise = null;
        driftGain = null;
        
        if (currentDriftGain) {
            currentDriftGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        }
        if (currentDriftNoise && currentDriftNoise._oscGain) {
            currentDriftNoise._oscGain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
        }
        
        setTimeout(() => {
            try {
                if (currentDriftNoise) {
                    currentDriftNoise.stop();
                    currentDriftNoise.disconnect();
                    if (currentDriftNoise._osc) {
                        currentDriftNoise._osc.stop();
                        currentDriftNoise._osc.disconnect();
                    }
                    if (currentDriftNoise._modulator) {
                        currentDriftNoise._modulator.stop();
                        currentDriftNoise._modulator.disconnect();
                    }
                }
            } catch (e) {}
        }, 150);
    }
}

// Fade out suave de la música del menú
export function stopMusicFadeOut(durationMs = 1000, callback = null) {
    if (!musicAudio || musicAudio.paused) {
        if (callback) callback();
        return;
    }
    
    const startVol = musicAudio.volume;
    const steps = 20;
    const stepTime = durationMs / steps;
    let currentStep = 0;
    
    const interval = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;
        musicAudio.volume = startVol * (1 - progress);
        
        if (currentStep >= steps) {
            clearInterval(interval);
            musicAudio.pause();
            musicAudio.volume = musicVolume; // Restaurar volumen original para la próxima pista
            if (callback) callback();
        }
    }, stepTime);
}

// Reproducir una canción de partido aleatoria (que no sea Gravity Shift - ID 6)
export function startMatchMusic() {
    if (!playlistOrder || playlistOrder.length <= 1) {
        shufflePlaylist();
    }
    
    // Obtener la canción que está sonando en el menú principal
    const menuSongIdx = currentSongIdx;
    
    // Elegimos otra canción aleatoria entre las disponibles (1 a TOTAL_SONGS) excluyendo menuSongIdx
    const availableSongs = [];
    for (let i = 1; i <= TOTAL_SONGS; i++) {
        if (i !== menuSongIdx) {
            availableSongs.push(i);
        }
    }
    
    const randomSongIdx = availableSongs[Math.floor(Math.random() * availableSongs.length)];
    
    // Encontrar dónde está esa canción en playlistOrder y mover el puntero
    const idxInPlaylist = playlistOrder.indexOf(randomSongIdx);
    if (idxInPlaylist !== -1) {
        playlistPointer = idxInPlaylist;
    } else {
        playlistPointer = Math.floor(Math.random() * playlistOrder.length);
        playlistOrder[playlistPointer] = randomSongIdx;
    }
    
    playPlaylist();
}

export function getMusicVolume() { return musicVolume; }
export function isMuted() { return isMusicMuted; }

export function nextSong() {
    playlistPointer++;
    if (playlistPointer >= TOTAL_SONGS) {
        playlistPointer = 0;
        shufflePlaylist();
    }
    playPlaylist();
}

export function prevSong() {
    playlistPointer--;
    if (playlistPointer < 0) {
        playlistPointer = TOTAL_SONGS - 1;
    }
    playPlaylist();
}

export function getCurrentSongInfo() {
    return songMetadata[currentSongIdx - 1];
}

function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function playPlaylist() {
    if (musicAudio) {
        musicAudio.pause();
        musicAudio.onended = null;
        musicAudio.ontimeupdate = null;
    }

    currentSongIdx = playlistOrder[playlistPointer];
    musicAudio = new Audio(getAssetPath(`recursos/music/song${currentSongIdx}.mp3`));
    musicAudio.volume = musicVolume;
    musicAudio.muted = isMusicMuted;

    // Conectar al analizador
    const source = audioCtx.createMediaElementSource(musicAudio);
    source.connect(audioAnalyser);
    audioAnalyser.connect(masterGain);
    
    musicAudio.play().then(() => {
        showSongNotification();
        updateSettingsSongUI();
        
        // Sincronizar para pausa
        const meta = songMetadata[currentSongIdx - 1];
        window.currentTrack = { name: meta.title, artist: meta.artist };

        const pPP = document.getElementById('btn-pause-play-pause-icon');
        if (pPP) pPP.innerText = '▶';
        const pauseSongNameEl = document.getElementById('pause-song-name');
        if (pauseSongNameEl) pauseSongNameEl.innerText = meta.title;
    }).catch(e => console.log("Música bloqueada:", e));

    musicAudio.ontimeupdate = () => {
        const timerEl = document.getElementById('settings-song-timer');
        if (timerEl) {
            const current = formatTime(musicAudio.currentTime);
            const total = formatTime(musicAudio.duration);
            timerEl.innerText = `${current} / ${total}`;
        }
        const pauseSongInfoEl = document.getElementById('pause-song-info');
        if (pauseSongInfoEl) {
            const current = formatTime(musicAudio.currentTime);
            const total = formatTime(musicAudio.duration);
            pauseSongInfoEl.innerText = `${current} / ${total}`;
        }
    };

    musicAudio.onended = () => {
        nextSong();
    };
}

function updateSettingsSongUI() {
    const nameEl = document.getElementById('settings-song-name');
    const artistEl = document.getElementById('settings-song-artist');
    if (nameEl && artistEl) {
        const info = getCurrentSongInfo();
        nameEl.innerText = info.title;
        artistEl.innerText = info.artist;
    }
}

function showSongNotification() {
    if (isMusicMuted) return;

    const el = document.getElementById('song-notification');
    const nameEl = document.getElementById('song-name');
    const artistEl = document.getElementById('song-artist');
    if (!el || !nameEl) return;

    const info = getCurrentSongInfo();
    nameEl.innerText = info.title;
    if (artistEl) artistEl.innerText = info.artist;
    
    el.style.display = 'flex';
    el.offsetHeight; // Reflow
    el.style.opacity = '1';

    setTimeout(() => {
        el.style.opacity = '0';
        setTimeout(() => {
            el.style.display = 'none';
        }, 1000);
    }, 5000);
}
