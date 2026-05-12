# Documentación Técnica de SCAPS
**Versión Actual:** 1.3.1 - Refactorización de Personalización y Estructura

## 1. Visión General de la Arquitectura
SCAPS está diseñado como un motor de juego modular y orientado a eventos. La arquitectura está desacoplada en módulos especializados para renderizado, resolución de físicas, toma de decisiones de IA y gestión de estados.

### Tecnologías Principales:
- **Lenguaje**: JavaScript (ECMAScript 2022+)
- **Entorno**: Navegador Web (Client-side)
- **API**: HTML5 Canvas (2D) para renderizado, Web Audio API para el procesamiento de sonido.

---

## 2. Módulos Principales

### 2.1. Bucle Principal de Ejecución (`js/main.js`)
El script `main.js` sirve como punto de entrada y controlador principal del bucle de juego.
- **Gestión del Reloj**: Implementa un bucle `requestAnimationFrame` que opera a un objetivo de 60 FPS.
- **Gestión de Escenas**: Una máquina de estados controla las transiciones entre `intro`, `menu`, `matchSetup`, `playing` y `paused`.
- **Orquestación de Entidades**: Coordina el ciclo de vida y el orden de renderizado de los coches, el balón, las partículas y las capas de la interfaz de usuario.

### 2.2. Motor de Físicas (`js/world/physics.js`)
El módulo de físicas maneja la partición espacial y la resolución de colisiones. Actualmente utiliza el motor **Core Production V12**.
- **Detección de Colisiones**: 
    - **Círculo-Polígono**: Utilizado para las interacciones entre el balón/coche y las paredes.
    - **Círculo-Círculo**: Utilizado para las interacciones coche-coche y coche-balón.
- **Resolución de Impulsos**: Implementa fórmulas de colisión elástica 1D para manejar la transferencia de momento y la restitución.
- **Detalles Matemáticos**: Ver [ESPECIFICACIONES_FISICAS.md](./ESPECIFICACIONES_FISICAS.md) para fórmulas de colisión y sistemas de coordenadas.
- **Simulación de Eje Z (Mecánica de Rampas)**: El motor de físicas anula los algoritmos de colisión 2D cuando el balón golpea una pared, activando un `onWallTimer`. Durante este estado, el sprite del balón aumenta de tamaño (Zoom) y la colisión coche-balón se suspende temporalmente, simulando una trayectoria aérea sobre los vehículos.

### 2.3. Inteligencia Autónoma: Core Production
El módulo de IA (`updateCarAI`) implementa un algoritmo de persecución determinante hiper-optimizado. Ver [IA_SCAPS_CORE.md](./IA_SCAPS_CORE.md) para más detalles.
- **Alineación del Sistema de Coordenadas**: Corrige una divergencia matemática fundamental entre el espacio trigonométrico estándar (donde `atan2(0)` es derecha) y el espacio del vehículo (donde el ángulo `0` es arriba). Esta alineación garantiza vectores de interceptación sin orbitación.
- **Gating de Aceleración (Throttle Gating)**: Control activo de la velocidad basado en la diferencia angular (`absDiff`). Los bots soltarán el acelerador o frenarán fuerte si el vector objetivo requiere un giro superior a ~17 grados, optimizando el radio de giro.
- **Anti-Bloqueo por Hardware**: Evalúa la velocidad absoluta por frame. Si la velocidad cae por debajo de un umbral durante 30 frames consecutivos, una secuencia de emergencia de marcha atrás y giro anula todas las demás entradas.

### 2.4. Editor de Físicas en Tiempo Real (`js/ui/physics_editor.js`)
- Una capa de interfaz interactiva que se inyecta en el DOM y se vincula directamente a las propiedades de `CONST.CONFIG`.
- Suspende el bucle principal del juego (`isPaused`) y permite el intercambio en caliente de parámetros físicos (fricción, rebote, torques) con efecto inmediato al reanudar.

### 2.5. Personalización Extendida (v1.4.0)
- **Sistema de Pestañas**: Interfaz inspirada en Rocket League con secciones para Perfil, Vehículo, Balón, Boost y Explosión.
- **Tinte Dinámico**: Implementación de filtros CSS (`hue-rotate` y `saturate`) aplicados directamente en el contexto del Canvas para permitir miles de combinaciones de colores en un solo asset de imagen.
- **Paginación de Balones**: Soporte dinámico para más de 40 modelos de balón organizados en páginas para optimizar el rendimiento del DOM.
- **Previsualizaciones en Tiempo Real**: Inyección de un micro-bucle de renderizado para partículas en los contenedores de vista previa del menú.
- **Persistencia**: Todos los ajustes se guardan en `localStorage` bajo la clave `SCAPS_USER_CONFIG`.

### 2.6. Sistema de Escalado Adaptativo (v1.4.0)
- **Independencia de Resolución**: SCAPS utiliza ahora un sistema de unidades relativas (`vw`, `vh`) para toda la interfaz de usuario.
- **Base de Referencia**: Diseñado sobre una base de 1600x900 (16:9), el sistema detecta el ancho del contenedor (`wrapper.offsetWidth`) y escala dinámicamente fuentes, rellenos y contenedores.
- **Sin Límite de Resolución**: Se ha eliminado el tope de 1600px, permitiendo que el juego escale nativamente en monitores 2K y 4K manteniendo la proporción estética.

### 2.7. Definición de Entidades (`js/entities/`)
- **Física del Vehículo (`Car.js`)**: Implementa tracción, curvas de aceleración y torque de dirección. Incluye dirección dinámica `speedFactor` que ajusta la maniobrabilidad según la velocidad.
- **Dinámica del Balón (`Ball.js`)**: Maneja la fricción, la velocidad terminal y la simulación visual del eje Z (escalado) para efectos de elevación.

---

## 3. Datos del Mapa y Renderizado
Las arenas se definen como objetos JSON que contienen:
- **FIELD_POLYGON**: Define los límites físicos de colisión de la arena.
- **GOAL_DATA**: Define las coordenadas de los triggers para anotar goles.
- **Robustez del Guardado**: El sistema PHP (`save_map.php`) ahora desactiva la visualización de errores HTML para garantizar una respuesta JSON limpia, verificando permisos de escritura y existencia del directorio `/maps` antes de confirmar la transacción.
- **Offsets Visuales**: Sprites visuales desacoplados de los datos de colisión para admitir diversos estilos estéticos.

## 4. Flujo de Trabajo de Desarrollo
El sistema incluye un Editor de Mapas dedicado (`editor.html`) que permite la manipulación visual de los datos JSON de la arena, incluyendo ajuste a rejilla (grid-snapping) para precisión de coordenadas y visualización en tiempo real de los triggers de gol.

---
*Documentación actualizada: Mayo 2026 (Ref: Actualización de Adaptabilidad v1.4.0).*
