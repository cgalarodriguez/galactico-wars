
import React from 'react';
import { GameState, EnemyType } from '../types';

interface HUDProps {
  gameState: GameState;
  onLeft: () => void;
  onRight: () => void;
  onStop: () => void;
  onTurbo: () => void;
  onShootStart: () => void;
  onShootEnd: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onLeft, onRight, onStop, onTurbo, onShootStart, onShootEnd }) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const boss = gameState.enemies.find(e => e.type === EnemyType.BOSS);

  return (
    <div className="relative z-20 flex flex-col h-full pointer-events-none p-4 text-white safe-pt safe-pb">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-start w-full gap-4">
        <div className="flex-1 flex flex-col gap-1">
          <div className="bg-black/40 backdrop-blur-md border-l-2 border-neon-cyan/50 pl-3 py-1 pr-4 rounded-r-lg inline-self-start">
            <p className="text-[9px] text-neon-cyan font-black tracking-widest uppercase opacity-80">SECTOR {gameState.stage}</p>
            <p className="text-white text-base font-bold leading-none tabular-nums">{formatTime(gameState.time)}</p>
          </div>
          <div className="w-full max-w-[140px] bg-black/40 backdrop-blur-sm p-1.5 rounded-md border border-white/5">
            <div className="flex justify-between items-center mb-1 px-0.5">
              <span className="text-[7px] font-black text-primary tracking-tighter uppercase">INTEGRITY</span>
              <span className="text-[8px] font-bold text-white">{Math.floor(gameState.health)}%</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 shadow-[0_0_8px_#f425af]"
                style={{ width: `${gameState.health}%` }}
              />
            </div>
          </div>
        </div>

        {/* BOSS HEALTH BAR - Centered if active */}
        {boss && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 w-full max-w-[280px] flex flex-col items-center gap-1">
             <div className="flex justify-between w-full px-2">
                <span className="text-[10px] font-black text-primary tracking-[0.2em] animate-pulse">BOSS: OMEGA SENTINEL</span>
                <span className="text-[10px] font-bold">{Math.ceil(boss.health)}</span>
             </div>
             <div className="h-3 w-full bg-black/60 border border-primary/30 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-primary via-purple-500 to-primary transition-all duration-100"
                  style={{ width: `${(boss.health / (boss.maxHealth || 1500)) * 100}%` }}
                />
             </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-end gap-1 text-right">
          <div className="bg-black/40 backdrop-blur-md border-r-2 border-primary/50 pr-3 py-1 pl-4 rounded-l-lg inline-self-end">
            <p className="text-[9px] text-primary font-black tracking-widest uppercase opacity-80">SCORE</p>
            <p className="text-white text-base font-bold leading-none tabular-nums">{gameState.score.toString().padStart(5, '0')}</p>
          </div>
          <div className="w-full max-w-[140px] bg-black/40 backdrop-blur-sm p-1.5 rounded-md border border-white/5">
            <div className="flex justify-between items-center mb-1 px-0.5">
              <span className="text-[8px] font-bold text-white">{Math.floor(gameState.turbo)}%</span>
              <span className="text-[7px] font-black text-neon-cyan tracking-tighter uppercase">DRIVE CORE</span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-neon-cyan transition-all duration-300 shadow-[0_0_8px_#00f3ff]"
                style={{ width: `${gameState.turbo}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOSS INCOMING WARNING */}
      {gameState.bossIncoming > 0 && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-full">
          <div className="bg-primary/20 border-y-4 border-primary/60 w-full py-6 flex flex-col items-center backdrop-blur-sm animate-pulse">
            <h2 className="text-primary text-5xl font-black italic tracking-tighter glitch-text mb-2">WARNING</h2>
            <p className="text-white text-lg font-bold tracking-[0.3em] uppercase">BOSS INBOUND</p>
            <div className="mt-4 flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="size-2 bg-primary animate-ping" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow"></div>

      {/* FOOTER CONTROLS */}
      <div className="flex items-end justify-between pointer-events-auto pb-8 px-2">
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <button 
              onMouseDown={onLeft} onMouseUp={onStop} onMouseLeave={onStop}
              onTouchStart={(e) => { e.preventDefault(); onLeft(); }} onTouchEnd={(e) => { e.preventDefault(); onStop(); }}
              className="flex items-center justify-center size-20 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 active:bg-neon-cyan/30 active:scale-90 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined !text-4xl text-white/60">arrow_back</span>
            </button>
            <button 
              onMouseDown={onRight} onMouseUp={onStop} onMouseLeave={onStop}
              onTouchStart={(e) => { e.preventDefault(); onRight(); }} onTouchEnd={(e) => { e.preventDefault(); onStop(); }}
              className="flex items-center justify-center size-20 rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 active:bg-neon-cyan/30 active:scale-90 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined !text-4xl text-white/60">arrow_forward</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-end gap-5">
          <button 
            onClick={(e) => { e.preventDefault(); onTurbo(); }}
            disabled={gameState.turbo < 50 || gameState.isTurboActive}
            className={`relative flex items-center justify-center size-20 rounded-full border-2 transition-all duration-300 ${
              gameState.isTurboActive ? 'border-neon-cyan bg-neon-cyan shadow-[0_0_25px_#00f3ff] scale-110' : 'border-primary/50 bg-black/60 active:scale-95'
            } ${gameState.turbo < 50 && !gameState.isTurboActive ? 'opacity-20 grayscale' : 'opacity-100'}`}
          >
            <span className={`material-symbols-outlined !text-3xl ${gameState.isTurboActive ? 'text-black' : 'text-primary'}`}>offline_bolt</span>
          </button>
          <button 
            onMouseDown={onShootStart} onMouseUp={onShootEnd} onMouseLeave={onShootEnd}
            onTouchStart={(e) => { e.preventDefault(); onShootStart(); }} onTouchEnd={(e) => { e.preventDefault(); onStop(); onShootEnd(); }}
            className="flex items-center justify-center size-28 rounded-full bg-white/5 backdrop-blur-xl border-4 border-white/20 active:bg-white/40 active:scale-105 transition-all shadow-2xl"
          >
            <div className="size-20 rounded-full border-2 border-white/40 flex items-center justify-center group-active:border-neon-cyan">
               <span className="material-symbols-outlined !text-6xl text-white/80">target</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default HUD;
