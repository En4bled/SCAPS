# SCAPS: Sports-Car Arena Physics Simulation
**Simulación de Físicas de Coches Deportivos en Arena**

SCAPS es un motor de física 2D de alto rendimiento y un framework de juego inspirado en la dinámica del fútbol vehicular. Desarrollado utilizando un enfoque puro de pila web (HTML5, CSS3 y JavaScript ES6+), proporciona un entorno robusto para la simulación en tiempo real, el comportamiento competitivo de la IA y el diseño de niveles interactivo.

## 🛠 Stack Técnico
- **Lógica Central**: Vanilla JavaScript (Módulos ES6)
- **Motor de Renderizado**: API HTML5 Canvas (Contexto 2D)
- **Estilo e Interfaz**: Propiedades personalizadas de CSS3 y Flexbox/Grid
- **Persistencia de Datos**: Configuración basada en JSON y almacenamiento de niveles

## 🚀 Características Clave

### 1. Motor de Física Avanzado
- **Resolución de Colisiones**: Manejo de colisiones basado en impulsos en tiempo real para interacciones Coche-a-Coche y Coche-a-Balón.
- **Maniobrabilidad Dinámica**: Manejo avanzado del vehículo que incluye pérdida de tracción (derrape), dirección basada en torque y curvas de aceleración.
- **Momento Elástico**: Transferencia de momento físicamente precisa entre entidades, evitando superposiciones y asegurando vectores de rebote consistentes.

### 2. Inteligencia Autónoma (AI Striker V11 Experimental)
- **Dirección Determinista**: Resolución angular corregida matemáticamente para eliminar la orbitación y asegurar vectores de orientación inmediata hacia el balón.
- **Gating de Aceleración**: Gestión avanzada de la velocidad donde los bots frenan activamente en giros cerrados (>17°) para evitar pasarse de largo.
- **Recuperación a Prueba de Fallos**: Lógica agresiva anti-bloqueo basada en el recuento de frames de baja velocidad para ejecutar maniobras de escape.

### 3. Editor de Física en Tiempo Real
- **Hot-Swapping**: Modifica la velocidad del vehículo, la tracción y las propiedades de colisión del balón instantáneamente durante el juego.
- **Capa de Interfaz**: Capa de pausa dedicada activada mediante la tecla `º` para probar cambios de equilibrio sin recargar.

### 4. Editor de Mapas Integrado (Suite de Diseño de Niveles)
- **Mapeo Visual**: Interfaz WYSIWYG para definir límites de campo, zonas de gol y puntos de aparición (spawns).
- **Simulación de Eje Z (Rampas)**: Las paredes actúan como rampas, impulsando el balón al aire (`onWallTimer`) y pasando limpiamente sobre los vehículos.
- **Gestión de Recursos**: Carga dinámica de JSON para texturas de campo personalizadas y configuraciones de arena.

## 🎮 Especificación de Controles
| Acción | Tecla |
| :--- | :--- |
| **Movimiento** | `W`, `A`, `S`, `D` |
| **Nitro (Boost)** | `Shift Izquierdo` |
| **Derrape (Drift)** | `Espacio` |
| **Cambiar Cámara** | `V` |
| **Marcador** | `Tab` |
| **Menú de Pausa** | `Esc` |

## 📦 Estructura del Proyecto
- `/js/core`: Constantes del sistema e inicialización del motor.
- `/js/world`: Solucionador de físicas, detección de colisiones y renderizado de campo.
- `/js/entities`: Clases modulares para físicas de vehículos y balón.
- `/js/ui`: Gestión de escenas e interacciones de interfaz.
- `editor.html`: Entorno dedicado al diseño de niveles.

---
*Desarrollado por En4bLeD_ & Antigravity Assistant. 2026.*
