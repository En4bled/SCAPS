/**
 * SCAPS - Definiciones de Explosiones de Gol
 * Este archivo centraliza los 12 tipos de explosiones disponibles y sus configuraciones visuales.
 */

export const EXPLOSION_DEFS = {
    'classic': {
        name: 'EXPLOSIÓN CLÁSICA',
        color: '#f90',
        secondary: '#ff0',
        particles: 'fire',
        count: 50,
        duration: 4000,
        icon: '💥'
    },
    'nuclear': {
        name: 'HONGO NUCLEAR',
        color: '#fff',
        secondary: '#0f0',
        particles: 'shockwave',
        count: 80,
        duration: 5000,
        icon: '☢️'
    },
    'confetti': {
        name: 'FIESTA TOTAL',
        color: 'multi',
        secondary: '#fff',
        particles: 'squares',
        count: 100,
        duration: 4500,
        icon: '🎉'
    },
    'blackhole': {
        name: 'AGUJERO NEGRO',
        color: '#303',
        secondary: '#000',
        particles: 'vortex',
        count: 60,
        duration: 4000,
        icon: '🕳️'
    },
    'lightning': {
        name: 'TORMENTA ELÉCTRICA',
        color: '#0cf',
        secondary: '#fff',
        particles: 'bolts',
        count: 40,
        duration: 4000,
        icon: '⚡'
    },
    'cyber': {
        name: 'DATA BREACH',
        color: '#0f0',
        secondary: '#000',
        particles: 'binary',
        count: 70,
        duration: 4500,
        icon: '📟'
    },
    'frozen': {
        name: 'CERO ABSOLUTO',
        color: '#8df',
        secondary: '#fff',
        particles: 'shards',
        count: 50,
        duration: 4000,
        icon: '🧊'
    },
    'love': {
        name: 'CORAZONES',
        color: '#f06',
        secondary: '#f9a',
        particles: 'hearts',
        count: 40,
        duration: 4000,
        icon: '❤️'
    },
    'gold': {
        name: 'LLUVIA DE ORO',
        color: '#ffd700',
        secondary: '#fff',
        particles: 'coins',
        count: 60,
        duration: 4500,
        icon: '💰'
    },
    'gravity': {
        name: 'ANTIGRAVEDAD',
        color: '#a0f',
        secondary: '#fff',
        particles: 'float',
        count: 50,
        duration: 5000,
        icon: '🛸'
    },
    'ghost': {
        name: 'ESPECTRAL',
        color: '#fff',
        secondary: '#aaf',
        particles: 'souls',
        count: 30,
        duration: 4000,
        icon: '👻'
    },
    'pixel': {
        name: 'RETRO BITS',
        color: '#f0f',
        secondary: '#0ff',
        particles: 'big_pixels',
        count: 80,
        duration: 4500,
        icon: '🕹️'
    }
};
