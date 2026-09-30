import React from 'react';
import { CombatantState, Team } from '../game/types';
import { MatchSimulator } from '../game/network/MatchSimulator';
import { Trophy, X } from 'lucide-react';

interface ScoreboardModalProps {
  matchSim: MatchSimulator;
  onClose?: () => void;
  isGameOver?: boolean;
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  matchSim,
  onClose,
  isGameOver = false,
}) => {
  const combatants = matchSim.getCombatantList();
  const mode = matchSim.settings.mode;

  const alphaTeam = combatants
    .filter((c) => c.team === 'alpha')
    .sort((a, b) => b.score - a.score);

  const omegaTeam = combatants
    .filter((c) => c.team === 'omega')
    .sort((a, b) => b.score - a.score);

  const ffaList = [...combatants].sort((a, b) => b.kills - a.kills || b.score - a.score);

  const renderCombatantRow = (c: CombatantState, rank: number) => {
    const accuracy = c.shotsFired > 0 ? Math.round((c.shotsHit / c.shotsFired) * 100) : 0;
    return (
      <tr
        key={c.id}
        className={`border-b border-slate-800/60 ${
          c.isPlayer ? 'bg-cyan-950/40 text-cyan-200' : 'text-slate-300'
        } hover:bg-slate-800/30 transition-colors`}
      >
        <td className="py-2.5 px-3 font-mono text-xs text-slate-500 tabular-nums">#{rank}</td>
        <td className="py-2.5 px-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{c.name}</span>
            {c.isPlayer && (
              <span className="text-[10px] text-cyan-400 font-mono">YOU</span>
            )}
          </div>
        </td>
        <td className="py-2.5 px-3 font-mono text-sm font-bold text-slate-100 tabular-nums text-center">
          {c.kills}
        </td>
        <td className="py-2.5 px-3 font-mono text-sm text-slate-400 tabular-nums text-center">
          {c.deaths}
        </td>
        <td className="py-2.5 px-3 font-mono text-sm text-slate-400 tabular-nums text-center">
          {c.assists}
        </td>
        <td className="py-2.5 px-3 font-mono text-sm text-slate-300 tabular-nums text-center">
          {c.damageDealt}
        </td>
        <td className="py-2.5 px-3 font-mono text-sm text-slate-400 tabular-nums text-center">
          {accuracy}%
        </td>
        <td className="py-2.5 px-3 font-mono text-sm font-bold text-amber-400 tabular-nums text-right">
          {c.score}
        </td>
      </tr>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
              {isGameOver ? 'FINAL MATCH SCOREBOARD' : 'TACTICAL SCOREBOARD'}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {mode === 'ffa' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase">
                    <th className="py-2 px-3">Rank</th>
                    <th className="py-2 px-3">Operative</th>
                    <th className="py-2 px-3 text-center">Kills</th>
                    <th className="py-2 px-3 text-center">Deaths</th>
                    <th className="py-2 px-3 text-center">Assists</th>
                    <th className="py-2 px-3 text-center">Damage</th>
                    <th className="py-2 px-3 text-center">Accuracy</th>
                    <th className="py-2 px-3 text-right">Score</th>
                  </tr>
                </thead>
                <tbody>{ffaList.map((c, idx) => renderCombatantRow(c, idx + 1))}</tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Alpha Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-sky-500" />
                    <h3 className="font-bold text-sky-400 text-base">ALPHA SYNDICATE</h3>
                  </div>
                  <span className="font-mono font-bold text-sky-400 text-lg tabular-nums">
                    {Math.round(matchSim.matchState.alphaScore)} PTS
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase">
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Operative</th>
                        <th className="py-2 px-3 text-center">Kills</th>
                        <th className="py-2 px-3 text-center">Deaths</th>
                        <th className="py-2 px-3 text-center">Assists</th>
                        <th className="py-2 px-3 text-center">Damage</th>
                        <th className="py-2 px-3 text-center">Accuracy</th>
                        <th className="py-2 px-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>{alphaTeam.map((c, idx) => renderCombatantRow(c, idx + 1))}</tbody>
                  </table>
                </div>
              </div>

              {/* Omega Team */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    <h3 className="font-bold text-orange-400 text-base">OMEGA VANGUARD</h3>
                  </div>
                  <span className="font-mono font-bold text-orange-400 text-lg tabular-nums">
                    {Math.round(matchSim.matchState.omegaScore)} PTS
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-mono text-xs uppercase">
                        <th className="py-2 px-3">Rank</th>
                        <th className="py-2 px-3">Operative</th>
                        <th className="py-2 px-3 text-center">Kills</th>
                        <th className="py-2 px-3 text-center">Deaths</th>
                        <th className="py-2 px-3 text-center">Assists</th>
                        <th className="py-2 px-3 text-center">Damage</th>
                        <th className="py-2 px-3 text-center">Accuracy</th>
                        <th className="py-2 px-3 text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody>{omegaTeam.map((c, idx) => renderCombatantRow(c, idx + 1))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {onClose && (
          <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Close Scoreboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
