import { playSound } from '../fx/audio.js';
import { getAssetPath } from '../core/constants.js';

class BoostParticle {
    constructor(x, y, isMini) {
        this.ox = x; this.oy = y;
        this.colors = ['#ffcc00', '#ffaa00', '#ffee88', '#442200'];
        this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
        this.life = Math.random(); // Nacen en distintas fases
        this.decay = (Math.random() * 0.03 + 0.01);
        this.size = Math.random() * 2.5 + 2.5; // Tamaño base aumentado
        if (Math.random() < 0.15) this.size *= 1.8; // Variante gruesa aumentada
        
        const maxDist = isMini ? 15 : 35;
        this.dist = Math.random() * maxDist + 2;
        // Órbita (angularSpeed)
        this.angularSpeed = (Math.random() * 0.1 + 0.05) * (Math.random() > 0.5 ? 1 : -1);
        this.angle = Math.random() * Math.PI * 2;
        
        this.x = this.ox + Math.cos(this.angle) * this.dist;
        this.y = this.oy + Math.sin(this.angle) * this.dist;
    }

    update() {
        this.angle += this.angularSpeed;
        this.x = this.ox + Math.cos(this.angle) * this.dist;
        this.y = this.oy + Math.sin(this.angle) * this.dist;
        this.life -= this.decay;
    }

    draw(ctx) {
        if (this.life <= 0) return;
        ctx.globalAlpha = Math.min(1, this.life * 2); // Más opacas y sólidas
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.size;
        ctx.lineCap = 'round';
        
        // Simular el rastro (trailAlpha) sin borrar el canvas general
        // Calculando posiciones anteriores en la órbita
        ctx.beginPath();
        const trailLen = 6; // Longitud del arco del rastro
        const trailAngle = this.angle - (this.angularSpeed * trailLen);
        const trailX = this.ox + Math.cos(trailAngle) * this.dist;
        const trailY = this.oy + Math.sin(trailAngle) * this.dist;
        
        ctx.moveTo(trailX, trailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
}

export class BoostPad {
    constructor(x, y, isMini = false) {
        this.x = x; this.y = y; this.isMini = isMini; 
        this.radius = isMini ? 15 : 30; 
        this.amount = isMini ? 30 : 100; 
        this.respawnTime = (isMini ? 5 : 10) * 60; 
        this.active = true; this.respawnTimer = 0;
        
        // --- Sistema de Partículas Interno ---
        this.particles = [];
        this.maxParticles = isMini ? 20 : 45; // Optimizado para rendimiento global

        // --- Cargar Sprite de Base ---
        this.padImg = new Image();
        const imgPath = isMini ? 'recursos/maps/chapa_pad.png' : 'recursos/maps/boost_pad.png';
        this.padImg.src = getAssetPath(imgPath);
    }

    draw(ctx) {
        ctx.save();
        
        // 1. Dibujar el sprite de la base (siempre visible, tanto activa como inactiva)
        if (this.padImg && this.padImg.complete) {
            const sizeMultiplier = this.isMini ? 2.5 : 3.0;
            const size = this.radius * sizeMultiplier;
            ctx.drawImage(this.padImg, this.x - size / 2, this.y - size / 2, size, size);
        } else {
            // Fallback si la imagen aún no ha cargado
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
            ctx.fill();
        }

        // 2. Dibujar efectos sobre la base
        if (this.active) {
            // blendMode: "add"
            ctx.globalCompositeOperation = 'lighter';
            
            // Dibujar el núcleo central (Difuminado / Glow)
            const glowRad = this.radius * (this.isMini ? 1.0 : 1.2);
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRad);
            grad.addColorStop(0, 'rgba(255, 204, 0, 0.45)'); // GOLD
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowRad, 0, Math.PI * 2);
            ctx.fill();
            
            // Núcleo Sólido Central
            const solidRad = this.radius * 0.5;
            ctx.fillStyle = 'rgba(255, 215, 0, 0.95)'; // Amarillo dorado sólido
            ctx.beginPath();
            ctx.arc(this.x, this.y, solidRad, 0, Math.PI * 2);
            ctx.fill();
            
            // Las partículas se encargan de dibujar la estela dorada en órbita
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].draw(ctx);
            }
        } else {
            // Dibujar un arco de progreso de cooldown circular y sutil sobre el pad inactivo
            const cooldownPercent = (this.respawnTime - this.respawnTimer) / this.respawnTime;
            if (cooldownPercent > 0 && cooldownPercent < 1) {
                ctx.strokeStyle = 'rgba(255, 150, 0, 0.55)'; // Naranja brillante pero translúcido
                ctx.lineWidth = this.isMini ? 2 : 3.5;
                ctx.beginPath();
                // Dibujamos el arco desde arriba (-PI/2) hasta completar el círculo
                ctx.arc(this.x, this.y, this.radius * 0.75, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * cooldownPercent));
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    update() { 
        if (!this.active) { 
            this.respawnTimer--; 
            if (this.respawnTimer <= 0) { 
                this.active = true; 
                this.particles = []; // Reiniciar explosión al reaparecer
            } 
        } else {
            // Reposición constante
            if (this.particles.length < this.maxParticles && Math.random() < 0.6) {
                this.particles.push(new BoostParticle(this.x, this.y, this.isMini));
            }
            // Actualización
            for (let i = this.particles.length - 1; i >= 0; i--) {
                const p = this.particles[i];
                p.update();
                if (p.life <= 0) {
                    this.particles.splice(i, 1);
                }
            }
        }
    }

    collect(car) { 
        if (this.active) { 
            this.active = false; 
            this.respawnTimer = this.respawnTime; 
            car.boost = Math.min(100, car.boost + this.amount); 
            playSound('boost_pickup', 0.5);
        } 
    }
}

