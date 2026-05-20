import * as CONST from '../core/constants.js';
import { getAssetPath } from '../core/constants.js';
import { Particle, SkidMark } from '../fx/particles.js';
import { checkPolygonCollision } from '../world/physics.js';
import { playSound } from '../fx/audio.js';

export class Car {
    constructor(x, y, color, controls, name, imgPath = null, hue = 0, saturate = 100) {
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
        this.hue = hue;
        this.saturate = saturate;
        this.type = 'car';
        
        this.img = null;
        if (imgPath) {
            this.setAppearance(imgPath, hue, saturate);
        }

        this.isBoosting = false;
        this.isDrifting = false; 
        this.skidMarkTimer = 0; 
        this.score = 0;
        this.goals = 0;
        this.assists = 0;
        this.aiState = { role: 'attacker', targetBoostPad: null }; 
        
        // Efectos y Personalización
        this.boostType = 'classic';
        
        // Estado de Supervivencia y Físicas 3D/Z
        this.isExploded = false;
        this.respawnTimer = 0;
        this.isSupersonic = false;
        this.trailTimer = 0;
        
        // Eje Z y Acrobacias
        this.z = 0;
        this.vz = 0;
        this.isJumping = false;
        this.isFlipping = false;
        this.canDoubleJump = true;
        this.flipTimer = 0;
        this.flipVisualAngle = 0;
        this.flipCooldownTimer = 0;
        this.wallTractionTimer = 0;
        this.lastWallNormal = null;
    }

    setAppearance(imgPath, hue = this.hue, saturate = this.saturate) {
        this.hue = hue;
        this.saturate = saturate;
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

    draw(ctx) {
        if (this.isExploded) return; // No dibujar si ha explotado

        let scaleX = 1.0;
        let scaleY = 1.0;
        if (this.isFlipping) {
            scaleY = Math.cos(this.flipVisualAngle);
            scaleX = 1.0 + (1.0 - Math.abs(scaleY)) * 0.12; // Squash & Stretch
        }

        // 1. DIBUJAR SOMBRA DINÁMICA EN EL SUELO
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        const shadowScale = Math.max(0.45, 1.0 - (this.z / 250));
        ctx.beginPath();
        ctx.ellipse(0, 4, (this.width / 2.2) * shadowScale, (this.height / 2.2) * shadowScale, 0, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${0.45 * shadowScale})`;
        ctx.fill();
        ctx.restore();

        // 2. DIBUJAR COCHE ELEVADO EN EL EJE Z
        ctx.save();
        ctx.translate(this.x, this.y - this.z); // Trasladar en Y vertical hacia arriba
        ctx.rotate(this.angle);

        // Si está haciendo un Front Flip, simular voltereta frontal con Squash & Stretch
        if (this.isFlipping) {
            ctx.scale(scaleX, scaleY);
        }

        // Efecto visual Supersónico (Vibración/Brillo opcional aquí)
        if (this.isSupersonic) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = 'white';
        }

        if (this.img && this.img.complete) {
            // Si el coche está boca abajo (scaleY < 0), mostrar silueta oscura (chasis)
            if (scaleY < 0) {
                ctx.filter = 'brightness(0.12) contrast(1.1)';
            } else if (this.hue !== 0 || this.saturate !== 100) {
                ctx.filter = `hue-rotate(${this.hue}deg) saturate(${this.saturate}%)`;
            }
            ctx.drawImage(this.img, -this.width / 2, -this.height / 2, this.width, this.height);
            ctx.filter = 'none'; // Resetear para el resto del frame
        } else {
            // Fallback ultra-simple (Rectángulo de color o chasis negro)
            ctx.fillStyle = (scaleY < 0) ? '#151515' : this.color;
            ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
            ctx.strokeStyle = (scaleY < 0) ? '#333' : 'white';
            ctx.strokeRect(-this.width/2, -this.height/2, this.width, this.height);
        }
        ctx.restore();
    }

    update(keys, gameState, particles, skidMarks, timeScale = 1.0) {
        // Manejo de Respawn
        if (this.isExploded) {
            this.respawnTimer--;
            if (this.respawnTimer <= 0) {
                this.isExploded = false;
            }
            return;
        }

        let isTurning = false; 
        let isAccelerating = false; 

        this.isBoosting = keys[this.controls.boost] && this.boost > 0 && (gameState === 'playing' || gameState === 'goalScored'); 
        this.isDrifting = keys[this.controls.drift] && (gameState === 'playing' || gameState === 'goalScored');
        
        let currentAccel = this.isBoosting ? CONST.CONFIG.CAR_BOOST_ACCEL : CONST.CONFIG.CAR_ACCEL;
        let maxSpeed = this.isBoosting ? CONST.CONFIG.CAR_MAX_BOOST_SPEED : CONST.CONFIG.CAR_MAX_SPEED;

        if (gameState === 'countdown') {
            this.speed = 0; this.vx = 0; this.vy = 0;
            this.z = 0; this.vz = 0;
            this.isJumping = false; this.isFlipping = false; this.canDoubleJump = true;
            return;
        }

        // --- ACTUALIZAR COOLDOWN DEL FLIP ---
        if (this.flipCooldownTimer > 0) {
            this.flipCooldownTimer -= timeScale;
        }

        // --- ACELERACIÓN / REVERSA VECTORIAL (Bloqueadas durante el Front Flip) ---
        if (!this.isFlipping) {
            if (keys[this.controls.up]) { 
                this.vx += Math.sin(this.angle) * currentAccel * timeScale;
                this.vy -= Math.cos(this.angle) * currentAccel * timeScale;
                isAccelerating = true;
            } 
            else if (keys[this.controls.down]) { 
                this.vx -= Math.sin(this.angle) * CONST.CONFIG.CAR_REVERSE_ACCEL * timeScale;
                this.vy += Math.cos(this.angle) * CONST.CONFIG.CAR_REVERSE_ACCEL * timeScale;
            } 
            
            // --- DRAG Y FRICCIÓN VECTORIAL ---
            const currentSpeed = Math.sqrt(this.vx**2 + this.vy**2);
            if (!isAccelerating && !keys[this.controls.down]) {
                // Solo si está en el suelo (this.z === 0) se aplica la fricción del suelo
                if (this.z === 0) {
                    this.vx *= Math.pow(CONST.CONFIG.CAR_FRICTION, timeScale); 
                    this.vy *= Math.pow(CONST.CONFIG.CAR_FRICTION, timeScale); 
                }
            } else {
                // Límite de velocidad
                if (currentSpeed > maxSpeed) {
                    const scale = maxSpeed / currentSpeed;
                    this.vx *= scale;
                    this.vy *= scale;
                }
            }
        }

        // Velocidad lineal proyectada (para sonidos y lógica externa compatible)
        const currentSpeed = Math.sqrt(this.vx**2 + this.vy**2);
        const forwardX = Math.sin(this.angle);
        const forwardY = -Math.cos(this.angle);
        const forwardVel = this.vx * forwardX + this.vy * forwardY;
        this.speed = forwardVel;

        // --- DIRECCIÓN Y GIRO (Bloqueadas durante el Front Flip) ---
        if (!this.isFlipping && currentSpeed > 0.05) {
            let turnDirection = 0;
            
            // Prioridad a la entrada analógica
            if (typeof keys['analogSteer'] === 'number' && keys['analogSteer'] !== 0) {
                turnDirection = keys['analogSteer'];
                isTurning = true;
            } else {
                if (keys[this.controls.left]) { turnDirection = -1; isTurning = true; }
                if (keys[this.controls.right]) { turnDirection = 1; isTurning = true; }
            }
            
            if (turnDirection !== 0) {
                let steerAngle = (forwardVel >= 0) ? turnDirection : -turnDirection;
                let maxTurnSpeed = CONST.CONFIG.CAR_TURN_SPEED;
                
                // Giro según la velocidad
                let speedFactor = Math.min(1.0, currentSpeed / CONST.CONFIG.CAR_MAX_SPEED);
                let dynamicTurnSpeed = maxTurnSpeed * (0.8 + 0.2 * (1 - Math.abs(speedFactor - 0.5) * 2));
                
                if (this.isBoosting) {
                    dynamicTurnSpeed *= 0.5;
                }
                
                if (this.isDrifting) {
                    steerAngle *= 1.45; // Trazado más cerrado en drift
                }
                
                this.angle += steerAngle * dynamicTurnSpeed * timeScale; 
            }
        }

        // --- SISTEMA DE SALTO Y FRONT FLIP (EJE Z) ---
        const jumpPressed = !!keys[this.controls.jump];
        const jumpJustPressed = jumpPressed && !this.jumpKeyPressedLastFrame;
        this.jumpKeyPressedLastFrame = jumpPressed;

        if (jumpJustPressed) {
            if (this.z === 0) { // Salto inicial
                this.vz = CONST.CONFIG.CAR_JUMP_FORCE;
                this.z = 0.1;
                this.isJumping = true;
                this.canDoubleJump = true;
                playSound('jump');
            } else if (this.z > 0 && this.canDoubleJump && !this.isFlipping && this.flipCooldownTimer <= 0) { // Voltereta Frontal (Front Flip)
                this.isFlipping = true;
                this.flipTimer = CONST.CONFIG.CAR_FLIP_DURATION;
                this.canDoubleJump = false;
                this.flipVisualAngle = 0;
                this.flipCooldownTimer = 60; // 1 segundo (60 frames a 60fps)
                
                // Impulso horizontal en dirección del chasis
                this.vx += Math.sin(this.angle) * CONST.CONFIG.CAR_FLIP_IMPULSE;
                this.vy -= Math.cos(this.angle) * CONST.CONFIG.CAR_FLIP_IMPULSE;
                
                // Impulso vertical snappy inicial (cancela caída, da sustentación rápida)
                this.vz = 1.0;
                
                playSound('flip');
            }
        }

        // Gravedad y actualización del vuelo Z
        if (this.z > 0) {
            this.z += this.vz * timeScale;
            // Durante la voltereta, la gravedad afecta MENOS para dar sensación de planeo aerodinámico
            const gravityMultiplier = this.isFlipping ? 0.35 : 1.0;
            this.vz -= CONST.CONFIG.CAR_GRAVITY * gravityMultiplier * timeScale;
            
            if (this.z <= 0) {
                this.z = 0;
                this.vz = 0;
                this.isJumping = false;
                this.isFlipping = false;
                this.canDoubleJump = true;
                this.flipVisualAngle = 0;
            }
        }

        // Animación de Voltereta (Ease-Out para movimiento rápido al inicio y suave al final)
        if (this.isFlipping) {
            this.flipTimer -= timeScale;
            const t = Math.max(0, Math.min(1, 1.0 - (this.flipTimer / CONST.CONFIG.CAR_FLIP_DURATION)));
            const easedT = Math.sin(t * Math.PI / 2);
            this.flipVisualAngle = easedT * Math.PI * 2;
            
            if (this.flipTimer <= 0) {
                this.isFlipping = false;
                this.flipVisualAngle = 0;
                // Impulso de caída al terminar (sensación de peso al recuperar control)
                this.vz = Math.min(this.vz, -1.2);
            }
        }

        if (gameState === 'playing' && this.isBoosting) {
            this.boost = Math.max(0, this.boost - CONST.CONFIG.CAR_BOOST_CONSUMPTION);
        }

        // --- ESTADO SUPERSÓNICO ---
        this.isSupersonic = (currentSpeed > CONST.CONFIG.CAR_MAX_BOOST_SPEED * 0.9);

        if (gameState === 'playing' || gameState === 'goalScored') { 
            this.move(timeScale);
            if (this.skidMarkTimer > 0) this.skidMarkTimer--;
            if (this.wallTractionTimer > 0) this.wallTractionTimer -= timeScale;
            
            // Efectos visuales de huellas y humo (solo en el suelo)
            if (this.z === 0) {
                if (isTurning && currentSpeed > CONST.CONFIG.CAR_MAX_SPEED * 0.4) {
                    if (this.skidMarkTimer <= 0) { this.spawnSkidMark(skidMarks); this.skidMarkTimer = 4; }
                    if (this.isDrifting) this.spawnDriftSmoke(particles);
                }
                if (this.isBoosting) this.spawnParticles(5, this.boostType, particles);
                else if (currentSpeed > 0.5 && isAccelerating) this.spawnParticles(1, 'smoke', particles);
            } else {
                // Si está en el aire con Boost, igual soltar partículas de propulsión
                if (this.isBoosting) this.spawnParticles(3, this.boostType, particles);
            }
        }
    }

    move(timeScale = 1.0) { 
        this.x += this.vx * timeScale; 
        this.y += this.vy * timeScale; 
        this.checkWallCollision(); 
    }

    checkWallCollision() {
        // Colisiones con las porterías (Cajas de colisión dinámicas)
        const goalBuffer = 40; 
        const inGoalLeft = (Math.abs(this.y - CONST.CONFIG.GOAL_TOP.y) < (CONST.CONFIG.GOAL_TOP.w/2 + 10) && this.x < (CONST.CONFIG.GOAL_TOP.x + goalBuffer));
        const inGoalRight = (Math.abs(this.y - CONST.CONFIG.GOAL_BOTTOM.y) < (CONST.CONFIG.GOAL_BOTTOM.w/2 + 10) && this.x > (CONST.CONFIG.GOAL_BOTTOM.x - goalBuffer));
        const bounce = CONST.CONFIG.CAR_WALL_RESTITUTION;

        if (inGoalLeft) {
            const top = CONST.CONFIG.GOAL_TOP.y - CONST.CONFIG.GOAL_TOP.w/2;
            const bottom = CONST.CONFIG.GOAL_TOP.y + CONST.CONFIG.GOAL_TOP.w/2;
            const back = CONST.CONFIG.GOAL_TOP.x - CONST.CONFIG.GOAL_TOP.d;
            if (this.y - this.radius < top) { 
                this.y = top + this.radius; 
                this.vy = Math.abs(this.vy) * bounce; 
            }
            if (this.y + this.radius > bottom) { 
                this.y = bottom - this.radius; 
                this.vy = -Math.abs(this.vy) * bounce; 
            }
            if (this.x - this.radius < back) { 
                this.x = back + this.radius; 
                this.vx = Math.abs(this.vx) * bounce; 
            }
        } else if (inGoalRight) {
            const top = CONST.CONFIG.GOAL_BOTTOM.y - CONST.CONFIG.GOAL_BOTTOM.w/2;
            const bottom = CONST.CONFIG.GOAL_BOTTOM.y + CONST.CONFIG.GOAL_BOTTOM.w/2;
            const back = CONST.CONFIG.GOAL_BOTTOM.x + CONST.CONFIG.GOAL_BOTTOM.d;
            if (this.y - this.radius < top) { 
                this.y = top + this.radius; 
                this.vy = Math.abs(this.vy) * bounce; 
            }
            if (this.y + this.radius > bottom) { 
                this.y = bottom - this.radius; 
                this.vy = -Math.abs(this.vy) * bounce; 
            }
            if (this.x + this.radius > back) { 
                this.x = back - this.radius; 
                this.vx = -Math.abs(this.vx) * bounce; 
            }
        } else {
            // Solo si no estamos en zona de portería, aplicamos la colisión con los muros del campo
            checkPolygonCollision(this, CONST.CONFIG.FIELD_POLYGON);
        }
    }

    spawnParticles(amount, type, particles) {
        let angleBehind = this.angle + Math.PI;
        let spawnX = this.x + Math.sin(angleBehind) * (this.height / 2), spawnY = this.y - Math.cos(angleBehind) * (this.height / 2);
        
        // Aplicar nivel de detalle (LOD) basado en los FPS globales
        const lodAmount = Math.max(1, Math.round(amount * (window.SCAPS_LOD_LEVEL || 1.0)));
        for (let i = 0; i < lodAmount; i++) particles.push(new Particle(spawnX, spawnY, type));
    }

    spawnDriftSmoke(particles) {
        // En modo de bajo rendimiento (LOD bajo), omitir humo de derrape probabilísticamente
        if ((window.SCAPS_LOD_LEVEL || 1.0) < 0.5 && Math.random() > 0.5) return;

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
