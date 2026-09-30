import React, { useState } from 'react';
import {
  DifficultyLevel,
  GameModeType,
  GraphicsSettings,
  Loadout,
  MatchSettings,
  PlayerProgression,
} from '../game/types';
import { CHARACTER_REGISTRY } from '../game/characters/CharacterRegistry';
import { WEAPON_REGISTRY } from '../game/weapons/WeaponRegistry';
import { soundManager } from '../game/audio/AudioSynthesizer';
import { CharacterSelectionModal } from './CharacterSelectionModal';
import { LoadoutModal } from './LoadoutModal';
import { SettingsModal } from './SettingsModal';
import { ControlsModal } from './ControlsModal';
import {
  Shield,
  Zap,
  Crosshair,
  Award,
  Play,
  User,
  Sliders,
  Sparkles,
  Target,
  Trophy,
  Keyboard,
} from 'lucide-react';

interface MainMenuProps {
  onStartMatch: (settings: MatchSettings) => void;
  loadout: Loadout;
  onUpdateLoadout: (newLoadout: Loadout) => void;
  progression: PlayerProgression;
  onProgressionUpdated: () => void;
  graphicsSettings: GraphicsSettings;
  onUpdateGraphicsSettings: (settings: GraphicsSettings) => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartMatch,
  loadout,
  onUpdateLoadout,
  progression,
  onProgressionUpdated,
  graphicsSettings,
  onUpdateGraphicsSettings,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameModeType>('tdm');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('normal');
  const [botCount, setBotCount] = useState<number>(6);

  // Modals
  const [showCharacterModal, setShowCharacterModal] = useState(false);
  const [showLoadoutModal, setShowLoadoutModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showCareerModal, setShowCareerModal] = useState(false);
  const [showControlsModal, setShowControlsModal] = useState(false);

  const activeChar = CHARACTER_REGISTRY[loadout.characterId] || CHARACTER_REGISTRY.kaelen_voss;
  const activeWeapon = WEAPON_REGISTRY[loadout.primaryWeaponId] || WEAPON_REGISTRY.pulse_carbine;


  const handleLaunch = () => {
    soundManager.init();
    soundManager.playButtonClick();
    onStartMatch({
      mode: selectedMode,
      difficulty: selectedDifficulty,
      scoreLimit: selectedMode === 'tdm' ? 25 : selectedMode === 'ffa' ? 15 : 100,
      timeLimitSeconds: 300, // 5 minutes
      botCount,
      mapId: 'spire_courtyard',
    });
  };

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden select-none">
      {/* Dynamic Background Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. TOP BAR CONTRACT */}
      <header className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-slate-800/80 bg-slate-950/60 backdrop-blur-md">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-400 flex items-center justify-center">
            <Crosshair className="w-5 h-5 text-cyan-400" />
          </div>
          <span className="text-xl font-bold font-display tracking-wider text-slate-100">
            APEX ARENA
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
          <button
            onClick={() => {}}
            className="text-cyan-400 font-semibold transition-colors cursor-pointer"
          >
            Combat Grid
          </button>
          <button
            onClick={() => {
              soundManager.init();
              setShowLoadoutModal(true);
            }}
            className="hover:text-slate-100 transition-colors cursor-pointer"
          >
            Armory
          </button>
          <button
            onClick={() => {
              soundManager.init();
              setShowCharacterModal(true);
            }}
            className="hover:text-slate-100 transition-colors cursor-pointer"
          >
            Operatives
          </button>
          <button
            onClick={() => {
              soundManager.init();
              setShowCareerModal(true);
            }}
            className="hover:text-slate-100 transition-colors cursor-pointer"
          >
            Career Dossier
          </button>
          <button
            onClick={() => {
              soundManager.init();
              setShowControlsModal(true);
            }}
            className="hover:text-slate-100 transition-colors cursor-pointer"
          >
            Controls
          </button>
          <button
            onClick={() => {
              soundManager.init();
              setShowSettingsModal(true);
            }}
            className="hover:text-slate-100 transition-colors cursor-pointer"
          >
            Settings
          </button>
        </nav>

        {/* Zone 3: Primary Actions & Profile Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-cyan-400 font-bold">LVL {progression.level}</span>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-bold">{progression.credits} CR</span>
          </div>

          <button
            onClick={handleLaunch}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] whitespace-nowrap cursor-pointer flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" /> Deploy Match
          </button>
        </div>
      </header>

      {/* 2. MAIN HUB CONTENT */}
      <main className="relative z-10 max-w-7xl w-full mx-auto px-6 py-8 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Match Setup & Mode Selection (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-widest mb-2">
                <span>SIMULATION DEPLOYMENT</span>
                <span>·</span>
                <span>ORIGINAL ARENA COMBAT</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold font-display text-slate-100 tracking-tight leading-tight">
                High-Caliber 3D Arena Shooter
              </h1>
              <p className="text-sm text-slate-400 mt-2 max-w-xl">
                Engage in fast-paced competitive firefights with fictional directed-energy weapons,
                tactical verticality, jump pads, and intelligent opponent AI.
              </p>
            </div>

            {/* Game Mode Selection */}
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-3">
                SELECT GAME MODE
              </span>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => {
                    setSelectedMode('tdm');
                    soundManager.playButtonClick();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'tdm'
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-5 h-5 text-sky-400" />
                    {selectedMode === 'tdm' && (
                      <span className="text-[10px] text-cyan-400 font-mono">SELECTED</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm">Team Deathmatch</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Alpha vs Omega squad battle. First to 25 eliminations.
                  </p>
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('ffa');
                    soundManager.playButtonClick();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'ffa'
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Crosshair className="w-5 h-5 text-amber-400" />
                    {selectedMode === 'ffa' && (
                      <span className="text-[10px] text-cyan-400 font-mono">SELECTED</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm">Free For All</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Every operative for themselves. First to 15 eliminations.
                  </p>
                </button>

                <button
                  onClick={() => {
                    setSelectedMode('zone');
                    soundManager.playButtonClick();
                  }}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedMode === 'zone'
                      ? 'bg-slate-900 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="w-5 h-5 text-purple-400" />
                    {selectedMode === 'zone' && (
                      <span className="text-[10px] text-cyan-400 font-mono">SELECTED</span>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-100 text-sm">Capture Zone</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Hold the central energy platform to 100% control.
                  </p>
                </button>
              </div>
            </div>

            {/* Combat Settings (Difficulty & Bot Count) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  AI DIFFICULTY
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  {(['easy', 'normal', 'hard'] as const).map((diff) => (
                    <button
                      key={diff}
                      onClick={() => {
                        setSelectedDifficulty(diff);
                        soundManager.playButtonClick();
                      }}
                      className={`py-2 text-xs font-semibold capitalize rounded-lg transition-colors cursor-pointer ${
                        selectedDifficulty === diff
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
                  BOT POPULATION
                </span>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-900 rounded-xl border border-slate-800">
                  {[4, 6, 8].map((count) => (
                    <button
                      key={count}
                      onClick={() => {
                        setBotCount(count);
                        soundManager.playButtonClick();
                      }}
                      className={`py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                        botCount === count
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {count} Bots
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Big Launch Button */}
            <button
              onClick={handleLaunch}
              className="w-full py-4 bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-extrabold text-base rounded-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-3 cursor-pointer group"
            >
              <Play className="w-5 h-5 fill-current group-hover:scale-110 transition-transform" />
              <span>INITIALIZE COMBAT SIMULATION</span>
            </button>
          </div>

          {/* Right Column: Active Operative & Loadout Preview Card (5 Cols) */}
          <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Ambient accent glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                ACTIVE CONFIGURATION
              </span>
              <span className="text-xs font-mono text-slate-400">{progression.selectedTitle}</span>
            </div>

            {/* Operative Card */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-xl text-slate-100">{activeChar.name}</h3>
                  <span className="text-xs text-slate-400 font-mono">{activeChar.callsign}</span>
                </div>
                <button
                  onClick={() => setShowCharacterModal(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  Change
                </button>
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-cyan-400" /> {activeChar.baseShield} Shield
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-sky-400" /> {activeChar.speedMultiplier}x Speed
                </span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400">{activeChar.role}</span>
              </div>
            </div>

            {/* Weapon Card */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 mb-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-base text-slate-100">{activeWeapon.name}</h4>
                  <span className="text-xs text-slate-400 font-mono uppercase">
                    {activeWeapon.category} RIFLE
                  </span>
                </div>
                <button
                  onClick={() => setShowLoadoutModal(true)}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 rounded-lg transition-colors cursor-pointer"
                >
                  Armory
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs font-mono bg-slate-900/60 p-2 rounded-xl">
                <div>
                  <span className="text-slate-500 block text-[10px]">DAMAGE</span>
                  <span className="font-bold text-slate-200">{activeWeapon.damage}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">RATE</span>
                  <span className="font-bold text-slate-200">{activeWeapon.fireRate} rps</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">MAGAZINE</span>
                  <span className="font-bold text-slate-200">{activeWeapon.magazineSize}</span>
                </div>
              </div>
            </div>

            {/* Tactical Gear */}
            <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800/80 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-slate-300 font-semibold">
                  {loadout.tacticalId === 'stim' ? 'Nano Stim Booster' : 'Concussive EMP Grenade'}
                </span>
              </div>
              <span className="text-slate-500 font-mono text-[10px]">TACTICAL [G]</span>
            </div>

            {/* XP Level Progress Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>OPERATIVE PROGRESSION</span>
                <span>
                  {progression.xp} / {progression.xpToNextLevel} XP
                </span>
              </div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-cyan-400"
                  style={{
                    width: `${Math.min(100, (progression.xp / progression.xpToNextLevel) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 3. FOOTER */}
      <footer className="relative z-10 px-8 py-4 border-t border-slate-800/60 text-xs text-slate-500 flex items-center justify-between">
        <div>Apex Arena: Cyberstrike 3D · Original Competitive Shooter Simulation</div>
        <div className="flex items-center gap-4">
          <span>WASD to Move</span>
          <span>·</span>
          <span>Mouse to Aim & Fire</span>
          <span>·</span>
          <span>Shift to Sprint</span>
          <span>·</span>
          <span>Space to Jump</span>
        </div>
      </footer>

      {/* MODALS */}
      {showCharacterModal && (
        <CharacterSelectionModal
          loadout={loadout}
          onUpdateLoadout={onUpdateLoadout}
          onClose={() => setShowCharacterModal(false)}
          progression={progression}
          onProgressionUpdated={onProgressionUpdated}
        />
      )}

      {showLoadoutModal && (
        <LoadoutModal
          loadout={loadout}
          onUpdateLoadout={onUpdateLoadout}
          onClose={() => setShowLoadoutModal(false)}
          progression={progression}
          onProgressionUpdated={onProgressionUpdated}
        />
      )}

      {showSettingsModal && (
        <SettingsModal
          settings={graphicsSettings}
          onUpdateSettings={onUpdateGraphicsSettings}
          onClose={() => setShowSettingsModal(false)}
        />
      )}

      {/* Career Dossier Modal */}
      {showCareerModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-slate-100 text-lg">CAREER DOSSIER</h3>
              </div>
              <button
                onClick={() => setShowCareerModal(false)}
                className="text-slate-400 hover:text-slate-100 text-xs font-mono cursor-pointer"
              >
                [CLOSE]
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-6">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">MATCHES WON</span>
                <span className="text-xl font-bold font-mono text-slate-100 block mt-1">
                  {progression.careerStats.matchesWon} / {progression.careerStats.matchesPlayed}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">TOTAL ELIMINATIONS</span>
                <span className="text-xl font-bold font-mono text-cyan-400 block mt-1">
                  {progression.careerStats.totalKills}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">DAMAGE INFLICTED</span>
                <span className="text-xl font-bold font-mono text-amber-400 block mt-1">
                  {progression.careerStats.totalDamage}
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] font-mono text-slate-500 uppercase">HEADSHOT CRITICALS</span>
                <span className="text-xl font-bold font-mono text-red-400 block mt-1">
                  {progression.careerStats.headshots}
                </span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowCareerModal(false)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Controls Modal */}
      {showControlsModal && (
        <ControlsModal onClose={() => setShowControlsModal(false)} />
      )}
    </div>
  );
};
