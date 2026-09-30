export type GameModeType = 'tdm' | 'ffa' | 'zone';

export type DifficultyLevel = 'easy' | 'normal' | 'hard';

export type Team = 'alpha' | 'omega' | 'neutral';

export interface WeaponDef {
  id: string;
  name: string;
  category: 'assault' | 'cqb' | 'sniper' | 'heavy' | 'sidearm';
  damage: number;
  fireRate: number; // rounds per second
  magazineSize: number;
  reloadTime: number; // in seconds
  spread: number; // in radians
  recoil: number;
  range: number;
  zoomFov: number; // ADS FOV (default ~75)
  isHitscan: boolean;
  projectileSpeed?: number;
  splashRadius?: number;
  color: string;
  beamType: 'pulse' | 'arc' | 'rail' | 'ion' | 'plasma';
  description: string;
  unlockedAtLevel: number;
}

export interface CharacterSkin {
  id: string;
  name: string;
  primaryColor: string;
  accentColor: string;
  glowColor: string;
  priceCredits: number;
  requiredLevel: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  callsign: string;
  role: 'Assault' | 'Recon' | 'Juggernaut' | 'Engineer';
  baseHealth: number;
  baseShield: number;
  speedMultiplier: number;
  jumpMultiplier: number;
  description: string;
  skins: CharacterSkin[];
}

export interface Loadout {
  primaryWeaponId: string;
  secondaryWeaponId: string;
  tacticalId: 'stim' | 'emp' | 'shield';
  weaponSkinId: string;
  characterId: string;
  characterSkinId: string;
}

export interface KillFeedEntry {
  id: string;
  killerName: string;
  killerTeam: Team;
  victimName: string;
  victimTeam: Team;
  weaponName: string;
  isHeadshot: boolean;
  timestamp: number;
}

export interface CombatantState {
  id: string;
  name: string;
  isPlayer: boolean;
  isBot: boolean;
  team: Team;
  characterId: string;
  skinId: string;
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  isAlive: boolean;
  kills: number;
  deaths: number;
  assists: number;
  score: number;
  damageDealt: number;
  shotsFired: number;
  shotsHit: number;
  headshots: number;
  currentWeaponId: string;
  ammoInMag: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  tacticalCooldown: number; // in seconds
  respawnTimeRemaining: number;
  position: { x: number; y: number; z: number };
  rotation: { yaw: number; pitch: number };
}

export interface MatchSettings {
  mode: GameModeType;
  difficulty: DifficultyLevel;
  scoreLimit: number;
  timeLimitSeconds: number;
  botCount: number;
  mapId: string;
}

export interface MatchState {
  status: 'waiting' | 'countdown' | 'in_progress' | 'ended';
  timeRemaining: number;
  countdown: number;
  alphaScore: number;
  omegaScore: number;
  zoneProgress: number; // -100 to 100 (negative is Alpha, positive is Omega)
  zoneControllingTeam: Team;
  winnerTeam: Team | null;
  winnerCombatantId: string | null;
}

export interface PlayerProgression {
  level: number;
  xp: number;
  xpToNextLevel: number;
  credits: number;
  unlockedWeaponIds: string[];
  unlockedSkinIds: string[];
  unlockedTitles: string[];
  selectedTitle: string;
  careerStats: {
    matchesPlayed: number;
    matchesWon: number;
    totalKills: number;
    totalDeaths: number;
    totalDamage: number;
    headshots: number;
    timePlayedMinutes: number;
  };
}

export interface GraphicsSettings {
  quality: 'low' | 'medium' | 'high';
  fov: number;
  mouseSensitivity: number;
  crosshairColor: string;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
}

export interface HitEffect {
  x: number;
  y: number;
  isHeadshot: boolean;
  damage: number;
  timestamp: number;
}
