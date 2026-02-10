
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameState, Enemy, Bullet, EnemyType, Vector2, PowerUpType } from './types';
import HUD from './components/HUD';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 800;
const PLAYER_Y = CANVAS_HEIGHT - 180;

// Temas de las 7 misiones
const STAGE_THEMES = [
  { name: "AETHER", color: "#00f3ff", bg: "#0a0510", accent: "#00f3ff" },
  { name: "IGNIS", color: "#ff4b4b", bg: "#1a0505", accent: "#ff8c00" },
  { name: "GLACIES", color: "#a0d8ef", bg: "#05101a", accent: "#ffffff" },
  { name: "NULL", color: "#9932cc", bg: "#0f0015", accent: "#f425af" },
  { name: "TERRA", color: "#7cfc00", bg: "#0a1005", accent: "#ffd700" },
  { name: "PLASMA", color: "#ff00ff", bg: "#100010", accent: "#00ffff" },
  { name: "ZENITH", color: "#ffffff", bg: "#0d0d0d", accent: "#f425af" }
];

const playSound = (type: string) => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  const now = ctx.currentTime;

  if (type === 'hit') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(100, now); gain.gain.setValueAtTime(0.3, now); osc.start(); osc.stop(now + 0.2);
  } else if (type === 'shoot') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(1200, now); osc.frequency.exponentialRampToValueAtTime(400, now + 0.1); gain.gain.setValueAtTime(0.1, now); osc.start(); osc.stop(now + 0.1);
  } else if (type === 'boss_alert') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(200, now); osc.frequency.linearRampToValueAtTime(50, now + 1.5); gain.gain.setValueAtTime(0.3, now); osc.start(); osc.stop(now + 1.5);
  }
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    playerPos: 50, bullets: [], enemyBullets: [], enemies: [], powerUps: [], explosions: [],
    score: 0, lives: 7, maxLives: 7, invulnerable: 0, turbo: 50, isTurboActive: false,
    weaponLevel: 1, time: 0, stage: 1, gameOver: false, victory: false, hitFlash: 0, shake: 0, bossIncoming: 0,
  });

  const [input, setInput] = useState({ left: false, right: false, shooting: false });
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spawnTimerRef = useRef<number>(0);
  const fireTimerRef = useRef<number>(0);
  const bossSpawnedRef = useRef<number>(0);

  const stars = useMemo(() => Array.from({ length: 60 }).map(() => ({
    x: Math.random() * CANVAS_WIDTH, y: Math.random() * CANVAS_HEIGHT, size: Math.random() * 2, speed: 0.5 + Math.random() * 2
  })), []);

  const nextStage = useCallback(() => {
    if (gameState.stage < 7) {
      setGameState(prev => ({
        ...prev, stage: prev.stage + 1, victory: false, enemies: [], bullets: [], enemyBullets: [], bossIncoming: 0, score: prev.score + 1000
      }));
      bossSpawnedRef.current = 0;
    }
  }, [gameState.stage]);

  const update = useCallback((time: number) => {
    const deltaTime = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setGameState(prev => {
      if (prev.gameOver || prev.victory) return prev;

      let { playerPos, bullets, enemyBullets, enemies, powerUps, explosions, score, lives, invulnerable, weaponLevel, stage, shake, hitFlash, bossIncoming, victory, gameOver } = prev;
      const pX = (playerPos / 100) * CANVAS_WIDTH;
      const currentTheme = STAGE_THEMES[stage - 1];

      invulnerable = Math.max(0, invulnerable - deltaTime);
      hitFlash = Math.max(0, hitFlash - deltaTime * 2);
      shake = Math.max(0, shake - deltaTime * 50);

      if (input.left) playerPos = Math.max(10, playerPos - (350 * deltaTime / (CANVAS_WIDTH / 100)));
      if (input.right) playerPos = Math.min(90, playerPos + (350 * deltaTime / (CANVAS_WIDTH / 100)));

      fireTimerRef.current += deltaTime;
      if (input.shooting && fireTimerRef.current > 0.15) {
        fireTimerRef.current = 0;
        playSound('shoot');
        const bCol = currentTheme.accent;
        bullets.push({ id: Math.random().toString(), pos: { x: pX, y: PLAYER_Y - 30 }, velocity: { x: 0, y: -25 }, isSpecial: false, color: bCol });
        if (weaponLevel >= 2) {
            bullets.push({ id: Math.random().toString(), pos: { x: pX - 15, y: PLAYER_Y - 20 }, velocity: { x: -3, y: -22 }, isSpecial: false, color: bCol });
            bullets.push({ id: Math.random().toString(), pos: { x: pX + 15, y: PLAYER_Y - 20 }, velocity: { x: 3, y: -22 }, isSpecial: false, color: bCol });
        }
        if (weaponLevel >= 3) {
            bullets.push({ id: Math.random().toString(), pos: { x: pX - 25, y: PLAYER_Y - 10 }, velocity: { x: -6, y: -20 }, isSpecial: false, color: bCol });
            bullets.push({ id: Math.random().toString(), pos: { x: pX + 25, y: PLAYER_Y - 10 }, velocity: { x: 6, y: -20 }, isSpecial: false, color: bCol });
        }
      }

      // Enemy Spawning Strategy per Stage
      spawnTimerRef.current += deltaTime;
      const spawnRate = Math.max(0.4, 1.4 - (stage * 0.12));
      if (spawnTimerRef.current > spawnRate && !enemies.some(e => e.type === EnemyType.BOSS) && bossIncoming <= 0) {
        spawnTimerRef.current = 0;
        const startX = 50 + Math.random() * (CANVAS_WIDTH - 100);
        
        let type = EnemyType.MYSTIC_SHARD;
        const rand = Math.random();
        
        if (stage === 1) type = EnemyType.MYSTIC_SHARD;
        else if (stage === 2) type = rand > 0.7 ? EnemyType.VOID_STALKER : EnemyType.MYSTIC_SHARD;
        else if (stage === 3) type = rand > 0.6 ? EnemyType.ORACLE_EYE : EnemyType.MYSTIC_SHARD;
        else if (stage === 4) type = rand > 0.8 ? EnemyType.TITAN_CORE : (rand > 0.5 ? EnemyType.VOID_STALKER : EnemyType.MYSTIC_SHARD);
        else if (stage === 5) type = rand > 0.7 ? EnemyType.WISP : EnemyType.ORACLE_EYE;
        else type = [EnemyType.MYSTIC_SHARD, EnemyType.VOID_STALKER, EnemyType.ORACLE_EYE, EnemyType.TITAN_CORE, EnemyType.WISP][Math.floor(Math.random() * 5)];

        const cfg: any = {
          [EnemyType.MYSTIC_SHARD]: { s: 25, hp: 30 + stage * 5, vy: 2 + stage * 0.2 },
          [EnemyType.VOID_STALKER]: { s: 22, hp: 20 + stage * 5, vy: 4 + stage * 0.3 },
          [EnemyType.ORACLE_EYE]: { s: 28, hp: 40 + stage * 10, vy: 1.5 + stage * 0.1 },
          [EnemyType.TITAN_CORE]: { s: 45, hp: 150 + stage * 30, vy: 0.8 + stage * 0.05 },
          [EnemyType.WISP]: { s: 15, hp: 10, vy: 5 + stage * 0.5 }
        }[type];

        enemies.push({
          id: Math.random().toString(), type, pos: { x: startX, y: -50 }, velocity: { x: 0, y: cfg.vy },
          size: cfg.s, health: cfg.hp, color: currentTheme.color, rotation: 0, rotationSpeed: 0.05, lastShot: 0,
          baseX: startX, phase: Math.random() * Math.PI * 2
        });
      }

      // Boss Logic
      if (score >= stage * 2500 && !enemies.some(e => e.type === EnemyType.BOSS) && bossSpawnedRef.current < stage && bossIncoming <= 0) {
          bossIncoming = 3;
          bossSpawnedRef.current = stage;
          playSound('boss_alert');
      }
      if (bossIncoming > 0) {
          bossIncoming -= deltaTime;
          if (bossIncoming <= 0) {
            enemies.push({
                id: 'BOSS', type: EnemyType.BOSS, pos: { x: CANVAS_WIDTH/2, y: -100 }, velocity: { x: 0, y: 1 },
                size: 80, health: 1000 + stage * 500, maxHealth: 1000 + stage * 500, color: currentTheme.accent, rotation: 0, rotationSpeed: 0.01, lastShot: 0, baseX: CANVAS_WIDTH/2
            });
          }
      }

      // Enemy AI & Movement
      enemies = enemies.map(e => {
        const next = { ...e, rotation: e.rotation + e.rotationSpeed };
        if (e.type === EnemyType.BOSS) {
          if (next.pos.y < 150) next.pos.y += next.velocity.y;
          else next.pos.x = next.baseX! + Math.sin(prev.time * 0.8) * 100;
          
          next.lastShot += deltaTime;
          if (next.lastShot > 1.5 - (stage * 0.1)) {
            next.lastShot = 0;
            for(let i=-2; i<=2; i++) {
              enemyBullets.push({ id: Math.random().toString(), pos: { ...next.pos }, velocity: { x: i * 2, y: 5 + stage }, color: currentTheme.accent });
            }
          }
        } else if (e.type === EnemyType.VOID_STALKER) {
          next.pos.y += next.velocity.y;
          next.pos.x = next.baseX! + Math.sin(prev.time * 6) * 60;
        } else if (e.type === EnemyType.ORACLE_EYE) {
          if (next.pos.y < 200) next.pos.y += next.velocity.y;
          next.lastShot += deltaTime;
          if (next.lastShot > 2.5) {
            next.lastShot = 0;
            const dx = pX - next.pos.x;
            const dy = PLAYER_Y - next.pos.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            enemyBullets.push({ id: Math.random().toString(), pos: { ...next.pos }, velocity: { x: (dx/dist)*6, y: (dy/dist)*6 }, color: '#fff' });
          }
        } else if (e.type === EnemyType.WISP) {
           const dx = pX - next.pos.x;
           next.pos.x += Math.sign(dx) * 2;
           next.pos.y += next.velocity.y;
        } else if (e.type === EnemyType.TITAN_CORE) {
          next.pos.y += next.velocity.y;
          next.lastShot += deltaTime;
          if (next.lastShot > 3) {
            next.lastShot = 0;
            for(let a=0; a<Math.PI*2; a+=Math.PI/4) {
               enemyBullets.push({ id: Math.random().toString(), pos: { ...next.pos }, velocity: { x: Math.cos(a)*4, y: Math.sin(a)*4 }, color: currentTheme.color });
            }
          }
        } else { // SHARD
          next.pos.y += next.velocity.y;
        }
        return next;
      });

      // Bullets & Collision
      bullets = bullets.map(b => ({ ...b, pos: { x: b.pos.x + b.velocity.x, y: b.pos.y + b.velocity.y } })).filter(b => b.pos.y > -50);
      enemyBullets = enemyBullets.map(eb => ({ ...eb, pos: { x: eb.pos.x + eb.velocity.x, y: eb.pos.y + eb.velocity.y } })).filter(eb => eb.pos.y < CANVAS_HEIGHT + 20);

      enemyBullets.forEach((eb, i) => {
        if (invulnerable <= 0 && Math.sqrt(Math.pow(eb.pos.x - pX, 2) + Math.pow(eb.pos.y - PLAYER_Y, 2)) < 25) {
          lives--; invulnerable = 1.5; hitFlash = 0.6; shake = 25; playSound('hit');
          enemyBullets.splice(i, 1);
        }
      });

      enemies.forEach((e, i) => {
        if (invulnerable <= 0 && Math.sqrt(Math.pow(e.pos.x - pX, 2) + Math.pow(e.pos.y - PLAYER_Y, 2)) < e.size) {
           lives--; invulnerable = 1.5; hitFlash = 0.6; shake = 25; playSound('hit');
           if (e.type !== EnemyType.BOSS) enemies.splice(i, 1);
        }
        bullets.forEach((b, bi) => {
           if (Math.sqrt(Math.pow(e.pos.x - b.pos.x, 2) + Math.pow(e.pos.y - b.pos.y, 2)) < e.size) {
              e.health -= 20; bullets.splice(bi, 1);
              if (e.health <= 0) {
                score += e.type === EnemyType.BOSS ? 5000 : (e.type === EnemyType.TITAN_CORE ? 400 : 100);
                if (e.type === EnemyType.BOSS) victory = true;
                enemies.splice(i, 1);
              }
           }
        });
      });

      powerUps.forEach((p, i) => {
          p.pos.y += p.velocity.y;
          if (Math.sqrt(Math.pow(p.pos.x - pX, 2) + Math.pow(p.pos.y - PLAYER_Y, 2)) < 40) {
              if (p.type === PowerUpType.RECOVERY) lives = Math.min(7, lives + 1);
              else weaponLevel = Math.min(3, weaponLevel + 1);
              powerUps.splice(i, 1);
          }
      });
      if (Math.random() < 0.002) {
          powerUps.push({ id: Math.random().toString(), type: Math.random() > 0.4 ? PowerUpType.RECOVERY : PowerUpType.WEAPON_UPGRADE, pos: { x: Math.random() * CANVAS_WIDTH, y: -20 }, velocity: { x: 0, y: 3 }, size: 20 });
      }

      if (lives <= 0) gameOver = true;

      return { ...prev, playerPos, bullets, enemyBullets, enemies, powerUps, score, lives, invulnerable, weaponLevel, stage, shake, hitFlash, bossIncoming, time: prev.time + deltaTime, victory, gameOver };
    });
    requestRef.current = requestAnimationFrame(update);
  }, [input, nextStage]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(update);
    return () => cancelAnimationFrame(requestRef.current!);
  }, [update]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const theme = STAGE_THEMES[gameState.stage - 1];

    ctx.save();
    if (gameState.shake > 0) ctx.translate((Math.random()-0.5)*gameState.shake, (Math.random()-0.5)*gameState.shake);
    
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    stars.forEach(s => {
      const y = (s.y + gameState.time * s.speed * 50) % CANVAS_HEIGHT;
      ctx.fillStyle = theme.accent + '33';
      ctx.beginPath(); ctx.arc(s.x, y, s.size, 0, Math.PI*2); ctx.fill();
    });

    ctx.strokeStyle = theme.color + '11'; ctx.lineWidth = 1;
    const gS = 50; const off = (gameState.time * 80) % gS;
    for(let i=0; i<CANVAS_WIDTH; i+=gS) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, CANVAS_HEIGHT); ctx.stroke(); }
    for(let i=off; i<CANVAS_HEIGHT; i+=gS) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(CANVAS_WIDTH, i); ctx.stroke(); }

    // Render Jugador: ANDROIDE MÍSTICO
    const pX = (gameState.playerPos/100)*CANVAS_WIDTH;
    if (!gameState.gameOver) {
      ctx.save();
      ctx.translate(pX, PLAYER_Y);
      if (gameState.invulnerable > 0 && Math.floor(gameState.time * 15) % 2 === 0) ctx.globalAlpha = 0.3;
      
      ctx.strokeStyle = theme.accent; ctx.setLineDash([5, 5]); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 35 + Math.sin(gameState.time*5)*3, 0, Math.PI*2); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#fff"; ctx.beginPath();
      ctx.moveTo(0, -25); ctx.lineTo(18, 12); ctx.lineTo(-18, 12); ctx.closePath(); ctx.fill();
      
      const floatY = Math.sin(gameState.time * 4) * 6;
      ctx.fillStyle = theme.color;
      ctx.beginPath(); ctx.moveTo(-30, -5 + floatY); ctx.lineTo(-20, -15 + floatY); ctx.lineTo(-10, -5 + floatY); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(10, -5 + floatY); ctx.lineTo(20, -15 + floatY); ctx.lineTo(30, -5 + floatY); ctx.closePath(); ctx.fill();

      ctx.fillStyle = theme.accent; ctx.beginPath(); ctx.arc(0, -32, 8, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Render Unique Enemies Low Poly
    gameState.enemies.forEach(e => {
      ctx.save(); ctx.translate(e.pos.x, e.pos.y); ctx.rotate(e.rotation);
      ctx.strokeStyle = e.color; ctx.lineWidth = 2; ctx.beginPath();
      
      if (e.type === EnemyType.BOSS) {
         ctx.setLineDash([5, 10]);
         ctx.beginPath(); ctx.arc(0, 0, e.size + Math.sin(gameState.time*3)*5, 0, Math.PI*2); ctx.stroke();
         ctx.setLineDash([]);
         for(let i=0; i<6; i++) {
           const a = i * Math.PI * 2 / 6;
           ctx.lineTo(Math.cos(a)*e.size, Math.sin(a)*e.size);
         }
      } else if (e.type === EnemyType.VOID_STALKER) {
         ctx.moveTo(0, -e.size); ctx.lineTo(e.size/2, e.size); ctx.lineTo(-e.size/2, e.size);
      } else if (e.type === EnemyType.ORACLE_EYE) {
         ctx.arc(0, 0, e.size/2, 0, Math.PI*2);
         ctx.moveTo(-e.size/2, 0); ctx.lineTo(e.size/2, 0);
      } else if (e.type === EnemyType.TITAN_CORE) {
         for(let i=0; i<8; i++) {
           const a = i * Math.PI * 2 / 8;
           ctx.lineTo(Math.cos(a)*e.size/2, Math.sin(a)*e.size/2);
         }
      } else if (e.type === EnemyType.WISP) {
         ctx.moveTo(0, -e.size); ctx.lineTo(e.size, 0); ctx.lineTo(0, e.size); ctx.lineTo(-e.size, 0);
         ctx.fillStyle = e.color + '44'; ctx.fill();
      } else { // SHARD
         ctx.moveTo(0, -e.size/2); ctx.lineTo(e.size/2, 0); ctx.lineTo(0, e.size/2); ctx.lineTo(-e.size/2, 0);
      }
      ctx.closePath(); ctx.stroke(); ctx.restore();
    });

    gameState.bullets.forEach(b => {
      ctx.fillStyle = b.color; ctx.beginPath(); ctx.arc(b.pos.x, b.pos.y, 4, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 10; ctx.shadowColor = b.color; ctx.fill(); ctx.shadowBlur = 0;
    });

    gameState.enemyBullets.forEach(eb => {
      ctx.fillStyle = eb.color; ctx.beginPath(); ctx.arc(eb.pos.x, eb.pos.y, 5, 0, Math.PI*2); ctx.fill();
    });

    gameState.powerUps.forEach(p => {
        ctx.strokeStyle = p.type === PowerUpType.RECOVERY ? "#ff4b4b" : "#00f3ff";
        ctx.lineWidth = 3; 
        ctx.save(); ctx.translate(p.pos.x, p.pos.y); ctx.rotate(gameState.time * 2);
        ctx.strokeRect(-12, -12, 24, 24);
        ctx.fillStyle = "#fff"; ctx.font = "bold 14px Space Grotesk"; ctx.textAlign = 'center';
        ctx.fillText(p.type === PowerUpType.RECOVERY ? "❤" : "⚡", 0, 5);
        ctx.restore();
    });

    ctx.restore();
    if (gameState.hitFlash > 0) { ctx.fillStyle = `rgba(255,255,255,${gameState.hitFlash})`; ctx.fillRect(0,0,CANVAS_WIDTH,CANVAS_HEIGHT); }
  }, [gameState, stars]);

  return (
    <div className="relative h-screen w-full flex items-center justify-center bg-black overflow-hidden font-display">
      <div className="scanline" />
      <div className="relative w-full max-w-[400px] h-full bg-black overflow-hidden shadow-2xl">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full" />
        
        {gameState.gameOver && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/90 text-white p-8 text-center">
            <h1 className="text-4xl font-black text-primary mb-4">ESENCIA AGOTADA</h1>
            <p className="mb-8 opacity-70 uppercase tracking-widest text-sm">Tu forma física ha retornado al vacío en el plano {STAGE_THEMES[gameState.stage-1].name}</p>
            <button onClick={() => window.location.reload()} className="px-12 py-4 border-2 border-primary text-primary font-bold active:bg-primary active:text-black transition-all rounded-full">REENCARNAR</button>
          </div>
        )}

        {gameState.victory && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/10 backdrop-blur-xl text-white p-8 text-center">
            <h1 className="text-4xl font-black text-white mb-2 italic tracking-tighter">ASCENSIÓN LOGRADA</h1>
            <p className="mb-12 uppercase tracking-[0.3em] text-neon-cyan">Plano {STAGE_THEMES[gameState.stage-1].name} Superado</p>
            <button onClick={nextStage} className="px-12 py-4 bg-neon-cyan text-black font-black active:scale-95 transition-all uppercase tracking-widest rounded-full shadow-[0_0_20px_#00f3ff]">Trascender</button>
          </div>
        )}

        {!gameState.gameOver && !gameState.victory && (
          <HUD 
            gameState={gameState} 
            onLeft={() => setInput(p => ({ ...p, left: true }))}
            onRight={() => setInput(p => ({ ...p, right: true }))}
            onStop={() => setInput(p => ({ ...p, left: false, right: false }))}
            onShootStart={() => setInput(p => ({ ...p, shooting: true }))}
            onShootEnd={() => setInput(p => ({ ...p, shooting: false }))}
          />
        )}
      </div>
    </div>
  );
};

export default App;
