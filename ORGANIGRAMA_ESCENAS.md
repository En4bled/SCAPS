# 🎬 Organigrama de Escenas de SCAPS

¡Hola! Bienvenido al detrás de cámaras de SCAPS. Aquí te explicamos cómo fluye nuestro juego de principio a fin, como si fuera una obra de teatro con diferentes "actos" o escenas. Esto nos ayuda a tenerlo todo ordenadito.

---

## 1️⃣ La Presentación (Intro)
**Nombre de la escena:** `INTRO_BRANDING` y `INTRO_LEGAL`
* **¿Qué pasa aquí?**: Es lo primero que ves al abrir el juego. Aparecen los logos de las empresas o tecnologías usadas, seguido de los textos legales o créditos.
* **Vibe**: Misterioso y profesional, para ir calentando motores.

---

## 2️⃣ El Centro de Mando (Menú Principal)
**Nombre de la escena:** `MENU_PRINCIPAL`
* **¿Qué pasa aquí?**: ¡Llegaste al lobby! Tienes un fondo bonito (a veces animado o borroso si pasas el ratón por los botones) y opciones claras: Jugar, Editor, Opciones, etc.
* **Botones mágicos**: Aquí decides tu próximo destino.

---

## 3️⃣ Preparando el Terreno (Match Setup)
**Nombre de la escena:** `MATCH_SETUP` (Nueva!)
* **¿Qué pasa aquí?**: Antes de saltar al campo, eliges las reglas. Puedes ver miniaturas de los mapas, elegir si juegas 2vs2, 3vs3, o un torneo online.
* **Vibe**: Estratégico. Como elegir tu equipación antes de salir al césped.

---

## 4️⃣ Viaje al Estadio (Transición)
**Nombre de la escena:** `TRANSICION_PARTIDO`
* **¿Qué pasa aquí?**: El juego necesita un segundo para cargar los coches, la pelota y el estadio. Ponemos la pantalla en negro o con un efecto suave, y suena un pulso de "cargando". ¡La anticipación sube!

---

## 5️⃣ Un Vistazo Rápido (Pre-Partido)
**Nombre de la escena:** `PRE_PARTIDO`
* **¿Qué pasa aquí?**: Ya estás en la cancha, pero el tiempo está congelado (por unos 3 segunditos). Esto sirve para que mires a tu alrededor, veas quién está en tu equipo y planees tu primera jugada.
* **Importante**: ¡Los motores están apagados! Nadie puede moverse aún.

---

## 6️⃣ ¡A Jugar! (El Partido)
**Nombres de escenas:** `CUENTA_ATRAS` ➡️ `PARTIDO_JUGANDO`
* **¿Qué pasa aquí?**: Suena el "3, 2, 1... ¡YA!" y se desata el caos. Aquí es donde ocurre toda la magia: las físicas, los choques, los saltos con turbo y, por supuesto, los goles.
* **Eventos especiales**:
  * **`GOL_CELEBRACION`**: ¡GOOOOOL! La cámara puede temblar, salen partículas, y volvemos a la posición inicial.
  * **`MENU_PAUSA`**: Si pulsas ESC, el tiempo se detiene para que respires o cambies algo.

---

## 7️⃣ El Pitido Final (Fin del Partido)
**Nombre de la escena:** `FIN_PARTIDO`
* **¿Qué pasa aquí?**: El cronómetro llega a cero. Se muestran las estadísticas: quién marcó, quién hizo más paradas, etc. Desde aquí puedes pedir la revancha o volver al Menú Principal.

---

### 🔄 Resumen del Flujo:
`Intro` ➡️ `Menú Principal` ➡️ `Match Setup` ➡️ `Cargando...` ➡️ `¡3, 2, 1!` ➡️ `Partido` ➡️ `Fin del Juego` ➡️ `(Vuelta al Menú)`

¡Y eso es todo! Cada bloque está separado en nuestro código para que sea muy fácil arreglar una parte sin romper las demás. ¡A disfrutar jugando y programando! 🚗⚽
