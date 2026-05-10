# Changelog - SCAPS

## [0.9.5] - 2026-05-10 - *Striker Engine V4 & Physics Polish*
### Añadido
- **Striker Engine V4 (IA Vectorial)**: 
    - Lógica basada en productos escalares y cruzados para un posicionamiento táctico perfecto.
    - Los bots ahora calculan un "Strike Point" detrás del balón alineado con la portería rival.
    - Maniobras de rodeo dinámicas para evitar golpear el balón hacia la propia portería.
    - Protocolo de escape de emergencia para bots atascados dentro de las redes.
- **Físicas de Colisión Pro**:
    - Implementado sistema de impulso elástico (conservación de momento) para choques coche-coche.
    - Rebotes realistas contra paredes que preservan la orientación visual y permiten rebotes marcha atrás.
    - Eliminados bugs de aceleración infinita (catapultas) al rozar muros.

### Cambiado
- **Cinemática de Inicio**:
    - Zoom inicial reducido a 0.1 para mostrar el estadio completo al arrancar.
    - Duración de la cinemática ajustada a 3 segundos para un inicio más dinámico.
- **IA de Bots**:
    - Mayor agresividad hacia el balón y uso optimizado del Turbo y Derrape táctico.
    - Los bots ahora detectan el "fuera de juego" y se reposicionan inteligentemente.

### Corregido
- **Atascos en Portería**: Los bots ya no se quedan vibrando dentro de las redes gracias al nuevo modo de escape.
- **Error de Sintaxis**: Corregido un `Unexpected token }` en el motor de físicas.
- **Física de Rebote**: Eliminado el "pegado" a las paredes mediante la proyección correcta de vectores de velocidad.

 
## [0.9.0] - 2026-05-10 - *Cinematic Experience & AI Overhaul*
### Añadido
- **Secuencia Cinemática de Inicio**: 
    - Zoom majestuoso de 5 segundos desde el centro del estadio hasta el jugador.
    - Transición fluida (panning) hacia el vehículo asignado antes del inicio.
    - Cuenta atrás sincronizada: solo aparece cuando la cámara está enfocada.
- **IA de Bots V2**:
    - Sistema de evitación de colisiones (repulsión de proximidad) para evitar bloqueos entre bots.
    - Intercepción predictiva: los bots calculan la trayectoria futura del balón para disparar a portería.
    - Comportamiento de roles (Atacante/Defensor/Apoyo) refinado con posicionamiento táctico.
- **Feedback Físico Mejorado**:
    - Efecto de "Elevación" (Lift): el balón aumenta su radio visual al golpear paredes o ser impactado por un coche, simulando un salto tridimensional.
    - Feedback de cámara: mensaje visual ("CÁMARA FIJA" / "ROTATIVA") y sonido al cambiar de vista con la tecla `V`.

### Cambiado
- **Escala de Juego**: Incrementado el tamaño de los coches un 50% y reducido el zoom por defecto (0.85) para una perspectiva más equilibrada y profesional.
- **Barra de Carga Neon**: Implementada una barra de carga estética durante la transición al partido para ocultar la carga de texturas del estadio.

### Corregido
- **Bug de Tecla V**: Restaurada la funcionalidad de cambio de cámara (que estaba erróneamente en la C) y mejorada con notificaciones UI.
- **Error de Consola (IA)**: Solucionado el `TypeError` al iniciar partido debido a argumentos faltantes en el bucle de la IA.
- **Flashes de Color**: Eliminado el "destello verde" al cargar mapas por primera vez mediante pre-carga de assets y fondos negros.
- **Editor de Mapas**: Optimizado el guardado de archivos JSON grandes (eliminado Pretty Print) y corregida la vinculación de la URL de imagen de fondo.


## [0.8.0] - 2026-05-10 - *Customization & UI Refinement*
### Añadido
- **Rediseño Total del Menú Personalizar**: 
    - Selección de nombre de piloto con persistencia visual en el juego.
    - Galería de miniaturas para elegir el aspecto del vehículo (Tu Vehículo y Oponentes).
    - Paginación de vehículos (8 por página) con miniaturas compactas de 60px para evitar desbordamientos.
- **Gestión Inteligente de Logo**: El logo del menú principal se oculta automáticamente al entrar en submenús, maximizando el espacio de trabajo.

### Cambiado
- **Menú de Pausa**: Unificada la altura de los controles de música (regulador y mute) a 50px para coincidir con el resto de botones.
- **Optimización de Layout**: El panel de personalización es ahora más compacto y eficiente, respetando los límites visuales del fondo del juego.

### Corregido
- **Rebosamiento de Interfaz**: Solucionados los problemas de desbordamiento en el menú de personalización mediante el uso de miniaturas reducidas y paginación 4x2.


## [0.7.0] - 2026-05-10 - *UI & Audio Overhaul*
### Añadido
- **Sistema de Audio Dinámico**: Nueva playlist de 8 canciones con reproducción aleatoria (Shuffle), metadatos (título/artista) y notificaciones visuales en la parte superior.
- **Paginación de Mapas**: Sustituido el scrollbar por un sistema de páginas (3 mapas por página) para una selección más limpia y profesional.
- **Estética de Botones**: Añadido borde negro (silueta) a todo el texto del menú principal y submenús para máxima legibilidad.
- **Controles de Audio**: Regulador de volumen y botón de mute integrados directamente en el menú de pausa (`ESC`).

### Cambiado
- **Interfaz "Ajustes de Partido"**: Renombrada la escena de selección, optimizado el tamaño de las miniaturas de mapas y botones de modo (ahora sin márgenes internos y con iconos a sangre).
- **Interacción de Menú**: Los botones del menú principal mantienen el texto blanco al pasar el ratón, mejorando el contraste con el fondo neón.
- **Feedback Visual**: Notificación de canción movida a la parte superior con un diseño más compacto y profesional.

## [0.6.0] - 2026-05-10 - *Actualización "Smart Editor"*
### Añadido
- **Organigrama de Escenas**: Documentación amigable (`ORGANIGRAMA_ESCENAS.md`) que explica el flujo completo del juego, desde la Intro hasta el Fin del Partido.
- **Documentación Técnica Renovada**: El archivo `DOCUMENTACION_TECNICA.md` se ha reescrito usando jerga sencilla, clara y amigable para facilitar la incorporación de nuevos desarrolladores o curiosos.
- **Independencia de Porterías y Redes**: Se ha dividido la lógica interna en el editor y el motor; ahora la zona real donde la pelota cuenta como gol es independiente de dónde y cómo se dibuja visualmente la red (`netW`, `netD`, `netX`, `netY`).

### Corregido
- **Física del Equipo Naranja**: Arreglado por completo el molesto rebote extraño que ocurría en el fondo de la portería derecha (Naranja). Ahora los goles entran limpios.
- **Interfaz del Editor (Sidebar)**: Eliminadas las barras de desplazamiento (scrollbars) innecesarias en el gestor de mapas. Optimización de la altura y mejora visual de los colores (Azul a la izquierda, Naranja a la derecha).
- **Editor Snapping (Rejilla)**: El sistema de imantación (grid) funciona ahora correctamente para arrastrar redes y porterías, facilitando enormemente la alineación de elementos simétricos.

## [0.5.0] - 2026-05-10
### Añadido
- Nueva escena de **Match Setup** (Selección de Partida) previa al inicio del juego.
- Galería visual de mapas con miniaturas dinámicas (`map1.png` - `map10.png`).
- Panel de selección de modos (Online, 2vs2, 3vs3, Torneo).
- Sistema de desplazamiento suave con deslizador (scrollbar) estilo neón rojo.
- Integración de fondo cinematográfico (`fondo_menu.png`) y efectos de desenfoque.
- **Map Editor**: Barra de herramientas flotante centralizada con iconos minimalistas (Undo/Redo/Reset).
- **Map Editor**: Gestor de mapas compacto 2x2 con miniaturas asíncronas.

### Corregido
- Errores de visibilidad del Menú Principal tras transiciones de escena.
- Sincronización de estados de selección de mapa y carga de archivos JSON.
- Consistencia estética global entre el Editor, el Menú y el Selector.

## [0.4.0] - 2026-05-10
### Añadido
- Marquesina dinámica en el menú principal con ciclo de colores azul/naranja.
- Sonidos de interacción: clic (`Modern2.wav`) y hover (`Minimalist8.wav`).
- Efecto de difuminado (Glassmorphism) en los botones del menú.
- Tamaño de los botones del menú reducido para una interfaz más compacta.
### Cambiado
- Ajustes de posición y altura en el logo, botones y botón de mute.
- Logo del menú principal reducido y con efecto de resplandor tipo neón dinámico (Azul/Naranja).
- Logo de la intro ahora estático y sin filtros por requerimiento estético.

## [0.3.1] - 2026-05-09
### Añadido
- Configuración de control de versiones con Git.
- Sincronización del proyecto con el repositorio remoto en GitHub.
- Creación de archivos de gestión (`.gitignore`, `CHANGELOG.md`).

## [0.3.0] - 2026-05-09
### Añadido
- Pantallas de introducción (Logos y avisos legales).
- Mecánica de bloqueo de movimiento de vehículos durante la cuenta atrás para evitar ventajas injustas.
### Corregido
- Renderizado del fondo del estadio.
- Mejoras en la navegación de escenas y transiciones de estado.

## [0.2.5] - 2026-05-02
### Corregido
- Eliminación de bloqueos (freezes) al inicio del juego.
- Reparación de los botones del menú de pausa (Continuar, Reiniciar, Salir).
- Optimización del bucle principal de juego para mayor fluidez.

## [0.2.0] - 2026-05-02
### Añadido
- Integración de gráficos personalizados para el campo (`Estadio2.png`).
- Sistema de partículas y efectos visuales básicos.
- Estructura inicial del motor de juego SCAPS (coches y fútbol 2D).
### Cambiado
- Modularización del motor de física y lógica del mundo.
- Optimización de la carga de assets.
