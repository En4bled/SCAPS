/**
 * SCAPS REPLAY SYSTEM
 * Gestiona la grabación y reproducción de jugadas recientes.
 */

export class ReplaySystem {
    constructor(maxFrames = 480) { // ~8 segundos a 60fps
        this.maxFrames = maxFrames;
        this.buffer = [];
        this.isPlaying = false;
        this.currentFrameIndex = 0;
        this.playbackSpeed = 1.0;
    }

    /**
     * Captura el estado actual de todas las entidades importantes.
     */
    record(ball, cars) {
        if (this.isPlaying) return;

        const frame = {
            ball: {
                x: ball.x,
                y: ball.y,
                angle: ball.rotationAngle,
                visualRadius: ball.visualRadius,
                isFireball: ball.isFireball
            },
            cars: cars.map(car => ({
                x: car.x,
                y: car.y,
                angle: car.angle,
                isBoosting: car.isBoosting,
                isExploded: car.isExploded,
                isSupersonic: car.isSupersonic
            }))
        };

        this.buffer.push(frame);
        if (this.buffer.length > this.maxFrames) {
            this.buffer.shift();
        }
    }

    /**
     * Prepara el sistema para reproducir.
     */
    startPlayback() {
        if (this.buffer.length === 0) return false;
        this.isPlaying = true;
        this.currentFrameIndex = 0;
        return true;
    }

    /**
     * Detiene el replay.
     */
    stopPlayback() {
        this.isPlaying = false;
        this.currentFrameIndex = 0;
    }

    /**
     * Aplica el estado del frame actual a las entidades reales del juego.
     */
    applyFrame(ball, cars) {
        if (!this.isPlaying || this.buffer.length === 0) return false;

        const frame = this.buffer[Math.floor(this.currentFrameIndex)];
        if (!frame) return false;

        // Aplicar al balón
        ball.x = frame.ball.x;
        ball.y = frame.ball.y;
        ball.rotationAngle = frame.ball.angle;
        ball.visualRadius = frame.ball.visualRadius;
        ball.isFireball = frame.ball.isFireball;

        // Aplicar a los coches
        frame.cars.forEach((carState, index) => {
            if (cars[index]) {
                const car = cars[index];
                car.x = carState.x;
                car.y = carState.y;
                car.angle = carState.angle;
                car.isBoosting = carState.isBoosting;
                car.isExploded = carState.isExploded;
                car.isSupersonic = carState.isSupersonic;
                
                // Forzar velocidad a 0 para que no afecten las físicas si hay fugas
                car.vx = 0;
                car.vy = 0;
                car.speed = 0;
            }
        });

        // Avanzar frame
        this.currentFrameIndex += this.playbackSpeed;

        // Retornar true si aún hay frames, false si terminó
        if (this.currentFrameIndex >= this.buffer.length) {
            this.isPlaying = false;
            return false;
        }
        return true;
    }

    reset() {
        this.buffer = [];
        this.isPlaying = false;
        this.currentFrameIndex = 0;
    }
}
