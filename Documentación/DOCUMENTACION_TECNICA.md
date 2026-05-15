# Documentación Técnica de SCAPS
**Versión Actual:** 1.6.0 - Game Feel & Physics Update

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
- **Gestión de Escenas**: Una máquina de estados controla las transiciones entre `intro`, `menu`, `matchSetup`, `playing` and `paused`.
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
El módulo de IA (`updateCarAI`) implementa un algoritmo de conducción Arcade 2D. 
En la v1.6.0 se ha eliminado el control estricto de rotación para evitar bloqueos oscilantes, y se ha introducido una máquina de estados "Modo Pánico", que detecta si la velocidad es mínima durante 45 fotogramas y fuerza una maniobra de escape (marcha atrás con giro). Ver [IA_SCAPS_CORE.md](./IA_SCAPS_CORE.md) para más detalles.

### 2.4. Editor de Físicas en Tiempo Real (`js/ui/physics_editor.js`)
- Interfaz dinámica (Tecla º) para modificar `CONST.CONFIG` en tiempo real.

### 2.5. Personalización Extendida y Diseñador de Banners (v1.5.0)
- **Diseñador de Banners Procedimental**: Nuevo motor de renderizado que inyecta estilos CSS (degradados, patrones SVG y sombras) en el DOM basándose en `USER_CONFIG`.
- **Patrones Visuales**: Implementación de texturas dinámicas (Carbon, Dots, Tech) mediante clases CSS inyectadas.
- **Tinte Dinámico**: Filtros CSS (`hue-rotate`) para personalización cromática de vehículos.
- **Previsualizaciones en Tiempo Real**: Micro-motores de renderizado para partículas y banners sincronizados con los controles del editor.
- **Persistencia**: Sincronización bidireccional entre `USER_CONFIG`, el DOM y `localStorage`.

### 2.6. Sistema de Escalado Adaptativo (v1.4.0)
- **Independencia de Resolución**: Uso de unidades `vw` y `vh` para una interfaz fluida en 1080p y 2K.

### 2.7. Game Feel y Post-Procesado ("Juice") (v1.6.0)
- **Hit-Stop**: Implementación de interrupciones temporales en el motor (micro-pausas) durante demoliciones o cañonazos de balón, exclusivas para el jugador para maximizar el impacto cinético.
- **Screen Shake**: Efecto de cámara vibratoria calculada dinámicamente según el impulso de la colisión.
- **Bloom Global**: Sistema híbrido de post-procesado que inyecta filtros CSS (`drop-shadow`, `saturate`, `contrast`) al contenedor completo (`#game-wrapper`), aplicando resplandor a menús e interfaces sin afectar al rendimiento de `requestAnimationFrame`.
- **FOV Dinámico**: Ajuste de cámara (zoom out) basado en la velocidad `supersónica` del jugador.

### 2.7. Definición de Entidades (`js/entities/`)
- **Car.js**: Tracción, aceleración y torque.
- **Ball.js**: Fricción y escalado de eje Z.

---

## 3. Datos del Mapa y Renderizado
Las arenas se definen como objetos JSON. El sistema de guardado PHP garantiza transacciones limpias.

---
*Documentación actualizada: Mayo 2026 (Ref: Actualización v1.6.0).*
