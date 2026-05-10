import * as CONST from '../core/constants.js';
import { Particle, SkidMark } from '../fx/particles.js';
import { checkPolygonCollision } from '../world/physics.js';

export class Car {
    constructor(x, y, color, controls, name, imgPath = null) {
        this.x = x;
        this.y = y;
        this.width = CONST.CONFIG.CAR_WIDTH;
        this.height = CONST.CONFIG.CAR_HEIGHT;
        this.color = color;
        this.controls = controls;
        this.name = name; 
        this.radius = CONST.CONFIG.CAR_HITBOX_RADIUS; 
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

    update(keys, gameState, particles, skidMarks) {
        if (gameState === 'goalScored' || gameState === 'gameOver') {
            this.speed *= CONST.CONFIG.CAR_FRICTION; 
            this.vx *= CONST.CONFIG.CAR_FRICTION;
            this.vy *= CONST.CONFIG.CAR_FRICTION;
            return; 
        }

        let isTurning = false; 
        let isAccelerating = false; 

        this.isBoosting = keys[this.controls.boost] && this.boost > 0 && gameState === 'playing'; 
        this.isDrifting = keys[this.controls.drift] && !this.isBoosting && Math.abs(this.speed) > CONST.CONFIG.CAR_MAX_SPEED * 0.3 && (keys[this.controls.left] || keys[this.controls.right]);
        
        let currentAccel = this.isBoosting ? CONST.CONFIG.CAR_BOOST_ACCEL : CONST.CONFIG.CAR_ACCEL;
        let maxSpeed = this.isBoosting ? CONST.CONFIG.CAR_MAX_BOOST_SPEED : CONST.CONFIG.CAR_MAX_SPEED;

        if (gameState === 'countdown') {
            if (keys[this.controls.up]) isAccelerating = true;
            if (keys[this.controls.left]) { this.angle -= CONST.CONFIG.CAR_TURN_SPEED * 0.4; isTurning = true; }
            if (keys[this.controls.right]) { this.angle += CONST.CONFIG.CAR_TURN_SPEED * 0.4; isTurning = true; }
            this.speed = 0; this.vx = 0; this.vy = 0;
            return;
        }

        if (keys[this.controls.up]) { 
            this.speed += currentAccel; isAccelerating = true;
        } 
        else if (keys[this.controls.down]) { 
            this.speed -= CONST.CONFIG.CAR_REVERSE_ACCEL; 
        } 
        
        if (!isAccelerating && !keys[this.controls.down]) {
            this.speed *= CONST.CONFIG.CAR_FRICTION; 
        } else {
            if (isAccelerating && this.speed > maxSpeed) this.speed = maxSpeed; 
        }
        
        if (this.speed < -maxSpeed / 2) this.speed = -maxSpeed / 2;
        
        if (this.speed !== 0) {
            let turnDirection = 0;
            if (keys[this.controls.left]) { turnDirection = -1; isTurning = true; }
            if (keys[this.controls.right]) { turnDirection = 1; isTurning = true; }
            let steerAngle = (this.speed > 0) ? turnDirection : -turnDirection;
            if (this.isDrifting) steerAngle *= CONST.CONFIG.CAR_DRIFT_TURN_MULTIPLIER;
            this.angle += steerAngle * CONST.CONFIG.CAR_TURN_SPEED; 
        }

        if (gameState === 'playing' && this.isBoosting) {
            this.boost = Math.max(0, this.boost - CONST.CONFIG.CAR_BOOST_CONSUMPTION);
        }

        if (Math.abs(this.speed) < 0.01) this.speed = 0;
        this.vx = Math.sin(this.angle) * this.speed;
        this.vy = -Math.cos(this.angle) * this.speed;

        if (gameState === 'playing' || gameState === 'countdown') { 
            this.move();
            if (this.skidMarkTimer > 0) this.skidMarkTimer--;
            
            // Efectos visuales (humo y huellas)
            if (isTurning && Math.abs(this.speed) > CONST.CONFIG.CAR_MAX_SPEED * 0.4) {
                if(this.skidMarkTimer <= 0) { this.spawnSkidMark(skidMarks); this.skidMarkTimer = 4; }
                if(this.isDrifting) this.spawnDriftSmoke(particles);
            }
            if (this.isBoosting) this.spawnParticles(5, 'boost', particles);
            else if (Math.abs(this.speed) > 0.5 && isAccelerating) this.spawnParticles(1, 'smoke', particles);
        }
    }

    move() { 
        this.x += this.vx; this.y += this.vy; 
        this.checkWallCollision(); 
    }

    checkWallCollision() {
        // Colisiones con las porterías (Cajas de colisión dinámicas)
        // Añadimos un pequeño margen (buffer) para facilitar la entrada y evitar rebotes en los bordes
        const goalBuffer = 40; 
        const inGoalLeft = (Math.abs(this.y - CONST.CONFIG.GOAL_TOP.y) < (CONST.CONFIG.GOAL_TOP.w/2 + 10) && this.x < (CONST.CONFIG.GOAL_TOP.x + goalBuffer));
        const inGoalRight = (Math.abs(this.y - CONST.CONFIG.GOAL_BOTTOM.y) < (CONST.CONFIG.GOAL_BOTTOM.w/2 + 10) && this.x > (CONST.CONFIG.GOAL_BOTTOM.x - goalBuffer));

        if (inGoalLeft) {
            const top = CONST.CONFIG.GOAL_TOP.y - CONST.CONFIG.GOAL_TOP.w/2;
            const bottom = CONST.CONFIG.GOAL_TOP.y + CONST.CONFIG.GOAL_TOP.w/2;
            const back = CONST.CONFIG.GOAL_TOP.x - CONST.CONFIG.GOAL_TOP.d;
            if (this.y - this.radius < top) { this.y = top + this.radius; this.vy = 0; }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; this.vy = 0; }
            if (this.x - this.radius < back) { this.x = back + this.radius; this.vx = 0; }
        } else if (inGoalRight) {
            const top = CONST.CONFIG.GOAL_BOTTOM.y - CONST.CONFIG.GOAL_BOTTOM.w/2;
            const bottom = CONST.CONFIG.GOAL_BOTTOM.y + CONST.CONFIG.GOAL_BOTTOM.w/2;
            const back = CONST.CONFIG.GOAL_BOTTOM.x + CONST.CONFIG.GOAL_BOTTOM.d;
            if (this.y - this.radius < top) { this.y = top + this.radius; this.vy = 0; }
            if (this.y + this.radius > bottom) { this.y = bottom - this.radius; this.vy = 0; }
            if (this.x + this.radius > back) { this.x = back - this.radius; this.vx = 0; }
        } else {
            // Solo si no estamos en zona de portería, aplicamos la colisión con los muros del campo
            checkPolygonCollision(this, CONST.CONFIG.FIELD_POLYGON);
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
