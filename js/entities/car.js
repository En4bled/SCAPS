import * as CONST from '../core/constants.js';
import { Particle, SkidMark } from '../fx/particles.js';
import { checkPolygonCollision } from '../world/physics.js';

export class Car {
    constructor(x, y, color, controls, name, imgPath = null) {
        this.x = x;
        this.y = y;
        this.width = CONST.CAR_WIDTH;
        this.height = CONST.CAR_HEIGHT;
        this.color = color;
        this.controls = controls;
        this.name = name; 
        this.radius = CONST.CAR_HITBOX_RADIUS; 
        this.speed = 0;
        this.angle = (color === '#5ad') ? 0 : Math.PI; 
        this.vx = 0;
        this.vy = 0;
        this.boost = 33; 
        
        this.img = null;
        if (imgPath) {
            this.img = new Image();
            this.img.src = imgPath;
        }

        this.isBoosting = false;
        this.isDrifting = false; 
        this.skidMarkTimer = 0; 
        this.score = 0;
        this.goals = 0;
        this.assists = 0;
        this.aiState = { role: 'attacker', targetBoostPad: null }; 
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.img && this.img.complete) {
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
        } else {
            // Fallback ultra-simple (Rectángulo de color)
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            ctx.strokeStyle = 'white';
            ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        ctx.restore();
    }

    update(keysPressed, gameState, particles, skidMarks) {
        if (gameState === 'goalScored' || gameState === 'gameOver') {
            this.speed *= CONST.CAR_FRICTION; 
            this.vx *= CONST.CAR_FRICTION;
            this.vy *= CONST.CAR_FRICTION;
            return; 
        }

        const isPlayer1 = this.controls.up === 'KeyW';
        let isTurning = false; 
        let isAccelerating = false; 

        if (isPlayer1) {
            this.isBoosting = keysPressed[this.controls.boost] && this.boost > 0 && gameState === 'playing'; 
            this.isDrifting = keysPressed[this.controls.drift] && !this.isBoosting && this.speed > CONST.CAR_MAX_SPEED * 0.3 && (keysPressed[this.controls.left] || keysPressed[this.controls.right]);
            
            let currentAccel = this.isBoosting ? CONST.CAR_BOOST_ACCEL : CONST.CAR_ACCEL;
            let maxSpeed = this.isBoosting ? CONST.CAR_MAX_BOOST_SPEED : CONST.CAR_MAX_SPEED;

            if (gameState === 'countdown') {
                this.speed = 0;
                this.vx = 0;
                this.vy = 0;
                return;
            }

            if (keysPressed[this.controls.up]) { 
                this.speed += currentAccel; isAccelerating = true;
            } 
            else if (keysPressed[this.controls.down]) { 
                this.speed -= CONST.CAR_REVERSE_ACCEL * (gameState === 'countdown' ? 0.1 : 1); 
            } 
            
            if (!isAccelerating && !keysPressed[this.controls.down]) {
                this.speed *= CONST.CAR_FRICTION; 
            } else {
                if (isAccelerating && this.speed > maxSpeed) this.speed = maxSpeed; 
            }
            
            if (this.speed < -maxSpeed / 2) this.speed = -maxSpeed / 2;
            
            if (this.speed !== 0) {
                let turnDirection = 0;
                if (keysPressed[this.controls.left]) { turnDirection = -1; isTurning = true; }
                if (keysPressed[this.controls.right]) { turnDirection = 1; isTurning = true; }
                let steerAngle = (this.speed > 0) ? turnDirection : -turnDirection;
                if (this.isDrifting) steerAngle *= CONST.CAR_DRIFT_TURN_MULTIPLIER;
                this.angle += steerAngle * CONST.CAR_TURN_SPEED * (gameState === 'countdown' ? 0.3 : 1); 
            }

            if (gameState === 'playing' && this.isBoosting) {
                this.boost = Math.max(0, this.boost - CONST.CAR_BOOST_CONSUMPTION);
            }
        }

        if (Math.abs(this.speed) < 0.01) this.speed = 0;
        this.vx = Math.sin(this.angle) * this.speed;
        this.vy = -Math.cos(this.angle) * this.speed;

        if (gameState === 'playing' || gameState === 'countdown') { 
            this.move();
            if (this.skidMarkTimer > 0) this.skidMarkTimer--;
            if ((isTurning && this.speed > CONST.CAR_MAX_SPEED * 0.4 && !this.isBoosting) || (isPlayer1 && this.isDrifting)) {
                if(this.skidMarkTimer <= 0) { this.spawnSkidMark(skidMarks); this.skidMarkTimer = 4; }
                if(isPlayer1 && this.isDrifting) this.spawnDriftSmoke(particles);
            }
            if (this.isBoosting) this.spawnParticles(5, 'boost', particles);
            else if (Math.abs(this.speed) > 0.5 && !this.isDrifting && isAccelerating) this.spawnParticles(1, 'smoke', particles);
        }
    }

    move() { 
        this.x += this.vx; this.y += this.vy; 
        this.checkWallCollision(); 
    }

    checkWallCollision() {
        checkPolygonCollision(this, CONST.FIELD_POLYGON);
        // Fallback de seguridad extrema (no debe activarse si el polígono funciona)
        if (this.x < -500) this.x = -500; if (this.x > CONST.WORLD_W + 500) this.x = CONST.WORLD_W + 500;
        if (this.y < -500) this.y = -500; if (this.y > CONST.WORLD_H + 500) this.y = CONST.WORLD_H + 500;

        const inGoalTop = (Math.abs(this.x - CONST.GOAL_TOP.x) < CONST.GOAL_TOP.w/2 && this.y < CONST.GOAL_TOP.y);
        const inGoalBottom = (Math.abs(this.x - CONST.GOAL_BOTTOM.x) < CONST.GOAL_BOTTOM.w/2 && this.y > CONST.GOAL_BOTTOM.y);

        if (inGoalTop) {
            const left = CONST.GOAL_TOP.x - CONST.GOAL_TOP.w/2, right = CONST.GOAL_TOP.x + CONST.GOAL_TOP.w/2, back = CONST.GOAL_TOP.y - CONST.GOAL_TOP.d;
            if (this.x - this.radius < left) { this.x = left + this.radius; this.vx = 0; }
            if (this.x + this.radius > right) { this.x = right - this.radius; this.vx = 0; }
            if (this.y - this.radius < back) { this.y = back + this.radius; this.vy = 0; }
        } else if (inGoalBottom) {
            const left = CONST.GOAL_BOTTOM.x - CONST.GOAL_BOTTOM.w/2, right = CONST.GOAL_BOTTOM.x + CONST.GOAL_BOTTOM.w/2, back = CONST.GOAL_BOTTOM.y + CONST.GOAL_BOTTOM.d;
            if (this.x - this.radius < left) { this.x = left + this.radius; this.vx = 0; }
            if (this.x + this.radius > right) { this.x = right - this.radius; this.vx = 0; }
            if (this.y + this.radius > back) { this.y = back - this.radius; this.vy = 0; }
        }
    }

    spawnParticles(amount, type, particles) {
        let angleBehind = this.angle + Math.PI;
        let spawnX = this.x + Math.sin(angleBehind) * (this.height / 2), spawnY = this.y - Math.cos(angleBehind) * (this.height / 2);
        for (let i = 0; i < amount; i++) particles.push(new Particle(spawnX, spawnY, type));
    }

    spawnDriftSmoke(particles) {
        let angleBehind = this.angle + Math.PI;
        let rearX = this.x + Math.sin(angleBehind) * (this.height / 2.5), rearY = this.y - Math.cos(angleBehind) * (this.height / 2.5);
        let s = Math.sin(this.angle + Math.PI/2) * (this.width / 2.2), c = Math.cos(this.angle + Math.PI/2) * (this.width / 2.2);
        particles.push(new Particle(rearX + s, rearY - c, 'smoke'));
        particles.push(new Particle(rearX - s, rearY + c, 'smoke'));
    }

    spawnSkidMark(skidMarks) {
        let angleBehind = this.angle + Math.PI;
        let rearX = this.x + Math.sin(angleBehind) * (this.height / 2.5), rearY = this.y - Math.cos(angleBehind) * (this.height / 2.5);
        let s = Math.sin(this.angle + Math.PI/2) * (this.width / 2.2), c = Math.cos(this.angle + Math.PI/2) * (this.width / 2.2);
        skidMarks.push(new SkidMark(rearX + s, rearY - c, this.angle));
        skidMarks.push(new SkidMark(rearX - s, rearY + c, this.angle));
    }
}
