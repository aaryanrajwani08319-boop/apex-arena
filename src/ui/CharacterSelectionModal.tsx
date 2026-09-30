import React, { useState } from 'react';
import { CHARACTER_REGISTRY } from '../game/characters/CharacterRegistry';
import { CharacterDef, CharacterSkin, Loadout, PlayerProgression } from '../game/types';
import { ProgressionManager } from '../game/progression/ProgressionManager';
import { soundManager } from '../game/audio/AudioSynthesizer';
import { Shield, Heart, Zap, Check, Lock, X } from 'lucide-react';

interface CharacterSelectionModalProps {
  loadout: Loadout;
  onUpdateLoadout: (newLoadout: Loadout) => void;
  onClose: () => void;
  progression: PlayerProgression;
  onProgressionUpdated: () => void;
}

export const CharacterSelectionModal: React.FC<CharacterSelectionModalProps> = ({
  loadout,
  onUpdateLoadout,
  onClose,
  progression,
  onProgressionUpdated,
}) => {
  const characters = Object.values(CHARACTER_REGISTRY);
  const [selectedCharId, setSelectedCharId] = useState(loadout.characterId);
  const [selectedSkinId, setSelectedSkinId] = useState(loadout.characterSkinId);

  const selectedChar = CHARACTER_REGISTRY[selectedCharId] || characters[0];
  const progressionMgr = ProgressionManager.getInstance();

  const handleSelectChar = (c: CharacterDef) => {
    setSelectedCharId(c.id);
    setSelectedSkinId(c.skins[0].id);
    soundManager.playButtonClick();
  };

  const handleEquip = () => {
    onUpdateLoadout({
      ...loadout,
      characterId: selectedCharId,
      characterSkinId: selectedSkinId,
    });
    soundManager.playButtonClick();
    onClose();
  };

  const handleBuySkin = (skin: CharacterSkin) => {
    if (progressionMgr.purchaseSkin(skin.id, skin.priceCredits)) {
      setSelectedSkinId(skin.id);
      onProgressionUpdated();
      soundManager.playButtonClick();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
              OPERATIVE SELECTION
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select your combat chassis and tactical armor profile.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-lg border border-amber-500/20">
              CREDITS: {progression.credits}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Character Roster List */}
          <div className="space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              ROSTER
            </span>
            {characters.map((c) => {
              const isSelected = c.id === selectedCharId;
              const isEquipped = c.id === loadout.characterId;
              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectChar(c)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{c.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">{c.callsign}</span>
                    </div>
                    {isEquipped && (
                      <span className="text-[10px] text-cyan-400 font-mono font-semibold">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span>{c.role}</span>
                    <span>·</span>
                    <span>{c.baseHealth} HP</span>
                    <span>·</span>
                    <span>{c.baseShield} Shield</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Character Detailed Inspection & Stats */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    {selectedChar.role} CLASS
                  </span>
                  <h3 className="text-2xl font-bold font-display text-slate-100">
                    {selectedChar.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    {selectedChar.description}
                  </p>
                </div>
              </div>

              {/* Stat Ratings */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5" /> BASE HEALTH
                    </span>
                    <span className="font-bold">{selectedChar.baseHealth}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${(selectedChar.baseHealth / 150) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-cyan-400">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" /> BASE SHIELD
                    </span>
                    <span className="font-bold">{selectedChar.baseShield}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400"
                      style={{ width: `${(selectedChar.baseShield / 150) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-sky-400">
                    <span className="flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5" /> SPRINT SPEED
                    </span>
                    <span className="font-bold">{selectedChar.speedMultiplier}x</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${(selectedChar.speedMultiplier / 1.3) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-purple-400">
                    <span>VERTICAL MOBILITY</span>
                    <span className="font-bold">{selectedChar.jumpMultiplier}x</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400"
                      style={{ width: `${(selectedChar.jumpMultiplier / 1.3) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Skins Customization */}
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-3">
                CHASSIS SKINS
              </span>
              <div className="grid grid-cols-3 gap-3">
                {selectedChar.skins.map((skin) => {
                  const isUnlocked = progression.unlockedSkinIds.includes(skin.id) || skin.priceCredits === 0;
                  const isSelected = skin.id === selectedSkinId;
                  const canAfford = progression.credits >= skin.priceCredits;

                  return (
                    <div
                      key={skin.id}
                      onClick={() => {
                        if (isUnlocked) setSelectedSkinId(skin.id);
                      }}
                      className={`p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'bg-slate-800 border-cyan-400'
                          : 'bg-slate-950/60 border-slate-800'
                      } ${isUnlocked ? 'cursor-pointer hover:border-slate-700' : 'opacity-70'}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-slate-200">{skin.name}</span>
                        {isUnlocked ? (
                          isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{ backgroundColor: skin.primaryColor }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{ backgroundColor: skin.accentColor }}
                        />
                      </div>

                      {!isUnlocked && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuySkin(skin);
                          }}
                          disabled={!canAfford}
                          className={`w-full py-1.5 text-[11px] font-mono rounded-lg transition-colors ${
                            canAfford
                              ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          BUY {skin.priceCredits} CR
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Equip Button */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleEquip}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Equip Operative & Chassis
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
