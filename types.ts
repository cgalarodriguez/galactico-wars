
export interface Vector2 {
  x: number;
  y: number;
}

export enum EnemyType {
  MYSTIC_SHARD = 'MYSTIC_SHARD', // Básico
  VOID_STALKER = 'VOID_STALKER', // Rápido
  ORACLE_EYE = 'ORACLE_EYE',     // Sniper
  TITAN_CORE = 'TITAN_CORE',     // Heavy
  WISP = 'WISP',                 // Kamikaze
  BOSS = 'BOSS'
}

export enum PowerUpType {
  RECOVERY = 'RECOVERY',
  WEAPON_UPGRADE = 'WEAPON_UPGRADE',
  SHIELD = 'SHIELD',
  SOUL_ENERGY = 'SOUL_ENERGY'
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
  phase?: number;
  baseX?: number;
}

export interface Bullet {
  id: string;
  pos: Vector2;
  velocity: Vector2;
  isSpecial: boolean;
  color: string;
}

export interface GameState {
  playerPos: number;
  bullets: Bullet[];
  enemyBullets: { id: string; pos: Vector2; velocity: Vector2; color: string }[];
  enemies: Enemy[];
  powerUps: { id: string; type: PowerUpType; pos: Vector2; velocity: Vector2; size: number }[];
  explosions: any[];
  score: number;
  lives: number; // Ahora son 7 vidas
  maxLives: number;
  invulnerable: number; // Tiempo de invulnerabilidad tras golpe
  turbo: number;
  isTurboActive: boolean;
  weaponLevel: number; // 1 to 3
  time: number;
  stage: number; // 1 to 7
  gameOver: boolean;
  victory: boolean;
  hitFlash: number;
  shake: number;
  bossIncoming: number;
}
