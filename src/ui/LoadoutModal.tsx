import React, { useState } from 'react';
import { WEAPON_REGISTRY, WEAPON_SKINS } from '../game/weapons/WeaponRegistry';
import { Loadout, PlayerProgression, WeaponDef } from '../game/types';
import { ProgressionManager } from '../game/progression/ProgressionManager';
import { soundManager } from '../game/audio/AudioSynthesizer';
import { Crosshair, Zap, Shield, Sparkles, Check, Lock, X } from 'lucide-react';

interface LoadoutModalProps {
  loadout: Loadout;
  onUpdateLoadout: (newLoadout: Loadout) => void;
  onClose: () => void;
  progression: PlayerProgression;
  onProgressionUpdated: () => void;
}

export const LoadoutModal: React.FC<LoadoutModalProps> = ({
  loadout,
  onUpdateLoadout,
  onClose,
  progression,
  onProgressionUpdated,
}) => {
  const [selectedPrimary, setSelectedPrimary] = useState(loadout.primaryWeaponId);
  const [selectedTactical, setSelectedTactical] = useState(loadout.tacticalId);
  const [selectedWeaponSkin, setSelectedWeaponSkin] = useState(loadout.weaponSkinId);

  const primaryWeapons = Object.values(WEAPON_REGISTRY).filter((w) => w.category !== 'sidearm');
  const activeWeapon = WEAPON_REGISTRY[selectedPrimary] || primaryWeapons[0];
  const progressionMgr = ProgressionManager.getInstance();

  const handleEquipLoadout = () => {
    onUpdateLoadout({
      ...loadout,
      primaryWeaponId: selectedPrimary,
      tacticalId: selectedTactical,
      weaponSkinId: selectedWeaponSkin,
    });
    soundManager.playButtonClick();
    onClose();
  };

  const handleBuySkin = (skin: typeof WEAPON_SKINS[0]) => {
    if (progressionMgr.purchaseSkin(skin.id, skin.price)) {
      setSelectedWeaponSkin(skin.id);
      onProgressionUpdated();
      soundManager.playButtonClick();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
          <div>
            <h2 className="text-xl font-bold font-display text-slate-100 tracking-wide">
              ARMORY & LOADOUT CONFIG
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tune your primary energy weapon, secondary sidearm, and tactical utility.
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

        {/* Body */}
        <div className="p-8 overflow-y-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Primary Weapon List */}
          <div className="space-y-3">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-2">
              PRIMARY WEAPONS
            </span>
            {primaryWeapons.map((wpn) => {
              const isUnlocked = progression.unlockedWeaponIds.includes(wpn.id);
              const isSelected = wpn.id === selectedPrimary;

              return (
                <div
                  key={wpn.id}
                  onClick={() => {
                    if (isUnlocked) {
                      setSelectedPrimary(wpn.id);
                      soundManager.playButtonClick();
                    }
                  }}
                  className={`p-4 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-slate-800 border-cyan-500 shadow-md'
                      : 'bg-slate-950/60 border-slate-800'
                  } ${isUnlocked ? 'cursor-pointer hover:border-slate-700' : 'opacity-60'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{wpn.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono uppercase">
                        {wpn.category}
                      </span>
                    </div>
                    {isUnlocked ? (
                      isSelected && <Check className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <span className="text-[10px] text-amber-400 font-mono">
                        LVL {wpn.unlockedAtLevel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 font-mono">
                    <span>{wpn.damage} DMG</span>
                    <span>·</span>
                    <span>{wpn.fireRate} RPS</span>
                    <span>·</span>
                    <span>{wpn.magazineSize} MAG</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Weapon Details & Statistics */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-950/60 p-6 rounded-2xl border border-slate-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider">
                    {activeWeapon.category} CLASS
                  </span>
                  <h3 className="text-2xl font-bold font-display text-slate-100">
                    {activeWeapon.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    {activeWeapon.description}
                  </p>
                </div>
              </div>

              {/* Stat Bars */}
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
                    <span>DAMAGE PER SHOT</span>
                    <span className="font-bold">{activeWeapon.damage}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-400"
                      style={{ width: `${(activeWeapon.damage / 100) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
                    <span>FIRE RATE</span>
                    <span className="font-bold">{activeWeapon.fireRate} rps</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400"
                      style={{ width: `${(activeWeapon.fireRate / 16) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
                    <span>EFFECTIVE RANGE</span>
                    <span className="font-bold">{activeWeapon.range}m</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-400"
                      style={{ width: `${(activeWeapon.range / 250) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono mb-1 text-slate-300">
                    <span>MAGAZINE SIZE</span>
                    <span className="font-bold">{activeWeapon.magazineSize} rounds</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${(activeWeapon.magazineSize / 50) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tactical Gear Selection */}
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-3">
                TACTICAL ABILITY
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div
                  onClick={() => {
                    setSelectedTactical('stim');
                    soundManager.playButtonClick();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTactical === 'stim'
                      ? 'bg-slate-800 border-cyan-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-cyan-400" /> Nano Stim Booster
                    </span>
                    {selectedTactical === 'stim' && (
                      <Check className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Instant nanite injection restoring 40 Health and 40 Shield. 15s cooldown.
                  </p>
                </div>

                <div
                  onClick={() => {
                    setSelectedTactical('emp');
                    soundManager.playButtonClick();
                  }}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedTactical === 'emp'
                      ? 'bg-slate-800 border-cyan-400'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" /> Concussive EMP Grenade
                    </span>
                    {selectedTactical === 'emp' && (
                      <Check className="w-4 h-4 text-cyan-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    High-yield explosive discharging 80 damage over 6m blast radius. 15s cooldown.
                  </p>
                </div>
              </div>
            </div>

            {/* Weapon Skins */}
            <div>
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block mb-3">
                WEAPON CAMOUFLAGE
              </span>
              <div className="grid grid-cols-3 gap-3">
                {WEAPON_SKINS.map((skin) => {
                  const isUnlocked = progression.unlockedSkinIds.includes(skin.id) || skin.price === 0;
                  const isSelected = skin.id === selectedWeaponSkin;
                  const canAfford = progression.credits >= skin.price;

                  return (
                    <div
                      key={skin.id}
                      onClick={() => {
                        if (isUnlocked) setSelectedWeaponSkin(skin.id);
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
                          style={{ backgroundColor: skin.primary }}
                        />
                        <div
                          className="w-4 h-4 rounded-full border border-slate-700"
                          style={{ backgroundColor: skin.accent }}
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
                          BUY {skin.price} CR
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
                onClick={handleEquipLoadout}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Confirm Loadout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
