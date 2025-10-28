// ============================================
// 常量定义
// ============================================
const GRID_SIZE = 32; // 每个网格单元的像素大小
const MAP_WIDTH = 26; // 地图宽度（网格数）
const MAP_HEIGHT = 26; // 地图高度（网格数）

// 地形类型
const TERRAIN = {
    EMPTY: 0,      // 空地
    BRICK: 1,      // 砖墙
    STEEL: 2,      // 钢铁
    WATER: 3,      // 水域
    FOREST: 4,     // 丛林
    ICE: 5,        // 冰面
    BASE: 6        // 基地
};

// 方向定义
const DIRECTION = {
    UP: 0,
    RIGHT: 1,
    DOWN: 2,
    LEFT: 3
};

// 坦克类型
const TANK_TYPE = {
    BASIC: 0,      // 基础坦克
    FAST: 1,       // 快速坦克
    ARMOR: 2,      // 装甲坦克
    POWER: 3       // 加强型坦克
};

// 道具类型
const POWERUP = {
    STAR: 0,       // 星星（多子弹）
    TANK: 1,       // 额外生命
    BOMB: 2,       // 炸弹
    TIMER: 3,      // 秒表（冻结）
    HELMET: 4,     // 头盔（无敌）
    SHOVEL: 5,     // 铲子（强化基地）
    GUN: 6,        // 手枪（击穿钢板）
    SHIELD: 7,     // 护盾（3次伤害抵挡）
    LASER: 8,      // 激光（穿透敌人）
    MISSILE: 9     // 导弹（锁定最近敌人）
};

// 成就定义
const ACHIEVEMENTS = {
    FIRST_KILL: { id: 'first_kill', name: '首杀', desc: '击杀第一个敌人', icon: '🎯' },
    COMBO_3: { id: 'combo_3', name: '三连杀', desc: '完成3连击', icon: '🔥' },
    COMBO_5: { id: 'combo_5', name: '五连杀', desc: '完成5连击', icon: '⚡' },
    COMBO_10: { id: 'combo_10', name: '无双', desc: '完成10连击', icon: '💫' },
    SCORE_1000: { id: 'score_1000', name: '千分达成', desc: '分数达到1000', icon: '💯' },
    SCORE_5000: { id: 'score_5000', name: '高手', desc: '分数达到5000', icon: '🏆' },
    LEVEL_5: { id: 'level_5', name: '坚持不懈', desc: '通过第5关', icon: '🌟' },
    COLLECT_ALL: { id: 'collect_all', name: '收藏家', desc: '收集所有类型道具', icon: '📦' }
};

// ============================================
// 实体基类
// ============================================
class Entity {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.active = true;
    }

    update(deltaTime) {}
    render(ctx) {}
}

// ============================================
// 子弹类
// ============================================
class Bullet extends Entity {
    constructor(x, y, direction, speed, power, owner, isPiercing = false, isLaser = false, isMissile = false) {
        super(x, y);
        this.direction = direction;
        this.speed = speed;
        this.power = power; // 伤害值
        this.owner = owner; // 发射者
        this.width = 6;
        this.height = 6;
        this.isPiercing = isPiercing; // 是否为穿甲弹
        this.isLaser = isLaser; // 是否为激光（穿透敌人）
        this.isMissile = isMissile; // 是否为导弹（自动追踪）
        this.target = null; // 导弹目标
    }

    update(deltaTime, targets = []) {
        if (!this.active) return;

        // 导弹追踪逻辑
        if (this.isMissile && targets.length > 0) {
            // 找到最近的目标
            let closestTarget = null;
            let closestDist = Infinity;

            for (let target of targets) {
                if (!target.active) continue;
                const dx = target.x - this.x;
                const dy = target.y - this.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < closestDist) {
                    closestDist = dist;
                    closestTarget = target;
                }
            }

            // 追踪目标
            if (closestTarget) {
                const dx = closestTarget.x - this.x;
                const dy = closestTarget.y - this.y;
                const angle = Math.atan2(dy, dx);

                this.x += Math.cos(angle) * this.speed * deltaTime;
                this.y += Math.sin(angle) * this.speed * deltaTime;
            }
        } else {
            // 普通移动
            switch (this.direction) {
                case DIRECTION.UP:
                    this.y -= this.speed * deltaTime;
                    break;
                case DIRECTION.DOWN:
                    this.y += this.speed * deltaTime;
                    break;
                case DIRECTION.LEFT:
                    this.x -= this.speed * deltaTime;
                    break;
                case DIRECTION.RIGHT:
                    this.x += this.speed * deltaTime;
                    break;
            }
        }

        // 边界检测
        if (this.x < 0 || this.x > MAP_WIDTH * GRID_SIZE ||
            this.y < 0 || this.y > MAP_HEIGHT * GRID_SIZE) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;

        // 根据类型渲染不同颜色
        if (this.isLaser) {
            ctx.fillStyle = '#0ff'; // 青色激光
        } else if (this.isMissile) {
            ctx.fillStyle = '#f0f'; // 紫色导弹
        } else if (this.isPiercing) {
            ctx.fillStyle = '#f80'; // 橙色穿甲弹
        } else {
            ctx.fillStyle = '#ff0'; // 黄色普通子弹
        }

        ctx.fillRect(this.x - this.width / 2, this.y - this.height / 2, this.width, this.height);
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}

// ============================================
// 坦克类
// ============================================
class Tank extends Entity {
    constructor(x, y, isPlayer = false) {
        super(x, y);
        this.direction = DIRECTION.UP;
        this.baseSpeed = 100; // 基础速度
        this.speed = 100; // 当前速度（像素/秒）
        this.speedBoost = 0; // 速度加成（0-6，每次+1代表5%）
        this.size = 26;
        this.isPlayer = isPlayer;
        this.health = 1;
        this.level = 0; // 等级（0-3）
        this.bulletSpeed = 300;
        this.canShoot = true;
        this.shootCooldown = 0;
        this.maxBullets = 1;
        this.bullets = [];
        this.invincible = false;
        this.invincibleTime = 0;
        this.frozen = false;
        this.tankType = TANK_TYPE.BASIC;
        this.moveAnimation = 0;
        this.hasPiercingBullet = false; // 是否拥有穿甲弹
        this.starCount = 0; // 拾取的星星数量
        this.shield = 0; // 护盾次数
        this.hasLaser = false; // 是否拥有激光
        this.hasMissile = false; // 是否拥有导弹
    }

    addSpeedBoost() {
        if (this.speedBoost < 6) { // 最多30%（6 * 5%）
            this.speedBoost++;
            this.speed = this.baseSpeed * (1 + this.speedBoost * 0.05);
        }
    }

    upgrade() {
        if (this.level < 3) {
            this.level++;
            if (this.level === 1) {
                this.bulletSpeed = 400;
            } else if (this.level === 2) {
                this.maxBullets = 2;
            } else if (this.level === 3) {
                this.bulletSpeed = 500;
                this.health = 2;
            }
        }
    }

    move(direction, deltaTime, map, allTanks = []) {
        if (this.frozen) return;

        const oldX = this.x;
        const oldY = this.y;
        this.direction = direction;

        let moveSpeed = this.speed;

        // 检查是否在冰面上
        const gridX = Math.floor(this.x / GRID_SIZE);
        const gridY = Math.floor(this.y / GRID_SIZE);
        if (map.getTerrain(gridX, gridY) === TERRAIN.ICE) {
            moveSpeed *= 1.5; // 冰面上速度更快
        }

        switch (direction) {
            case DIRECTION.UP:
                this.y -= moveSpeed * deltaTime;
                break;
            case DIRECTION.DOWN:
                this.y += moveSpeed * deltaTime;
                break;
            case DIRECTION.LEFT:
                this.x -= moveSpeed * deltaTime;
                break;
            case DIRECTION.RIGHT:
                this.x += moveSpeed * deltaTime;
                break;
        }

        // 碰撞检测（地形+其他坦克）
        const terrainCollision = this.checkCollision(map);
        const tankCollision = this.checkTankCollision(allTanks);

        if (terrainCollision || tankCollision) {
            this.x = oldX;
            this.y = oldY;

            // NPC坦克碰撞后改变方向
            if (!this.isPlayer && tankCollision) {
                this.handleTankCollision();
            }
        }

        this.moveAnimation += deltaTime * 10;
    }

    handleTankCollision() {
        // 随机选择一个新方向（不是当前方向）
        const directions = [DIRECTION.UP, DIRECTION.DOWN, DIRECTION.LEFT, DIRECTION.RIGHT];
        const availableDirections = directions.filter(d => d !== this.direction);
        this.targetDirection = availableDirections[Math.floor(Math.random() * availableDirections.length)];
    }

    checkCollision(map) {
        const bounds = this.getBounds();

        // 边界检测
        if (bounds.x < 0 || bounds.x + bounds.width > MAP_WIDTH * GRID_SIZE ||
            bounds.y < 0 || bounds.y + bounds.height > MAP_HEIGHT * GRID_SIZE) {
            return true;
        }

        // 地形碰撞
        const corners = [
            { x: bounds.x, y: bounds.y },
            { x: bounds.x + bounds.width, y: bounds.y },
            { x: bounds.x, y: bounds.y + bounds.height },
            { x: bounds.x + bounds.width, y: bounds.y + bounds.height }
        ];

        for (let corner of corners) {
            const gridX = Math.floor(corner.x / GRID_SIZE);
            const gridY = Math.floor(corner.y / GRID_SIZE);
            const terrain = map.getTerrain(gridX, gridY);

            if (terrain === TERRAIN.BRICK || terrain === TERRAIN.STEEL ||
                terrain === TERRAIN.WATER || terrain === TERRAIN.BASE) {
                return true;
            }
        }

        return false;
    }

    checkTankCollision(allTanks) {
        const myBounds = this.getBounds();

        for (let tank of allTanks) {
            if (tank === this || !tank.active) continue;

            const tankBounds = tank.getBounds();

            // AABB碰撞检测
            if (myBounds.x < tankBounds.x + tankBounds.width &&
                myBounds.x + myBounds.width > tankBounds.x &&
                myBounds.y < tankBounds.y + tankBounds.height &&
                myBounds.y + myBounds.height > tankBounds.y) {

                // 如果两个坦克完全重叠（卡住），主动分离
                if (!this.isPlayer && !tank.isPlayer) {
                    this.separateFromTank(tank);
                }

                return true;
            }
        }

        return false;
    }

    separateFromTank(otherTank) {
        // 计算两个坦克之间的距离向量
        const dx = this.x - otherTank.x;
        const dy = this.y - otherTank.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 如果距离非常小（完全重叠），给一个随机推力
        if (distance < 5) {
            const angle = Math.random() * Math.PI * 2;
            this.x += Math.cos(angle) * 10;
            this.y += Math.sin(angle) * 10;
        } else {
            // 否则沿着距离向量推开
            const pushDistance = 5;
            this.x += (dx / distance) * pushDistance;
            this.y += (dy / distance) * pushDistance;
        }
    }

    shoot() {
        if (!this.canShoot || this.frozen) return null;

        // 检查子弹数量限制
        this.bullets = this.bullets.filter(b => b.active);
        if (this.bullets.length >= this.maxBullets) return null;

        const bulletsToShoot = [];
        const bulletCount = 1 + this.starCount; // 1 + 星星数量

        for (let i = 0; i < bulletCount; i++) {
            let bulletX = this.x;
            let bulletY = this.y;
            const offset = this.size / 2 + 5;

            // 根据方向和索引计算子弹位置（扇形发射）
            const spreadAngle = (i - (bulletCount - 1) / 2) * 0.15; // 扩散角度

            switch (this.direction) {
                case DIRECTION.UP:
                    bulletY -= offset;
                    bulletX += Math.sin(spreadAngle) * 10;
                    break;
                case DIRECTION.DOWN:
                    bulletY += offset;
                    bulletX += Math.sin(spreadAngle) * 10;
                    break;
                case DIRECTION.LEFT:
                    bulletX -= offset;
                    bulletY += Math.sin(spreadAngle) * 10;
                    break;
                case DIRECTION.RIGHT:
                    bulletX += offset;
                    bulletY += Math.sin(spreadAngle) * 10;
                    break;
            }

            const bullet = new Bullet(
                bulletX, bulletY, this.direction,
                this.bulletSpeed, this.level + 1, this,
                this.hasPiercingBullet, this.hasLaser, this.hasMissile
            );
            this.bullets.push(bullet);
            bulletsToShoot.push(bullet);
        }

        this.canShoot = false;
        this.shootCooldown = 0.3; // 0.3秒冷却

        return bulletsToShoot;
    }

    update(deltaTime) {
        if (this.shootCooldown > 0) {
            this.shootCooldown -= deltaTime;
            if (this.shootCooldown <= 0) {
                this.canShoot = true;
            }
        }

        if (this.invincibleTime > 0) {
            this.invincibleTime -= deltaTime;
            if (this.invincibleTime <= 0) {
                this.invincible = false;
            }
        }

        // 更新子弹
        for (let bullet of this.bullets) {
            bullet.update(deltaTime);
        }
    }

    hit(damage) {
        if (this.invincible) return false;

        // 护盾保护
        if (this.shield > 0) {
            this.shield--;
            return false;
        }

        this.health -= damage;
        if (this.health <= 0) {
            this.active = false;
            return true;
        }
        return false;
    }

    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 无敌闪烁效果
        if (this.invincible && Math.floor(this.invincibleTime * 10) % 2 === 0) {
            ctx.globalAlpha = 0.5;
        }

        // 坦克主体颜色
        const bodyColor = this.isPlayer ? '#4a4' : '#a44';
        const trackColor = this.isPlayer ? '#282' : '#822';
        const turretColor = this.isPlayer ? '#6c6' : '#c66';

        // 绘制履带
        ctx.fillStyle = trackColor;
        if (this.direction === DIRECTION.UP || this.direction === DIRECTION.DOWN) {
            // 左履带
            ctx.fillRect(-this.size / 2, -this.size / 2, 6, this.size);
            // 右履带
            ctx.fillRect(this.size / 2 - 6, -this.size / 2, 6, this.size);

            // 履带纹理
            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                const offset = (this.moveAnimation % 2) * 4;
                const y = -this.size / 2 + i * 8 + offset;
                ctx.fillRect(-this.size / 2 + 1, y, 4, 2);
                ctx.fillRect(this.size / 2 - 5, y, 4, 2);
            }
        } else {
            // 上履带
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, 6);
            // 下履带
            ctx.fillRect(-this.size / 2, this.size / 2 - 6, this.size, 6);

            // 履带纹理
            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                const offset = (this.moveAnimation % 2) * 4;
                const x = -this.size / 2 + i * 8 + offset;
                ctx.fillRect(x, -this.size / 2 + 1, 2, 4);
                ctx.fillRect(x, this.size / 2 - 5, 2, 4);
            }
        }

        // 绘制坦克主体
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-this.size / 2 + 6, -this.size / 2 + 6, this.size - 12, this.size - 12);

        // 主体装甲线条
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.size / 2 + 6, -this.size / 2 + 6, this.size - 12, this.size - 12);

        // 绘制炮塔
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // 绘制炮管
        ctx.fillStyle = '#333';
        switch (this.direction) {
            case DIRECTION.UP:
                ctx.fillRect(-2, -this.size / 2, 4, 10);
                break;
            case DIRECTION.DOWN:
                ctx.fillRect(-2, this.size / 2 - 10, 4, 10);
                break;
            case DIRECTION.LEFT:
                ctx.fillRect(-this.size / 2, -2, 10, 4);
                break;
            case DIRECTION.RIGHT:
                ctx.fillRect(this.size / 2 - 10, -2, 10, 4);
                break;
        }

        // 绘制等级标识
        if (this.level > 0) {
            ctx.fillStyle = '#fff';
            for (let i = 0; i < this.level; i++) {
                ctx.beginPath();
                ctx.arc(-6 + i * 5, -this.size / 2 + 8, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        ctx.restore();
    }
}

// ============================================
// 敌方坦克类
// ============================================
class EnemyTank extends Tank {
    constructor(x, y, type) {
        super(x, y, false);
        this.tankType = type;
        this.aiTimer = 0;
        this.aiInterval = 1 + Math.random() * 2; // AI决策间隔
        this.targetDirection = this.direction;
        this.hasBonus = false; // 是否携带道具

        // 根据类型设置属性
        switch (type) {
            case TANK_TYPE.BASIC:
                this.speed = 80;
                this.health = 1;
                this.bulletSpeed = 250;
                break;
            case TANK_TYPE.FAST:
                this.speed = 160;
                this.health = 1;
                this.bulletSpeed = 300;
                break;
            case TANK_TYPE.ARMOR:
                this.speed = 60;
                this.health = 4;
                this.bulletSpeed = 280;
                break;
            case TANK_TYPE.POWER:
                this.speed = 100;
                this.health = 2;
                this.bulletSpeed = 400;
                this.level = 2;
                break;
        }
    }

    updateAI(deltaTime, map, playerTank, allTanks = []) {
        if (this.frozen) return;

        this.aiTimer += deltaTime;

        // 随机射击
        if (Math.random() < 0.01) {
            this.shoot();
        }

        // AI决策
        if (this.aiTimer >= this.aiInterval) {
            this.aiTimer = 0;
            this.makeDecision(map, playerTank);
        }

        // 移动
        this.move(this.targetDirection, deltaTime, map, allTanks);
    }

    makeDecision(map, playerTank) {
        const directions = [DIRECTION.UP, DIRECTION.DOWN, DIRECTION.LEFT, DIRECTION.RIGHT];

        // 加强型坦克会尝试接近基地
        if (this.tankType === TANK_TYPE.POWER) {
            const baseX = 12 * GRID_SIZE;
            const baseY = 24 * GRID_SIZE;

            if (Math.abs(this.x - baseX) > Math.abs(this.y - baseY)) {
                this.targetDirection = this.x > baseX ? DIRECTION.LEFT : DIRECTION.RIGHT;
            } else {
                this.targetDirection = this.y > baseY ? DIRECTION.DOWN : DIRECTION.UP;
            }

            // 30%概率随机转向
            if (Math.random() < 0.3) {
                this.targetDirection = directions[Math.floor(Math.random() * 4)];
            }
        } else {
            // 其他类型坦克随机移动
            this.targetDirection = directions[Math.floor(Math.random() * 4)];
        }
    }

    render(ctx) {
        if (!this.active) return;

        ctx.save();
        ctx.translate(this.x, this.y);

        // 根据类型设置颜色
        let bodyColor, trackColor, turretColor;

        if (this.hasBonus && Math.floor(Date.now() / 200) % 2 === 0) {
            // 携带道具的坦克闪烁白色
            bodyColor = '#fff';
            trackColor = '#ccc';
            turretColor = '#fff';
        } else {
            switch (this.tankType) {
                case TANK_TYPE.BASIC:
                    bodyColor = '#c44';
                    trackColor = '#822';
                    turretColor = '#e66';
                    break;
                case TANK_TYPE.FAST:
                    bodyColor = '#c4c';
                    trackColor = '#828';
                    turretColor = '#e6e';
                    break;
                case TANK_TYPE.ARMOR:
                    bodyColor = '#4c4';
                    trackColor = '#282';
                    turretColor = '#6e6';
                    break;
                case TANK_TYPE.POWER:
                    bodyColor = '#4cc';
                    trackColor = '#288';
                    turretColor = '#6ee';
                    break;
            }
        }

        // 绘制履带
        ctx.fillStyle = trackColor;
        if (this.direction === DIRECTION.UP || this.direction === DIRECTION.DOWN) {
            ctx.fillRect(-this.size / 2, -this.size / 2, 6, this.size);
            ctx.fillRect(this.size / 2 - 6, -this.size / 2, 6, this.size);

            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                const offset = (this.moveAnimation % 2) * 4;
                const y = -this.size / 2 + i * 8 + offset;
                ctx.fillRect(-this.size / 2 + 1, y, 4, 2);
                ctx.fillRect(this.size / 2 - 5, y, 4, 2);
            }
        } else {
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, 6);
            ctx.fillRect(-this.size / 2, this.size / 2 - 6, this.size, 6);

            ctx.fillStyle = '#000';
            for (let i = 0; i < 4; i++) {
                const offset = (this.moveAnimation % 2) * 4;
                const x = -this.size / 2 + i * 8 + offset;
                ctx.fillRect(x, -this.size / 2 + 1, 2, 4);
                ctx.fillRect(x, this.size / 2 - 5, 2, 4);
            }
        }

        // 绘制坦克主体
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-this.size / 2 + 6, -this.size / 2 + 6, this.size - 12, this.size - 12);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-this.size / 2 + 6, -this.size / 2 + 6, this.size - 12, this.size - 12);

        // 绘制炮塔
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.stroke();

        // 绘制炮管
        ctx.fillStyle = '#333';
        switch (this.direction) {
            case DIRECTION.UP:
                ctx.fillRect(-2, -this.size / 2, 4, 10);
                break;
            case DIRECTION.DOWN:
                ctx.fillRect(-2, this.size / 2 - 10, 4, 10);
                break;
            case DIRECTION.LEFT:
                ctx.fillRect(-this.size / 2, -2, 10, 4);
                break;
            case DIRECTION.RIGHT:
                ctx.fillRect(this.size / 2 - 10, -2, 10, 4);
                break;
        }

        ctx.restore();
    }
}

// ============================================
// 道具类
// ============================================
class PowerUp extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = type;
        this.lifetime = 10; // 存在10秒
        this.size = 26;
    }

    update(deltaTime) {
        this.lifetime -= deltaTime;
        if (this.lifetime <= 0) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;

        // 闪烁效果
        if (Math.floor(this.lifetime * 4) % 2 === 0) {
            ctx.globalAlpha = 0.7;
        }

        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);

        ctx.save();
        ctx.translate(this.x, this.y);

        // 根据道具类型绘制不同图标
        switch (this.type) {
            case POWERUP.STAR:
                // 星星
                ctx.fillStyle = '#ff0';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('★', 0, 0);
                break;

            case POWERUP.TANK:
                // 小坦克形状
                ctx.fillStyle = '#0f0';
                ctx.fillRect(-8, -6, 16, 12);
                ctx.fillStyle = '#000';
                ctx.fillRect(-3, -8, 6, 4);
                ctx.fillRect(-2, 4, 4, 4);
                break;

            case POWERUP.BOMB:
                // 炸弹
                ctx.fillStyle = '#f00';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('●', 0, 0);
                break;

            case POWERUP.TIMER:
                // 秒表
                ctx.fillStyle = '#08f';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('◐', 0, 0);
                break;

            case POWERUP.HELMET:
                // 头盔
                ctx.fillStyle = '#888';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('◆', 0, 0);
                break;

            case POWERUP.SHOVEL:
                // 铲子
                ctx.fillStyle = '#c84';
                ctx.font = '20px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('▲', 0, 0);
                break;

            case POWERUP.GUN:
                // 手枪（简单的枪形状）
                ctx.fillStyle = '#333';
                ctx.fillRect(-8, -2, 12, 4);
                ctx.fillRect(4, -4, 4, 8);
                ctx.fillStyle = '#f80';
                ctx.fillRect(-10, 0, 2, 2);
                break;
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }

    getBounds() {
        return {
            x: this.x - this.size / 2,
            y: this.y - this.size / 2,
            width: this.size,
            height: this.size
        };
    }
}

// ============================================
// 爆炸效果类
// ============================================
class Explosion extends Entity {
    constructor(x, y, size = 32) {
        super(x, y);
        this.size = size;
        this.duration = 0.3;
        this.timer = 0;
    }

    update(deltaTime) {
        this.timer += deltaTime;
        if (this.timer >= this.duration) {
            this.active = false;
        }
    }

    render(ctx) {
        if (!this.active) return;

        const progress = this.timer / this.duration;
        const currentSize = this.size * (1 + progress);
        const alpha = 1 - progress;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#ff0';
        ctx.fillRect(this.x - currentSize / 2, this.y - currentSize / 2, currentSize, currentSize);
        ctx.fillStyle = '#f00';
        ctx.fillRect(this.x - currentSize / 3, this.y - currentSize / 3, currentSize * 2 / 3, currentSize * 2 / 3);
        ctx.restore();
    }
}

// ============================================
// 地图类
// ============================================
class GameMap {
    constructor() {
        this.grid = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TERRAIN.EMPTY));
        this.baseProtected = false;
        this.baseProtectionTimer = 0;
    }

    getTerrain(x, y) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
            return TERRAIN.STEEL;
        }
        return this.grid[y][x];
    }

    setTerrain(x, y, terrain) {
        if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
            this.grid[y][x] = terrain;
        }
    }

    loadLevel(levelData) {
        // 清空地图
        this.grid = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TERRAIN.EMPTY));

        // 加载关卡数据
        for (let y = 0; y < levelData.length; y++) {
            for (let x = 0; x < levelData[y].length; x++) {
                this.grid[y][x] = levelData[y][x];
            }
        }

        // 确保基地存在（单个方块）
        this.setTerrain(12, 24, TERRAIN.BASE);
    }

    protectBase() {
        this.baseProtected = true;
        this.baseProtectionTimer = 20; // 20秒保护

        // 用钢铁包围基地
        for (let x = 11; x <= 14; x++) {
            this.setTerrain(x, 23, TERRAIN.STEEL);
            this.setTerrain(x, 26, TERRAIN.STEEL);
        }
        for (let y = 23; y <= 26; y++) {
            this.setTerrain(11, y, TERRAIN.STEEL);
            this.setTerrain(14, y, TERRAIN.STEEL);
        }
    }

    update(deltaTime) {
        if (this.baseProtected) {
            this.baseProtectionTimer -= deltaTime;
            if (this.baseProtectionTimer <= 0) {
                this.baseProtected = false;
                // 恢复砖墙
                for (let x = 11; x <= 14; x++) {
                    if (this.getTerrain(x, 23) === TERRAIN.STEEL) this.setTerrain(x, 23, TERRAIN.BRICK);
                    if (this.getTerrain(x, 26) === TERRAIN.STEEL) this.setTerrain(x, 26, TERRAIN.BRICK);
                }
                for (let y = 23; y <= 26; y++) {
                    if (this.getTerrain(11, y) === TERRAIN.STEEL) this.setTerrain(11, y, TERRAIN.BRICK);
                    if (this.getTerrain(14, y) === TERRAIN.STEEL) this.setTerrain(14, y, TERRAIN.BRICK);
                }
            }
        }
    }

    render(ctx) {
        for (let y = 0; y < MAP_HEIGHT; y++) {
            for (let x = 0; x < MAP_WIDTH; x++) {
                const terrain = this.grid[y][x];
                const px = x * GRID_SIZE;
                const py = y * GRID_SIZE;

                switch (terrain) {
                    case TERRAIN.BRICK:
                        this.renderBrick(ctx, px, py, x, y);
                        break;
                    case TERRAIN.STEEL:
                        this.renderSteel(ctx, px, py, x, y);
                        break;
                    case TERRAIN.WATER:
                        this.renderWater(ctx, px, py);
                        break;
                    case TERRAIN.FOREST:
                        this.renderForest(ctx, px, py);
                        break;
                    case TERRAIN.ICE:
                        this.renderIce(ctx, px, py);
                        break;
                    case TERRAIN.BASE:
                        this.renderEagle(ctx, px, py);
                        break;
                }
            }
        }
    }

    renderBrick(ctx, px, py, x, y) {
        // 砖块主色
        ctx.fillStyle = '#c84';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 绘制砖块纹理
        const brickW = 8;
        const brickH = 4;
        ctx.fillStyle = '#a62';

        for (let by = 0; by < GRID_SIZE; by += brickH) {
            const offset = (Math.floor(by / brickH) % 2) * (brickW / 2);
            for (let bx = 0; bx < GRID_SIZE; bx += brickW) {
                ctx.strokeStyle = '#942';
                ctx.strokeRect(px + bx + offset, py + by, brickW, brickH);
            }
        }

        // 边框
        ctx.strokeStyle = '#942';
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, GRID_SIZE, GRID_SIZE);
    }

    renderSteel(ctx, px, py, x, y) {
        // 钢铁主色
        ctx.fillStyle = '#888';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 金属光泽效果
        const halfSize = GRID_SIZE / 2;

        // 四个小方格
        for (let sy = 0; sy < 2; sy++) {
            for (let sx = 0; sx < 2; sx++) {
                const spx = px + sx * halfSize;
                const spy = py + sy * halfSize;

                // 渐变效果（模拟金属光泽）
                ctx.fillStyle = ((sx + sy) % 2 === 0) ? '#999' : '#777';
                ctx.fillRect(spx, spy, halfSize, halfSize);

                // 边框
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 2;
                ctx.strokeRect(spx + 1, spy + 1, halfSize - 2, halfSize - 2);

                // 高光
                ctx.fillStyle = '#bbb';
                ctx.fillRect(spx + 2, spy + 2, 4, 2);
            }
        }
    }

    renderWater(ctx, px, py) {
        // 水面底色
        ctx.fillStyle = '#06a';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 水波纹理
        const time = Date.now() / 500;
        ctx.fillStyle = '#08c';

        for (let i = 0; i < 3; i++) {
            const offset = (time + i * 0.3) % 1;
            ctx.globalAlpha = 0.3;
            ctx.fillRect(px, py + offset * GRID_SIZE, GRID_SIZE, 3);
        }

        ctx.globalAlpha = 1;

        // 高光
        ctx.fillStyle = '#0af';
        ctx.fillRect(px + 4, py + 4, 8, 2);
    }

    renderForest(ctx, px, py) {
        // 森林底色
        ctx.fillStyle = '#0a0';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 树木纹理
        ctx.fillStyle = '#080';
        for (let i = 0; i < 4; i++) {
            const tx = px + (i % 2) * 16 + 4;
            const ty = py + Math.floor(i / 2) * 16 + 4;

            // 树冠
            ctx.beginPath();
            ctx.arc(tx + 4, ty + 4, 6, 0, Math.PI * 2);
            ctx.fill();
        }

        // 亮色点缀
        ctx.fillStyle = '#0c0';
        for (let i = 0; i < 6; i++) {
            const dx = (i * 7 + 3) % GRID_SIZE;
            const dy = (i * 11 + 5) % GRID_SIZE;
            ctx.fillRect(px + dx, py + dy, 2, 2);
        }
    }

    renderIce(ctx, px, py) {
        // 冰面底色
        ctx.fillStyle = '#cff';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 冰裂纹
        ctx.strokeStyle = '#aee';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(px, py + 8);
        ctx.lineTo(px + 12, py + 8);
        ctx.moveTo(px + 20, py + 12);
        ctx.lineTo(px + GRID_SIZE, py + 12);
        ctx.moveTo(px + 8, py + 20);
        ctx.lineTo(px + 16, py + 24);
        ctx.stroke();

        // 冰晶高光
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.6;
        ctx.fillRect(px + 2, py + 2, 6, 6);
        ctx.fillRect(px + 20, py + 18, 8, 8);
        ctx.globalAlpha = 1;
    }

    renderEagle(ctx, px, py) {
        // 红色背景
        ctx.fillStyle = '#c00';
        ctx.fillRect(px, py, GRID_SIZE, GRID_SIZE);

        // 边框
        ctx.strokeStyle = '#800';
        ctx.lineWidth = 2;
        ctx.strokeRect(px, py, GRID_SIZE, GRID_SIZE);

        ctx.save();
        ctx.translate(px + GRID_SIZE / 2, py + GRID_SIZE / 2);

        // 绘制黄色五角星
        this.drawStar(ctx, 0, 0, 5, 12, 5, '#ff0');

        ctx.restore();
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius, color) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }

        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();

        // 星星边框
        ctx.strokeStyle = '#f80';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
} // GameMap类结束

// ============================================
// 关卡数据
// ============================================
const LEVELS = [
    // 关卡1：新手训练营
    {
        enemies: [
            { type: TANK_TYPE.BASIC, count: 18 },
            { type: TANK_TYPE.FAST, count: 2 }
        ],
        map: generateLevel1Map()
    },
    // 关卡2：走廊阻击战
    {
        enemies: [
            { type: TANK_TYPE.BASIC, count: 14 },
            { type: TANK_TYPE.FAST, count: 4 },
            { type: TANK_TYPE.ARMOR, count: 2 }
        ],
        map: generateLevel2Map()
    },
    // 关卡3：钢铁防线
    {
        enemies: [
            { type: TANK_TYPE.BASIC, count: 12 },
            { type: TANK_TYPE.FAST, count: 4 },
            { type: TANK_TYPE.ARMOR, count: 4 }
        ],
        map: generateLevel3Map()
    }
];

function generateLevel1Map() {
    const map = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TERRAIN.EMPTY));

    // 添加一些散落的砖墙
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 24) + 1;
        const y = Math.floor(Math.random() * 20) + 1;
        map[y][x] = TERRAIN.BRICK;
    }

    // 基地周围的保护（单个方块基地）
    for (let x = 11; x <= 14; x++) {
        map[23][x] = TERRAIN.BRICK;
        map[25][x] = TERRAIN.BRICK;
    }
    for (let y = 23; y <= 25; y++) {
        map[y][11] = TERRAIN.BRICK;
        map[y][14] = TERRAIN.BRICK;
    }

    return map;
}

function generateLevel2Map() {
    const map = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TERRAIN.EMPTY));

    // 创建走廊
    for (let y = 5; y < 22; y++) {
        map[y][12] = TERRAIN.BRICK;
        map[y][13] = TERRAIN.BRICK;
    }

    // 侧面通道
    for (let x = 5; x < 10; x++) {
        map[15][x] = TERRAIN.BRICK;
        map[16][x + 10] = TERRAIN.BRICK;
    }

    // 基地保护
    for (let x = 11; x <= 14; x++) {
        map[23][x] = TERRAIN.BRICK;
    }

    return map;
}

function generateLevel3Map() {
    const map = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TERRAIN.EMPTY));

    // 钢铁防线
    for (let x = 5; x < 21; x += 3) {
        for (let y = 5; y < 20; y += 3) {
            map[y][x] = TERRAIN.STEEL;
        }
    }

    // 砖墙填充
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 24) + 1;
        const y = Math.floor(Math.random() * 20) + 1;
        if (map[y][x] === TERRAIN.EMPTY) {
            map[y][x] = TERRAIN.BRICK;
        }
    }

    // 基地保护
    for (let x = 11; x <= 14; x++) {
        map[23][x] = TERRAIN.STEEL;
    }

    return map;
}

// ============================================
// 游戏主类
// ============================================
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lastTime = 0;
        this.running = false;
        this.paused = false;

        // 游戏状态
        this.currentLevel = 0;
        this.score = 0;
        this.lives = 3;

        // 连击系统
        this.comboCount = 0;
        this.comboTimer = 0;
        this.comboTimeout = 3; // 3秒内未击杀则重置连击
        this.scoreMultiplier = 1; // 分数倍率

        // 成就系统
        this.achievements = new Set();
        this.totalKills = 0;
        this.collectedPowerUps = new Set();
        this.achievementQueue = []; // 待显示的成就

        // 实体
        this.player = null;
        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.explosions = [];
        this.map = new GameMap();

        // 敌军生成
        this.enemyQueue = [];
        this.enemiesSpawned = 0;
        this.maxEnemiesOnScreen = 4;
        this.spawnTimer = 0;
        this.spawnInterval = 3;
        this.spawnPoints = [
            { x: GRID_SIZE, y: GRID_SIZE },
            { x: 12 * GRID_SIZE, y: GRID_SIZE },
            { x: 24 * GRID_SIZE, y: GRID_SIZE }
        ];

        // 输入
        this.keys = {};
        this.setupInput();

        // 游戏状态
        this.frozenTimer = 0;

        this.init();
    }

    init() {
        this.loadLevel(this.currentLevel);
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    setupInput() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            if (e.key === ' ') {
                e.preventDefault();
                if (this.player && this.player.active) {
                    const bullets = this.player.shoot();
                    if (bullets) {
                        // shoot返回的是数组，需要展开
                        this.bullets.push(...bullets);
                    }
                }
            }

            if (e.key.toLowerCase() === 'p') {
                this.paused = !this.paused;
            }
        });

        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }

    loadLevel(levelIndex) {
        if (levelIndex >= LEVELS.length) {
            levelIndex = LEVELS.length - 1; // 循环最后一关
        }

        const level = LEVELS[levelIndex];

        // 重置游戏状态
        this.map.loadLevel(level.map);

        // 创建玩家
        this.player = new Tank(8 * GRID_SIZE, 24 * GRID_SIZE, true);
        this.player.invincible = true;
        this.player.invincibleTime = 3;

        // 设置敌军队列
        this.enemyQueue = [];
        for (let enemyGroup of level.enemies) {
            for (let i = 0; i < enemyGroup.count; i++) {
                this.enemyQueue.push(enemyGroup.type);
            }
        }

        // 随机打乱
        this.enemyQueue.sort(() => Math.random() - 0.5);

        // 设置携带道具的敌人（每4个敌人有1个）
        for (let i = 3; i < this.enemyQueue.length; i += 4) {
            this.enemyQueue[i] = { type: this.enemyQueue[i], hasBonus: true };
        }

        this.enemies = [];
        this.bullets = [];
        this.powerUps = [];
        this.explosions = [];
        this.enemiesSpawned = 0;
        this.spawnTimer = 0;
        this.frozenTimer = 0;

        this.updateUI();
    }

    spawnEnemy() {
        if (this.enemiesSpawned >= this.enemyQueue.length) return;
        if (this.enemies.length >= this.maxEnemiesOnScreen) return;

        const spawnPoint = this.spawnPoints[Math.floor(Math.random() * this.spawnPoints.length)];
        const enemyData = this.enemyQueue[this.enemiesSpawned];

        let type, hasBonus = false;
        if (typeof enemyData === 'object') {
            type = enemyData.type;
            hasBonus = enemyData.hasBonus;
        } else {
            type = enemyData;
        }

        const enemy = new EnemyTank(spawnPoint.x, spawnPoint.y, type);
        enemy.hasBonus = hasBonus;
        enemy.invincible = true;
        enemy.invincibleTime = 2;

        this.enemies.push(enemy);
        this.enemiesSpawned++;
        this.updateUI();
    }

    update(deltaTime) {
        if (this.paused) return;

        // 更新地图
        this.map.update(deltaTime);

        // 更新冻结计时器
        if (this.frozenTimer > 0) {
            this.frozenTimer -= deltaTime;
            if (this.frozenTimer <= 0) {
                this.enemies.forEach(e => e.frozen = false);
            }
        }

        // 更新连击计时器
        if (this.comboCount > 0) {
            this.comboTimer += deltaTime;
            if (this.comboTimer >= this.comboTimeout) {
                this.comboCount = 0;
                this.comboTimer = 0;
                this.scoreMultiplier = 1;
            }
        }

        // 玩家输入
        if (this.player && this.player.active) {
            const allTanks = [this.player, ...this.enemies];
            if (this.keys['w']) {
                this.player.move(DIRECTION.UP, deltaTime, this.map, allTanks);
            } else if (this.keys['s']) {
                this.player.move(DIRECTION.DOWN, deltaTime, this.map, allTanks);
            } else if (this.keys['a']) {
                this.player.move(DIRECTION.LEFT, deltaTime, this.map, allTanks);
            } else if (this.keys['d']) {
                this.player.move(DIRECTION.RIGHT, deltaTime, this.map, allTanks);
            }
            this.player.update(deltaTime);
        }

        // 生成敌军
        this.spawnTimer += deltaTime;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer = 0;
            this.spawnEnemy();
        }

        // 更新敌军
        const allTanks = [this.player, ...this.enemies];
        for (let enemy of this.enemies) {
            if (enemy.active) {
                enemy.update(deltaTime);
                enemy.updateAI(deltaTime, this.map, this.player, allTanks);

                // 敌军射击
                if (Math.random() < 0.02) {
                    const bullets = enemy.shoot();
                    if (bullets) this.bullets.push(...bullets);
                }
            }
        }

        // 更新子弹（玩家导弹追踪敌人）
        for (let bullet of this.bullets) {
            if (bullet.owner === this.player && bullet.isMissile) {
                bullet.update(deltaTime, this.enemies);
            } else {
                bullet.update(deltaTime);
            }
        }

        // 更新道具
        for (let powerUp of this.powerUps) {
            powerUp.update(deltaTime);
        }

        // 更新爆炸
        for (let explosion of this.explosions) {
            explosion.update(deltaTime);
        }

        // 碰撞检测
        this.checkCollisions();

        // 清理非活动实体
        this.enemies = this.enemies.filter(e => e.active);
        this.bullets = this.bullets.filter(b => b.active);
        this.powerUps = this.powerUps.filter(p => p.active);
        this.explosions = this.explosions.filter(e => e.active);

        // 检查游戏结束条件
        this.checkGameState();
    }

    checkCollisions() {
        // 子弹与地形
        for (let bullet of this.bullets) {
            if (!bullet.active) continue;

            const bx = Math.floor(bullet.x / GRID_SIZE);
            const by = Math.floor(bullet.y / GRID_SIZE);
            const terrain = this.map.getTerrain(bx, by);

            if (terrain === TERRAIN.BRICK) {
                this.map.setTerrain(bx, by, TERRAIN.EMPTY);
                bullet.active = false;
                this.explosions.push(new Explosion(bullet.x, bullet.y, 16));
            } else if (terrain === TERRAIN.STEEL) {
                // 穿甲弹或3级子弹可以摧毁钢铁
                if (bullet.isPiercing || bullet.power >= 3) {
                    this.map.setTerrain(bx, by, TERRAIN.EMPTY);
                }
                bullet.active = false;
                this.explosions.push(new Explosion(bullet.x, bullet.y, 16));
            } else if (terrain === TERRAIN.BASE) {
                bullet.active = false;
                this.explosions.push(new Explosion(bullet.x, bullet.y, 32));
                this.gameOver();
            }
        }

        // 子弹与坦克
        for (let bullet of this.bullets) {
            if (!bullet.active) continue;

            // 子弹与玩家
            if (this.player && this.player.active && bullet.owner !== this.player) {
                if (this.checkBulletTankCollision(bullet, this.player)) {
                    bullet.active = false;
                    if (this.player.hit(bullet.power)) {
                        this.explosions.push(new Explosion(this.player.x, this.player.y));
                        this.lives--;
                        this.updateUI();

                        if (this.lives > 0) {
                            setTimeout(() => this.respawnPlayer(), 1000);
                        } else {
                            this.gameOver();
                        }
                    }
                }
            }

            // 子弹与敌军（只有玩家子弹可以攻击敌军）
            for (let enemy of this.enemies) {
                if (!enemy.active) continue;
                if (bullet.owner !== this.player) continue; // 只有玩家子弹可以攻击敌军

                if (this.checkBulletTankCollision(bullet, enemy)) {
                    // 激光不会被消耗
                    if (!bullet.isLaser) {
                        bullet.active = false;
                    }

                    if (enemy.hit(bullet.power)) {
                        this.explosions.push(new Explosion(enemy.x, enemy.y));

                        // 击杀计数
                        this.totalKills++;

                        // 连击系统
                        this.comboCount++;
                        this.comboTimer = 0; // 重置连击计时器
                        this.scoreMultiplier = 1 + Math.floor(this.comboCount / 3) * 0.5; // 每3连击增加0.5倍

                        // 计算得分（带倍率）
                        const baseScore = 100 * (enemy.tankType + 1);
                        const finalScore = Math.floor(baseScore * this.scoreMultiplier);
                        this.score += finalScore;

                        // 击杀后玩家速度提升
                        if (this.player && this.player.active) {
                            this.player.addSpeedBoost();
                        }

                        // 检查成就
                        this.checkAchievements();

                        this.updateUI();

                        // 生成道具
                        if (enemy.hasBonus) {
                            this.spawnPowerUp(enemy.x, enemy.y);
                        }
                    }
                }
            }
        }

        // 子弹与子弹（只有敌对双方的子弹才会碰撞）
        for (let i = 0; i < this.bullets.length; i++) {
            for (let j = i + 1; j < this.bullets.length; j++) {
                const b1 = this.bullets[i];
                const b2 = this.bullets[j];

                // 只有不同发射者的子弹才会碰撞
                if (b1.active && b2.active && b1.owner !== b2.owner &&
                    this.checkBoundsCollision(b1.getBounds(), b2.getBounds())) {
                    b1.active = false;
                    b2.active = false;
                    this.explosions.push(new Explosion(b1.x, b1.y, 12));
                }
            }
        }

        // 玩家与道具
        if (this.player && this.player.active) {
            for (let powerUp of this.powerUps) {
                if (powerUp.active && this.checkBoundsCollision(this.player.getBounds(), powerUp.getBounds())) {
                    this.collectPowerUp(powerUp);
                    powerUp.active = false;
                }
            }
        }
    }

    checkBulletTankCollision(bullet, tank) {
        return this.checkBoundsCollision(bullet.getBounds(), tank.getBounds());
    }

    checkBoundsCollision(bounds1, bounds2) {
        return bounds1.x < bounds2.x + bounds2.width &&
               bounds1.x + bounds1.width > bounds2.x &&
               bounds1.y < bounds2.y + bounds2.height &&
               bounds1.y + bounds1.height > bounds2.y;
    }

    spawnPowerUp(x, y) {
        // 提高星星和手枪的出现概率（权重系统）
        const weightedTypes = [
            POWERUP.STAR, POWERUP.STAR, POWERUP.STAR,  // 星星权重3
            POWERUP.GUN, POWERUP.GUN, POWERUP.GUN,     // 手枪权重3
            POWERUP.TANK, POWERUP.TANK,                // 生命权重2
            POWERUP.BOMB,                              // 炸弹权重1
            POWERUP.TIMER,                             // 秒表权重1
            POWERUP.HELMET,                            // 头盔权重1
            POWERUP.SHOVEL                             // 铲子权重1
        ];
        const type = weightedTypes[Math.floor(Math.random() * weightedTypes.length)];

        // 随机位置
        const px = (Math.floor(Math.random() * 20) + 3) * GRID_SIZE;
        const py = (Math.floor(Math.random() * 20) + 3) * GRID_SIZE;

        this.powerUps.push(new PowerUp(px, py, type));
    }

    collectPowerUp(powerUp) {
        // 记录收集的道具类型
        this.collectedPowerUps.add(powerUp.type);

        switch (powerUp.type) {
            case POWERUP.STAR:
                this.player.starCount++;
                break;
            case POWERUP.TANK:
                this.lives++;
                break;
            case POWERUP.BOMB:
                for (let enemy of this.enemies) {
                    enemy.active = false;
                    this.explosions.push(new Explosion(enemy.x, enemy.y));
                    this.score += 100;
                }
                break;
            case POWERUP.TIMER:
                this.frozenTimer = 5;
                this.enemies.forEach(e => e.frozen = true);
                break;
            case POWERUP.HELMET:
                this.player.invincible = true;
                this.player.invincibleTime = 10;
                break;
            case POWERUP.SHOVEL:
                this.map.protectBase();
                break;
            case POWERUP.GUN:
                this.player.hasPiercingBullet = true;
                break;
            case POWERUP.SHIELD:
                this.player.shield += 3; // 增加3次护盾
                break;
            case POWERUP.LASER:
                this.player.hasLaser = true;
                break;
            case POWERUP.MISSILE:
                this.player.hasMissile = true;
                break;
        }

        // 检查成就
        this.checkAchievements();
        this.updateUI();
    }

    respawnPlayer() {
        this.player = new Tank(8 * GRID_SIZE, 24 * GRID_SIZE, true);
        this.player.invincible = true;
        this.player.invincibleTime = 3;
    }

    checkGameState() {
        // 检查是否所有敌人都被消灭
        if (this.enemiesSpawned >= this.enemyQueue.length && this.enemies.length === 0) {
            this.levelComplete();
        }
    }

    levelComplete() {
        this.running = false;
        this.checkAchievements(); // 检查关卡成就
        const levelScoreEl = document.getElementById('levelScore');
        const levelCompleteEl = document.getElementById('levelComplete');
        if (levelScoreEl) levelScoreEl.textContent = this.score;
        if (levelCompleteEl) levelCompleteEl.style.display = 'block';
    }

    gameOver() {
        this.running = false;
        const finalScoreEl = document.getElementById('finalScore');
        const gameOverEl = document.getElementById('gameOver');
        if (finalScoreEl) finalScoreEl.textContent = this.score;
        if (gameOverEl) gameOverEl.style.display = 'block';
    }

    nextLevel() {
        const levelCompleteEl = document.getElementById('levelComplete');
        if (levelCompleteEl) levelCompleteEl.style.display = 'none';
        this.currentLevel++;
        this.loadLevel(this.currentLevel);
        this.running = true;
        this.lastTime = performance.now();
        // 继续游戏循环
        this.gameLoop(this.lastTime);
    }

    restart() {
        const gameOverEl = document.getElementById('gameOver');
        if (gameOverEl) gameOverEl.style.display = 'none';
        this.currentLevel = 0;
        this.score = 0;
        this.lives = 3;
        this.loadLevel(this.currentLevel);
        this.running = true;
        this.lastTime = performance.now();
        // 重启游戏循环
        this.gameLoop(this.lastTime);
    }

    unlockAchievement(achievement) {
        if (!this.achievements.has(achievement.id)) {
            this.achievements.add(achievement.id);
            this.achievementQueue.push(achievement);
        }
    }

    checkAchievements() {
        // 首杀
        if (this.totalKills === 1) {
            this.unlockAchievement(ACHIEVEMENTS.FIRST_KILL);
        }

        // 连击成就
        if (this.comboCount === 3) {
            this.unlockAchievement(ACHIEVEMENTS.COMBO_3);
        } else if (this.comboCount === 5) {
            this.unlockAchievement(ACHIEVEMENTS.COMBO_5);
        } else if (this.comboCount === 10) {
            this.unlockAchievement(ACHIEVEMENTS.COMBO_10);
        }

        // 分数成就
        if (this.score >= 1000 && !this.achievements.has('score_1000')) {
            this.unlockAchievement(ACHIEVEMENTS.SCORE_1000);
        }
        if (this.score >= 5000 && !this.achievements.has('score_5000')) {
            this.unlockAchievement(ACHIEVEMENTS.SCORE_5000);
        }

        // 关卡成就
        if (this.currentLevel === 4) { // 通过第5关（索引4）
            this.unlockAchievement(ACHIEVEMENTS.LEVEL_5);
        }

        // 收藏家成就
        if (this.collectedPowerUps.size >= 7) { // 至少收集7种道具
            this.unlockAchievement(ACHIEVEMENTS.COLLECT_ALL);
        }
    }

    updateUI() {
        const levelEl = document.getElementById('level');
        const livesEl = document.getElementById('lives');
        const scoreEl = document.getElementById('score');
        const enemiesEl = document.getElementById('enemies');

        if (levelEl) levelEl.textContent = this.currentLevel + 1;
        if (livesEl) livesEl.textContent = this.lives;
        if (scoreEl) scoreEl.textContent = this.score;
        if (enemiesEl) enemiesEl.textContent = this.enemyQueue.length - this.enemiesSpawned + this.enemies.length;

        // 更新连击显示
        const comboEl = document.getElementById('combo');
        if (comboEl) {
            if (this.comboCount > 1) {
                comboEl.textContent = `连击: ${this.comboCount}x (${this.scoreMultiplier.toFixed(1)}倍分数)`;
                comboEl.style.display = 'block';
            } else {
                comboEl.style.display = 'none';
            }
        }
    }

    render() {
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 渲染地图
        this.map.render(this.ctx);

        // 渲染爆炸
        for (let explosion of this.explosions) {
            explosion.render(this.ctx);
        }

        // 渲染道具
        for (let powerUp of this.powerUps) {
            powerUp.render(this.ctx);
        }

        // 渲染子弹
        for (let bullet of this.bullets) {
            bullet.render(this.ctx);
        }

        // 渲染坦克
        if (this.player && this.player.active) {
            this.player.render(this.ctx);
        }

        for (let enemy of this.enemies) {
            enemy.render(this.ctx);
        }

        // 渲染暂停文字
        if (this.paused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#fff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2);
        }

        // 渲染成就提示
        if (this.achievementQueue.length > 0) {
            const achievement = this.achievementQueue[0];
            const alpha = Math.min(1, performance.now() % 3000 / 1000);

            this.ctx.save();
            this.ctx.globalAlpha = alpha > 2 ? 3 - alpha : 1;
            this.ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
            this.ctx.fillRect(this.canvas.width / 2 - 150, 50, 300, 80);
            this.ctx.strokeStyle = '#ff0';
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(this.canvas.width / 2 - 150, 50, 300, 80);

            this.ctx.fillStyle = '#000';
            this.ctx.font = 'bold 20px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('🏆 成就解锁', this.canvas.width / 2, 75);
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`${achievement.icon} ${achievement.name}`, this.canvas.width / 2, 100);
            this.ctx.font = '12px Arial';
            this.ctx.fillStyle = '#333';
            this.ctx.fillText(achievement.desc, this.canvas.width / 2, 118);
            this.ctx.restore();

            // 3秒后移除
            if (!achievement.showTime) {
                achievement.showTime = performance.now();
            } else if (performance.now() - achievement.showTime > 3000) {
                this.achievementQueue.shift();
            }
        }
    }

    gameLoop(currentTime) {
        if (!this.running) return;

        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame((time) => this.gameLoop(time));
    }
}

// 启动游戏
const game = new Game();
