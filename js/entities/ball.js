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
        this.rotationAngle = 0; this.isFireball = false; this.fireballTimer = 0; 
        this.type = 'ball';
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
        
        // Dibujar Sombra Dinámica (Desplazada y más ajustada al volumen)
        ctx.beginPath();
        const shadowScale = Math.max(0.3, 1 - (this.z / 350));
        ctx.scale(1, 0.5); // Sombra ovalada
        // Añadimos un pequeño offset (x:8, y:15) para simular una luz en ángulo
        // Y reducimos el tamaño base al 85% del radio para que no asome demasiado en reposo
        ctx.arc(8, 15, this.radius * shadowScale * 0.85, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.5 * shadowScale})`;
        ctx.fill();
        ctx.scale(1, 2); // Restaurar escala
        
        // Trasladar en Y hacia arriba para simular la altura Z
        ctx.translate(0, -this.z);
        ctx.rotate(this.rotationAngle); 
        
        // El radio visual crece un poco al elevarse para dar efecto 3D
        const renderRadius = this.visualRadius * (1 + this.z / 400);
        
        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -renderRadius, -renderRadius, renderRadius * 2, renderRadius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, renderRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, renderRadius * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(0, -renderRadius / 2, renderRadius / 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(renderRadius / 2, renderRadius / 3, renderRadius / 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-renderRadius / 2, renderRadius / 3, renderRadius / 3.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore(); 
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

        // FÍSICAS DEL EJE Z (Gravedad y Rebote)
        this.z += this.vz * timeScale;
        this.vz -= 0.3 * timeScale; // Fuerza de gravedad
        
        if (this.z < 0) {
            this.z = 0;
            // Bote elástico en el suelo (Balón pesado, menos bote)
            if (this.vz < -2) {
                this.vz *= -0.45; // Factor de restitución vertical reducido (antes 0.65)
                // Sonido suave proporcional al bote, para no saturar
                playSound('ball_hit', Math.min(0.3, Math.abs(this.vz) * 0.05));
            } else {
                this.vz = 0;
            }
        }

        // Fricción adaptativa (mucho menos en el aire)
        const currentFriction = (this.z > 0) ? 0.998 : CONST.CONFIG.BALL_FRICTION;
        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        this.vx *= Math.pow(currentFriction, timeScale); 
        this.vy *= Math.pow(currentFriction, timeScale);
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > CONST.CONFIG.BALL_MAX_SPEED) { 
            const factor = CONST.CONFIG.BALL_MAX_SPEED / currentSpeed; 
            this.vx *= factor; this.vy *= factor; 
        }
        this.rotationAngle += this.vx * 0.05 * timeScale; 
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
            this.z = 100;
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
            if (this.y - this.radius < top) { this.y = top + this.radius; this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
            if (this.x - this.radius < back) { this.x = back + this.radius; this.vx *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
        } else if (inGoalRight) {
            const top = CONST.CONFIG.GOAL_BOTTOM.y - CONST.CONFIG.GOAL_BOTTOM.w/2;
            const bottom = CONST.CONFIG.GOAL_BOTTOM.y + CONST.CONFIG.GOAL_BOTTOM.w/2;
            const back = CONST.CONFIG.GOAL_BOTTOM.x + CONST.CONFIG.GOAL_BOTTOM.d;
            if (this.y - this.radius < top) { this.y = top + this.radius; this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; this.vy *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
            if (this.x + this.radius > back) { this.x = back - this.radius; this.vx *= -CONST.CONFIG.BALL_WALL_SLOWDOWN_FACTOR; playSound('wall_hit', 0.5); }
        }
    }

    checkGoal() {
        if (Math.abs(this.y - CONST.CONFIG.GOAL_TOP.y) < CONST.CONFIG.GOAL_TOP.w / 2 && this.x < CONST.CONFIG.GOAL_TOP.x - 20) return 'orange';
        if (Math.abs(this.y - CONST.CONFIG.GOAL_BOTTOM.y) < CONST.CONFIG.GOAL_BOTTOM.w / 2 && this.x > CONST.CONFIG.GOAL_BOTTOM.x + 20) return 'blue';
        return null;
    }
}
