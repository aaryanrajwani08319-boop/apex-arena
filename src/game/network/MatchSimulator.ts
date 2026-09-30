import * as THREE from 'three';
import {
  CombatantState,
  GameModeType,
  KillFeedEntry,
  MatchSettings,
  MatchState,
  Team,
  WeaponDef,
} from '../types';
import { ArenaData } from '../map/ArenaBuilder';
import { soundManager } from '../audio/AudioSynthesizer';
import { WEAPON_REGISTRY } from '../weapons/WeaponRegistry';

export interface DamageContribution {
  attackerId: string;
  amount: number;
  timestamp: number;
}

export type NetworkEventCallback = (eventName: string, payload: unknown) => void;

export class MatchSimulator {
  public matchState: MatchState;
  public settings: MatchSettings;
  public combatants: Map<string, CombatantState> = new Map();
  public killFeed: KillFeedEntry[] = [];
  public damageHistory: Map<string, DamageContribution[]> = new Map();

  private arena: ArenaData;
  private eventListeners: NetworkEventCallback[] = [];
  private zoneHoldTimeAlpha = 0;
  private zoneHoldTimeOmega = 0;

  constructor(settings: MatchSettings, arena: ArenaData) {
    this.settings = settings;
    this.arena = arena;
    this.matchState = {
      status: 'countdown',
      timeRemaining: settings.timeLimitSeconds,
      countdown: 3,
      alphaScore: 0,
      omegaScore: 0,
      zoneProgress: 0,
      zoneControllingTeam: 'neutral',
      winnerTeam: null,
      winnerCombatantId: null,
    };
  }

  public onNetworkEvent(cb: NetworkEventCallback) {
    this.eventListeners.push(cb);
  }

  public emit(event: string, payload: unknown) {
    this.eventListeners.forEach((cb) => cb(event, payload));
  }

  public addCombatant(combatant: CombatantState) {
    this.combatants.set(combatant.id, combatant);
  }

  public getCombatantList(): CombatantState[] {
    return Array.from(this.combatants.values());
  }

  public getPlayer(): CombatantState | undefined {
    return Array.from(this.combatants.values()).find((c) => c.isPlayer);
  }

  public update(dt: number): { matchEnded: boolean; winnerTeam: Team | null } {
    // 1. Countdown State
    if (this.matchState.status === 'countdown') {
      const prevCd = Math.ceil(this.matchState.countdown);
      this.matchState.countdown -= dt;
      const newCd = Math.ceil(this.matchState.countdown);

      if (newCd < prevCd && newCd > 0) {
        soundManager.playCountdownBeep(false);
      } else if (this.matchState.countdown <= 0) {
        this.matchState.countdown = 0;
        this.matchState.status = 'in_progress';
        soundManager.playCountdownBeep(true);
        this.emit('match_started', {});
      }
      return { matchEnded: false, winnerTeam: null };
    }

    if (this.matchState.status !== 'in_progress') {
      return { matchEnded: true, winnerTeam: this.matchState.winnerTeam };
    }

    // 2. Timer tick
    this.matchState.timeRemaining -= dt;
    if (this.matchState.timeRemaining <= 0) {
      this.matchState.timeRemaining = 0;
      this.endMatchByTime();
      return { matchEnded: true, winnerTeam: this.matchState.winnerTeam };
    }

    // 3. Respawns tick
    this.combatants.forEach((c) => {
      if (!c.isAlive) {
        c.respawnTimeRemaining -= dt;
        if (c.respawnTimeRemaining <= 0) {
          this.respawnCombatant(c);
        }
      }

      // Tactical ability cooldown tick
      if (c.tacticalCooldown > 0) {
        c.tacticalCooldown = Math.max(0, c.tacticalCooldown - dt);
      }

      // Reloading progress tick
      if (c.isReloading) {
        const weapon = WEAPON_REGISTRY[c.currentWeaponId] || WEAPON_REGISTRY.pulse_carbine;
        c.reloadProgress += dt / weapon.reloadTime;
        if (c.reloadProgress >= 1) {
          c.isReloading = false;
          c.reloadProgress = 0;
          c.ammoInMag = weapon.magazineSize;
        }
      }
    });

    // 4. Capture Zone Mode Logic
    if (this.settings.mode === 'zone') {
      this.updateCaptureZone(dt);
    }

    // 5. Check Score Limit
    if (this.settings.mode === 'tdm') {
      if (this.matchState.alphaScore >= this.settings.scoreLimit) {
        this.finalizeWinner('alpha', null);
        return { matchEnded: true, winnerTeam: 'alpha' };
      }
      if (this.matchState.omegaScore >= this.settings.scoreLimit) {
        this.finalizeWinner('omega', null);
        return { matchEnded: true, winnerTeam: 'omega' };
      }
    } else if (this.settings.mode === 'ffa') {
      for (const c of this.combatants.values()) {
        if (c.kills >= this.settings.scoreLimit) {
          this.finalizeWinner(c.team, c.id);
          return { matchEnded: true, winnerTeam: c.team };
        }
      }
    }

    return { matchEnded: false, winnerTeam: null };
  }

  private updateCaptureZone(dt: number) {
    const zoneCenter = this.arena.captureZoneCenter;
    const radius = this.arena.captureZoneRadius;

    let alphaInZone = 0;
    let omegaInZone = 0;

    this.combatants.forEach((c) => {
      if (!c.isAlive) return;
      const pos = new THREE.Vector3(c.position.x, c.position.y, c.position.z);
      if (pos.distanceTo(zoneCenter) <= radius) {
        if (c.team === 'alpha') alphaInZone++;
        else if (c.team === 'omega') omegaInZone++;
      }
    });

    // Contested vs Dominated
    if (alphaInZone > 0 && omegaInZone === 0) {
      this.matchState.zoneControllingTeam = 'alpha';
      this.zoneHoldTimeAlpha += dt;
      this.matchState.zoneProgress = Math.max(-100, this.matchState.zoneProgress - dt * 25);

      // Score increment when fully held
      if (this.matchState.zoneProgress <= -99) {
        this.matchState.alphaScore += dt * 3.5;
        if (this.matchState.alphaScore >= this.settings.scoreLimit) {
          this.finalizeWinner('alpha', null);
        }
      }
    } else if (omegaInZone > 0 && alphaInZone === 0) {
      this.matchState.zoneControllingTeam = 'omega';
      this.zoneHoldTimeOmega += dt;
      this.matchState.zoneProgress = Math.min(100, this.matchState.zoneProgress + dt * 25);

      if (this.matchState.zoneProgress >= 99) {
        this.matchState.omegaScore += dt * 3.5;
        if (this.matchState.omegaScore >= this.settings.scoreLimit) {
          this.finalizeWinner('omega', null);
        }
      }
    } else if (alphaInZone > 0 && omegaInZone > 0) {
      this.matchState.zoneControllingTeam = 'neutral'; // Contested
    }
  }

  public applyDamage(
    victimId: string,
    damage: number,
    shooterId: string,
    weaponId: string,
    isHeadshot: boolean
  ) {
    const victim = this.combatants.get(victimId);
    const shooter = this.combatants.get(shooterId);
    if (!victim || !victim.isAlive) return;

    // Friendly fire check
    if (this.settings.mode === 'tdm' && shooter && shooter.team === victim.team && shooter.id !== victim.id) {
      return;
    }

    // Shield takes damage first
    let remainingDmg = damage;
    let shieldBroke = false;

    if (victim.shield > 0) {
      if (victim.shield >= remainingDmg) {
        victim.shield -= remainingDmg;
        remainingDmg = 0;
      } else {
        remainingDmg -= victim.shield;
        victim.shield = 0;
        shieldBroke = true;
      }
    }

    // Rest to health
    if (remainingDmg > 0) {
      victim.health = Math.max(0, victim.health - remainingDmg);
    }

    // Sound and stats for shooter
    if (shooter) {
      shooter.damageDealt += damage;
      shooter.shotsHit += 1;
      if (isHeadshot) shooter.headshots += 1;
    }

    // Record damage for assist tracking (timestamped)
    const history = this.damageHistory.get(victimId) || [];
    history.push({
      attackerId: shooterId,
      amount: damage,
      timestamp: Date.now(),
    });
    this.damageHistory.set(victimId, history);

    // Audio cues
    if (victim.isPlayer) {
      soundManager.playPlayerHurt();
      if (shieldBroke) soundManager.playShieldBreak();
    }
    if (shooter && shooter.isPlayer) {
      if (isHeadshot) soundManager.playHeadshotCrit();
      else soundManager.playHitMarker();
    }

    // Check Elimination
    if (victim.health <= 0) {
      this.handleElimination(victim, shooter, weaponId, isHeadshot);
    }
  }

  private handleElimination(
    victim: CombatantState,
    killer: CombatantState | undefined,
    weaponId: string,
    isHeadshot: boolean
  ) {
    victim.isAlive = false;
    victim.deaths += 1;
    victim.respawnTimeRemaining = 3.0; // 3 second respawn countdown

    const weapon = WEAPON_REGISTRY[weaponId] || WEAPON_REGISTRY.pulse_carbine;

    if (killer) {
      killer.kills += 1;
      killer.score += isHeadshot ? 150 : 100;

      if (killer.isPlayer) {
        soundManager.playKillConfirm();
      }

      // Add to team score
      if (killer.team === 'alpha') {
        this.matchState.alphaScore += 1;
      } else if (killer.team === 'omega') {
        this.matchState.omegaScore += 1;
      }

      // Check assists (damage in last 8s from someone else on the same team)
      const recentContribs = (this.damageHistory.get(victim.id) || []).filter(
        (c) => Date.now() - c.timestamp < 8000 && c.attackerId !== killer.id
      );

      const uniqueAssisters = new Set<string>();
      recentContribs.forEach((c) => {
        if (c.amount >= 25) uniqueAssisters.add(c.attackerId);
      });

      uniqueAssisters.forEach((assisterId) => {
        const assister = this.combatants.get(assisterId);
        if (assister) {
          assister.assists += 1;
          assister.score += 40;
        }
      });
    }

    // Clear damage history for victim
    this.damageHistory.delete(victim.id);

    // Add Kill Feed Entry
    const killFeedEntry: KillFeedEntry = {
      id: Math.random().toString(36).substring(2, 9),
      killerName: killer ? killer.name : 'Environmental',
      killerTeam: killer ? killer.team : 'neutral',
      victimName: victim.name,
      victimTeam: victim.team,
      weaponName: weapon.name,
      isHeadshot,
      timestamp: Date.now(),
    };

    this.killFeed.unshift(killFeedEntry);
    if (this.killFeed.length > 6) this.killFeed.pop();

    this.emit('elimination', killFeedEntry);
  }

  public respawnCombatant(c: CombatantState) {
    let spawnList = this.arena.spawnPointsFFA;
    if (this.settings.mode === 'tdm') {
      spawnList = c.team === 'alpha' ? this.arena.spawnPointsAlpha : this.arena.spawnPointsOmega;
    }

    const spawn = spawnList[Math.floor(Math.random() * spawnList.length)];
    c.position = { x: spawn.x + (Math.random() - 0.5) * 2, y: spawn.y, z: spawn.z + (Math.random() - 0.5) * 2 };
    c.health = c.maxHealth;
    c.shield = c.maxShield;
    c.isAlive = true;
    c.isReloading = false;
    c.reloadProgress = 0;
    c.ammoInMag = WEAPON_REGISTRY[c.currentWeaponId]?.magazineSize || 30;

    this.emit('respawn', { combatantId: c.id, position: c.position });
  }

  private endMatchByTime() {
    if (this.settings.mode === 'tdm' || this.settings.mode === 'zone') {
      if (this.matchState.alphaScore > this.matchState.omegaScore) {
        this.finalizeWinner('alpha', null);
      } else if (this.matchState.omegaScore > this.matchState.alphaScore) {
        this.finalizeWinner('omega', null);
      } else {
        this.finalizeWinner('neutral', null); // Draw
      }
    } else {
      // FFA: highest kills
      let topCombatant: CombatantState | null = null;
      for (const c of this.combatants.values()) {
        if (!topCombatant || c.kills > topCombatant.kills) {
          topCombatant = c;
        }
      }
      this.finalizeWinner(topCombatant ? topCombatant.team : 'neutral', topCombatant ? topCombatant.id : null);
    }
  }

  private finalizeWinner(team: Team, combatantId: string | null) {
    this.matchState.status = 'ended';
    this.matchState.winnerTeam = team;
    this.matchState.winnerCombatantId = combatantId;

    const player = this.getPlayer();
    const playerWon = player ? (this.settings.mode === 'ffa' ? player.id === combatantId : player.team === team) : false;

    if (playerWon) {
      soundManager.playVictory();
    } else {
      soundManager.playDefeat();
    }

    this.emit('match_ended', { winnerTeam: team, winnerCombatantId: combatantId });
  }
}
