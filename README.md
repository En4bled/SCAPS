# SCAPS - 2D Rocket League Engine

SCAPS es un motor de juego 2D inspirado en Rocket League, desarrollado íntegramente con tecnologías web modernas (HTML5, CSS3, JavaScript ES6) y asistido por IA.

## 🚀 Tecnologías
- **Core**: JavaScript (ES Modules)
- **Renderizado**: Canvas 2D API
- **Estilos**: CSS3 con variables y animaciones personalizadas
- **Herramientas**: dat.GUI para edición en tiempo real

## 📂 Estructura del Proyecto
```text
SCAPS/
├── css/                # Estilos visuales
├── js/
│   ├── core/           # Constantes globales y sistema de input
│   ├── entities/       # Clases de objetos (Car, Ball, Boost)
│   ├── fx/             # Efectos visuales y de sonido
│   ├── tools/          # Herramientas de desarrollo (Editor)
│   ├── ui/             # HUD y menús
│   ├── world/          # Física y renderizado del campo
│   └── main.js         # Punto de entrada del juego
├── music/              # Archivos de música
├── res/                # Recursos gráficos (imágenes)
└── sound/              # Efectos de sonido
```

## 🎮 Controles
- **WASD**: Movimiento y giro del coche.
- **Shift Izquierdo**: Turbo (Boost).
- **Ctrl Izquierdo**: Derrape (Drift).
- **V**: Cambiar cámara (Fija / Seguimiento).
- **Tab**: Ver tabla de puntuaciones.

## 🛠 Herramienta de Edición (Editor)
Se ha integrado una herramienta visual (esquina superior derecha) que permite ajustar en tiempo real:
- **Escala y Offset del Fondo**: Para alinear perfectamente la imagen del estadio.
- **Límites del Campo**: Márgenes y tamaño del mundo.
- **Porterías**: Ancho y profundidad.
- **Spawns**: Posiciones iniciales de los jugadores.

**Uso**: Ajusta los sliders hasta que el campo visual coincida con la física. Haz clic en "Imprimir en Consola" para obtener los valores que debes copiar en `js/core/constants.js`.

## 🧠 Arquitectura Técnica
- **Física (`physics.js`)**: Implementación personalizada de colisiones círculo-círculo y círculo-rectángulo, incluyendo rebotes y fricción.
- **IA (`physics.js`)**: Sistema de estados para los bots (atacante, defensor, apoyo) que persiguen el balón o buscan pads de turbo.
- **Cámara**: Sistema de suavizado (lerp) con soporte para rotación dinámica según la orientación del coche.

## 📈 Futuras Mejoras
- Implementación de multijugador real (WebSockets).
- Sistema de skins para los coches.
- Más estadios y efectos de partículas.
- Repeticiones de goles.

---
2.026 &copy; ANTIGRAVITY ENGINE
