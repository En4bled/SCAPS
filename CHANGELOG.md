# Changelog - SCAPS

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
