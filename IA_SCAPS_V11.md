# Arquitectura y Diseño de IA SCAPS (V11 Experimental)

Este documento detalla el funcionamiento interno del motor de Inteligencia Artificial V11 implementado en `physics_experimental.js`. Sirve como base de conocimiento para futuras iteraciones y mejoras del comportamiento de los bots mediante prompts.

## 1. El Problema Base (Resuelto en V11)
Durante las versiones V1 a V10, los bots presentaban un comportamiento de "órbita infinita" alrededor del balón. Este fallo no era heurístico, sino estrictamente matemático:
- La función `Math.atan2(dy, dx)` calcula ángulos donde `0` radianes equivale a apuntar hacia la **Derecha** (Eje X positivo).
- El motor de físicas de SCAPS (`Car.js`) está programado de tal forma que `angle = 0` implica apuntar hacia **Arriba** (Eje Y negativo).
- Esta divergencia de 90 grados (PI/2) provocaba que, al calcular la diferencia angular, la IA siempre creyera estar desviada 90 grados respecto al target, forzándola a girar constantemente y creando un movimiento orbital.

**La Solución V11:**
```javascript
const targetAngle = Math.atan2(dy, dx);
const standardCarAngle = ai.angle - Math.PI / 2; // Alineación de coordenadas
let angleDiff = targetAngle - standardCarAngle;
```
Al restar `PI/2` al ángulo del coche, ambos sistemas de coordenadas se sincronizan, permitiendo una persecución lineal y directa.

## 2. Componentes de la IA V11

La IA actual carece de una Máquina de Estados Finita (FSM) compleja. Funciona como un script de "Fuerza Bruta Determinista" evaluado en cada frame (`requestAnimationFrame`).

### 2.1. Control de Dirección (Steering)
La IA evalúa el valor absoluto de la diferencia angular (`absDiff`).
- Se aplica una **Deadzone** (`0.08` rad) para evitar micro-oscilaciones ("jittering") cuando el bot está prácticamente alineado.
- Si `angleDiff > 0`, pulsa Derecha. Si es `< 0`, pulsa Izquierda.

### 2.2. Throttle Gating (Gating de Aceleración)
Para evitar que los bots "pasen de largo" el balón debido a un radio de giro muy amplio a altas velocidades, la aceleración está condicionada al ángulo:
- **`absDiff < 0.3` (~17°)**: Perfectamente alineado. Pulsa `Up` y `Boost` si está disponible.
- **`absDiff < 1.2` (~68°)**: Ligeramente desalineado. Pulsa `Up` pero **sin Boost**, permitiendo que la física del coche cierre la curva.
- **`absDiff >= 1.2` (> 68°)**: Totalmente desalineado. Suelta el acelerador, pulsa `Down` (Freno) y `Drift` (Derrape). Esto hace que el bot pivote como una torreta en lugar de describir un arco inmenso.

### 2.3. Anti-Stuck por Hardware
Dado que los bots persiguen el balón sin importar los obstáculos (paredes o porterías), se atascarían inevitablemente al chocar de frente.
- La IA monitorea `ai.speed`. Si `Math.abs(ai.speed) < 0.2` durante 30 frames consecutivos, asume que está empotrada contra una pared.
- **Protocolo de Escape**: Suelta el acelerador, mantiene pulsado `Down` (Marcha Atrás) y `Left` (Giro extremo) durante 30 frames para despegarse de la geometría antes de reiniciar la persecución.

## 3. Plan de Futuro (Próximos Prompts)

A partir de esta base matemáticamente estable (los bots ya saben ir del Punto A al Punto B), las futuras iteraciones deben enfocarse en el comportamiento táctico:

1. **Predicción de Interceptación Avanzada (Lead Target)**:
   En lugar de apuntar a `ball.x`, `ball.y`, la IA debe apuntar a `ball.x + ball.vx * timeToIntercept`.
2. **Pathfinding y Evasión Euclidiana**:
   Implementar Raycasting o A* simplificado para evitar las porterías y paredes sin depender del `Anti-Stuck` reactivo.
3. **Roles Dinámicos**:
   Re-integrar la FSM pero con lógica de equipo:
   - *Attacker*: Persigue el balón.
   - *Defender*: Se posiciona entre el balón y su propia portería.
   - *Support*: Busca posiciones de pase o recoge `BoostPads`.
4. **Boost Pathing**:
   Si un bot no es el *Attacker* activo, debe evaluar la ruta hacia el `BoostPad` lleno más cercano.
