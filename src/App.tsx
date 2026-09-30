import React, { useState, useEffect, useRef } from 'react';
import {
  CombatantState,
  GraphicsSettings,
  HitEffect,
  Loadout,
  MatchSettings,
  PlayerProgression,
  Team,
} from './game/types';
import { GameEngine } from './game/engine/GameEngine';
import { MatchSimulator } from './game/network/MatchSimulator';
import { ProgressionManager } from './game/progression/ProgressionManager';
import { soundManager } from './game/audio/AudioSynthesizer';
import { MainMenu } from './ui/MainMenu';
import { HUD } from './ui/HUD';
import { PauseMenu } from './ui/PauseMenu';
import { MatchResultsModal } from './ui/MatchResultsModal';

export default function App() {
  const [screen, setScreen] = useState<'menu' | 'match'>('menu');
  const [loadout, setLoadout] = useState<Loadout>({
    characterId: 'kaelen_voss',
    characterSkinId: 'skin_voss_default',
    primaryWeaponId: 'mp5_tactical',
    secondaryWeaponId: 'phase_pistol',
    tacticalId: 'stim',
    weaponSkinId: 'skin_default',
  });

  const [matchSettings, setMatchSettings] = useState<MatchSettings>({
    mode: 'tdm',
    difficulty: 'normal',
    scoreLimit: 25,
    timeLimitSeconds: 300,
    botCount: 6,
    mapId: 'spire_courtyard',
  });

  const [graphicsSettings, setGraphicsSettings] = useState<GraphicsSettings>({
    quality: 'medium',
    fov: 75,
    mouseSensitivity: 1.0,
    crosshairColor: '#06b6d4',
    masterVolume: 0.8,
    sfxVolume: 0.8,
    musicVolume: 0.5,
  });

  const [progression, setProgression] = useState<PlayerProgression>(() =>
    ProgressionManager.getInstance().getData()
  );

  // Match Runtime State
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);

  const [playerState, setPlayerState] = useState<CombatantState | null>(null);
  const [matchSimState, setMatchSimState] = useState<MatchSimulator | null>(null);
  const [currentHitEffect, setCurrentHitEffect] = useState<HitEffect | null>(null);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isMatchOver, setIsMatchOver] = useState(false);
  const [isPlayerVictory, setIsPlayerVictory] = useState(false);

  const reloadProgression = () => {
    setProgression(ProgressionManager.getInstance().getData());
  };

  const handleStartMatch = (settings: MatchSettings) => {
    setMatchSettings(settings);
    setIsMatchOver(false);
    setIsPaused(false);
    setScreen('match');
  };

  // Launch / Destroy Game Engine when screen changes
  useEffect(() => {
    if (screen !== 'match') {
      if (gameEngineRef.current) {
        gameEngineRef.current.dispose();
        gameEngineRef.current = null;
      }
      return;
    }

    if (!canvasContainerRef.current) return;

    // Clean up any stale instance
    if (gameEngineRef.current) {
      gameEngineRef.current.dispose();
    }

    const engine = new GameEngine(
      canvasContainerRef.current,
      loadout,
      matchSettings,
      graphicsSettings
    );
    gameEngineRef.current = engine;

    engine.onHudUpdate = (player, sim, hit) => {
      setPlayerState({ ...player });
      setMatchSimState(sim);
      if (hit) setCurrentHitEffect(hit);
    };

    engine.onPointerLockChange = (locked) => {
      setIsPointerLocked(locked);
    };

    engine.onMatchEnd = (winnerTeam: Team | null, isPlayerWon: boolean) => {
      setIsMatchOver(true);
      setIsPlayerVictory(isPlayerWon);
      engine.exitPointerLock();
      reloadProgression();
    };

    return () => {
      engine.dispose();
      gameEngineRef.current = null;
    };
  }, [screen]);

  // Handle Pause Key (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && screen === 'match' && !isMatchOver) {
        setIsPaused((prev) => {
          const next = !prev;
          if (gameEngineRef.current) {
            gameEngineRef.current.setPaused(next);
          }
          return next;
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [screen, isMatchOver]);

  const handleResumeMatch = () => {
    setIsPaused(false);
    if (gameEngineRef.current) {
      gameEngineRef.current.setPaused(false);
      gameEngineRef.current.requestPointerLock();
    }
  };

  const handleQuitToLobby = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.dispose();
      gameEngineRef.current = null;
    }
    setIsPaused(false);
    setIsMatchOver(false);
    setScreen('menu');
    reloadProgression();
  };

  const handleRematch = () => {
    if (gameEngineRef.current) {
      gameEngineRef.current.dispose();
      gameEngineRef.current = null;
    }
    setIsMatchOver(false);
    setIsPaused(false);
    // Trigger re-mount
    setScreen('menu');
    setTimeout(() => {
      setScreen('match');
    }, 50);
  };

  const handleUpdateGraphicsSettings = (newSettings: GraphicsSettings) => {
    setGraphicsSettings(newSettings);
    if (gameEngineRef.current) {
      gameEngineRef.current.updateGraphicsSettings(newSettings);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-slate-950 overflow-hidden font-sans select-none">
      {screen === 'menu' && (
        <MainMenu
          onStartMatch={handleStartMatch}
          loadout={loadout}
          onUpdateLoadout={setLoadout}
          progression={progression}
          onProgressionUpdated={reloadProgression}
          graphicsSettings={graphicsSettings}
          onUpdateGraphicsSettings={handleUpdateGraphicsSettings}
        />
      )}

      {screen === 'match' && (
        <div className="relative w-full h-full">
          {/* 3D WebGL Canvas Container */}
          <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full z-0" />

          {/* Real-time HUD */}
          {playerState && matchSimState && (
            <HUD
              player={playerState}
              matchSim={matchSimState}
              hitEffect={currentHitEffect}
              isPointerLocked={isPointerLocked}
              onRequestPointerLock={() => {
                if (gameEngineRef.current) gameEngineRef.current.requestPointerLock();
              }}
              onOpenPause={() => {
                setIsPaused(true);
                if (gameEngineRef.current) gameEngineRef.current.setPaused(true);
              }}
              onTouchLook={(dx, dy) => gameEngineRef.current?.handleTouchLook(dx, dy)}
              onTouchMove={(x, y) => gameEngineRef.current?.setTouchMoveVector(x, y)}
              onTouchFire={(isFiring) => gameEngineRef.current?.setTouchFire(isFiring)}
              onTouchADS={() => gameEngineRef.current?.toggleTouchADS()}
              onTouchJump={() => gameEngineRef.current?.triggerTouchJump()}
              onTouchReload={() => gameEngineRef.current?.triggerTouchReload()}
              onSwitchWeapon={() => {
                if (gameEngineRef.current && playerState) {
                  const currIdx = playerState.currentWeaponId === loadout.primaryWeaponId ? 1 : 0;
                  gameEngineRef.current.switchWeapon(currIdx);
                }
              }}
              onThrowTactical={() => gameEngineRef.current?.throwTactical()}
            />
          )}

          {/* Pause Menu */}
          {isPaused && matchSimState && (
            <PauseMenu
              onResume={handleResumeMatch}
              onQuit={handleQuitToLobby}
              matchSim={matchSimState}
              graphicsSettings={graphicsSettings}
              onUpdateSettings={handleUpdateGraphicsSettings}
            />
          )}

          {/* Match Results & Victory Screen */}
          {isMatchOver && playerState && matchSimState && (
            <MatchResultsModal
              player={playerState}
              matchSim={matchSimState}
              isVictory={isPlayerVictory}
              onPlayAgain={handleRematch}
              onReturnToLobby={handleQuitToLobby}
            />
          )}
        </div>
      )}
    </div>
  );
}
