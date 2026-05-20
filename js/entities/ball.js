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

    spawnFireParticles(explosionParticles) {
        for (let i = 0; i < 3; i++) { 
            const colorOffset = Math.random() * 50 - 25;
            let p = new ExplosionParticle(this.x, this.y, colorOffset);
            p.size = Math.random() * 15 + 10; p.lifespan = 30; p.vx = (Math.random() - 0.5) * 6; p.vy = (Math.random() - 0.5) * 6;
            explosionParticles.push(p);
        }
    }

    drawNormalBall(ctx) {
        ctx.save(); 
        ctx.translate(this.x, this.y); 
        
        // Dibujar Sombra Dinámica o Retícula de Caída
        const zThreshold = 25;
        if (this.z > zThreshold) {
            ctx.save();
            ctx.scale(1, 0.5); // Proyección isométrica plana

            // Círculo exterior (Blanco con glow y semitransparente)
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.9, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 3;
            ctx.stroke();

            // Relleno de fondo oscuro semitransparente para contrastar
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fill();

            // Dibujar la cruz central (+)
            const crossSize = this.radius * 0.45;
            ctx.beginPath();
            ctx.moveTo(-crossSize, 0);
            ctx.lineTo(crossSize, 0);
            ctx.moveTo(0, -crossSize);
            ctx.lineTo(0, crossSize);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Círculo interno decorativo
            ctx.beginPath();
            ctx.arc(0, 0, this.radius * 0.25, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 150, 0, 0.5)'; // Tono naranja sutil
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Punto central brillante
            ctx.beginPath();
            ctx.arc(0, 0, 5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffaa00';
            ctx.fill();

            ctx.restore();
        } else {
            // Dibujar Sombra Dinámica Local Mejorada (con degradado radial difuminado en los bordes)
            ctx.save();
            ctx.scale(1, 0.5); // Sombra ovalada
            
            const shadowRadius = this.radius * Math.max(0.35, 1.0 - (this.z / 32.0) * 0.65) * 0.9;
            const opacity = Math.max(0.1, 0.55 * (1.0 - (this.z / 32.0) * 0.75));

            const grad = ctx.createRadialGradient(4, 8, 0, 4, 8, shadowRadius);
            grad.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
            grad.addColorStop(0.7, `rgba(0, 0, 0, ${opacity * 0.45})`);
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(4, 8, shadowRadius, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
        
        // Trasladar en Y hacia arriba para simular la altura Z
        ctx.translate(0, -this.z);
        
        // Zoom suave del balón según su altura en Z (hasta un 18% más grande a máx altura)
        const zoomScale = 1.0 + Math.min(1.0, this.z / 32.0) * 0.18;
        const renderRadius = this.visualRadius * zoomScale;
        
        // --- 1. MÁSCARA DE RECORTE ESFÉRICA PERFECTA ---
        ctx.save(); // Para contener la máscara de recorte (clipping)
        ctx.beginPath();
        ctx.arc(0, 0, renderRadius, 0, Math.PI * 2);
        ctx.clip(); // Limita todo el dibujo a la silueta circular de la esfera
        
        // Rotación del eje Z (spin / rosca)
        ctx.rotate(this.rotationAngle);
        
        // Desplazamiento orbital dinámico de la textura interna (rodamiento 3D)
        const shiftAmp = renderRadius * 0.28;
        const shiftX = Math.sin(this.rollDistance / this.radius) * shiftAmp;
        const shiftY = Math.cos(this.rollDistance / this.radius) * shiftAmp;
        
        // Escalamos un poco más la textura interna (1.5x) para que al desplazarse por rodadura nunca exponga bordes transparentes
        const texSize = renderRadius * 1.5;
        
        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -texSize + shiftX, -texSize + shiftY, texSize * 2, texSize * 2);
        } else {
            // Fallback con formas vectoriales
            ctx.beginPath();
            ctx.arc(shiftX, shiftY, renderRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(shiftX, shiftY, renderRadius * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(shiftX, -renderRadius / 2 + shiftY, renderRadius / 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(renderRadius / 2 + shiftX, renderRadius / 3 + shiftY, renderRadius / 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-renderRadius / 2 + shiftX, renderRadius / 3 + shiftY, renderRadius / 3.5, 0, Math.PI * 2); ctx.fill();
        }
        
        ctx.restore(); // Eliminamos la máscara de recorte (mantiene la traslación de Z)

        // --- 2. OVERLAY DE SOMBREADO ESFÉRICO FIJO ---
        // Sombreado radial fijo de alta definición que le da el relieve volumétrico 3D a la esfera
        const shadingGrad = ctx.createRadialGradient(
            -renderRadius * 0.18, -renderRadius * 0.18, renderRadius * 0.05,
            0, 0, renderRadius
        );
        shadingGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');   // Brillo del foco de luz
        shadingGrad.addColorStop(0.35, 'rgba(255, 255, 255, 0.05)');  // Transición
        shadingGrad.addColorStop(0.7, 'rgba(0, 0, 0, 0.15)');       // Sombra de volumen
        shadingGrad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');          // Oclusión en los bordes

        ctx.fillStyle = shadingGrad;
        ctx.beginPath();
        ctx.arc(0, 0, renderRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore(); // Restaura la traslación inicial de Z 
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

        // Gravedad y físicas del eje Z
        if (this.z > 0) {
            this.z += this.vz * timeScale;
            this.vz -= CONST.CONFIG.CAR_GRAVITY * 1.25 * timeScale; // Gravedad aumentada para reducir la flotación
            
            if (this.z <= 0) {
                this.z = 0;
                // Rebote elástico reducido contra el suelo
                if (this.vz < -0.4) {
                    this.vz *= -0.48;
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

        // Rodamiento 3D y spin físico de la pelota
        if (this.z > 0) {
            // En el aire: sigue rodando por inercia pero más lento, y el spin se conserva más
            this.rollDistance += currentSpeed * 0.65 * timeScale;
            this.rotationAngle += this.spin * timeScale;
            this.spin *= Math.pow(0.995, timeScale);
        } else {
            // En el suelo: rueda al 100% de la velocidad física, y el spin se reduce rápido por la fricción del suelo
            this.rollDistance += currentSpeed * timeScale;
            this.rotationAngle += this.spin * timeScale;
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
