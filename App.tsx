
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Enemy, Bullet, EnemyBullet, ExplosionParticle, EnemyType, Vector2, PowerUp, PowerUpType } from './types';
import HUD from './components/HUD';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;
const PLAYER_Y = CANVAS_HEIGHT - 180;
const INITIAL_TURBO = 65;

// --- AUDIO SYSTEM ---
type SoundType = 'shoot' | 'explosion' | 'hit' | 'gameover' | 'laser' | 'powerup_health' | 'powerup_turbo' | 'powerup_triple' | 'powerup_shield' | 'boss_alert' | 'victory' | 'charge';

const playSound = (type: SoundType) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  switch (type) {
    case 'shoot':
      osc.type = 'square';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now); osc.stop(now + 0.1);
      break;
    case 'explosion':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.3);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.3);
      osc.start(now); osc.stop(now + 0.3);
      break;
    case 'hit':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(200, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.2);
      osc.start(now); osc.stop(now + 0.2);
      break;
    case 'charge':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.linearRampToValueAtTime(600, now + 1.5);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 1.5);
      osc.start(now); osc.stop(now + 1.5);
      break;
    case 'boss_alert':
      // Cinematic Klaxon siren - 3 pulses
      [0, 0.8, 1.6].forEach(offset => {
        const o2 = ctx.createOscillator();
        const g2 = ctx.createGain();
        o2.type = 'sawtooth';
        o2.connect(g2);
        g2.connect(ctx.destination);
        o2.frequency.setValueAtTime(180, now + offset);
        o2.frequency.exponentialRampToValueAtTime(60, now + offset + 0.6);
        g2.gain.setValueAtTime(0, now + offset);
        g2.gain.linearRampToValueAtTime(0.4, now + offset + 0.1);
        g2.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.6);
        o2.start(now + offset);
        o2.stop(now + offset + 0.6);
      });
      break;
    case 'victory':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.2);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.start(now); osc.stop(now + 0.5);
      break;
    case 'powerup_health': osc.type = 'sine'; osc.frequency.setValueAtTime(440, now); osc.frequency.exponentialRampToValueAtTime(880, now + 0.3); gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3); osc.start(now); osc.stop(now + 0.3); break;
    case 'powerup_turbo': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.2); gain.gain.setValueAtTime(0.15, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2); osc.start(now); osc.stop(now + 0.2); break;
    case 'powerup_shield': osc.type = 'sine'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(600, now + 0.1); gain.gain.setValueAtTime(0.3, now); osc.start(now); osc.stop(now + 0.5); break;
    case 'powerup_triple':
      [0, 0.07, 0.14].forEach((offset, i) => {
        const o = ctx.createOscillator(); const g = ctx.createGain(); o.type = 'square'; o.connect(g); g.connect(ctx.destination);
        o.frequency.setValueAtTime(600 + i * 200, now + offset); g.gain.setValueAtTime(0.1, now + offset); g.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.05);
        o.start(now + offset); o.stop(now + offset + 0.05);
      });
      break;
    case 'laser': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.exponentialRampToValueAtTime(600, now + 0.1); gain.gain.setValueAtTime(0.05, now); osc.start(now); osc.stop(now + 0.1); break;
    case 'gameover': osc.type = 'sawtooth'; osc.frequency.setValueAtTime(300, now); osc.frequency.linearRampToValueAtTime(50, now + 1.0); gain.gain.setValueAtTime(0.3, now); osc.start(now); osc.stop(now + 1.0); break;
  }
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerPos: 50, bullets: [], enemyBullets: [], enemies: [], powerUps: [], explosions: [],
    score: 0, health: 100, turbo: INITIAL_TURBO, isTurboActive: false,
    tripleShotTimer: 0, shieldTimer: 0, time: 0, rank: 20, stage: 1, gameOver: false, victory: false, hitFlash: 0, shake: 0, bossIncoming: 0,
  });

  const [input, setInput] = useState({ left: false, right: false, shooting: false });
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const powerUpTimerRef = useRef<number>(0);
  const fireTimerRef = useRef<number>(0);
  const bossSpawnedRef = useRef<number>(0);

  // Background Parallax Stars
  const stars = useMemo(() => {
    return Array.from({ length: 80 }).map(() => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: Math.random() * 2,
      opacity: 0.1 + Math.random() * 0.4
    }));
  }, []);

  const restartGame = useCallback(() => {
    bossSpawnedRef.current = 0;
    setGameState({
      playerPos: 50, bullets: [], enemyBullets: [], enemies: [], powerUps: [], explosions: [],
      score: 0, health: 100, turbo: INITIAL_TURBO, isTurboActive: false,
      tripleShotTimer: 0, shieldTimer: 0, time: 0, rank: 20, stage: 1, gameOver: false, victory: false, hitFlash: 0, shake: 0, bossIncoming: 0,
    });
    lastTimeRef.current = performance.now();
  }, []);

  const nextStage = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      stage: prev.stage + 1,
      victory: false,
      enemies: [],
      bullets: [],
      enemyBullets: [],
      explosions: [],
      bossIncoming: 0,
    }));
    lastTimeRef.current = performance.now();
  }, []);

  const activateTurbo = useCallback(() => {
    setGameState(prev => {
      if (prev.turbo >= 50 && !prev.isTurboActive && !prev.gameOver && !prev.victory) {
        playSound('laser');
        return { ...prev, isTurboActive: true };
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setInput(prev => ({ ...prev, left: true }));
      if (e.key === 'ArrowRight') setInput(prev => ({ ...prev, right: true }));
      if (e.key === ' ') setInput(prev => ({ ...prev, shooting: true }));
      if ((e.key === 'Shift' || e.key === 'Enter') && !gameState.gameOver) activateTurbo();
      if (e.key === 'r' && gameState.gameOver) restartGame();
      if (e.key === 'Enter' && gameState.victory) nextStage();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setInput(prev => ({ ...prev, left: false }));
      if (e.key === 'ArrowRight') setInput(prev => ({ ...prev, right: false }));
      if (e.key === ' ') setInput(prev => ({ ...prev, shooting: false }));
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.gameOver, gameState.victory, activateTurbo, restartGame, nextStage]);

  const createExplosion = (pos: Vector2, color: string, style: EnemyType | 'powerup' | 'player' | 'hit' = 'hit') => {
    const newParticles: ExplosionParticle[] = [];
    let debrisCount = 10;
    let sparkCount = 10;
    let glowCount = 5;
    let debrisForce = 8;
    let sparkForce = 15;
    let shape: 'circle' | 'square' | 'shard' = 'circle';
    let baseLife = 0.5;

    switch (style) {
      case EnemyType.BOSS: 
        debrisCount = 100; sparkCount = 80; glowCount = 30; 
        debrisForce = 25; sparkForce = 45; shape = 'shard'; baseLife = 2.0; 
        break;
      case EnemyType.HEAVY: 
        debrisCount = 40; sparkCount = 30; glowCount = 15; 
        debrisForce = 12; sparkForce = 20; shape = 'circle'; baseLife = 1.0; 
        break;
      case EnemyType.SQUARE: 
        debrisCount = 15; sparkCount = 10; glowCount = 5; 
        debrisForce = 8; sparkForce = 12; shape = 'square'; baseLife = 0.6; 
        break;
      case EnemyType.KAMIKAZE: 
        debrisCount = 20; sparkCount = 50; glowCount = 10; 
        debrisForce = 15; sparkForce = 35; shape = 'shard'; baseLife = 0.4; 
        break;
      case EnemyType.SWARMER: 
        debrisCount = 6; sparkCount = 5; glowCount = 3; 
        debrisForce = 5; sparkForce = 8; shape = 'circle'; baseLife = 0.4; 
        break;
      case EnemyType.SNIPER: 
        debrisCount = 12; sparkCount = 15; glowCount = 6; 
        debrisForce = 10; sparkForce = 18; shape = 'shard'; baseLife = 0.6; 
        break;
      case 'player': 
        debrisCount = 60; sparkCount = 40; glowCount = 20; 
        debrisForce = 20; sparkForce = 30; shape = 'shard'; baseLife = 1.5; 
        break;
      case 'powerup': 
        debrisCount = 10; sparkCount = 15; glowCount = 10; 
        debrisForce = 6; sparkForce = 10; shape = 'circle'; baseLife = 0.7; 
        break;
      case 'hit': 
        debrisCount = 3; sparkCount = 4; glowCount = 2; 
        debrisForce = 3; sparkForce = 6; shape = 'circle'; baseLife = 0.3; 
        break;
    }

    for (let i = 0; i < debrisCount; i++) {
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: { ...pos },
        velocity: { x: (Math.random() - 0.5) * debrisForce, y: (Math.random() - 0.5) * debrisForce },
        life: 1, maxLife: baseLife * (0.6 + Math.random() * 0.4), color,
        size: 2 + Math.random() * 4, shape, particleType: 'debris'
      });
    }

    for (let i = 0; i < sparkCount; i++) {
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: { ...pos },
        velocity: { x: (Math.random() - 0.5) * sparkForce, y: (Math.random() - 0.5) * sparkForce },
        life: 1, maxLife: (baseLife * 0.5) * (0.3 + Math.random() * 0.7), color: '#ffffff',
        size: 1 + Math.random() * 2, shape: 'shard', particleType: 'spark'
      });
    }

    for (let i = 0; i < glowCount; i++) {
      newParticles.push({
        id: Math.random().toString(36).substr(2, 9),
        pos: { ...pos },
        velocity: { x: (Math.random() - 0.5) * (debrisForce * 0.5), y: (Math.random() - 0.5) * (debrisForce * 0.5) },
        life: 1, maxLife: (baseLife * 1.5) * (0.8 + Math.random() * 0.4), color,
        size: 10 + Math.random() * 20, shape: 'circle', particleType: 'glow'
      });
    }

    return newParticles;
  };

  const update = useCallback((time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setGameState(prev => {
      if (prev.gameOver || prev.victory) return { ...prev, time: prev.time + deltaTime };

      let { playerPos, bullets, enemyBullets, enemies, powerUps, explosions, turbo, isTurboActive, score, health, gameOver, victory, rank, stage, tripleShotTimer, shieldTimer, hitFlash, shake, bossIncoming } = prev;
      const pX = (playerPos / 100) * CANVAS_WIDTH;
      
      hitFlash = Math.max(0, hitFlash - deltaTime * 2.0);
      shake = Math.max(0, shake - deltaTime * 50);
      tripleShotTimer = Math.max(0, tripleShotTimer - deltaTime);
      shieldTimer = Math.max(0, shieldTimer - deltaTime);

      const moveSpeed = 300;
      if (input.left) playerPos = Math.max(10, playerPos - (moveSpeed * deltaTime / (CANVAS_WIDTH / 100)));
      if (input.right) playerPos = Math.min(90, playerPos + (moveSpeed * deltaTime / (CANVAS_WIDTH / 100)));

      // Boss Spawn Logic with anticipation
      const isBossAlive = enemies.some(e => e.type === EnemyType.BOSS);
      const bossThreshold = stage * 3000;
      if (score >= bossThreshold && !isBossAlive && bossSpawnedRef.current < stage && bossIncoming <= 0) {
        bossIncoming = 3.0; // 3 seconds of panic
        playSound('boss_alert');
      }

      if (bossIncoming > 0) {
        bossIncoming -= deltaTime;
        shake = Math.max(shake, 15);
        if (Math.random() > 0.8) hitFlash = 0.2; // Red warning flickers
        
        if (bossIncoming <= 0) {
          bossIncoming = 0;
          bossSpawnedRef.current = stage;
          enemies.push({
            id: 'BOSS_OMEGA', type: EnemyType.BOSS, pos: { x: CANVAS_WIDTH / 2, y: -150 }, velocity: { x: 0, y: 1 },
            size: 100, health: 1500 + (stage * 500), maxHealth: 1500 + (stage * 500), color: '#f425af', rotation: 0, rotationSpeed: 0.01,
            lastShot: 0, attackTimer: 0, attackPattern: 0, baseX: CANVAS_WIDTH / 2
          });
        }
      }

      fireTimerRef.current += deltaTime;
      if (input.shooting && fireTimerRef.current > 0.1) {
        fireTimerRef.current = 0;
        playSound('shoot');
        const mainBullet = { id: Math.random().toString(), pos: { x: pX, y: PLAYER_Y - 20 }, velocity: { x: 0, y: -22 }, isSpecial: false };
        bullets.push(mainBullet);
        if (tripleShotTimer > 0) {
          bullets.push({ ...mainBullet, id: Math.random().toString(), velocity: { x: -4, y: -20 } });
          bullets.push({ ...mainBullet, id: Math.random().toString(), velocity: { x: 4, y: -20 } });
        }
      }

      if (isTurboActive) {
        turbo -= deltaTime * 85;
        if (turbo <= 0) { turbo = 0; isTurboActive = false; }
        enemies.forEach(enemy => {
          if (Math.abs(enemy.pos.x - pX) < (enemy.type === EnemyType.BOSS ? 80 : 50) && enemy.pos.y < PLAYER_Y) {
            enemy.health -= deltaTime * 400;
            if (Math.random() > 0.6) explosions.push(...createExplosion(enemy.pos, '#fff', 'hit'));
          }
        });
      } else { turbo = Math.min(100, turbo + deltaTime * 5); }

      enemies = enemies.map(e => {
        const n = { ...e, rotation: e.rotation + e.rotationSpeed };
        if (e.type === EnemyType.BOSS) {
          if (n.pos.y < 120) n.pos.y += 1;
          else n.pos.x = n.baseX! + Math.sin(prev.time * 0.8) * 120;
          n.attackTimer = (n.attackTimer || 0) + deltaTime;
          if (n.attackTimer > 4) { n.attackTimer = 0; n.attackPattern = (n.attackPattern! + 1) % 3; if (n.attackPattern === 2) playSound('charge'); }
          n.lastShot += deltaTime;
          if (n.attackPattern === 0 && n.lastShot > 0.4) {
            n.lastShot = 0;
            for(let i=-2; i<=2; i++) enemyBullets.push({ id: Math.random().toString(), pos: { ...n.pos }, velocity: { x: i*2, y: 6 }, color: '#f425af' });
          } else if (n.attackPattern === 1 && n.lastShot > 0.15) {
            n.lastShot = 0;
            const ang = prev.time * 5;
            enemyBullets.push({ id: Math.random().toString(), pos: { ...n.pos }, velocity: { x: Math.cos(ang)*5, y: 6 }, color: '#00f3ff' });
            enemyBullets.push({ id: Math.random().toString(), pos: { ...n.pos }, velocity: { x: Math.cos(ang + Math.PI)*5, y: 6 }, color: '#00f3ff' });
          } else if (n.attackPattern === 2 && n.attackTimer > 1.5) {
             if (Math.abs(n.pos.x - pX) < 40 && shieldTimer <= 0) {
                health -= deltaTime * 60; hitFlash = 0.5; shake = 10;
             }
          }
        } else {
          if (e.type === EnemyType.SWARMER) n.pos.x = e.baseX! + Math.sin(prev.time * 4 + e.phase!) * 70;
          n.pos.y += n.velocity.y;
          n.lastShot += deltaTime;
          if (n.lastShot > 2) {
            n.lastShot = 0;
            if (n.type === EnemyType.SNIPER) {
              const a = Math.atan2(PLAYER_Y - n.pos.y, pX - n.pos.x);
              enemyBullets.push({ id: Math.random().toString(), pos: { ...n.pos }, velocity: { x: Math.cos(a)*8, y: Math.sin(a)*8 }, color: '#ffcc00' });
            } else enemyBullets.push({ id: Math.random().toString(), pos: { ...n.pos }, velocity: { x: 0, y: 6 } });
          }
        }
        return n;
      }).filter(e => e.pos.y < CANVAS_HEIGHT + 150);

      // Only spawn regular enemies if boss isn't active AND not currently in the incoming phase
      if (!isBossAlive && bossIncoming <= 0) {
        spawnTimerRef.current += deltaTime;
        const spawnRate = Math.max(0.2, 1.0 - (prev.time * 0.01) - (stage * 0.05));
        if (spawnTimerRef.current > spawnRate) {
          spawnTimerRef.current = 0;
          const types = [EnemyType.SQUARE, EnemyType.SWARMER, EnemyType.SNIPER, EnemyType.HEAVY, EnemyType.KAMIKAZE];
          const type = types[Math.floor(Math.random() * types.length)];
          const cfg: any = {
            [EnemyType.SQUARE]: { col: '#00f3ff', s: 30, hp: 40 + (stage * 10), vy: 2.5 },
            [EnemyType.SWARMER]: { col: '#7cfc00', s: 20, hp: 20 + (stage * 5), vy: 4.5 },
            [EnemyType.SNIPER]: { col: '#ff8c00', s: 25, hp: 50 + (stage * 10), vy: 1.8 },
            [EnemyType.HEAVY]: { col: '#9932cc', s: 55, hp: 180 + (stage * 40), vy: 1.2 },
            [EnemyType.KAMIKAZE]: { col: '#ff0044', s: 22, hp: 30 + (stage * 10), vy: 3.5 },
          }[type];
          const startX = 40 + Math.random() * (CANVAS_WIDTH - 80);
          enemies.push({
            id: Math.random().toString(), type, pos: { x: startX, y: -50 }, velocity: { x: 0, y: cfg.vy },
            size: cfg.s, health: cfg.hp, color: cfg.col, rotation: 0, rotationSpeed: (Math.random() - 0.5) * 0.1,
            lastShot: 0, phase: Math.random() * Math.PI * 2, baseX: startX
          });
        }
      }

      bullets.forEach((b, bi) => {
        enemies.forEach(e => {
          if (Math.sqrt(Math.pow(b.pos.x - e.pos.x, 2) + Math.pow(b.pos.y - e.pos.y, 2)) < e.size) {
            e.health -= 20; bullets.splice(bi, 1);
            explosions.push(...createExplosion(b.pos, '#fff', 'hit'));
          }
        });
      });

      enemies.forEach((e, ei) => {
        if (e.health <= 0) {
          playSound('explosion');
          explosions.push(...createExplosion(e.pos, e.color, e.type));
          enemies.splice(ei, 1);
          score += (e.type === EnemyType.BOSS ? 5000 : 150);
          if (e.type === EnemyType.BOSS) { 
            playSound('victory'); victory = true; shake = 80;
            for(let i=0; i<3; i++) powerUps.push({ id:Math.random().toString(), type:PowerUpType.HEALTH, pos:{x:e.pos.x + (i-1)*40, y:e.pos.y}, velocity:{x:0, y:2}, size:24, rotation:0 });
          }
        }
      });

      enemyBullets.forEach((eb, ebi) => {
        eb.pos.x += eb.velocity.x; eb.pos.y += eb.velocity.y;
        if (shieldTimer <= 0 && Math.sqrt(Math.pow(eb.pos.x - pX, 2) + Math.pow(eb.pos.y - PLAYER_Y, 2)) < 25) {
          health -= 20; enemyBullets.splice(ebi, 1);
          hitFlash = 1.0; shake = 20; playSound('hit');
          explosions.push(...createExplosion({ x: pX, y: PLAYER_Y }, '#ff0000', 'hit'));
        }
      });

      enemyBullets = enemyBullets.filter(eb => eb.pos.y < CANVAS_HEIGHT + 20 && eb.pos.y > -50);
      bullets = bullets.map(b => ({ ...b, pos: { x: b.pos.x + b.velocity.x, y: b.pos.y + b.velocity.y } })).filter(b => b.pos.y > -20);
      explosions = explosions.map(p => ({ ...p, pos: { x: p.pos.x + p.velocity.x, y: p.pos.y + p.velocity.y }, life: p.life - deltaTime / p.maxLife })).filter(p => p.life > 0);

      powerUps.forEach((p, pi) => {
        if (Math.sqrt(Math.pow(p.pos.x - pX, 2) + Math.pow(p.pos.y - PLAYER_Y, 2)) < 40) {
          const col = p.type === PowerUpType.HEALTH ? '#ff4b8b' : p.type === PowerUpType.TURBO ? '#ffcc00' : p.type === PowerUpType.TRIPLE_SHOT ? '#00f3ff' : '#9932cc';
          explosions.push(...createExplosion(p.pos, col, 'powerup'));
          if (p.type === PowerUpType.HEALTH) { health = Math.min(100, health + 25); playSound('powerup_health'); }
          else if (p.type === PowerUpType.TURBO) { turbo = Math.min(100, turbo + 50); playSound('powerup_turbo'); }
          else if (p.type === PowerUpType.TRIPLE_SHOT) { tripleShotTimer = 10; playSound('powerup_triple'); }
          else if (p.type === PowerUpType.SHIELD) { shieldTimer = 6; playSound('powerup_shield'); }
          powerUps.splice(pi, 1);
        }
      });

      if (health <= 0 && !gameOver) { 
        health = 0; gameOver = true; playSound('gameover'); shake = 60;
        explosions.push(...createExplosion({ x: pX, y: PLAYER_Y }, '#00f3ff', 'player'));
      }

      return { ...prev, playerPos, bullets, enemyBullets, enemies, powerUps, explosions, turbo, isTurboActive, score, health, gameOver, victory, time: prev.time + deltaTime, tripleShotTimer, shieldTimer, hitFlash, shake, bossIncoming };
    });
    requestRef.current = requestAnimationFrame(update);
  }, [input, activateTurbo]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !canvas.getContext('2d')) return;
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    if (gameState.shake > 0 && !gameState.gameOver) ctx.translate((Math.random()-0.5)*gameState.shake, (Math.random()-0.5)*gameState.shake);
    ctx.clearRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);

    // --- PARALLAX BACKGROUND ---
    ctx.fillStyle = '#0a0510'; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT);
    
    stars.forEach(star => {
      const yPos = (star.y + gameState.time * 20) % CANVAS_HEIGHT;
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      ctx.beginPath();
      ctx.arc(star.x, yPos, star.size, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
    ctx.lineWidth = 1;
    const midGridSize = 120;
    const midOffset = (gameState.time * 40) % midGridSize;
    for(let x=0; x<CANVAS_WIDTH; x+=midGridSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=midOffset; y<CANVAS_HEIGHT; y+=midGridSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    ctx.strokeStyle = 'rgba(244, 37, 175, 0.08)';
    ctx.lineWidth = 2;
    const gSize = 60;
    const offset = (gameState.time * 100) % gSize;
    for(let x=0; x<CANVAS_WIDTH; x+=gSize) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke(); }
    for(let y=offset; y<CANVAS_HEIGHT; y+=gSize) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke(); }

    // --- RENDERING ENTITIES ---
    gameState.enemies.filter(e => e.type === EnemyType.BOSS).forEach(b => {
      ctx.save(); ctx.translate(b.pos.x, b.pos.y);
      ctx.strokeStyle = '#f425af'; ctx.lineWidth = 4; ctx.shadowBlur = 20; ctx.shadowColor = '#f425af';
      ctx.beginPath(); ctx.arc(0, 0, 70, gameState.time * 2, gameState.time * 2 + Math.PI * 1.5); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 85, -gameState.time * 1.5, -gameState.time * 1.5 + Math.PI * 1.2); ctx.stroke();
      ctx.fillStyle = b.health < (b.maxHealth! * 0.3) ? '#ff0000' : '#f425af'; ctx.beginPath();
      for(let i=0; i<6; i++) { const a = i * Math.PI * 2 / 6 + b.rotation; ctx.lineTo(Math.cos(a)*50, Math.sin(a)*50); } ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 15 + Math.sin(gameState.time*10)*5, 0, Math.PI*2); ctx.fill();
      if (b.attackPattern === 2) {
        if (b.attackTimer < 1.5) {
           ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + Math.sin(gameState.time * 20) * 0.1})`;
           ctx.fillRect(-25, 50, 50, CANVAS_HEIGHT);
        } else {
           ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.beginPath(); ctx.arc(0, 0, 100 + Math.random()*30, 0, Math.PI*2); ctx.fill();
           ctx.fillStyle = '#fff'; ctx.fillRect(-35, 50, 70, CANVAS_HEIGHT);
           ctx.shadowBlur = 40; ctx.shadowColor = '#fff';
        }
      }
      ctx.restore();
    });

    gameState.enemies.filter(e => e.type !== EnemyType.BOSS).forEach(e => {
      ctx.save(); ctx.translate(e.pos.x, e.pos.y); ctx.rotate(e.rotation);
      ctx.strokeStyle = e.color; ctx.lineWidth = 3; ctx.beginPath();
      if (e.type === EnemyType.SQUARE) ctx.rect(-e.size/2, -e.size/2, e.size, e.size);
      else if (e.type === EnemyType.HEAVY) { for(let i=0; i<8; i++) { const a = i*Math.PI*2/8; ctx.lineTo(Math.cos(a)*e.size/2, Math.sin(a)*e.size/2); } ctx.closePath(); }
      else { ctx.moveTo(0, -e.size/2); ctx.lineTo(e.size/2, e.size/2); ctx.lineTo(-e.size/2, e.size/2); ctx.closePath(); }
      ctx.stroke(); ctx.restore();
    });

    gameState.bullets.forEach(b => { ctx.fillStyle = '#00f3ff'; ctx.fillRect(b.pos.x-2, b.pos.y-10, 4, 10); });
    gameState.enemyBullets.forEach(eb => { ctx.fillStyle = eb.color || '#ff4b4b'; ctx.beginPath(); ctx.arc(eb.pos.x, eb.pos.y, 4, 0, Math.PI*2); ctx.fill(); });
    
    // --- ENHANCED EXPLOSION RENDERING ---
    gameState.explosions.forEach(p => { 
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.translate(p.pos.x, p.pos.y);
      
      if (p.particleType === 'spark') {
        ctx.fillStyle = '#ffffff';
        ctx.shadowBlur = 5;
        ctx.shadowColor = '#ffffff';
        ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x));
        ctx.fillRect(-p.size * 2, -p.size * 0.5, p.size * 4, p.size);
      } else if (p.particleType === 'glow') {
        ctx.globalAlpha = p.life * 0.3;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size * p.life);
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
      } else { // debris
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        if (p.shape === 'square') {
          ctx.fillRect(-p.size * p.life, -p.size * p.life, p.size * p.life * 2, p.size * p.life * 2);
        } else if (p.shape === 'shard') {
          ctx.rotate(Math.atan2(p.velocity.y, p.velocity.x));
          ctx.fillRect(-p.size * 3 * p.life, -p.size * p.life, p.size * 6 * p.life, p.size * 2 * p.life);
        } else {
          ctx.beginPath(); ctx.arc(0, 0, p.size * p.life, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    if (!gameState.gameOver) {
      const pX = (gameState.playerPos/100)*CANVAS_WIDTH;
      ctx.strokeStyle = '#00f3ff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pX, PLAYER_Y-25); ctx.lineTo(pX+20, PLAYER_Y+15); ctx.lineTo(pX, PLAYER_Y+5); ctx.lineTo(pX-20, PLAYER_Y+15); ctx.closePath(); ctx.stroke();
      if (gameState.shieldTimer > 0) { ctx.strokeStyle = '#9932cc'; ctx.beginPath(); ctx.arc(pX, PLAYER_Y, 40, 0, Math.PI*2); ctx.stroke(); }
      if (gameState.isTurboActive) { ctx.fillStyle = 'rgba(255, 255, 255, 0.4)'; ctx.fillRect(pX-15, 0, 30, PLAYER_Y-20); }
    }

    if (gameState.hitFlash > 0) { ctx.fillStyle = `rgba(255, 0, 0, ${gameState.hitFlash*0.3})`; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); }
    ctx.restore();
  }, [gameState, stars]);

  return (
    <div className="relative h-screen w-full flex flex-col items-center justify-center bg-background-dark overflow-hidden font-display">
      <div className="scanline" />
      <div className="relative z-10 w-full max-w-[400px] h-full flex flex-col bg-black">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 w-full h-full object-cover" />
        
        {gameState.gameOver && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 pointer-events-auto">
            <h1 className="text-primary text-4xl font-black mb-4 text-center px-4">SYSTEM FAILURE</h1>
            <p className="text-white text-xl mb-2 uppercase tracking-widest">STAGE {gameState.stage} TERMINATED</p>
            <p className="text-neon-cyan text-lg mb-12 tabular-nums">FINAL SCORE: {gameState.score}</p>
            <button onClick={restartGame} className="bg-primary/20 border-2 border-primary text-white px-12 py-4 rounded-xl font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(244,37,175,0.4)]">REBOOT</button>
          </div>
        )}

        {gameState.victory && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-neon-cyan/10 backdrop-blur-sm pointer-events-auto">
            <h1 className="text-neon-cyan text-4xl font-black mb-4 animate-bounce text-center px-4">STAGE CLEAR</h1>
            <p className="text-white text-xl mb-2 uppercase tracking-widest">SECTOR {gameState.stage} SECURED</p>
            <p className="text-primary text-lg mb-12">DATA SYNC COMPLETE</p>
            <button onClick={nextStage} className="bg-neon-cyan/20 border-2 border-neon-cyan text-white px-12 py-4 rounded-xl font-bold active:scale-95 transition-all shadow-[0_0_20px_rgba(0,243,255,0.4)] uppercase tracking-widest">Next Sector</button>
          </div>
        )}

        {!gameState.gameOver && !gameState.victory && (
          <HUD 
            gameState={gameState} 
            onLeft={() => setInput(p => ({ ...p, left: true }))}
            onRight={() => setInput(p => ({ ...p, right: true }))}
            onStop={() => setInput(p => ({ ...p, left: false, right: false }))}
            onTurbo={activateTurbo}
            onShootStart={() => setInput(p => ({ ...p, shooting: true }))}
            onShootEnd={() => setInput(p => ({ ...p, shooting: false }))}
          />
        )}
      </div>
    </div>
  );
};

export default App;
