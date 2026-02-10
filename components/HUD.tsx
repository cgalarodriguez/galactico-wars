
import React from 'react';
import { GameState } from '../types';

interface HUDProps {
  gameState: GameState;
  onLeft: () => void;
  onRight: () => void;
  onStop: () => void;
  onShootStart: () => void;
  onShootEnd: () => void;
}

const HUD: React.FC<HUDProps> = ({ gameState, onLeft, onRight, onStop, onShootStart, onShootEnd }) => {
  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col p-6 text-white safe-pt safe-pb">
      {/* HEADER: MISSION & SCORE */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-[10px] font-black tracking-[0.2em] text-neon-cyan opacity-80">MISIÓN {gameState.stage} / 7</p>
          <h2 className="text-2xl font-bold italic tracking-tighter">ANDROIDE_MÍSTICO</h2>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black tracking-[0.2em] opacity-50 uppercase">DATA_SYNC</p>
          <p className="text-xl font-bold tabular-nums">{gameState.score.toString().padStart(6, '0')}</p>
        </div>
      </div>

      {/* LIVES (7 ESFERAS) */}
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div 
            key={i} 
            className={`size-4 rounded-full border-2 transition-all duration-500 ${
              i < gameState.lives 
                ? 'bg-primary border-white shadow-[0_0_10px_#f425af] scale-100' 
                : 'bg-transparent border-white/20 scale-75'
            }`}
          />
        ))}
      </div>

      <div className="flex-grow" />

      {/* BOSS WARNING */}
      {gameState.bossIncoming > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full bg-primary/20 border-y-2 border-primary py-4 flex flex-col items-center animate-pulse">
             <p className="text-primary font-black tracking-[0.5em] text-xl">NÚCLEO DETECTADO</p>
             <p className="text-white text-xs opacity-70">ENTRANDO EN ZONA DE CONFLICTO</p>
          </div>
      )}

      {/* MOBILE CONTROLS */}
      <div className="flex justify-between items-end pointer-events-auto pb-4 gap-4">
        <div className="flex gap-2">
          <button 
            onMouseDown={onLeft} onMouseUp={onStop} onMouseLeave={onStop}
            onTouchStart={(e) => { e.preventDefault(); onLeft(); }} onTouchEnd={(e) => { e.preventDefault(); onStop(); }}
            className="size-20 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined !text-4xl">arrow_back</span>
          </button>
          <button 
            onMouseDown={onRight} onMouseUp={onStop} onMouseLeave={onStop}
            onTouchStart={(e) => { e.preventDefault(); onRight(); }} onTouchEnd={(e) => { e.preventDefault(); onStop(); }}
            className="size-20 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined !text-4xl">arrow_forward</span>
          </button>
        </div>

        <button 
          onMouseDown={onShootStart} onMouseUp={onShootEnd} onMouseLeave={onShootEnd}
          onTouchStart={(e) => { e.preventDefault(); onShootStart(); }} onTouchEnd={(e) => { e.preventDefault(); onShootEnd(); }}
          className="size-32 rounded-full bg-primary/20 backdrop-blur-lg border-4 border-primary flex items-center justify-center active:scale-105 transition-all group"
        >
          <div className="size-20 rounded-full border-2 border-white/40 flex items-center justify-center group-active:bg-primary">
            <span className="material-symbols-outlined !text-5xl">flare</span>
          </div>
        </button>
      </div>
    </div>
  );
};

export default HUD;
