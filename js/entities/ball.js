import * as CONST from '../core/constants.js';
import { ExplosionParticle } from '../fx/particles.js';
import { checkPolygonCollision } from '../world/physics.js';
import { playSound } from '../fx/audio.js';

export class Ball {
    constructor(x, y, imgPath = null) {
        this.x = x; this.y = y; this.radius = CONST.CONFIG.BALL_BASE_RADIUS; this.vx = 0; this.vy = 0;
        this.visualRadius = this.radius; this.targetRadius = this.radius; this.onWallTimer = 0; 
        this.rotationAngle = 0; this.isFireball = false; this.fireballTimer = 0; 
        this.img = null;
        if (imgPath) {
            this.setAppearance(imgPath);
        }
    }

    setAppearance(imgPath) {
        if (!this.img || (typeof imgPath === 'string' && !this.img.src.includes(imgPath))) {
            this.img = new Image();
            this.img.src = imgPath;
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
        ctx.rotate(this.rotationAngle); 
        
        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -this.visualRadius, -this.visualRadius, this.visualRadius * 2, this.visualRadius * 2);
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, this.visualRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'white';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(0, 0, this.visualRadius * 0.9, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            ctx.fill();
            ctx.fillStyle = '#222';
            ctx.beginPath(); ctx.arc(0, -this.visualRadius / 2, this.visualRadius / 3, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(this.visualRadius / 2, this.visualRadius / 3, this.visualRadius / 3.5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.arc(-this.visualRadius / 2, this.visualRadius / 3, this.visualRadius / 3.5, 0, Math.PI * 2); ctx.fill();
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

    update(gameState, explosionParticles) {
        if (this.isFireball && this.fireballTimer > 0) { 
            this.fireballTimer--; 
            this.spawnFireParticles(explosionParticles); 
            return; 
        }
        if (gameState === 'countdown') return; 

        this.x += this.vx; this.y += this.vy; this.vx *= CONST.CONFIG.BALL_FRICTION; this.vy *= CONST.CONFIG.BALL_FRICTION;
        const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (currentSpeed > CONST.CONFIG.BALL_MAX_SPEED) { 
            const factor = CONST.CONFIG.BALL_MAX_SPEED / currentSpeed; 
            this.vx *= factor; this.vy *= factor; 
        }
        this.rotationAngle += this.vx * 0.05; 
        if (this.onWallTimer > 0) { 
            this.onWallTimer--; 
        } else { 
            this.targetRadius = this.radius; 
        }
        const easeFactor = 0.1; 
        this.visualRadius += (this.targetRadius - this.visualRadius) * easeFactor;
        
        // --- COLISIONES ---
        
        // 1. Polígono del Campo
        checkPolygonCollision(this, CONST.CONFIG.FIELD_POLYGON);

        // Límites del mundo como seguridad extrema (no deben activarse si el polígono funciona)
        if (this.x < -500 || this.x > CONST.WORLD_W + 500) this.vx *= -1;
        if (this.y < -500 || this.y > CONST.WORLD_H + 500) this.vy *= -1;

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
