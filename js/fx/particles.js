export class Particle { 
    constructor(x, y, type) {
        this.x = x; this.y = y; this.type = type;
        
        // Colores según el tipo de boost seleccionado
        const boostColors = {
            'classic': ['rgba(100, 180, 255, 0.8)', 'rgba(255, 255, 255, 0.5)'],
            'fire': ['rgba(255, 100, 0, 0.9)', 'rgba(255, 200, 0, 0.7)'],
            'neon': ['rgba(255, 0, 255, 0.9)', 'rgba(0, 255, 255, 0.7)'],
            'plasma': ['rgba(160, 0, 255, 0.9)', 'rgba(255, 255, 255, 0.8)'],
            'toxic': ['rgba(50, 255, 0, 0.9)', 'rgba(150, 255, 0, 0.7)'],
            'glitch': ['rgba(255, 255, 255, 0.9)', 'rgba(255, 0, 0, 0.7)'],
            'gold': ['rgba(255, 215, 0, 0.9)', 'rgba(255, 255, 255, 0.7)'],
            'ice': ['rgba(150, 230, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
            'void': ['rgba(50, 0, 50, 0.9)', 'rgba(0, 0, 0, 0.8)'],
            'rainbow': ['rgba(255, 0, 0, 0.8)', 'rgba(0, 255, 0, 0.8)', 'rgba(0, 0, 255, 0.8)'],
            'cyber': ['rgba(0, 255, 255, 0.9)', 'rgba(100, 100, 255, 0.7)'],
            'nature': ['rgba(0, 200, 0, 0.9)', 'rgba(255, 255, 255, 0.7)'],
            'bubble': ['rgba(0, 200, 255, 0.9)', 'rgba(255, 255, 255, 0.8)'],
            'matrix': ['rgba(0, 255, 0, 0.9)', 'rgba(180, 255, 180, 0.7)'],
            'lava': ['rgba(255, 50, 0, 0.9)', 'rgba(255, 150, 0, 0.8)'],
            'cosmic': ['rgba(220, 0, 255, 0.9)', 'rgba(0, 255, 255, 0.8)']
        };

        if (boostColors[type]) {
            const palette = boostColors[type];
            this.color = palette[Math.floor(Math.random() * palette.length)];
            this.size = Math.random() * 8 + 5; 
            this.vx = (Math.random() - 0.5) * 4; 
            this.vy = (Math.random() - 0.5) * 4; 
            this.lifespan = 40; 
        } 
        else if (type === 'smoke') { 
            this.color = 'rgba(180, 180, 180, 0.5)'; 
            this.size = Math.random() * 5 + 2; this.vx = (Math.random() - 0.5) * 1; this.vy = (Math.random() - 0.5) * 1; this.lifespan = 50; 
        }
        else {
            this.color = 'rgba(100, 100, 100, 0.3)';
            this.size = 4; this.vx = 0; this.vy = 0; this.lifespan = 30;
        }
    }
    update(timeScale = 1.0) { 
        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        this.lifespan -= timeScale; 
        this.size *= Math.pow(0.95, timeScale); 
    }
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
    update(timeScale = 1.0) { 
        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        this.vy += this.gravity * timeScale; 
        this.lifespan -= timeScale; 
        this.size *= Math.pow(0.985, timeScale); 
        this.vx *= Math.pow(0.98, timeScale); 
        this.vy *= Math.pow(0.98, timeScale); 
    }    draw(ctx) {
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
    constructor(x, y, angle, isBurning = false) { 
        this.x = x; this.y = y; this.angle = angle; this.width = 6; this.height = 18; 
        this.lifespan = isBurning ? 120 : 600; // Las marcas de fuego se desvanecen más rápido para un efecto dinámico
        this.initialLifespan = this.lifespan; 
        this.isBurning = isBurning;
    }
    update() { this.lifespan--; }
    draw(ctx) {
        if (this.lifespan <= 0) return;
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        if (this.isBurning) {
            const alpha = this.lifespan / this.initialLifespan;
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = 'lighter';
            
            // Degradado de calor/fuego (amarillo incandescente en el centro, naranja/rojo en los bordes)
            const grad = ctx.createLinearGradient(-this.width / 2, 0, this.width / 2, 0);
            grad.addColorStop(0, 'rgba(255, 60, 0, 0.85)');
            grad.addColorStop(0.5, 'rgba(255, 230, 100, 0.98)');
            grad.addColorStop(1, 'rgba(255, 60, 0, 0.85)');
            
            ctx.fillStyle = grad;
            ctx.shadowBlur = 8;
            ctx.shadowColor = '#ff5500';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            const alpha = (this.lifespan / this.initialLifespan) * 0.3;
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#000';
            ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        }
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
