import { playSound } from '../fx/audio.js';

export class BoostPad {
    constructor(x, y, isMini = false) {
        this.x = x; this.y = y; this.isMini = isMini; 
        this.radius = isMini ? 15 : 30; // El doble de 15
        this.amount = isMini ? 30 : 100; 
        this.respawnTime = (isMini ? 5 : 10) * 60; 
        this.active = true; this.respawnTimer = 0;
    }

    draw(ctx) {
        ctx.save();
        if (this.active) {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fillStyle = this.isMini ? 'rgba(255, 165, 0, 0.6)' : 'rgba(255, 215, 0, 0.8)';
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Efecto de brillo simple
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100, 100, 100, 0.3)';
            ctx.fill();
        }
        ctx.restore();
    }

    update() { 
        if (!this.active) { 
            this.respawnTimer--; 
            if (this.respawnTimer <= 0) { this.active = true; } 
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
