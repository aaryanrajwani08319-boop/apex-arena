import { PlayerProgression } from '../types';

const STORAGE_KEY = 'apex_arena_save_v1';

export const TITLES_LIST = [
  'Recruit',
  'Apex Contender',
  'Zone Controller',
  'Vortex Master',
  'Ghost Operative',
  'Shock Trooper',
  'Recon Ace',
  'Apex Champion',
];

const DEFAULT_PROGRESSION: PlayerProgression = {
  level: 1,
  xp: 0,
  xpToNextLevel: 500,
  credits: 350,
  unlockedWeaponIds: ['mp5_tactical', 'mp40_sturm', 'pulse_carbine', 'phase_pistol', 'arc_blaster'],
  unlockedSkinIds: ['skin_voss_default', 'skin_nyx_default', 'skin_varek_default', 'skin_lyra_default', 'skin_default'],
  unlockedTitles: ['Recruit', 'Apex Contender'],
  selectedTitle: 'Apex Contender',
  careerStats: {
    matchesPlayed: 0,
    matchesWon: 0,
    totalKills: 0,
    totalDeaths: 0,
    totalDamage: 0,
    headshots: 0,
    timePlayedMinutes: 0,
  },
};

export class ProgressionManager {
  private static instance: ProgressionManager;
  private data: PlayerProgression;

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): ProgressionManager {
    if (!ProgressionManager.instance) {
      ProgressionManager.instance = new ProgressionManager();
    }
    return ProgressionManager.instance;
  }

  public getData(): PlayerProgression {
    return { ...this.data };
  }

  private load(): PlayerProgression {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULT_PROGRESSION,
          ...parsed,
          careerStats: {
            ...DEFAULT_PROGRESSION.careerStats,
            ...(parsed.careerStats || {}),
          },
        };
      }
    } catch {
      // Fallback
    }
    return { ...DEFAULT_PROGRESSION };
  }

  public save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch {
      // ignore
    }
  }

  public addMatchResults(
    won: boolean,
    kills: number,
    deaths: number,
    assists: number,
    damage: number,
    headshots: number,
    durationSeconds: number
  ): { xpGained: number; creditsGained: number; leveledUp: boolean; newUnlocks: string[] } {
    // XP Calculation
    const killXp = kills * 100;
    const assistXp = assists * 40;
    const damageXp = Math.floor(damage * 0.15);
    const winBonus = won ? 350 : 100;
    const xpGained = killXp + assistXp + damageXp + winBonus;

    // Credits Calculation
    const creditsGained = (won ? 150 : 60) + kills * 25 + assists * 10;

    this.data.xp += xpGained;
    this.data.credits += creditsGained;

    // Career Stats
    this.data.careerStats.matchesPlayed += 1;
    if (won) this.data.careerStats.matchesWon += 1;
    this.data.careerStats.totalKills += kills;
    this.data.careerStats.totalDeaths += deaths;
    this.data.careerStats.totalDamage += damage;
    this.data.careerStats.headshots += headshots;
    this.data.careerStats.timePlayedMinutes += Math.round(durationSeconds / 60);

    // Check level up
    let leveledUp = false;
    const newUnlocks: string[] = [];

    while (this.data.xp >= this.data.xpToNextLevel) {
      this.data.xp -= this.data.xpToNextLevel;
      this.data.level += 1;
      this.data.xpToNextLevel = Math.floor(500 * Math.pow(1.25, this.data.level - 1));
      leveledUp = true;

      // Unlock weapons based on level
      if (this.data.level >= 2 && !this.data.unlockedWeaponIds.includes('arc_blaster')) {
        this.data.unlockedWeaponIds.push('arc_blaster');
        newUnlocks.push('Arc Blaster');
      }
      if (this.data.level >= 3 && !this.data.unlockedWeaponIds.includes('vortex_rifle')) {
        this.data.unlockedWeaponIds.push('vortex_rifle');
        newUnlocks.push('Vortex Rifle');
      }
      if (this.data.level >= 4 && !this.data.unlockedWeaponIds.includes('ion_smg')) {
        this.data.unlockedWeaponIds.push('ion_smg');
        newUnlocks.push('Ion SMG');
      }
      if (this.data.level >= 5 && !this.data.unlockedWeaponIds.includes('plasma_launcher')) {
        this.data.unlockedWeaponIds.push('plasma_launcher');
        newUnlocks.push('Plasma Launcher');
      }

      // Title unlocks
      if (this.data.level >= 3 && !this.data.unlockedTitles.includes('Zone Controller')) {
        this.data.unlockedTitles.push('Zone Controller');
      }
      if (this.data.level >= 5 && !this.data.unlockedTitles.includes('Vortex Master')) {
        this.data.unlockedTitles.push('Vortex Master');
      }
      if (this.data.level >= 8 && !this.data.unlockedTitles.includes('Apex Champion')) {
        this.data.unlockedTitles.push('Apex Champion');
      }
    }

    this.save();
    return { xpGained, creditsGained, leveledUp, newUnlocks };
  }

  public purchaseSkin(skinId: string, cost: number): boolean {
    if (this.data.unlockedSkinIds.includes(skinId)) return true;
    if (this.data.credits >= cost) {
      this.data.credits -= cost;
      this.data.unlockedSkinIds.push(skinId);
      this.save();
      return true;
    }
    return false;
  }

  public setSelectedTitle(title: string) {
    if (this.data.unlockedTitles.includes(title)) {
      this.data.selectedTitle = title;
      this.save();
    }
  }
}
