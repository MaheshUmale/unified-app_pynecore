import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, ChevronRight, Scissors, X } from 'lucide-react';

interface ReplayBarProps {
  onCut: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onStep: () => void;
  onSpeedChange: (speed: number) => void;
  speed: number;
  isPlaying: boolean;
  isCutMode: boolean;
  onClose: () => void;
}

const ReplayBar: React.FC<ReplayBarProps> = ({
  onCut,
  onPlay,
  onPause,
  onStop,
  onStep,
  onSpeedChange,
  speed,
  isPlaying,
  isCutMode,
  onClose
}) => {
  return (
    <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-[#1e222d] border border-tv-border shadow-2xl rounded-full px-4 py-2 flex items-center gap-4 text-tv-text">
      <button
        onClick={onCut}
        className={`p-2 rounded-full transition-colors ${isCutMode ? 'bg-blue-600 text-white' : 'hover:bg-tv-grid'}`}
        title="Cut (Jump to Time)"
      >
        <Scissors className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      {isPlaying ? (
        <button onClick={onPause} className="p-2 hover:bg-tv-grid rounded-full">
          <Pause className="w-4 h-4 fill-current" />
        </button>
      ) : (
        <button onClick={onPlay} className="p-2 hover:bg-tv-grid rounded-full">
          <Play className="w-4 h-4 fill-current" />
        </button>
      )}

      <button onClick={onStop} className="p-2 hover:bg-tv-grid rounded-full">
        <Square className="w-4 h-4 fill-current" />
      </button>

      <button onClick={onStep} className="p-2 hover:bg-tv-grid rounded-full">
        <ChevronRight className="w-4 h-4" />
      </button>

      <div className="h-4 w-px bg-tv-border" />

      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="bg-transparent text-sm font-semibold focus:outline-none cursor-pointer"
      >
        <option value={2000}>0.5x</option>
        <option value={1000}>1x</option>
        <option value={500}>2x</option>
        <option value={200}>5x</option>
      </select>

      <div className="h-4 w-px bg-tv-border" />

      <button onClick={onClose} className="p-2 hover:bg-red-500/20 hover:text-red-500 rounded-full">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ReplayBar;
