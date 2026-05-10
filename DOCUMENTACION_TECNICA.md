# ⚽ SCAPS - Documentación Técnica (Edición Amigable)
**Versión:** 2.0 - "Striker Engine V4 & Physics Polish"

¡Hola! Esta guía técnica está escrita para que **cualquiera** pueda entender cómo está construido nuestro motor del juego. Vamos a explicar qué hace cada parte del código de forma sencilla y directa.

---

## 🧠 1. El Corazón del Proyecto: `js/main.js`
Piensa en `main.js` como el director de orquesta. Es el primer archivo que se carga y el que decide qué se muestra en la pantalla en cada momento.

### Funciones Estrella de `main.js`:
*   **Loop de Juego**: Se ejecuta 60 veces por segundo. Coordina el movimiento, las físicas y el dibujado.
*   **Cinemáticas Dinámicas**: Gestiona el zoom inicial (Zoom In) que muestra el estadio completo antes de enfocar al jugador, dando un inicio épico a cada partido.
*   **Gestión de UI**: Controla los overlays de goles, marcador, cuenta atrás y menús.

---

## 🏗️ 2. El Motor de Físicas e IA: `js/world/physics.js`
Este es el "cerebro" y las "leyes de la naturaleza" de SCAPS. Aquí se decide cómo rebotan las cosas y cómo piensan los bots.

### Striker Engine V4 (IA Vectorial):
Hemos implementado una IA avanzada que usa matemáticas vectoriales:
*   **Alineación (Dot Product)**: El bot sabe si está bien posicionado para tirar a portería comparando vectores.
*   **Rodeo (Cross Product)**: Si el bot se pasa de largo, calcula por qué lado rodear el balón para no marcarse en propia puerta.
*   **Protocolo de Escape**: Si un bot entra en la red de la portería, activa un modo de emergencia para salir disparado hacia el centro del campo y no quedarse atascado.

### Físicas de Colisión Pro:
*   **Impulso Elástico**: Los choques entre coches ya no son simples empujones; ahora intercambian energía basándose en su velocidad y ángulo, como si fueran objetos físicos reales.
*   **Rebotes de Pared**: Los coches rebotan físicamente hacia atrás sin girar su orientación visual de forma brusca si el choque es frontal, permitiendo maniobras de rebote mucho más naturales.

---

## 🚗 3. Los Protagonistas: `js/entities/`
Aquí viven los actores de nuestra película.
*   `Car.js` (El Coche): Controla la aceleración, frenado y el turbo. Hemos ajustado su motor para que permita "momentum" negativo, permitiendo que los rebotes te lancen hacia atrás con fluidez.
*   `Ball.js` (El Balón): Gestiona su propio rebote y el efecto visual de "salto" (Z-Axis simulation) cuando es golpeado con fuerza.

---

## 🛠️ 4. El Editor de Mapas: `editor.html`
Nuestra herramienta profesional para crear estadios.
*   **Lógica de Guardado**: Optimizado para manejar archivos grandes sin ralentizar el servidor.
*   **Independencia Visual**: Permite colocar redes y porterías de forma visual mientras el motor físico mantiene su propia lógica de colisión invisible.

---

## 🚀 Resumen para entenderlo TODO:
Si el juego no dibuja bien el campo, vas a `field.js`. Si un bot hace cosas raras, el culpable está en `physics.js`. Si quieres que el coche corra más, ajustas `Car.js`. ¡Todo está organizado para que sea fácil de mantener y ampliar!

