export class Particle { 
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        if (type === 'boost') { 
            this.color = (Math.random() > 0.5) ? 'rgba(255, 150, 50, 0.8)' : 'rgba(100, 180, 255, 0.8)'; 
            this.size = Math.random() * 8 + 5; this.vx = (Math.random() - 0.5) * 4; this.vy = (Math.random() - 0.5) * 4; this.lifespan = 40; 
        } 
        else { 
            this.color = 'rgba(180, 180, 180, 0.5)'; 
            this.size = Math.random() * 5 + 2; this.vx = (Math.random() - 0.5) * 1; this.vy = (Math.random() - 0.5) * 1; this.lifespan = 50; 
        }
    }
    update() { this.x += this.vx; this.y += this.vy; this.lifespan--; this.size *= 0.95; }
    draw(ctx) { ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); }
}

export class ExplosionParticle { 
    constructor(x, y, colorOffset) {
        this.x = x; this.y = y; 
        this.size = Math.random() * 20 + 15; 
        this.lifespan = Math.random() * 120 + 120; 
        this.initialLifespan = this.lifespan; 
        this.vx = (Math.random() - 0.5) * 15; 
        this.vy = (Math.random() - 0.5) * 15; 
        this.gravity = 0.2; 
        this.colorOffset = colorOffset; 
    }
    update() { this.x += this.vx; this.y += this.vy; this.vy += this.gravity; this.lifespan--; this.size *= 0.985; this.vx *= 0.98; this.vy *= 0.98; } 
    draw(ctx) {
        if (this.lifespan <= 0) return;
        const alpha = Math.max(0, this.lifespan / this.initialLifespan);
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, `rgba(255, 250, 200, ${alpha * 0.9})`); 
        gradient.addColorStop(0.3, `rgba(255, ${150 + this.colorOffset}, 0, ${alpha * 0.8})`); 
        gradient.addColorStop(0.6, `rgba(200, 50, 0, ${alpha * 0.6})`); 
        gradient.addColorStop(1, `rgba(50, 50, 50, ${alpha * 0.3})`); 
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2); ctx.fillStyle = gradient; ctx.fill();
    }
}

export class ConfettiParticle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 8 + 4; 
        this.lifespan = Math.random() * 150 + 100;
        this.initialLifespan = this.lifespan;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10 - 5; 
        this.gravity = 0.15;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.1;
        const colors = ['#ff0', '#f0f', '#0ff', '#f00', '#0f0', '#00f', '#fff'];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += this.gravity;
        this.rotation += this.rotationSpeed;
        this.lifespan--;
        this.vx *= 0.99; 
    }

    draw(ctx) {
        if (this.lifespan <= 0) return;
        const alpha = Math.max(0, this.lifespan / this.initialLifespan);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2); 
        ctx.restore();
    }
}

export class SkidMark { 
    constructor(x, y, angle) { 
        this.x = x; this.y = y; this.angle = angle; this.width = 6; this.height = 18; 
        this.lifespan = 120; this.initialLifespan = 120; 
    }
    update() { this.lifespan--; }
    draw(ctx) {
        if (this.lifespan <= 0) return;
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle);
        const alpha = (this.lifespan / this.initialLifespan) * 0.3; ctx.globalAlpha = alpha;
        ctx.fillStyle = '#000'; ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

export class FieryParticle {
    constructor(x, y, isBig = true) {
        this.x = x;
        this.y = y;
        this.initialX = x;
        this.size = Math.random() * (isBig ? 6 : 3) + 2;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = -(Math.random() * 2 + 1); // Suben hacia arriba
        this.lifespan = Math.random() * 40 + 40;
        this.initialLifespan = this.lifespan;
        this.swaySpeed = Math.random() * 0.1 + 0.05;
        this.swayOffset = Math.random() * Math.PI * 2;
        
        // Colores de la paleta "Fiery"
        const colors = [
            'rgba(255, 128, 0, 0.8)', // Naranja brillante
            'rgba(255, 60, 0, 0.8)',  // Naranja fuego
            'rgba(255, 200, 50, 0.8)', // Amarillo fuego
            'rgba(150, 30, 0, 0.8)'    // Rojo oscuro/brasa
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)];
    }

    update() {
        this.lifespan--;
        this.y += this.vy;
        this.x += this.vx + Math.sin(this.y * this.swaySpeed + this.swayOffset) * 0.5;
        this.size *= 0.98;
    }

    draw(ctx) {
        if (this.lifespan <= 0) return;
        const alpha = Math.max(0, this.lifespan / this.initialLifespan);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.globalCompositeOperation = 'lighter';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.size * 2;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}
