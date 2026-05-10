// Manejador de Audio para SCAPS (Música, Motores y Efectos Sintéticos)
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let musicAudio = null;
let motorAudios = [];
let isMusicMuted = false;
let playerCarRef = null;
let isInitialized = false;

export function toggleMusic() {
    isMusicMuted = !isMusicMuted;
    if (musicAudio) {
        musicAudio.muted = isMusicMuted;
    }
    return isMusicMuted;
}

export function initAudio(playerCar, allCars) {
    if (isInitialized) return;
    
    // Iniciar contexto de audio si estaba suspendido (política de navegadores)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    
    playerCarRef = playerCar;
    isInitialized = true;

    // 1. Música de fondo (Aleatoria entre song1 y song4)
    const randomSongIdx = Math.floor(Math.random() * 4) + 1;
    musicAudio = new Audio(`music/song${randomSongIdx}.mp3`);
    musicAudio.loop = true;
    musicAudio.volume = 0.2; 
    musicAudio.play().catch(e => console.log("Música bloqueada por el navegador. Se activará al interactuar."));

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
    else if (type === 'ball_hit') {
        osc.type = 'triangle';
        const baseFreq = 80 + (intensity * 120);
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);
        
        gainNode.gain.setValueAtTime(0.6 * intensity, now);
        gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        
        osc.start(now);
        osc.stop(now + 0.2);
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
