import React, { useState } from 'react';
import { Play, Settings, Trophy, LogOut, Keyboard } from 'lucide-react';
import { SettingsModal } from './SettingsModal';
import { ScoreboardModal } from './ScoreboardModal';
import { ControlsModal } from './ControlsModal';
import { GraphicsSettings } from '../game/types';
import { MatchSimulator } from '../game/network/MatchSimulator';

interface PauseMenuProps {
  onResume: () => void;
  onQuit: () => void;
  matchSim: MatchSimulator;
  graphicsSettings: GraphicsSettings;
  onUpdateSettings: (newSettings: GraphicsSettings) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onQuit,
  matchSim,
  graphicsSettings,
  onUpdateSettings,
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showControls, setShowControls] = useState(false);

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-6 flex flex-col items-center shadow-2xl">
        <h2 className="text-xl font-bold font-display text-slate-100 mb-6 tracking-wide">
          TACTICAL PAUSE
        </h2>

        <div className="flex flex-col gap-3 w-full">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" /> Resume Combat
          </button>

          <button
            onClick={() => setShowScoreboard(true)}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-amber-400" /> View Scoreboard
          </button>

          <button
            onClick={() => setShowControls(true)}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Keyboard className="w-4 h-4 text-sky-400" /> Controls & Keybinds
          </button>

          <button
            onClick={() => setShowSettings(true)}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Settings className="w-4 h-4 text-cyan-400" /> Settings
          </button>

          <button
            onClick={onQuit}
            className="w-full py-3 px-4 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/40 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            <LogOut className="w-4 h-4" /> Abandon Match
          </button>
        </div>
      </div>

      {showControls && <ControlsModal onClose={() => setShowControls(false)} />}

      {showSettings && (
        <SettingsModal
          settings={graphicsSettings}
          onUpdateSettings={onUpdateSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showScoreboard && (
        <ScoreboardModal matchSim={matchSim} onClose={() => setShowScoreboard(false)} />
      )}
    </div>
  );
};

