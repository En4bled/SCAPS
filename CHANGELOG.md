# Historial de Versiones - SCAPS

Este archivo registra los cambios significativos y las versiones del proyecto SCAPS.

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
- Efecto de resplandor neón dinámico en el logo del menú principal.
- Efecto hover neón global (degradado azul/naranja) aplicado a todos los botones.
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
