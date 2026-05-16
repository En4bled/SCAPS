import { playSound } from '../fx/audio.js';

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
    }

    draw(ctx) {
        ctx.save();
        if (this.active) {
            // blendMode: "add"
            ctx.globalCompositeOperation = 'lighter';
            
            // Dibujar el núcleo central (Difuminado / Glow)
            const glowRad = this.radius * (this.isMini ? 1.0 : 1.2);
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, glowRad);
            grad.addColorStop(0, 'rgba(255, 204, 0, 0.4)'); // GOLD
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, glowRad, 0, Math.PI * 2);
            ctx.fill();
            
            // Núcleo Sólido Central
            const solidRad = this.radius * 0.6; // Aumentado (0.4 -> 0.6)
            ctx.fillStyle = 'rgba(255, 215, 0, 0.9)'; // Amarillo dorado sólido
            ctx.beginPath();
            ctx.arc(this.x, this.y, solidRad, 0, Math.PI * 2);
            ctx.fill();
            
            // Las partículas se encargan de dibujar la estela dorada en órbita
            for (let i = 0; i < this.particles.length; i++) {
                this.particles[i].draw(ctx);
            }
        } else {
            // Base inactiva apagada
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(50, 50, 50, 0.4)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
            ctx.stroke();
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

