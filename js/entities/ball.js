import * as CONST from '../core/constants.js';
import { getAssetPath } from '../core/constants.js';
import { ExplosionParticle } from '../fx/particles.js';
import { checkPolygonCollision } from '../world/physics.js';
import { playSound } from '../fx/audio.js';

export class Ball {
    constructor(x, y, imgPath = null) {
        this.x = x; this.y = y; this.z = 0; 
        this.radius = CONST.CONFIG.BALL_BASE_RADIUS; 
        this.vx = 0; this.vy = 0; this.vz = 0;
        this.visualRadius = this.radius; this.targetRadius = this.radius; this.onWallTimer = 0; 
        this.rotationAngle = 0; this.spin = 0; this.rollDistance = 0; this.isFireball = false; this.fireballTimer = 0; 
        this.type = 'ball';
        this.mass = 15;
        this.img = null;
        
        // Parámetros de animación "Estirar y Aplastar" (Squash & Stretch)
        this.squashX = 1.0;
        this.squashY = 1.0;
        this.squashVx = 0;
        this.squashVy = 0;

        if (imgPath) {
            this.setAppearance(imgPath);
        }
    }

    setAppearance(imgPath) {
        if (typeof imgPath === 'string') {
            const resolvedPath = getAssetPath(imgPath);
            if (!this.img || !this.img.src.includes(resolvedPath)) {
                this.img = new Image();
                this.img.src = resolvedPath;
            }
        }
    }

    // Alias para compatibilidad
    set imgUrl(url) {
        this.setAppearance(url);
    }

    triggerImpactSquash(nx, ny, intensity) {
        const squashAmount = Math.min(0.35, intensity * 0.05);
        if (squashAmount < 0.05) return;
        
        const factorX = Math.abs(nx);
        const factorY = Math.abs(ny);
        
        this.squashX = 1.0 - (factorX * squashAmount) + (factorY * squashAmount);
        this.squashY = 1.0 - (factorY * squashAmount) + (factorX * squashAmount);
        
        this.squashVx = 0;
        this.squashVy = 0;
    }

    spawnFireParticles(explosionParticles) {
        for (let i = 0; i < 3; i++) { 
            const colorOffset = Math.random() * 50 - 25;
            let p = new ExplosionParticle(this.x, this.y, colorOffset);
            p.size = Math.random() * 15 + 10; p.lifespan = 30; p.vx = (Math.random() - 0.5) * 6; p.vy = (Math.random() - 0.5) * 6;
            explosionParticles.push(p);
        }
    }

    drawNormalBall(ctx) {
        // --- 1. DIBUJAR SOMBRA PROYECTADA EN EL SUELO ---
        // La sombra se dibuja primero (debajo del balón) y se proyecta dinámicamente según la altura
        ctx.save();
        // Desplazamiento de la sombra basado en la altura Z (luz desde arriba-izquierda)
        const shadowOffsetX = this.z * 0.35;
        const shadowOffsetY = this.z * 0.45;
        ctx.translate(this.x + shadowOffsetX, this.y + shadowOffsetY);
        ctx.scale(1, 0.5); // Proyección ovalada isométrica plana
        
        const heightFactor = Math.min(1.0, this.z / 150.0);
        const shadowRadius = this.radius * (1.0 + heightFactor * 0.45); // Se expande y difumina con la altura
        const shadowOpacity = 0.60 * (1.0 - heightFactor * 0.85); // Pierde opacidad con la altura
        
        const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadius);
        shadowGrad.addColorStop(0, `rgba(0, 0, 0, ${shadowOpacity})`);
        shadowGrad.addColorStop(0.35, `rgba(0, 0, 0, ${shadowOpacity * 0.7})`);
        shadowGrad.addColorStop(0.75, `rgba(0, 0, 0, ${shadowOpacity * 0.25})`);
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.arc(0, 0, shadowRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // --- 2. DIBUJAR LA RETÍCULA DE CAÍDA (SI ESTÁ ALTO EN EL AIRE) ---
        if (this.z > 25.0) {
            ctx.save();
            ctx.translate(this.x, this.y); // Centrado en la proyección vertical exacta en el suelo
            ctx.scale(1, 0.5);
            
            const opacity = Math.min(0.7, (this.z - 25.0) / 40.0);
            ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.95})`;
            ctx.lineWidth = 2.5;
            
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 1.25, 0, Math.PI * 2);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.moveTo(-this.radius * 1.8, 0); ctx.lineTo(-this.radius * 0.4, 0);
            ctx.moveTo(this.radius * 0.4, 0); ctx.lineTo(this.radius * 1.8, 0);
            ctx.moveTo(0, -this.radius * 1.8); ctx.lineTo(0, -this.radius * 0.4);
            ctx.moveTo(0, this.radius * 0.4); ctx.lineTo(0, this.radius * 1.8);
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.45, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 110, 0, ${opacity * 0.9})`;
            ctx.lineWidth = 2.0;
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 110, 0, ${opacity})`;
            ctx.fill();
            ctx.restore();
        }

        // --- 3. DIBUJAR EL CUERPO DEL BALÓN (CON ALTURA Z) ---
        ctx.save();
        ctx.translate(this.x, this.y - this.z); // Traslación a la posición 3D (altura Z integrada)
        
        // Aplastamiento y vibración elástica por impactos (suelo/pared/coche)
        ctx.scale(this.squashX, this.squashY);

        const zoomScale = 1.0 + Math.min(1.0, this.z / 32.0) * 0.18;
        const renderRadius = this.visualRadius * zoomScale;
        
        // Dibujar textura/gráfico del balón rotado
        ctx.save();
        ctx.rotate(this.rotationAngle); // Giro de la textura

        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -renderRadius, -renderRadius, renderRadius * 2, renderRadius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, renderRadius, 0, Math.PI * 2);
            ctx.fillStyle = '#ffffff';
            ctx.fill();
        }
        ctx.restore(); // Se deshace la rotación de textura!

        // --- 4. OVERLAY DE SOMBREADO ESFÉRICO DINÁMICO FIJO ---
        // Sombreado radial fijo de alta definición que le da el relieve volumétrico 3D a la esfera.
        // Queda estático (luz de arriba-izquierda, sombra abajo-derecha) independientemente de la rotación de la pelota.
        const shadingGrad = ctx.createRadialGradient(
            -renderRadius * 0.22, -renderRadius * 0.22, renderRadius * 0.05,
            0, 0, renderRadius
        );
        shadingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.55)');   // Brillo del foco de luz en 3D
        shadingGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.05)');  // Transición suave
        shadingGrad.addColorStop(0.65, 'rgba(0, 0, 0, 0.15)');       // Sombra de volumen
        shadingGrad.addColorStop(0.95, 'rgba(0, 0, 0, 0.65)');       // Oclusión ambiental
        shadingGrad.addColorStop(1, 'rgba(0, 0, 0, 0.85)');          // Borde oscuro esférico

        ctx.fillStyle = shadingGrad;
        ctx.beginPath();
        ctx.arc(0, 0, renderRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Restaurar el cuerpo del balón
    }

    drawFireball(ctx, animationFrameCounter) {
        if (this.fireballTimer <= 0) return; 
        const size = this.radius * (2.0 + Math.sin(animationFrameCounter * 0.3) * 0.3); 
        ctx.save(); ctx.translate(this.x, this.y);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)'); 
        gradient.addColorStop(0.2, 'rgba(255, 200, 0, 0.9)'); 
        gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.8)'); 
        gradient.addColorStop(1, 'rgba(200, 0, 0, 0.1)'); 
        ctx.fillStyle = gradient; ctx.beginPath(); ctx.arc(0, 0, size, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    draw(ctx, animationFrameCounter) { 
        if (this.isFireball) { this.drawFireball(ctx, animationFrameCounter); } 
        else { this.drawNormalBall(ctx); } 
    }

    update(gameState, explosionParticles, timeScale = 1.0) {
        if (this.isFireball && this.fireballTimer > 0) { 
            this.fireballTimer -= timeScale; 
            this.spawnFireParticles(explosionParticles); 
            return; 
        }
        if (gameState === 'countdown') return; 

        // Simulación de resorte-amortiguador para squash y stretch (peso/elasticidad)
        const k = 0.15; // Rigidez
        const damping = 0.78; // Amortiguación
        const ax = (1.0 - this.squashX) * k;
        const ay = (1.0 - this.squashY) * k;
        this.squashVx += ax * timeScale;
        this.squashVy += ay * timeScale;
        this.squashVx *= Math.pow(damping, timeScale);
        this.squashVy *= Math.pow(damping, timeScale);
        this.squashX += this.squashVx * timeScale;
        this.squashY += this.squashVy * timeScale;

        // Gravedad y físicas del eje Z
        if (this.z > 0) {
            this.z += this.vz * timeScale;
            this.vz -= CONST.CONFIG.CAR_GRAVITY * 1.25 * timeScale; // Gravedad aumentada para reducir la flotación
            
            if (this.z <= 0) {
                this.z = 0;
                // Rebote elástico reducido contra el suelo
                if (this.vz < -0.4) {
                    this.triggerImpactSquash(0, 1, Math.abs(this.vz));
                    this.vz *= -0.58;
                    this.vx *= 0.95;
                    this.vy *= 0.95;
                    playSound('ball_hit', Math.min(0.25, Math.abs(this.vz) * 0.08));
                } else {
                    this.vz = 0;
                }
            }
        }

        // Fricción constante en el suelo
        const currentFriction = CONST.CONFIG.BALL_FRICTION;
        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        this.vx *= Math.pow(currentFriction, timeScale); 
        this.vy *= Math.pow(currentFriction, timeScale);

        // Fricción de rodadura extra a velocidades muy bajas para detener el balón de forma limpia
        if (this.z === 0) {
            const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
            if (speed > 0 && speed < 0.3) {
                const stopFactor = Math.max(0, 1 - 0.08 * timeScale);
                this.vx *= stopFactor;
                this.vy *= stopFactor;
                if (speed < 0.04) {
                    this.vx = 0;
                    this.vy = 0;
                }
            }
        }

        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > CONST.CONFIG.BALL_MAX_SPEED) { 
            const factor = CONST.CONFIG.BALL_MAX_SPEED / currentSpeed; 
            this.vx *= factor; this.vy *= factor; 
        }

        // Rodamiento 2D continuo y spin físico de la pelota
        if (this.z > 0) {
            // En el aire: conserva su rotación de spin
            this.rotationAngle += this.spin * timeScale;
            this.spin *= Math.pow(0.995, timeScale);
        } else {
            // En el suelo: rueda de forma continua siguiendo el avance horizontal
            const rollDirectionSign = this.vx >= 0 ? 1 : -1;
            this.rotationAngle += rollDirectionSign * (currentSpeed / this.radius) * timeScale;
            this.rotationAngle += this.spin * 0.1 * timeScale; // El spin afecta ligeramente en el suelo
            this.spin *= Math.pow(0.95, timeScale);
        }

        if (this.onWallTimer > 0) { 
            this.onWallTimer -= timeScale; 
        } else { 
            this.targetRadius = this.radius; 
        }
        const easeFactor = 1.0 - Math.pow(0.9, timeScale); 
        this.visualRadius += (this.targetRadius - this.visualRadius) * easeFactor;
        
        // --- COLISIONES ---
        
        // 1. Polígono del Campo
        checkPolygonCollision(this, CONST.CONFIG.FIELD_POLYGON);

        // Límites del mundo como seguridad extrema (teletransporte al centro si logra escapar por un glitch)
        if (this.x < -1000 || this.x > CONST.CONFIG.WORLD_W + 1000 || 
            this.y < -1000 || this.y > CONST.CONFIG.WORLD_H + 1000) {
            this.x = CONST.CONFIG.WORLD_W / 2;
            this.y = CONST.CONFIG.WORLD_H / 2;
            this.vx = 0;
            this.vy = 0;
            this.z = 0;
            this.vz = 0;
            console.log("Balón rescatado del infinito.");
        }

        // 3. Porterías (Detección para rebotes internos)
        const inGoalLeft = (Math.abs(this.y - CONST.CONFIG.GOAL_TOP.y) < CONST.CONFIG.GOAL_TOP.w/2 && this.x < CONST.CONFIG.GOAL_TOP.x);
        const inGoalRight = (Math.abs(this.y - CONST.CONFIG.GOAL_BOTTOM.y) < CONST.CONFIG.GOAL_BOTTOM.w/2 && this.x > CONST.CONFIG.GOAL_BOTTOM.x);

        if (inGoalLeft) {
            const top = CONST.CONFIG.GOAL_TOP.y - CONST.CONFIG.GOAL_TOP.w/2;
            const bottom = CONST.CONFIG.GOAL_TOP.y + CONST.CONFIG.GOAL_TOP.w/2;
            const back = CONST.CONFIG.GOAL_TOP.x - CONST.CONFIG.GOAL_TOP.d;
            if (this.y - this.radius < top) { this.y = top + this.radius; if (Math.abs(this.vy) > 1.0) playSound('wall_hit', 0.5); this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; if (Math.abs(this.vy) > 1.0) playSound('wall_hit', 0.5); this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
            if (this.x - this.radius < back) { this.x = back + this.radius; if (Math.abs(this.vx) > 1.0) playSound('wall_hit', 0.5); this.vx *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
        } else if (inGoalRight) {
            const top = CONST.CONFIG.GOAL_BOTTOM.y - CONST.CONFIG.GOAL_BOTTOM.w/2;
            const bottom = CONST.CONFIG.GOAL_BOTTOM.y + CONST.CONFIG.GOAL_BOTTOM.w/2;
            const back = CONST.CONFIG.GOAL_BOTTOM.x + CONST.CONFIG.GOAL_BOTTOM.d;
            if (this.y - this.radius < top) { this.y = top + this.radius; if (Math.abs(this.vy) > 1.0) playSound('wall_hit', 0.5); this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; if (Math.abs(this.vy) > 1.0) playSound('wall_hit', 0.5); this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
            if (this.x + this.radius > back) { this.x = back - this.radius; if (Math.abs(this.vx) > 1.0) playSound('wall_hit', 0.5); this.vx *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; }
        }
    }

    checkGoal() {
        if (Math.abs(this.y - CONST.CONFIG.GOAL_TOP.y) < CONST.CONFIG.GOAL_TOP.w / 2 && this.x < CONST.CONFIG.GOAL_TOP.x - 20) return 'orange';
        if (Math.abs(this.y - CONST.CONFIG.GOAL_BOTTOM.y) < CONST.CONFIG.GOAL_BOTTOM.w / 2 && this.x > CONST.CONFIG.GOAL_BOTTOM.x + 20) return 'blue';
        return null;
    }
}
