# ⚽ SCAPS - Documentación Técnica (Edición Amigable)
**Versión:** 1.7 - "Audio & UI Overhaul"

¡Hola! Esta guía técnica está escrita para que **cualquiera** pueda entender cómo está construido nuestro motor del juego. Vamos a explicar qué hace cada parte del código de forma sencilla y directa.

---

## 🧠 1. El Corazón del Proyecto: `main.js`
Piensa en `main.js` como el director de orquesta. Es el primer archivo que se carga y el que decide qué se muestra en la pantalla en cada momento.

### Funciones Estrella de `main.js`:
*   `loop()`: Es el latido del corazón del juego. Se ejecuta 60 veces por segundo. Le dice a la pantalla: "Dibuja el menú" o "Dibuja los coches", dependiendo de en qué escena estemos.
*   `cambiarEscena(nuevaEscena)`: Es la máquina del tiempo. Borra todo lo que estás viendo y carga los elementos de la nueva fase (por ejemplo, pasar del Menú al Juego).
*   **Paginación de Mapas**: Hemos implementado una lógica de navegación por páginas en el selector de estadios. En lugar de un scrollbar, el código filtra el array de mapas y solo dibuja 3 a la vez, gestionando flechas de "Anterior" y "Siguiente".

---

## 🏟️ 2. El Terreno de Juego: `js/world/field.js`
Este archivo es el arquitecto del estadio. Aquí se dibuja el césped, las líneas, y se calcula dónde están las porterías y las paredes invisibles para que el balón no se salga.

### Lo que hace por dentro:
*   **Gestión de las Redes Visuales (`netW`, `netD`, `netX`, `netY`)**: Antiguamente, la red del gol y la zona de colisión eran la misma cosa. ¡Ahora son independientes! Esto significa que el balón colisiona con una zona exacta, pero podemos dibujar una red del tamaño y en la posición visual que mejor encaje con nuestra imagen de fondo.
*   `drawField()`: Pinta el césped (la imagen del campo) y dibuja las porterías para el equipo Azul y Naranja.
*   `checkCollisions()`: Es el árbitro. Comprueba constantemente: "¿Ha tocado el balón la red de la portería? ¡Si es así, canta gol!".

---

## 🛠️ 3. El Editor de Mapas: `editor.html` y `editor_interactions.js`
Hemos creado un "taller" profesional para diseñar nuevos campos sin tocar una sola línea de código complejo.

### Funciones principales del Editor:
*   **La Rejilla Mágica (Grid Snapping)**: Al mover elementos, estos "saltan" y se alinean perfectamente en cuadraditos imaginarios. ¡Adiós a las porterías torcidas!
*   **Gestor de Mapas**: En la barra lateral izquierda (diseñada sin esas molestas barras de desplazamiento extra) tienes tarjetas pequeñas (miniaturas) de tus estadios. Puedes hacer clic en uno, cargarlo, cambiarle el nombre o borrarlo.
*   **Herramienta de Arrastre**: Con tu ratón, puedes hacer clic y arrastrar el icono del balón (spawns) o las redes directamente sobre la imagen del campo. Lo que ves, es lo que juegas.

---

## 🚗 4. Los Protagonistas: `js/entities/`
Aquí viven los actores de nuestra película.
*   `Car.js` (El Coche): Controla qué tan rápido acelera, cómo frena y cuánto derrapa. Tiene variables como `speed` (velocidad), `rotation` (hacia dónde mira) y `boost` (el nitro).
*   `Ball.js` (El Balón): Sabe cómo rebotar gracias a su "coeficiente de restitución" (una palabra técnica para decir qué tan saltarina es). También sabe cuándo dibujar un rastro de fuego si va muy rápida.

---

## 🎶 5. La Ambientación: `js/fx/audio.js`
*   **Sistema de Música Inteligente**: Ahora el juego tiene una "Playlist" de 8 canciones. El código las mezcla de forma aleatoria (Shuffle) cada vez que empiezas a jugar.
*   **Metadatos y Notificaciones**: Cuando empieza una canción, el sistema busca su nombre y artista en un objeto interno y muestra una etiqueta visual en la parte superior de la pantalla.
*   **Efectos de Sonido**: Gestiona cuándo reproducir el "clic" de los botones o el sonido de la cuenta atrás (`Countdown.mp3`). Todo con silueta negra en el texto para que se lea perfecto.

---

## 🚀 Resumen para entenderlo TODO:
Si el juego no dibuja bien el campo, vas a `field.js`. Si un coche corre muy poco, vas a `Car.js`. Si quieres construir un estadio nuevo para tus amigos, abres el `editor.html`. ¡Todo está en cajoncitos separados para no volvernos locos!
