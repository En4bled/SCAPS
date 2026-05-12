# Especificaciones Técnicas del Motor de Físicas - SCAPS (V11)

Este documento detalla los fundamentos matemáticos y algoritmos que rigen el comportamiento físico del universo SCAPS.

## 1. Sistemas de Coordenadas y Espacio Trigonométrico

El motor opera en un espacio cartesiano estándar de 2D, pero con una divergencia en la orientación de las entidades:

- **Espacio Universal (Canvas)**: Ángulo 0 radianes apunta hacia el eje X positivo (Derecha). El crecimiento es horario (PI/2 = Abajo).
- **Entidades (Cars)**: Por diseño de los assets originales, el ángulo 0 del coche apunta hacia el eje Y negativo (Arriba).
- **Sincronización**: Para cálculos de vectores de IA y colisiones direccionales, se utiliza la transformación:
  `standardAngle = carAngle - PI/2`

## 2. Detección y Resolución de Colisiones

### 2.1. Colisión Círculo-Polígono (Paredes)
Se utiliza el **Teorema del Eje de Separación (SAT)** simplificado para entornos estáticos:
1. Se calcula el punto más cercano (Clamped Point) del polígono al centro del círculo.
2. Si la distancia es menor al radio, se genera un vector de penetración.
3. **Resolución**: Se desplaza el círculo fuera de la geometría y se invierte la componente normal de la velocidad multiplicada por el coeficiente de restitución (`CONST.CONFIG.WALL_BOUNCE`).

### 2.2. Colisión Círculo-Círculo (Coche-Balón / Coche-Coche)
Utiliza una resolución de impulsos basada en la conservación del momento (simplificada para masas iguales):
- **Detección**: `distance(c1, c2) < (r1 + r2)`.
- **Impulso**: Se calcula el ángulo de colisión (`phi`). Las velocidades se proyectan sobre el eje normal de impacto.
- **Factor de Potencia**: En colisiones Coche-Balón, se aplica un multiplicador de fuerza basado en la velocidad relativa para simular el "golpeo".

## 3. Dinámica del Vehículo

El movimiento de los coches no es puramente lineal, sino que simula tracción y transferencia de masa:

- **Aceleración**: `vx += cos(angle) * accel`, `vy += sin(angle) * accel`.
- **Fricción (Drag)**: Se aplica un factor de decaimiento constante (`0.98`) a la velocidad lateral para simular el agarre de los neumáticos.
- **Giro Dinámico**: La capacidad de rotación (`turnSpeed`) está vinculada a la velocidad actual (`speedFactor`). A velocidades extremas, el radio de giro aumenta (subviraje), a menos que se active el **Drift**, que reduce la fricción lateral.

## 4. Simulación de Elevación (Efecto Rampa / Z-Axis)

SCAPS simula una tercera dimensión mediante la manipulación del factor de escala y máscaras de colisión:

1. **Activación**: Al colisionar con una pared perimetral con suficiente velocidad, el balón entra en estado `onWallTimer`.
2. **Efecto Visual**: El radio visual del balón se escala linealmente (Zoom) de `1.0` a `1.4`, simulando que se eleva hacia la cámara.
3. **Gating de Colisión**: Mientras el balón está "en el aire" (`onWallTimer > 0`):
   - Se desactivan las colisiones con los coches (`checkCarBallCollision`).
   - El balón puede "volar" por encima de los vehículos.
   - La gravedad simulada reduce el temporizador hasta que el balón "aterriza" y recupera su escala y colisiones normales.

## 5. Cinemática de Cámara y Zoom

Se utilizan funciones de interpolación lineal (Lerp) y suavizado exponencial:

- **Interpolación de Cámara**: `current += (target - current) * lerpFactor`.
- **Hybrid Zoom Transition**: Durante el inicio, se utiliza un `mix` basado en el progreso del zoom:
  `targetX = (Centro * (1 - progress)) + (Jugador * progress)`.
- **Suavizado**: Se aplica una curva de Bezier simple (`mix * mix * (3 - 2 * mix)`) para que la transición entre el centro del mapa y el jugador sea orgánica.

---
*Documento de referencia para el desarrollo de la IA y optimización de rendimiento.*
