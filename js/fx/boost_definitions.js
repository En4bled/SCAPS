/**
 * SCAPS - Definiciones de Efectos de Boost
 * Este archivo centraliza los 12 tipos de boost disponibles y sus configuraciones visuales.
 */

export const BOOST_DEFS = {
    'classic': {
        name: 'ESTÁNDAR',
        color: '#5ad',
        secondary: '#fff',
        particles: 'smoke',
        speed: 1.0,
        density: 1,
        icon: '💨'
    },
    'fire': {
        name: 'INFERNAL',
        color: '#f50',
        secondary: '#ff0',
        particles: 'fire',
        speed: 1.4,
        density: 1.5,
        icon: '🔥'
    },
    'neon': {
        name: 'VAPORWAVE',
        color: '#f0f',
        secondary: '#0ff',
        particles: 'vapor',
        speed: 1.2,
        density: 1.2,
        icon: '🌸'
    },
    'plasma': {
        name: 'PLASMA',
        color: '#a0f',
        secondary: '#fff',
        particles: 'electric',
        speed: 1.6,
        density: 0.8,
        icon: '⚡'
    },
    'toxic': {
        name: 'TÓXICO',
        color: '#3f0',
        secondary: '#0f0',
        particles: 'bubbles',
        speed: 0.8,
        density: 1.3,
        icon: '🤢'
    },
    'glitch': {
        name: 'GLITCH',
        color: '#fff',
        secondary: '#f00',
        particles: 'squares',
        speed: 2.0,
        density: 1.0,
        icon: '👾'
    },
    'gold': {
        name: 'DORADO',
        color: '#ffd700',
        secondary: '#fff',
        particles: 'sparkles',
        speed: 1.1,
        density: 1.4,
        icon: '✨'
    },
    'ice': {
        name: 'CRIOGÉNICO',
        color: '#8df',
        secondary: '#fff',
        particles: 'snow',
        speed: 0.9,
        density: 1.1,
        icon: '❄️'
    },
    'void': {
        name: 'VACÍO',
        color: '#303',
        secondary: '#000',
        particles: 'dark_smoke',
        speed: 0.7,
        density: 1.8,
        icon: '🌑'
    },
    'rainbow': {
        name: 'ARCOÍRIS',
        color: 'multi',
        secondary: '#fff',
        particles: 'dots',
        speed: 1.3,
        density: 1.5,
        icon: '🌈'
    },
    'cyber': {
        name: 'CYBERPUNK',
        color: '#0ff',
        secondary: '#5ad',
        particles: 'lines',
        speed: 2.5,
        density: 0.6,
        icon: '🌐'
    },
    'nature': {
        name: 'NATURA',
        color: '#4f4',
        secondary: '#fff',
        particles: 'leaves',
        speed: 0.7,
        density: 1.2,
        icon: '🍃'
    }
};
