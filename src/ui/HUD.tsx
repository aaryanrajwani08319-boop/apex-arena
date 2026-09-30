import React, { useEffect, useState, useRef } from 'react';
import {
  CombatantState,
  HitEffect,
  KillFeedEntry,
  MatchState,
  WeaponDef,
} from '../game/types';
import { MatchSimulator } from '../game/network/MatchSimulator';
import { WEAPON_REGISTRY } from '../game/weapons/WeaponRegistry';
import { CHARACTER_REGISTRY } from '../game/characters/CharacterRegistry';
import {
  Shield,
  Heart,
  Crosshair,
  Flame,
  Zap,
  Repeat,
  Radio,
  Sparkles,
} from 'lucide-react';

interface HUDProps {
  player: CombatantState;
  matchSim: MatchSimulator;
  hitEffect: HitEffect | null;
  isPointerLocked: boolean;
  onRequestPointerLock: () => void;
  onOpenPause: () => void;
  // Mobile touch callbacks
  onTouchLook: (dx: number, dy: number) => void;
  onTouchMove: (x: number, y: number) => void;
  onTouchFire: (isFiring: boolean) => void;
  onTouchADS: () => void;
  onTouchJump: () => void;
  onTouchReload: () => void;
  onSwitchWeapon: () => void;
  onThrowTactical: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  player,
  matchSim,
  hitEffect,
  isPointerLocked,
  onRequestPointerLock,
  onOpenPause,
  onTouchLook,
  onTouchMove,
  onTouchFire,
  onTouchADS,
  onTouchJump,
  onTouchReload,
  onSwitchWeapon,
  onThrowTactical,
}) => {
  const [showHitMarker, setShowHitMarker] = useState(false);
  const [isCritHit, setIsCritHit] = useState(false);
  const [damageVignette, setDamageVignette] = useState(false);
  const prevHealthRef = useRef(player.health);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Virtual Joypad state
  const joypadTouchId = useRef<number | null>(null);
  const joypadOrigin = useRef({ x: 0, y: 0 });
  const [joypadKnob, setJoypadKnob] = useState({ x: 0, y: 0 });

  // Touch Look Swipe state
  const lookTouchId = useRef<number | null>(null);
  const lastLookPos = useRef({ x: 0, y: 0 });

  // Detect touch devices
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // Hit marker visual trigger
  useEffect(() => {
    if (hitEffect && Date.now() - hitEffect.timestamp < 250) {
      setShowHitMarker(true);
      setIsCritHit(hitEffect.isHeadshot);
      const timer = setTimeout(() => setShowHitMarker(false), 160);
      return () => clearTimeout(timer);
    }
  }, [hitEffect]);

  // Damage vignette trigger
  useEffect(() => {
    if (player.health < prevHealthRef.current) {
      setDamageVignette(true);
      const timer = setTimeout(() => setDamageVignette(false), 350);
      prevHealthRef.current = player.health;
      return () => clearTimeout(timer);
    }
    prevHealthRef.current = player.health;
  }, [player.health]);

  const currentWeapon = WEAPON_REGISTRY[player.currentWeaponId] || WEAPON_REGISTRY.pulse_carbine;
  const charDef = CHARACTER_REGISTRY[player.characterId] || CHARACTER_REGISTRY.kaelen_voss;
  const matchState = matchSim.matchState;
  const mode = matchSim.settings.mode;

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Joypad Touch Handlers
  const handleJoypadStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    joypadTouchId.current = touch.identifier;
    joypadOrigin.current = { x: touch.clientX, y: touch.clientY };
    setJoypadKnob({ x: 0, y: 0 });
  };

  const handleJoypadMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joypadTouchId.current) {
        const dx = touch.clientX - joypadOrigin.current.x;
        const dy = touch.clientY - joypadOrigin.current.y;
        const dist = Math.hypot(dx, dy);
        const maxDist = 45;
        const clampedDist = Math.min(dist, maxDist);
        const angle = Math.atan2(dy, dx);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;
        setJoypadKnob({ x: knobX, y: knobY });

        // Normalize -1 to 1
        onTouchMove(knobX / maxDist, knobY / maxDist);
      }
    }
  };

  const handleJoypadEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === joypadTouchId.current) {
        joypadTouchId.current = null;
        setJoypadKnob({ x: 0, y: 0 });
        onTouchMove(0, 0);
      }
    }
  };

  // Look Swipe Handlers
  const handleLookStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    lookTouchId.current = touch.identifier;
    lastLookPos.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleLookMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        const dx = touch.clientX - lastLookPos.current.x;
        const dy = touch.clientY - lastLookPos.current.y;
        lastLookPos.current = { x: touch.clientX, y: touch.clientY };
        onTouchLook(dx, dy);
      }
    }
  };

  const handleLookEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchId.current) {
        lookTouchId.current = null;
      }
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
      {/* 1. Red Damage Flash Vignette */}
      {damageVignette && (
        <div className="absolute inset-0 bg-radial from-transparent via-red-600/20 to-red-700/60 pointer-events-none animate-damage" />
      )}

      {/* 2. MATCH TOP HEADER BAR (Score, Objective & Time) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-950/70 backdrop-blur-md px-6 py-2.5 rounded-xl border border-slate-800 shadow-xl pointer-events-auto">
        {mode === 'tdm' && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sky-400">
              <span className="text-xs uppercase tracking-wider font-semibold">Alpha</span>
              <span className="font-mono text-2xl font-bold tabular-nums">
                {Math.round(matchState.alphaScore)}
              </span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 font-mono tracking-widest">
                {formatTime(matchState.timeRemaining)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                LIMIT: {matchSim.settings.scoreLimit}
              </span>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <span className="font-mono text-2xl font-bold tabular-nums">
                {Math.round(matchState.omegaScore)}
              </span>
              <span className="text-xs uppercase tracking-wider font-semibold">Omega</span>
            </div>
          </div>
        )}

        {mode === 'zone' && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sky-400">
              <span className="text-xs uppercase font-semibold">Alpha</span>
              <span className="font-mono text-xl font-bold tabular-nums">
                {Math.round(matchState.alphaScore)}
              </span>
            </div>
            {/* Zone Control Bar */}
            <div className="w-36 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-[10px] text-slate-400 mb-1">
                <span>CENTER ZONE</span>
                <span className="font-mono">{formatTime(matchState.timeRemaining)}</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-sky-500 transition-all"
                  style={{ width: `${Math.max(0, -matchState.zoneProgress)}%` }}
                />
                <div
                  className="h-full bg-orange-500 transition-all ml-auto"
                  style={{ width: `${Math.max(0, matchState.zoneProgress)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 text-orange-400">
              <span className="font-mono text-xl font-bold tabular-nums">
                {Math.round(matchState.omegaScore)}
              </span>
              <span className="text-xs uppercase font-semibold">Omega</span>
            </div>
          </div>
        )}

        {mode === 'ffa' && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sky-400">
              <span className="text-xs uppercase font-semibold">Kills</span>
              <span className="font-mono text-2xl font-bold tabular-nums">{player.kills}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-xs text-slate-400 font-mono tracking-widest">
                {formatTime(matchState.timeRemaining)}
              </span>
              <span className="text-[10px] text-slate-500 font-mono uppercase">
                TARGET: {matchSim.settings.scoreLimit}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. TOP RIGHT KILL FEED */}
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1.5 max-w-xs">
        {matchSim.killFeed.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950/75 backdrop-blur-md rounded border border-slate-800 text-xs font-mono animate-fadeIn"
          >
            <span
              className={
                entry.killerTeam === 'alpha'
                  ? 'text-sky-400 font-semibold'
                  : entry.killerTeam === 'omega'
                  ? 'text-orange-400 font-semibold'
                  : 'text-slate-300 font-semibold'
              }
            >
              {entry.killerName}
            </span>
            <span className="text-slate-400 text-[10px]">[{entry.weaponName}]</span>
            {entry.isHeadshot && <span className="text-red-400 text-[10px]">CRIT</span>}
            <span
              className={
                entry.victimTeam === 'alpha'
                  ? 'text-sky-400'
                  : entry.victimTeam === 'omega'
                  ? 'text-orange-400'
                  : 'text-slate-300'
              }
            >
              {entry.victimName}
            </span>
          </div>
        ))}
      </div>

      {/* 4. FLOATING CENTER CROSSHAIR */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        {/* Dynamic Crosshair Reticle */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          {/* North, South, East, West lines */}
          <div className="absolute top-0 w-0.5 h-2 bg-cyan-400/80" />
          <div className="absolute bottom-0 w-0.5 h-2 bg-cyan-400/80" />
          <div className="absolute left-0 w-2 h-0.5 bg-cyan-400/80" />
          <div className="absolute right-0 w-2 h-0.5 bg-cyan-400/80" />

          {/* Hit Marker 'X' Overlay */}
          {showHitMarker && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className={`w-6 h-6 border-2 transform rotate-45 ${
                  isCritHit ? 'border-red-500 scale-125' : 'border-sky-400 scale-110'
                } transition-transform`}
              />
            </div>
          )}
        </div>
      </div>

      {/* 5. BOTTOM LEFT STATUS (Health, Shield, Hero Callout) */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-2 bg-slate-950/70 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-xl max-w-xs pointer-events-auto">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-semibold">{charDef.name}</span>
          <span className="text-slate-500 font-mono uppercase text-[10px]">{charDef.role}</span>
        </div>

        {/* Shield Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono text-cyan-400">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> SHIELD
            </span>
            <span className="tabular-nums font-bold">
              {Math.round(player.shield)} / {player.maxShield}
            </span>
          </div>
          <div className="w-56 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${(player.shield / player.maxShield) * 100}%` }}
            />
          </div>
        </div>

        {/* Health Bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between text-xs font-mono text-emerald-400">
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> HEALTH
            </span>
            <span className="tabular-nums font-bold">
              {Math.round(player.health)} / {player.maxHealth}
            </span>
          </div>
          <div className="w-56 h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-150 ${
                player.health < 35 ? 'bg-red-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${(player.health / player.maxHealth) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* 6. BOTTOM RIGHT WEAPON STATUS & AMMO */}
      <div className="absolute bottom-6 right-6 flex items-end gap-4 pointer-events-auto">
        {/* Tactical Ability Slot */}
        <button
          onClick={onThrowTactical}
          className="relative flex flex-col items-center justify-center w-14 h-14 bg-slate-950/70 backdrop-blur-md rounded-xl border border-slate-800 hover:border-cyan-400/60 transition-colors cursor-pointer group"
        >
          <Sparkles className="w-6 h-6 text-cyan-400" />
          <span className="text-[9px] font-mono text-slate-400 mt-0.5">[G] STIM</span>
          {player.tacticalCooldown > 0 && (
            <div className="absolute inset-0 bg-slate-950/80 rounded-xl flex items-center justify-center">
              <span className="font-mono text-xs font-bold text-amber-400">
                {Math.ceil(player.tacticalCooldown)}s
              </span>
            </div>
          )}
        </button>

        {/* Weapon Ammo Module */}
        <div className="flex flex-col items-end bg-slate-950/70 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-xl min-w-[200px]">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-slate-400 uppercase font-mono">{currentWeapon.category}</span>
            <span className="text-sm font-bold text-slate-100">{currentWeapon.name}</span>
          </div>

          {/* Ammo readout */}
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold font-mono text-slate-50 tabular-nums">
              {player.ammoInMag}
            </span>
            <span className="text-slate-500 font-mono text-sm">/ {player.reserveAmmo}</span>
          </div>

          {/* Reload Progress bar */}
          {player.isReloading && (
            <div className="w-full mt-2">
              <div className="flex items-center justify-between text-[10px] text-amber-400 font-mono mb-0.5">
                <span>RELOADING...</span>
                <span>{Math.round(player.reloadProgress * 100)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 transition-all"
                  style={{ width: `${player.reloadProgress * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Weapon Switcher hint */}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono w-full justify-between">
            <span>[1/2] SWAP</span>
            <span>[R] RELOAD</span>
          </div>
        </div>
      </div>

      {/* 7. PAUSE BUTTON & CONTROLS HELP (TOP LEFT) */}
      <div className="absolute top-4 left-4 flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onOpenPause}
          className="px-3 py-1.5 bg-slate-950/70 backdrop-blur-md hover:bg-slate-800 text-xs font-mono text-slate-300 rounded-lg border border-slate-800 transition-colors cursor-pointer"
        >
          [ESC] MENU
        </button>
      </div>

      {/* 8. DESKTOP POINTER LOCK OVERLAY NOTICE */}
      {!isPointerLocked && !isTouchDevice && matchState.status === 'in_progress' && player.isAlive && (
        <div
          onClick={onRequestPointerLock}
          className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs flex flex-col items-center justify-center cursor-pointer pointer-events-auto z-20"
        >
          <div className="bg-slate-900/90 border border-cyan-500/40 p-6 rounded-2xl max-w-sm text-center shadow-2xl animate-pulse-subtle">
            <Crosshair className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold font-display text-slate-100 mb-1">CLICK TO ENGAGE</h2>
            <p className="text-xs text-slate-400 mb-4">
              Mouse locks look control. WASD to move, Left Click to fire, Right Click to zoom, R to reload.
            </p>
            <div className="inline-block px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-400">
              LOCK CONTROLS & FIRE
            </div>
          </div>
        </div>
      )}

      {/* 9. MATCH COUNTDOWN 3.. 2.. 1.. GO */}
      {matchState.status === 'countdown' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/50 backdrop-blur-xs z-30">
          <span className="text-xs text-cyan-400 uppercase tracking-widest font-mono mb-2">
            INITIALIZING COMBAT GRID
          </span>
          <span className="text-7xl font-bold font-display text-white tabular-nums drop-shadow-[0_0_20px_rgba(56,189,248,0.6)]">
            {Math.ceil(matchState.countdown) || 'ENGAGE!'}
          </span>
        </div>
      )}

      {/* 10. ELIMINATED / RESPAWN SCREEN */}
      {!player.isAlive && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-sm z-30">
          <span className="text-xs text-red-400 uppercase tracking-widest font-mono mb-1">
            CRITICAL SYSTEM FAILURE
          </span>
          <h2 className="text-3xl font-bold font-display text-white mb-3">ELIMINATED</h2>
          <div className="flex items-center gap-2 text-slate-300 font-mono text-sm">
            <span>RESPAWN IN</span>
            <span className="text-xl font-bold text-cyan-400 tabular-nums">
              {Math.max(1, Math.ceil(player.respawnTimeRemaining))}s
            </span>
          </div>
        </div>
      )}

      {/* 11. MOBILE TOUCH VIRTUAL JOYPAD & CONTROLS */}
      {isTouchDevice && matchState.status === 'in_progress' && (
        <div className="absolute inset-0 pointer-events-auto z-10">
          {/* Left Touch Joystick Zone */}
          <div
            className="absolute bottom-6 left-6 w-36 h-36 rounded-full bg-slate-900/50 border border-slate-700/60 flex items-center justify-center touch-none"
            onTouchStart={handleJoypadStart}
            onTouchMove={handleJoypadMove}
            onTouchEnd={handleJoypadEnd}
          >
            <div
              className="w-14 h-14 rounded-full bg-cyan-500/80 shadow-[0_0_12px_rgba(6,182,212,0.6)] transform transition-transform duration-75"
              style={{ transform: `translate(${joypadKnob.x}px, ${joypadKnob.y}px)` }}
            />
          </div>

          {/* Right Swipe Look Zone */}
          <div
            className="absolute top-20 right-0 w-1/2 h-2/3 touch-none"
            onTouchStart={handleLookStart}
            onTouchMove={handleLookMove}
            onTouchEnd={handleLookEnd}
          />

          {/* Right Touch Action Buttons */}
          <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3 pointer-events-auto">
            <div className="flex items-center gap-3">
              {/* ADS Button */}
              <button
                onTouchStart={onTouchADS}
                className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center text-xs font-mono text-cyan-300 shadow-lg active:scale-95"
              >
                ADS
              </button>
              {/* Jump Button */}
              <button
                onTouchStart={onTouchJump}
                className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center text-xs font-mono text-white shadow-lg active:scale-95"
              >
                JUMP
              </button>
            </div>

            <div className="flex items-center gap-3">
              {/* Reload Button */}
              <button
                onTouchStart={onTouchReload}
                className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-600 flex items-center justify-center text-xs font-mono text-amber-300 shadow-lg active:scale-95"
              >
                <Repeat className="w-5 h-5" />
              </button>
              {/* Fire Button */}
              <button
                onTouchStart={() => onTouchFire(true)}
                onTouchEnd={() => onTouchFire(false)}
                className="w-20 h-20 rounded-full bg-red-600/90 border-2 border-red-400 flex items-center justify-center font-bold text-white shadow-[0_0_16px_rgba(239,68,68,0.6)] active:scale-95"
              >
                FIRE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
