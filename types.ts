
export interface Vector2 {
  x: number;
  y: number;
}

export enum EnemyType {
  SQUARE = 'SQUARE',
  SWARMER = 'SWARMER',
  SNIPER = 'SNIPER',
  HEAVY = 'HEAVY',
  KAMIKAZE = 'KAMIKAZE',
  BOSS = 'BOSS'
}

export enum PowerUpType {
  HEALTH = 'HEALTH',
  TURBO = 'TURBO',
  TRIPLE_SHOT = 'TRIPLE_SHOT',
  SHIELD = 'SHIELD'
}

export interface Enemy {
  id: string;
  type: EnemyType;
  pos: Vector2;
  velocity: Vector2;
  size: number;
  health: number;
  maxHealth?: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  lastShot: number;
  // State for advanced patterns
  phase?: number;
  baseX?: number;
  isDashing?: boolean;
  attackTimer?: number;
  attackPattern?: number;
}

export interface Bullet {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  isSpecial: boolean;
}

export interface EnemyBullet {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  color?: string;
}

export interface PowerUp {
  id: string;
  type: PowerUpType;
  pos: Vector2;
  velocity: Vector2;
  size: number;
  rotation: number;
}

export interface ExplosionParticle {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape?: 'circle' | 'square' | 'shard';
  particleType?: 'debris' | 'spark' | 'glow';
}

export interface GameState {
  playerPos: number; // 0 to 100
  bullets: Bullet[];
  enemyBullets: EnemyBullet[];
  enemies: Enemy[];
  powerUps: PowerUp[];
  explosions: ExplosionParticle[];
  score: number;
  health: number;
  turbo: number;
  isTurboActive: boolean;
  tripleShotTimer: number;
  shieldTimer: number;
  time: number;
  rank: number;
  stage: number;
  gameOver: boolean;
  victory: boolean;
  hitFlash: number;
  shake: number;
  bossIncoming: number; // Timer for anticipation
}
