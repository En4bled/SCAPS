# 🚀 Hoja de Ruta de Desarrollo: SCAPS

Este documento detalla las funcionalidades críticas, mejoras estéticas y correcciones técnicas necesarias para llevar **SCAPS** de una fase beta a un estado de lanzamiento profesional.

---

## 1. 🎥 Sistema de Replay y Cámara de Goles
**Objetivo:** Aumentar el impacto emocional y la satisfacción tras anotar un gol.

- [ ] **Grabación de Búfer:** Implementar un sistema que almacene los últimos 5-10 segundos de posiciones del balón y los coches en una estructura de datos ligera.
- [ ] **Lógica de Reproducción:** Al detectar un gol, pausar el juego y "reproducir" los datos del búfer.
- [ ] **Cámara Cinemática:** Crear una cámara que siga el balón desde ángulos dinámicos (no solo la cámara de juego fija) durante el replay.
- [ ] **Superposición de UI:** Mostrar el nombre del anotador y la velocidad del balón durante la repetición.

---

## 2. 🧠 Inteligencia Artificial Avanzada (Bots 2.0)
**Objetivo:** Crear una experiencia competitiva desafiante para un solo jugador.

- [x] **Gestión de Boost:** Los bots deben detectar las cápsulas de turbo cercanas y desviarse para recogerlas si su nivel es bajo.
- [x] **Rotación Defensiva:** Lógica para que un bot regrese a portería si el balón está en su zona defensiva, en lugar de solo perseguirlo.
- [x] **Predicción de Trayectoria:** Mejorar el cálculo de intercepción para que el bot apunte a donde *estará* el balón, no a donde está ahora.
- [x] **Dificultad Escalar:** Ajustar parámetros de precisión y tiempo de reacción según el nivel seleccionado (Adaptado dinámicamente).

---

## 3. ✨ "Game Feel" y Pulido Visual (Juice)
**Objetivo:** Hacer que el juego se sienta "vivo", pesado y reactivo.

- [x] **Cámara Dinámica:**
    - [x] *Field of View (FOV) dinámico:* Aumentar el FOV ligeramente al usar turbo.
    - [x] *Screen Shake:* Vibración de cámara proporcional a la fuerza de los impactos o explosiones.
- [x] **Post-procesado (WebGL/CSS):** 
    - [x] Implementar un efecto de *Bloom* (resplandor) para elementos neón y partículas.
    - [ ] Motion blur sutil durante el desplazamiento a alta velocidad.
- [x] **Impactos Físicos:** Añadir un pequeño "stop-frame" (pausa de milisegundos) en colisiones súper masivas para enfatizar la fuerza.

---

## 4. 💾 Persistencia y Perfil del Jugador
**Objetivo:** Fomentar la retención del jugador mediante el guardado de progresos.

- [x] **Sistema de Perfiles:** Guardar la configuración seleccionada (Coche, Balón, Explosión, Boost) en `localStorage`.
- [x] **Estadísticas Globales:** Contador persistente de goles totales, partidos ganados y tiempo jugado.
- [x] **Sistema de Desbloqueos (Opcional):** Lógica para marcar ítems como "bloqueados" hasta cumplir ciertos requisitos (ej. ganar 5 partidos).

---

## 5. 🏟️ Modo Entrenamiento (Free Play)
**Objetivo:** Permitir al jugador dominar las mecánicas de vuelo y conducción sin presión.

- [ ] **Escena de Práctica:** Un entorno sin límite de tiempo ni marcador.
- [ ] **Comandos de Entrenamiento:** Teclas rápidas para:
    - [ ] Resetear balón al centro.
    - [ ] "Lanzarse" el balón a uno mismo para practicar recepciones.
    - [ ] Turbo infinito habilitado por defecto.

---

## 6. 🔧 Optimización Técnica y Audio
**Objetivo:** Garantizar estabilidad y calidad sonora en cualquier navegador.

- [ ] **Motor de Audio Pro:** 
    - [ ] Sincronización de *pitch* del motor del coche con la velocidad actual.
    - [ ] Sistema de prioridades para evitar que sonidos de partículas silencien el sonido del motor.
- [ ] **Depuración de Colisiones:** Optimizar los límites de los mapas del editor para evitar saltos en las uniones de las mallas de colisión.
- [ ] **LOD (Level of Detail):** Optimizar el sistema de partículas para que baje la densidad si los FPS caen.

---

> [!TIP]
> **Orden Recomendado de Integración:**
> 1. Entrenamiento (Base fácil de implementar)
> 2. Game Feel (Mejora inmediata de la percepción)
> 3. Persistencia (Estructura necesaria para el futuro)
> 4. Bots y Replays (Sistemas complejos)
