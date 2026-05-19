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

    // Motores Sintéticos de Alta Fidelidad
    motorAudios = [];
    allCars.forEach(car => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();

        osc.type = 'triangle';
        osc.frequency.value = 40; 
        
        filter.type = 'lowpass';
        filter.frequency.value = 400;

        gain.gain.value = 0; 

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain); 
        osc.start();

        motorAudios.push({ car, osc, gain, filter });
    });
}

export function stopAllMotors() {
    motorAudios.forEach(item => {
        try {
            item.gain.gain.cancelScheduledValues(audioCtx.currentTime);
            item.gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
            setTimeout(() => {
                item.osc.stop();
                item.osc.disconnect();
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
        const speedPercent = Math.min(Math.abs(car.speed) / 3.2, 1.0);
        
        // Rugido del motor: Multiplicar tono por boost o velocidad supersónica
        let boostFactor = car.isBoosting ? 1.5 : 1.0;
        if (car.isSupersonic) boostFactor = 1.8;

        // Frecuencia con suavizado mayor (0.15)
        // Ralentí a 60Hz para que sea más audible
        const targetFreq = (60 + (speedPercent * 120)) * boostFactor;
        item.osc.frequency.setTargetAtTime(targetFreq, now, 0.15);
        
        // Filtro más agresivo para evitar "clipping" de agudos, se abre con el boost
        const targetFilter = (150 + (speedPercent * 600)) * boostFactor;
        item.filter.frequency.setTargetAtTime(targetFilter, now, 0.15);

        let finalVol = 0;
        if (car.isExploded) {
            finalVol = 0;
        } else if (car === playerCarRef) {
            // Ralentí a 0.15 para que se escuche bien antes de empezar, incrementado en boost
            const baseVol = 0.15 + (speedPercent * 0.1);
            finalVol = car.isBoosting ? baseVol * 1.4 : baseVol;
        } else {
            const dx = car.x - playerCarRef.x;
            const dy = car.y - playerCarRef.y;
            const distSq = dx*dx + dy*dy;
            const maxDistSq = 1800 * 1800; // Radio de audición
            
            let spatialMult = Math.max(0, 1.0 - (distSq / maxDistSq));
            // Los otros coches suenan mucho más bajo para evitar "bola de ruido"
            const baseVol = spatialMult * 0.04 * (0.5 + speedPercent * 0.5);
            finalVol = car.isBoosting ? baseVol * 1.4 : baseVol;
        }
        item.gain.gain.setTargetAtTime(finalVol * sfxVolume, now, 0.15);
    });
}

export function playSound(type, intensity = 1.0) {
    if (!isInitialized || audioCtx.state !== 'running') return;

    // Límite de voces y sistema de prioridades de audio sintético
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

    if (type === 'menu_click') {
        const clickSnd = new Audio(getAssetPath('recursos/sound/modern2.wav'));
        clickSnd.volume = 0.4 * sfxVolume;
        clickSnd.play().catch(e => {});
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
    if (type === 'countdown') {
        const cdSnd = new Audio(getAssetPath('recursos/sound/countdown.mp3'));
        cdSnd.volume = 0.6 * sfxVolume;
        cdSnd.play().catch(e => console.log("Countdown sound blocked:", e));
        return;
    }
    if (type === 'menu_hover') {
        const hoverSnd = new Audio(getAssetPath('recursos/sound/minimalist8.wav'));
        hoverSnd.volume = 0.3 * sfxVolume;
        hoverSnd.play().catch(e => {});
        return;
    }
    else if (type === 'ball_hit') {
        osc.type = 'triangle';
        const baseFreq = 80 + (intensity * 120);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        gainNode.gain.setValueAtTime(1.5 * intensity * sfxVolume, now);
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
