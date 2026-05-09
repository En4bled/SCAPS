# ⚽ SCAPS - Documentación Técnica Oficial
**Versión:** 1.5 - "Cinematic & Physics Update"
**Desarrollador:** En4bLeD_ (con asistencia de IA avanzada)

## 1. 📂 Glosario de Escenas y Flujo
El juego se divide en las siguientes etapas secuenciales. Puedes referirte a estos nombres para solicitar cambios específicos:

- **`INTRO_BRANDING`**: Pantalla inicial en negro. Muestra el logo de `capsules.png` rotando y los créditos del desarrollador. Fundido de entrada y salida suave.
- **`INTRO_LEGAL`**: Nota de desarrollo detallada sobre el estado del proyecto y disclaimer legal. Requiere interacción (ESPACIO).
- **`MENU_PRINCIPAL`**: El centro de control del juego.
    - **`MENU_NITIDO`**: Estado por defecto de la imagen de fondo.
    - **`MENU_DESENFOCADO`**: Efecto de desenfoque dinámico al pasar el ratón por los botones (hover).
- **`TRANSICION_PARTIDO`**: Fase de carga entre el menú y el juego. Incluye sonidos de pulsos de carga y fundido a negro.
- **`PRE_PARTIDO`**: El estadio se revela pero el juego está en pausa durante 3 segundos para que los jugadores se orienten.
- **`CUENTA_ATRAS`**: Secuencia "3, 2, 1, ¡YA!" que inicia las físicas del partido.
- **`PARTIDO_JUGANDO`**: Escena de acción principal donde se procesan físicas, colisiones e IA.
- **`MENU_PAUSA`**: Menú superpuesto (ESC) que permite reajustar sonidos, reiniciar o salir al menú.
- **`GOL_CELEBRACION`**: Efectos de partículas, cámara lenta y vibración tras un gol.
- **`FIN_PARTIDO`**: Pantalla de estadísticas finales tras agotarse el tiempo.

## 2. 🕹️ Funcionalidades del Motor

### Sistema de Físicas
- **Vehículos**: Movimiento basado en vectores con aceleración, fricción de suelo, derrape (drift) y sistema de Boost (nitro).
- **Balón**: Físicas de rebote elástico, fricción rodante y sistema de "Fireball" (efecto visual cuando se golpea a gran velocidad).
- **Colisiones**: Sistema avanzado de círculos para coches y balones, con cálculo de ángulo de rebote y transferencia de energía.

### Inteligencia Artificial (Bots)
- **Modos**: Los bots pueden actuar como Atacantes (persiguen el balón), Defensores (protegen la portería) o Apoyo.
- **Variedad**: Selección aleatoria de 10 modelos de vehículos (`Car1.png` a `Car10.png`) al inicio de cada partida.

### Audio y Música
- **Música Aleatoria**: Playlist de 4 canciones (`song1.mp3` a `song4.mp3`) cargadas aleatoriamente desde la carpeta `/music`.
- **Audio Espacial**: El sonido de los motores de otros coches se atenúa y cambia de pitch según su distancia y velocidad respecto al jugador.

### Editor de Mapas
- Herramienta externa (`editor.html`) que permite crear muros, definir spawns y exportar configuraciones en formato JSON.

## 3. 🛠️ Próxima Funcionalidad: Editor de Físicas en Vivo
Se implementará un panel de depuración (accesible con la tecla `º`) para modificar en tiempo real:
- Potencia de los motores y frenos.
- Coeficiente de restitución (rebote) del balón.
- Escala de tiempo y gravedad simulada.
- Radios de colisión (Hitboxes).

## 4. 📁 Estructura del Proyecto
- `/js/core/`: Constantes y lógica base.
- `/js/entities/`: Clases de Coche, Balón y Boost.
- `/js/fx/`: Audio, Partículas y Efectos Visuales.
- `/js/world/`: Motor de físicas y renderizado del campo.
- `/js/ui/`: HUD, Scoreboard e interfaces.
- `/res/`: Assets gráficos (Logos, Sprites, Estadios).
- `/music/`: Archivos de música de fondo.
