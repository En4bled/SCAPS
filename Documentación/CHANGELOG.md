# Changelog - SCAPS

All notable changes to this project will be documented in this file.

## [2.1.1] - 2026-05-26 - *Unificación de Código en Raíz y Limpieza*
### Changed
- **Unificación de Versiones (Migración a la Raíz)**:
  - La versión multijugador (que anteriormente se ubicaba en la subcarpeta `/multi/`) se ha movido directamente a la raíz del repositorio, reemplazando a la antigua versión single player. Esto consolida el código de SCAPS en una única versión unificada que cuenta tanto con el juego local (offline) como con el multijugador online.
  - Se eliminó la carpeta `/multi/` sobrante.
  - Se actualizaron todos los paths de importaciones relativas (en [index.html](file:///c:/xampp/htdocs/SCAPS/index.html) y [js/main.js](file:///c:/xampp/htdocs/SCAPS/js/main.js)) de `../../js/` a `./` y se removieron los prefijos `../` obsoletos para que el juego corra desde la raíz del servidor.

## [2.1.0] - 2026-05-26 - *Bases de Boost y Chapas Persistentes*
### Added
- **Pads de Base Estáticos para Boosts y Chapas**: Implementada una base visual persistente en el suelo para todos los puntos de turbo.
  - Para los Boosts grandes, se utiliza el sprite personalizado [boost_pad.png](file:///c:/xampp/htdocs/SCAPS/recursos/maps/boost_pad.png).
  - Para las chapas pequeñas, se utiliza el sprite personalizado [chapa_pad.png](file:///c:/xampp/htdocs/SCAPS/recursos/maps/chapa_pad.png).
  - Estas bases permanecen visibles de forma continua incluso si el turbo ha sido recogido, permitiendo ubicar fácilmente los puntos de spawn en el campo de juego.
- **Visualizador Cooldown de Turbo**: Se incorporó un arco circular naranja indicador sobre el plato cuando el boost/chapa está inactivo, que se completa gradualmente en sentido de las agujas del reloj indicando el tiempo restante para su reaparición.

## [2.0.9] - 2026-05-26 - *Alineación de Feed en HUD*
### Changed
- **Reposicionamiento del Feed de Partida**: Se ajustaron las coordenadas de dibujo de la caja de notificaciones (feed de goles/demoliciones) en [js/main.js](file:///c:/xampp/htdocs/SCAPS/js/main.js) y [multi/js/main_multi.js](file:///c:/xampp/htdocs/SCAPS/multi/js/main_multi.js) (`startX = canvas.width - 50` y `startY = 100`). Esto desplaza los mensajes hacia el interior de la pantalla, previniendo que queden fuera del HUD principal o recortados por el borde redondeado de 20px del lienzo.

## [2.0.8] - 2026-05-26 - *Consola Limpia y Entornos Estáticos*
### Fixed
- **Prevención de Errores 404 en Carga de Mapas**: Se añadió una detección de entorno estático (`isStaticEnv`) en la función `loadSetupMaps` tanto para juego local ([js/main.js](file:///c:/xampp/htdocs/SCAPS/js/main.js)) como multijugador ([multi/js/main_multi.js](file:///c:/xampp/htdocs/SCAPS/multi/js/main_multi.js)). Al detectar ejecución bajo GitHub Pages o mediante protocolo `file://`, el motor omite automáticamente el `fetch` al script PHP `get_maps.php` y recurre de forma directa al fallback local, previniendo alertas 404 molestas en la consola del navegador.

## [2.0.7] - 2026-05-26 - *Multijugador Online: UI, Audio y Respawn Polished*
### Added
- **Indicador de Conexión en Lobby**: Se ha añadido un punto verde con un parpadeo/pulso suave (`.connection-dot` con animación `@keyframes pulse-green`) a la derecha del botón superior de estado `CONECTADO` para indicar visualmente el estado activo.

### Changed
- **UI de Lobby Multijugador**: Eliminado el banner redundante `[ PROTOTIPO DE PRUEBA ]` de la cabecera y configurado el texto de estado `CONECTADO` para ocultarse al estar dentro de la sala, mostrándose únicamente durante errores o estados de conexión.
- **Optimización de Audio en Calentamiento**: Silenciado el sonido de la cuenta atrás cuando un jugador entra inicialmente en modo de calentamiento (warmup/libre) al iniciar la escena. El sonido y la visualización de la cuenta atrás ahora ocurren estrictamente al iniciar el partido oficial o tras la anotación de un gol.

### Fixed
- **Rutas de Recursos en Multijugador**: Ajustadas las rutas de recursos mediante una normalización inteligente en `getAssetPath` para asegurar que las imágenes de cartas de estadios, avatares, vehículos y balones se carguen correctamente tanto en local como en la carpeta del multijugador online.
- **Reaparición (Respawn) Zonal por Demolición**: Corregida la lógica de respawn tras la explosión de un coche (jugador o bot). Ahora reaparecen en los puntos de salida de su propio lado del campo según el color del equipo (puntos 0/1 para equipo azul y 2/3 para equipo naranja). Modificación integrada en el ciclo local (`main.js`) y en la sincronización de host (`main_multi.js`).

## [1.7.1] - 2026-05-24 - *Teclado en Pausa, Audio Update y Fix de Ajustes*
### Added
- **Teclado en Guía de Pausa**: Integración visual de teclas físicas de teclado retro (`.keyboard-key`) en el panel de controles de pausa, alineadas con sus equivalencias en gamepad.

### Changed
- **Mapeo de Boost**: Reubicado el botón de Boost del mando al botón B (antes en LB), sincronizándolo también en la guía de pausa.
- **Transición y Selección Musical**:
  - Exclusión dinámica de la canción del menú principal al iniciar el partido para evitar repeticiones.
  - Sincronización asíncrona de `startMatchMusic` con el callback de finalización de `stopMusicFadeOut`, logrando una transición de audio suave.
- **Audio Sintético Potenciado**:
  - Salto (`jump`): Rediseñado con oscilador de tipo `triangle` y filtro paso-bajo dinámico para un tono retro con cuerpo.
  - Voltereta (`flip`): Rediseñado con oscilador `sawtooth` y filtro paso-bajo resonante (`Q = 6.0`) que emula un latigazo del aire o turbo instantáneo.
  - Derrape (`drift`): Incrementada la ganancia de la señal de derrape (`0.16`) y modulación FM (`0.035`) para un chirrido de neumáticos claro in-game.

### Fixed
- **Bucle de Juego en Menús**: Corregida la condición en `gameLoop` para detener el procesamiento de físicas (`updateAll`) y de actualización de audio (`updateAudio`) durante estados de menú (como Ajustes o Personalización), eliminando sonidos de motor colgados de la partida anterior al abrir Ajustes.

## [1.7.0] - 2026-05-18 - *Gamepad Navigation, 3D Card Flip & Physics Polish*
### Added
- **Soporte de Card Flip 3D para Modos**:
  - Implementado sistema de rotación 3D (giro de 180 grados) interactivo en las tarjetas de selección de modo al ser seleccionadas.
  - Añadido reverso detallado a las tarjetas de modo con estadísticas de juego (modo, rival, duración, dificultad).
  - Integradas imágenes de fondo oscurecidas mediante un degradado translúcido con el color temático (`#0b2e1b`) en la parte trasera de las tarjetas para mantener máxima legibilidad con estética premium.
- **Navegación e Interacción por Mando (Gamepad)**:
  - Navegación optimizada mediante D-PAD para la selección de modos y mapas en la pantalla Match Setup.
  - Flujo de confirmación interactiva "Select-to-Confirm": las tarjetas de modo activas se iluminan en color dorado de foco al seleccionarse y requieren pulsar el botón START para iniciar la partida.
  - Badges visuales de mandos (botones A, B, LT, RT, D-PAD, START) integrados nativamente en la UI de selección.
  - Popups y modales de confirmación interactivos ("¿Salir del juego?", "Aviso de Modo Bloqueado") completamente controlables con el mando.
- **Físicas de Conducción y Colisión Avanzadas**:
  - Simulación de fricción lateral en neumáticos para mayor adherencia en curvas y deslizamiento realista.
  - Dinámica zonal de impacto: choques con la defensa frontal transfieren una fuerza de impacto significativamente mayor al balón.
  - Resistencia aerodinámica global (drag atmosférico) para evitar el movimiento perpetuo de las entidades.
  - Efecto "Pinch" físico de alta velocidad cuando el balón es presionado fuertemente contra las paredes por un vehículo.
  - Frame-rate independence garantizado: todas las físicas y simulaciones adaptadas al uso riguroso de delta-time (`timeScale`).
- **Rediseño e Integración de Personalización**:
  - Panel unificado de pestañas con distribución 50/50 simétrica y compacta para previsualizaciones en tiempo real (Boost y Explosiones).
  - Integración del título general "SISTEMA DE PERSONALIZACIÓN" en un banner superior externo.
  - Optimización de controles, espaciados y comportamiento responsivo de la cuadrícula de garaje y avatares.

### Changed
- **Estética de Selección unificada**: Sustitución de antiguos efectos de neón por un diseño de bordes pixelados azul/naranja premium y badges gamepad en la esquina inferior derecha.

### Fixed
- **Uniformidad de Tarjetas**: Corregido el problema de altura desigual en las tarjetas de la primera fila del Match Setup, forzando la consistencia en base a la proporción 1/1.23 mediante `.mode-card-front { height: 100% !important }`.
- **Previsualización de Partículas**: Corregidos bucles infinitos de animación y fugas de memoria en los previsualizadores de Canvas en las pestañas de Boost/Explosión.

## [1.6.1] - 2026-05-17 - *Estandarización de Recursos y XAMPP Compatibility*
### Added
- **Sanitización y Migración Automática de LocalStorage**: Nueva lógica en `loadUserConfig()` que intercepta configuraciones obsoletas almacenadas en el navegador (de versiones anteriores de SCAPS) y las migra de manera transparente a minúsculas y subcarpetas correctas. Esto previene de forma definitiva fallos visuales (estado *broken*) en usuarios recurrentes.

### Changed
- **Estandarización Integral de Recursos (`recursos/`)**:
  - Todos los activos organizados rigurosamente en subcarpetas temáticas (`cars/`, `balls/`, `avatar/`, `ui/`, `stadiums/`, `editor/`, `music/`, `sound/`).
  - Normalización al 100% de los nombres de archivos a minúsculas para compatibilidad absoluta con servidores basados en Linux case-sensitive (como InfinityFree).
  - Eliminación de archivos redundantes y conflictos de mayúsculas (como la necesidad anterior de mantener `Car2.png` y `car2.png` al mismo tiempo).
  - Corrección del typo físico y de código de `car-selecctor-tab.gif` a `car-selector-tab.gif`.
- **Rutas de Avatares y Fondos**: Sincronizadas las rutas en todo el código y hojas de estilo para apuntar a sus carpetas físicas definitivas (`recursos/avatar/` y `recursos/ui/fondo_menu.png`).

### Fixed
- **Ineficiencia de Red y Bucle de Recarga en Preview**: Solucionada la inundación masiva de peticiones de red redundantes (más de 300 solicitudes por segundo) para el sprite del coche seleccionado en la vista previa del menú. Ahora utiliza una comparación inteligente basada en `.endsWith()` que funciona correctamente independientemente de si el juego se ejecuta en una subcarpeta (ej: `/SCAPS/` bajo XAMPP) o en la raíz.
- **Rutas de Avatares**: Corregidas las rutas del generador y previsualizador en `index.html` y `main.js` para apuntar a la carpeta física correcta `recursos/avatar/` en lugar de `recursos/ui/avatar/`.

## [1.6.0] - 2026-05-15 - *Game Feel & Physics Update*
### Added
- **Game Feel & Post-procesado (Juice)**:
    - Implementación de **Hit-Stop (Micro-pausas)** para enfatizar colisiones destructivas y disparos supersónicos (exclusivo para el jugador 1).
    - Añadido efecto de **Bloom (Resplandor CSS)** a nivel global (`#game-wrapper`) que afecta a UI, neones y juego in-game.
    - Opciones de configuración de Bloom añadidas tanto en los **Ajustes del Menú Principal** como en el **Menú de Pausa**, persistiendo en `USER_CONFIG`.
    - **FOV Dinámico**: La cámara se aleja sutilmente cuando el jugador alcanza velocidades supersónicas.
    - **Screen Shake Inteligente**: Temblores de cámara aplicados al juego, discriminando impactos de bots para no molestar al jugador.
- **Optimización de Físicas**:
    - **Ajuste de Masas**: Incremento significativo de la masa del balón para evitar que los coches lo "arrastren"; ahora se transfiere inercia realista.
    - Aumento de velocidad máxima del balón y fuerza de rebote para permitir tiros espectaculares.
    - **Sistema Anti-Tunneling Activo**: Nueva rutina en `physics.js` para detectar colisiones a altísima velocidad y evitar que el coche o el balón atraviesen las paredes.
    - Mejora en la sombra del balón con un offset dinámico para percibir correctamente su altura.
- **Inteligencia Artificial (Bots 2.0)**:
    - Migración a conducción **Arcade 2D**: se elimina la lógica de ángulo/dirección estricta para resolver giros erráticos.
    - **Modo Pánico**: Implementada máquina de estados para detectar cuando un bot está atascado, forzándolo a retroceder y reorientarse.
- **Lógica de Reaparición (Respawn)**:
    - **Jugador**: Reaparece exactamente en su punto de inicio original para no desorientarse.
    - **Bots**: Reaparecen en un punto aleatorio correspondiente a su propia mitad del campo.

## [1.5.0] - 2026-05-14 - *Diseñador de Banners Avanzado y Refinamiento de Perfil*
### Added
- **Diseñador Dinámico de Banners**: 
    - Implementación de un editor procedimental que permite personalizar Fondo (Colores 1 y 2), Borde, Texto y Fondo de Avatar.
    - Soporte para modos **Sólido** y **Degradado** con actualización en tiempo real.
    - Integración de **Patrones Visuales** (Carbono, Puntos, Tech Grid) inyectados dinámicamente.
- **Optimización de Interfaz de Perfil**:
    - Rediseño de la pestaña Perfil en un sistema de dos columnas compactas para maximizar el espacio.
    - Reubicación inteligente de controles (Selector de color de avatar y paginación alineados en el pie de la galería).
    - Nueva vista previa escalada (0.65x) integrada directamente en el flujo del editor.
- **Navegación Visual Mejorada**:
    - Nuevos iconos animados (GIFs) en las pestañas de navegación para una estética más "Arcade/Retro".

### Fixed
- **Estabilidad de Menú**: Eliminada referencia huérfana a `renderBanners()` que causaba fallos al abrir la personalización.
- **Corrección de Fuentes**: Ajuste de `line-height` y `padding` en inputs para evitar recortes en fuentes pixeladas (ej: "TURBOADICTO").

## [1.4.0] - 2026-05-12 - *Adaptabilidad Visual y Robustez del Sistema*
### Added
- **Diseño Adaptativo Global**: 
    - Implementación de unidades relativas (`vw`, `vh`, `%`) en toda la interfaz para soporte nativo de resoluciones 2K y 1080p.
    - Eliminación del límite de 1600px en el contenedor principal para permitir pantalla completa en monitores de alta gama.
- **Expansión de Personalización**:
    - Integración de 40 modelos de balón con sistema de paginación (4 páginas).
    - Sistema de Previsualización de Boost y Explosión en tiempo real dentro del menú de personalización.
    - Nuevo botón de cierre (X) rápido en la esquina superior derecha del panel de personalización.
- **Seguridad de Navegación**:
    - Overlay de confirmación con diseño neón para prevenir aperturas accidentales del Editor de Mapas.
    - Gestión dinámica de visibilidad de botones secundarios según la pantalla activa.

### Changed
- **Optimización de UI**:
    - Rediseño compacto de la escena de selección de mapa para evitar solapamientos con botones de acción.
    - Escalado de fuentes y rellenos (paddings) basado en el ancho de ventana (`vw`).

### Fixed
- **Robustez del Editor**:
    - Corrección de errores de sintaxis JSON al guardar mapas mediante la desactivación de avisos HTML en PHP.
    - Implementación de verificaciones de permisos de escritura y existencia de directorios en `save_map.php`.

## [1.3.1] - 2026-05-11 - *Estructura y Personalización Extendida*
### Added
- **Migración de Recursos**: 
    - Consolidación de todos los assets en la carpeta `/recursos`.
    - Actualización global de rutas en JSON, HTML, CSS y JS para mayor orden.
- **Refactorización de Menú Personalizar**:
    - Sistema de pestañas cuadrado (Estilo Rocket League).
    - Secciones: Perfil, Vehículo, Balón, Boost y Explosión.
    - Implementación de selector de Avatares y Tinte de Vehículo (Tono/Saturación).

### Changed
- **Estructura del Proyecto**: Eliminación de la carpeta `/res` obsoleta y centralización en `/recursos`.
- **Filtros de Color**: Los vehículos ahora soportan ajustes dinámicos de color.

### Fixed
- **Cursor Global**: Solucionado el problema de visibilidad del cursor pixelado en todas las capas del juego.
- **Rutas de Mapas**: Corregido el error de carga de imágenes en mapas personalizados tras el cambio de directorio.

### Changed
- **Motor de Audio**:
    - Separación de controles de volumen para Música y Efectos (SFX).
    - Actualización de todos los sonidos (osciladores y archivos) para respetar el volumen SFX.
- **Navegación y Estructura**:
    - La marquesina de cambios ahora solo es visible en el menú principal.
    - Ajuste de posición predeterminada para el banner de canciones.

### Fixed
- **Sistema de Pausa**: Restaurada la funcionalidad de la tecla `Escape` y el panel de pausa durante el juego.
- **Errores de Referencia**: Corregido fallo crítico en la inicialización de volúmenes al arrancar el motor.

## [1.2.0] - 2026-05-11 - *Ciclo de Vida y Optimización UI*
### Added
- **Sistema de Game Over Dinámico**: 
    - Nueva interfaz premium con detección de ganador, marcador final y botones de Revancha/Selector de Modo/Salida.
- **Documentación Técnica Extendida**:
    - Creación de `ESPECIFICACIONES_FISICAS.md` con detalles matemáticos sobre SAT, impulsos y lógica pseudo-3D.

### Changed
- **Experiencia Cinemática de Inicio**:
    - Refactorización del Zoom Inicial a un sistema híbrido con mezcla (mix) suave hacia el jugador.
    - Ajuste de velocidad cinematográfica para una entrada más fluida y profesional.
- **Optimización de Rendimiento (Anti-Stutter)**:
    - Implementación de pre-carga real con `img.decode()` durante la pantalla de carga.
    - "Warm-up Render" para forzar la subida de texturas a la GPU (VRAM) antes del inicio del partido.
- **Tiempo de Juego**: Estandarizado a 60 segundos por sesión.

### Fixed
- **Atribución de Goles y Asistencias**: Corregida la lógica para asignar puntos a los coches basándose en el historial de toques.
- **Estabilidad de Código**: Corregido error de sintaxis en `updateUI` y depuración de listeners redundantes.

## [1.1.0] - 2026-05-11 - *Experimental Physics & AI Mastery*
### Added
- **AI Engine V11 (Fix Matemático Definitivo)**:
    - Reescritura completa de `updateCarAI` para resolver el error de offset de 90 grados.
    - Implementación de Deterministic Angular Steering y Throttle Gating.
    - Añadido sistema de retroceso (fallback) tras 30 frames de bloqueo.
- **Real-Time Physics Editor**:
    - Interfaz dinámica (Tecla º) para modificar `CONST.CONFIG` en tiempo real.
- **Simulación de Eje Z (Vuelo)**:
    - El balón ahora rebota con efecto de escala visual para simular altura tras impactos fuertes.

### Changed
- **Equilibrio de Físicas**:
    - Ajustes de velocidad máxima y giro para mayor peso en la conducción.
    - Incremento de fuerza de impacto para despejes largos.

## [1.0.0] - 2026-05-10 - *Production Release: AI & Physics Overhaul*
### Added
- **AI Engine (Relentless Pursuit V9)**: Implementación de algoritmos deterministas de persecución.
- **Motor de Colisiones Pro**: Resolución de impulsos elásticos 1D para choques coche-coche.
- **Lógica de Rebote en Muros**: Implementación de rebotes con conservación de momento y clamping de velocidad.

### Fixed
- **Integridad de Sintaxis**: Limpieza de llaves redundantes en `physics.js`.
- **Maniobrabilidad**: Corregida la amortiguación de giro a altas velocidades (80% agilidad mantenida).

## [0.9.0] - 2026-05-10 - *Cinematic Implementation*
### Added
- **Manager de Secuencias Cinemáticas**: Orquestación de inicio con zoom dinámico (0.1 inicial).
- **Espacialización de Audio**: Feedback auditivo basado en la magnitud del impacto.

### Changed
- **Escalado Global**: Incremento del 50% en las dimensiones de todas las entidades para mejorar visibilidad.

## [0.8.0] - 2026-05-10 - *UI & Personalization Architecture*
### Added
- **Suite de Personalización**: Persistencia de nombres de jugador y selección de skins.
- **Paginación Asíncrona**: Optimización O(1) para selectores de mapas y vehículos.

## [0.7.0] - 2026-05-10 - *Audio Engine & UX Integration*
### Added
- **Controlador de Playlist Dinámico**: Sistema de reproducción aleatoria con notificaciones de metadatos.
- **Ajustes In-Game**: Control de volumen y mute integrados.

## [0.6.0] - 2026-05-10 - *Level Design Suite (Editor)*
### Added
- **Lógica de Porterías Desacoplada**: Definición independiente de triggers físicos y sprites visuales.
- **Grid Snapping**: Heurísticas de ajuste a rejilla para precisión en el diseño.

## [0.5.0] - 2026-05-09 - *Core Engine & Collision SAT*
### Added
- **Implementación SAT (Separating Axis Theorem)**: Detección precisa de colisiones poligonales.
- **Sistema de Partículas**: Explosiones y confeti para efectos de gol.

## [0.4.0] - 2026-05-08 - *Asset Integration*
### Added
- **Carga Dinámica de Texturas**: Soporte para múltiples modelos de coche y variaciones de balón.
- **Fondo de Estadio**: Implementación del renderizado de campo con detalles de césped.

## [0.3.0] - 2026-05-05 - *Map & Physics System*
### Added
- **Sistema de Mapas JSON**: Carga de niveles desde archivos externos.
- **Fricción y Drag**: Simulación básica de resistencia al aire y fricción de rodadura.

## [0.2.0] - 2026-05-02 - *Input & Movement*
### Added
- **Control por Teclado**: Soporte para WASD y flechas.
- **Física de Conducción**: Implementación de giro, aceleración y frenado.

## [0.1.0] - 2026-05-01 - *Initial Prototype*
### Added
- **Render Loop Base**: Configuración de Canvas y ciclo de dibujo.
- **Entidades Básicas**: Coche cuadrado y balón circular moviéndose por pantalla.
