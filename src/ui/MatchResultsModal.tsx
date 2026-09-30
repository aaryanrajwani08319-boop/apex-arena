import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { CombatantState, Team } from '../game/types';
import { MatchSimulator } from '../game/network/MatchSimulator';
import { ProgressionManager } from '../game/progression/ProgressionManager';
import { ScoreboardModal } from './ScoreboardModal';
import { Trophy, Award, ArrowRight, RotateCcw, ShieldCheck } from 'lucide-react';

interface MatchResultsModalProps {
  player: CombatantState;
  matchSim: MatchSimulator;
  isVictory: boolean;
  onPlayAgain: () => void;
  onReturnToLobby: () => void;
}

export const MatchResultsModal: React.FC<MatchResultsModalProps> = ({
  player,
  matchSim,
  isVictory,
  onPlayAgain,
  onReturnToLobby,
}) => {
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [xpResult, setXpResult] = useState<{
    xpGained: number;
    creditsGained: number;
    leveledUp: boolean;
    newUnlocks: string[];
  } | null>(null);

  useEffect(() => {
    if (isVictory) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    }

    // Award progression
    const progressionMgr = ProgressionManager.getInstance();
    const duration = matchSim.settings.timeLimitSeconds - matchSim.matchState.timeRemaining;
    const result = progressionMgr.addMatchResults(
      isVictory,
      player.kills,
      player.deaths,
      player.assists,
      player.damageDealt,
      player.headshots,
      duration
    );
    setXpResult(result);
  }, []);

  const accuracy = player.shotsFired > 0 ? Math.round((player.shotsHit / player.shotsFired) * 100) : 0;
  const kdRatio = player.deaths > 0 ? (player.kills / player.deaths).toFixed(2) : player.kills.toString();

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl p-8 flex flex-col items-center shadow-2xl relative overflow-hidden">
        {/* Glow ambient background */}
        <div
          className={`absolute -top-32 w-72 h-72 rounded-full blur-3xl pointer-events-none ${
            isVictory ? 'bg-amber-500/20' : 'bg-red-500/15'
          }`}
        />

        {/* Victory / Defeat Title */}
        <div className="flex flex-col items-center mb-6">
          <div
            className={`p-3 rounded-2xl mb-3 ${
              isVictory ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
            }`}
          >
            {isVictory ? <Trophy className="w-10 h-10" /> : <Award className="w-10 h-10" />}
          </div>
          <h1
            className={`text-4xl font-extrabold font-display tracking-wider ${
              isVictory ? 'text-amber-400' : 'text-red-400'
            }`}
          >
            {isVictory ? 'VICTORY SECURED' : 'MISSION COMPROMISED'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {isVictory
              ? 'Your squad dominated the arena combat grid.'
              : 'Regroup and rearm for the next engagement.'}
          </p>
        </div>

        {/* Combat Performance Grid */}
        <div className="grid grid-cols-4 gap-3 w-full bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 mb-6 text-center">
          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-slate-500 uppercase">K / D / A</span>
            <span className="text-lg font-bold font-mono text-slate-100 tabular-nums">
              {player.kills}/{player.deaths}/{player.assists}
            </span>
            <span className="text-[10px] text-slate-400">Ratio: {kdRatio}</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Damage</span>
            <span className="text-lg font-bold font-mono text-slate-100 tabular-nums">
              {player.damageDealt}
            </span>
            <span className="text-[10px] text-slate-400">Total Dealt</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Accuracy</span>
            <span className="text-lg font-bold font-mono text-slate-100 tabular-nums">
              {accuracy}%
            </span>
            <span className="text-[10px] text-slate-400">{player.headshots} Crits</span>
          </div>

          <div className="flex flex-col">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Score</span>
            <span className="text-lg font-bold font-mono text-amber-400 tabular-nums">
              {player.score}
            </span>
            <span className="text-[10px] text-slate-400">PTS</span>
          </div>
        </div>

        {/* Progression & Rewards Card */}
        {xpResult && (
          <div className="w-full bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 mb-6">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" /> REWARDS EARNED
              </span>
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 font-bold">+{xpResult.xpGained} XP</span>
                <span className="text-amber-400 font-bold">+{xpResult.creditsGained} Credits</span>
              </div>
            </div>

            {xpResult.leveledUp && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mt-2 text-center">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  LEVEL UP!
                </span>
                {xpResult.newUnlocks.length > 0 && (
                  <p className="text-xs text-slate-200 mt-1">
                    Unlocked: {xpResult.newUnlocks.join(', ')}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center justify-between w-full gap-3">
          <button
            onClick={() => setShowScoreboard(true)}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors cursor-pointer"
          >
            View Scoreboard
          </button>
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" /> Rematch
          </button>
          <button
            onClick={onReturnToLobby}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            Lobby <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showScoreboard && (
        <ScoreboardModal
          matchSim={matchSim}
          onClose={() => setShowScoreboard(false)}
          isGameOver={true}
        />
      )}
    </div>
  );
};
