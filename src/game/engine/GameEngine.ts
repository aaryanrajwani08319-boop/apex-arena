import * as THREE from 'three';
import {
  CombatantState,
  GraphicsSettings,
  HitEffect,
  Loadout,
  MatchSettings,
  Team,
  WeaponDef,
} from '../types';
import { ArenaBuilder, ArenaData } from '../map/ArenaBuilder';
import { ParticleSystem } from '../combat/ParticleSystem';
import { ProjectileManager } from '../combat/ProjectileManager';
import { BotController } from '../ai/BotController';
import { MatchSimulator } from '../network/MatchSimulator';
import { soundManager } from '../audio/AudioSynthesizer';
import { WEAPON_REGISTRY } from '../weapons/WeaponRegistry';
import { CHARACTER_REGISTRY } from '../characters/CharacterRegistry';

export class GameEngine {
  private container: HTMLElement;
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private arena!: ArenaData;
  private particleSystem!: ParticleSystem;
  private projectileManager!: ProjectileManager;
  private matchSimulator!: MatchSimulator;
  private bots: BotController[] = [];

  // Player Camera & Rig
  private playerPosition = new THREE.Vector3(0, 1.8, 30);
  private playerVelocity = new THREE.Vector3();
  private cameraYaw = 0;
  private cameraPitch = 0;
  private isGrounded = true;
  private isSprinting = false;
  private isCrouching = false;
  private isAimingDownSights = false;
  private currentWeaponIndex = 0; // 0: primary, 1: secondary
  private equippedWeaponIds: string[] = [];

  // Weapon ViewModel & Sway
  private weaponRig = new THREE.Group();
  private weaponMeshGroup = new THREE.Group();
  private weaponSway = new THREE.Vector2();
  private recoilPitch = 0;
  private recoilYaw = 0;
  private walkBob = 0;
  private stepDistance = 0;

  // Input states
  private keys: Record<string, boolean> = {};
  private isPointerLocked = false;
  private isFiring = false;
  private fireTimer = 0;

  // Settings & Animation Loop
  private graphicsSettings: GraphicsSettings;
  private loadout: Loadout;
  private animationFrameId: number | null = null;
  private lastTime = performance.now();
  private isPaused = false;
  private isDisposed = false;

  // Raycaster for shooting & combatants hitboxes
  private raycaster = new THREE.Raycaster();

  // Callbacks for UI updates
  public onHudUpdate?: (
    player: CombatantState,
    matchSim: MatchSimulator,
    hitEffect: HitEffect | null
  ) => void;
  public onPointerLockChange?: (isLocked: boolean) => void;
  public onMatchEnd?: (winnerTeam: Team | null, isPlayerWinner: boolean) => void;

  constructor(
    container: HTMLElement,
    loadout: Loadout,
    matchSettings: MatchSettings,
    graphicsSettings: GraphicsSettings
  ) {
    this.container = container;
    this.loadout = loadout;
    this.graphicsSettings = graphicsSettings;
    this.equippedWeaponIds = [loadout.primaryWeaponId, loadout.secondaryWeaponId];

    this.initScene();
    this.initArena();
    this.initCombatantsAndSimulator(matchSettings);
    this.initWeaponRig();
    this.setupEventListeners();
    this.startLoop();
  }

  private initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x090d16);
    this.scene.fog = new THREE.FogExp2(0x090d16, 0.015);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(this.graphicsSettings.fov, width / height, 0.1, 400);

    this.renderer = new THREE.WebGLRenderer({
      antialias: this.graphicsSettings.quality !== 'low',
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.graphicsSettings.quality === 'high' ? 2 : 1));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    if (this.graphicsSettings.quality !== 'low') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    this.container.appendChild(this.renderer.domElement);

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0x38bdf8, 0.45);
    this.scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 1.4);
    sunLight.position.set(30, 60, 20);
    sunLight.castShadow = this.graphicsSettings.quality !== 'low';
    sunLight.shadow.mapSize.width = this.graphicsSettings.quality === 'high' ? 2048 : 1024;
    sunLight.shadow.mapSize.height = this.graphicsSettings.quality === 'high' ? 2048 : 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 160;
    sunLight.shadow.camera.left = -45;
    sunLight.shadow.camera.right = 45;
    sunLight.shadow.camera.top = 45;
    sunLight.shadow.camera.bottom = -45;
    this.scene.add(sunLight);

    // Colored base rim lights
    const alphaLight = new THREE.PointLight(0x0284c7, 3, 30);
    alphaLight.position.set(0, 6, -30);
    this.scene.add(alphaLight);

    const omegaLight = new THREE.PointLight(0xea580c, 3, 30);
    omegaLight.position.set(0, 6, 30);
    this.scene.add(omegaLight);

    // Systems
    this.particleSystem = new ParticleSystem(this.scene);
    this.projectileManager = new ProjectileManager(this.scene, this.particleSystem);
  }

  private initArena() {
    this.arena = ArenaBuilder.buildArena();
    this.scene.add(this.arena.scene);
  }

  private initCombatantsAndSimulator(settings: MatchSettings) {
    this.matchSimulator = new MatchSimulator(settings, this.arena);

    // 1. Create Human Player
    const charDef = CHARACTER_REGISTRY[this.loadout.characterId] || CHARACTER_REGISTRY.kaelen_voss;
    const playerSpawn = settings.mode === 'tdm' ? this.arena.spawnPointsAlpha[0] : this.arena.spawnPointsFFA[0];
    this.playerPosition.copy(playerSpawn);

    const playerState: CombatantState = {
      id: 'player_human',
      name: 'Operative (You)',
      isPlayer: true,
      isBot: false,
      team: settings.mode === 'tdm' ? 'alpha' : 'neutral',
      characterId: this.loadout.characterId,
      skinId: this.loadout.characterSkinId,
      health: charDef.baseHealth,
      maxHealth: charDef.baseHealth,
      shield: charDef.baseShield,
      maxShield: charDef.baseShield,
      isAlive: true,
      kills: 0,
      deaths: 0,
      assists: 0,
      score: 0,
      damageDealt: 0,
      shotsFired: 0,
      shotsHit: 0,
      headshots: 0,
      currentWeaponId: this.equippedWeaponIds[0],
      ammoInMag: WEAPON_REGISTRY[this.equippedWeaponIds[0]].magazineSize,
      reserveAmmo: WEAPON_REGISTRY[this.equippedWeaponIds[0]].magazineSize * 3,
      isReloading: false,
      reloadProgress: 0,
      tacticalCooldown: 0,
      respawnTimeRemaining: 0,
      position: { x: this.playerPosition.x, y: this.playerPosition.y, z: this.playerPosition.z },
      rotation: { yaw: 0, pitch: 0 },
    };
    this.matchSimulator.addCombatant(playerState);

    // 2. Create AI Bots
    const botNames = ['Unit-7', 'Spectre-Bot', 'Apex-AI', 'Echo-4', 'Nova-Drone', 'Stalker-9', 'Vortex-Bot', 'Recon-X'];
    const charKeys = Object.keys(CHARACTER_REGISTRY);
    const weaponKeys = ['pulse_carbine', 'arc_blaster', 'ion_smg', 'vortex_rifle', 'plasma_launcher'];

    for (let i = 0; i < settings.botCount; i++) {
      const botTeam: Team = settings.mode === 'tdm' ? (i % 2 === 0 ? 'omega' : 'alpha') : 'neutral';
      const spawnList = settings.mode === 'tdm' ? (botTeam === 'alpha' ? this.arena.spawnPointsAlpha : this.arena.spawnPointsOmega) : this.arena.spawnPointsFFA;
      const spawn = spawnList[(i + 1) % spawnList.length];

      const cId = charKeys[i % charKeys.length];
      const botCharDef = CHARACTER_REGISTRY[cId];
      const botWpnId = weaponKeys[i % weaponKeys.length];

      const botState: CombatantState = {
        id: `bot_${i}`,
        name: botNames[i % botNames.length],
        isPlayer: false,
        isBot: true,
        team: botTeam,
        characterId: cId,
        skinId: botCharDef.skins[0].id,
        health: botCharDef.baseHealth,
        maxHealth: botCharDef.baseHealth,
        shield: botCharDef.baseShield,
        maxShield: botCharDef.baseShield,
        isAlive: true,
        kills: 0,
        deaths: 0,
        assists: 0,
        score: 0,
        damageDealt: 0,
        shotsFired: 0,
        shotsHit: 0,
        headshots: 0,
        currentWeaponId: botWpnId,
        ammoInMag: WEAPON_REGISTRY[botWpnId]?.magazineSize || 30,
        reserveAmmo: 999,
        isReloading: false,
        reloadProgress: 0,
        tacticalCooldown: 0,
        respawnTimeRemaining: 0,
        position: { x: spawn.x, y: spawn.y, z: spawn.z },
        rotation: { yaw: 0, pitch: 0 },
      };

      this.matchSimulator.addCombatant(botState);
      const botCtrl = new BotController(botState, settings.difficulty, this.arena);
      this.bots.push(botCtrl);
      this.scene.add(botCtrl.mesh);
    }

    // Hook simulator events
    this.matchSimulator.onNetworkEvent((event, payload) => {
      if (event === 'match_ended') {
        const data = payload as { winnerTeam: Team | null };
        const p = this.matchSimulator.getPlayer();
        const isWon = p ? (settings.mode === 'ffa' ? p.id === this.matchSimulator.matchState.winnerCombatantId : p.team === data.winnerTeam) : false;
        if (this.onMatchEnd) this.onMatchEnd(data.winnerTeam, isWon);
      }
    });
  }

  private initWeaponRig() {
    // Camera holds weapon rig for first person perspective
    this.camera.add(this.weaponRig);
    this.scene.add(this.camera);

    this.rebuildWeaponViewModel();
  }

  private rebuildWeaponViewModel() {
    // Clear existing meshes
    while (this.weaponMeshGroup.children.length > 0) {
      const child = this.weaponMeshGroup.children[0];
      this.weaponMeshGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose());
        else child.material.dispose();
      }
    }
    this.weaponRig.remove(this.weaponMeshGroup);
    this.weaponMeshGroup = new THREE.Group();

    const currentWpnId = this.equippedWeaponIds[this.currentWeaponIndex];
    const weapon = WEAPON_REGISTRY[currentWpnId] || WEAPON_REGISTRY.mp5_tactical;

    // Realistic Military Materials
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const vintageSteelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.45,
      metalness: 0.8,
    });
    const polymerMat = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.7,
      metalness: 0.15,
    });
    const bakeliteMat = new THREE.MeshStandardMaterial({
      color: 0x3b1d11, // Dark reddish-brown bakelite
      roughness: 0.5,
      metalness: 0.1,
    });
    const sightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Red sight dot

    if (weapon.id === 'mp5_tactical') {
      // === REALISTIC MP-5X TACTICAL SUBMACHINE GUN ===
      // 1. Upper Cylindrical Receiver & Cocking Tube
      const upperRecGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.48, 12);
      upperRecGeo.rotateX(Math.PI / 2);
      const upperRec = new THREE.Mesh(upperRecGeo, steelMat);
      upperRec.castShadow = true;
      this.weaponMeshGroup.add(upperRec);

      // Cocking tube on top
      const cockingTubeGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.42, 8);
      cockingTubeGeo.rotateX(Math.PI / 2);
      const cockingTube = new THREE.Mesh(cockingTubeGeo, steelMat);
      cockingTube.position.set(0, 0.045, -0.02);
      this.weaponMeshGroup.add(cockingTube);

      // Charging handle on top-left
      const chargingHandleGeo = new THREE.BoxGeometry(0.04, 0.015, 0.015);
      const chargingHandle = new THREE.Mesh(chargingHandleGeo, steelMat);
      chargingHandle.position.set(-0.035, 0.045, -0.15);
      chargingHandle.rotation.z = -0.3;
      this.weaponMeshGroup.add(chargingHandle);

      // 2. Ribbed Textured Foregrip / Handguard
      const handguardGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.22, 12);
      handguardGeo.rotateX(Math.PI / 2);
      const handguard = new THREE.Mesh(handguardGeo, polymerMat);
      handguard.position.set(0, -0.005, -0.18);
      this.weaponMeshGroup.add(handguard);

      // 3. Barrel & 3-Lug Flash Hider
      const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, steelMat);
      barrel.position.set(0, 0, -0.38);
      this.weaponMeshGroup.add(barrel);

      const flashHiderGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.06, 8);
      flashHiderGeo.rotateX(Math.PI / 2);
      const flashHider = new THREE.Mesh(flashHiderGeo, steelMat);
      flashHider.position.set(0, 0, -0.48);
      this.weaponMeshGroup.add(flashHider);

      // 4. Iconic Hooded Front Sight Ring with Post
      const frontRingGeo = new THREE.TorusGeometry(0.025, 0.005, 8, 16);
      const frontRing = new THREE.Mesh(frontRingGeo, steelMat);
      frontRing.position.set(0, 0.065, -0.32);
      this.weaponMeshGroup.add(frontRing);

      const frontPostGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.022, 6);
      const frontPost = new THREE.Mesh(frontPostGeo, steelMat);
      frontPost.position.set(0, 0.065, -0.32);
      this.weaponMeshGroup.add(frontPost);

      // Rear Rotary Diopter Drum Sight
      const rearSightGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.025, 8);
      const rearSight = new THREE.Mesh(rearSightGeo, steelMat);
      rearSight.position.set(0, 0.055, 0.12);
      this.weaponMeshGroup.add(rearSight);

      // 5. Curved 30-Round Banana Magazine
      const magGeo = new THREE.BoxGeometry(0.032, 0.24, 0.06);
      const mag = new THREE.Mesh(magGeo, steelMat);
      mag.position.set(0, -0.16, -0.06);
      mag.rotation.x = 0.28; // Curved forward
      this.weaponMeshGroup.add(mag);

      // Magazine Well
      const magWellGeo = new THREE.BoxGeometry(0.048, 0.08, 0.08);
      const magWell = new THREE.Mesh(magWellGeo, steelMat);
      magWell.position.set(0, -0.05, -0.06);
      this.weaponMeshGroup.add(magWell);

      // 6. Ergonomic Pistol Grip & Trigger Guard
      const gripGeo = new THREE.BoxGeometry(0.04, 0.16, 0.065);
      const grip = new THREE.Mesh(gripGeo, polymerMat);
      grip.position.set(0, -0.12, 0.14);
      grip.rotation.x = -0.35;
      this.weaponMeshGroup.add(grip);

      const triggerGuardGeo = new THREE.TorusGeometry(0.03, 0.005, 6, 8, Math.PI);
      triggerGuardGeo.rotateZ(Math.PI / 2);
      const triggerGuard = new THREE.Mesh(triggerGuardGeo, steelMat);
      triggerGuard.position.set(0, -0.06, 0.08);
      this.weaponMeshGroup.add(triggerGuard);

      // 7. Retractable Stock Wire Rails
      [-0.035, 0.035].forEach((rx) => {
        const railGeo = new THREE.BoxGeometry(0.008, 0.012, 0.32);
        const rail = new THREE.Mesh(railGeo, steelMat);
        rail.position.set(rx, 0.01, 0.26);
        this.weaponMeshGroup.add(rail);
      });

      const buttPadGeo = new THREE.BoxGeometry(0.07, 0.12, 0.02);
      const buttPad = new THREE.Mesh(buttPadGeo, polymerMat);
      buttPad.position.set(0, 0, 0.42);
      this.weaponMeshGroup.add(buttPad);
    } else if (weapon.id === 'mp40_sturm') {
      // === REALISTIC MASCHINE-40 (MP40) SUBMACHINE GUN ===
      // 1. Stamped Steel Tubular Receiver
      const recGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.46, 12);
      recGeo.rotateX(Math.PI / 2);
      const rec = new THREE.Mesh(recGeo, vintageSteelMat);
      this.weaponMeshGroup.add(rec);

      // Bolt cocking handle groove & hooked handle
      const boltHandleGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.04);
      const boltHandle = new THREE.Mesh(boltHandleGeo, vintageSteelMat);
      boltHandle.position.set(-0.045, 0.02, 0.05);
      boltHandle.rotation.z = Math.PI / 2;
      this.weaponMeshGroup.add(boltHandle);

      // 2. Slender Barrel & Knurled Muzzle Nut
      const barrelGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.36, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, vintageSteelMat);
      barrel.position.set(0, 0, -0.38);
      this.weaponMeshGroup.add(barrel);

      const muzzleNutGeo = new THREE.CylinderGeometry(0.024, 0.024, 0.05, 8);
      muzzleNutGeo.rotateX(Math.PI / 2);
      const muzzleNut = new THREE.Mesh(muzzleNutGeo, vintageSteelMat);
      muzzleNut.position.set(0, 0, -0.56);
      this.weaponMeshGroup.add(muzzleNut);

      // Under-Barrel Resting Bar (Classic MP40 feature)
      const restBarGeo = new THREE.BoxGeometry(0.015, 0.028, 0.28);
      const restBar = new THREE.Mesh(restBarGeo, vintageSteelMat);
      restBar.position.set(0, -0.028, -0.34);
      this.weaponMeshGroup.add(restBar);

      // 3. Sights: Hooded Front Sight & Rear Notch
      const frontSightGeo = new THREE.BoxGeometry(0.03, 0.04, 0.03);
      const frontSight = new THREE.Mesh(frontSightGeo, vintageSteelMat);
      frontSight.position.set(0, 0.038, -0.52);
      this.weaponMeshGroup.add(frontSight);

      const rearNotchGeo = new THREE.BoxGeometry(0.03, 0.025, 0.02);
      const rearNotch = new THREE.Mesh(rearNotchGeo, vintageSteelMat);
      rearNotch.position.set(0, 0.048, 0.1);
      this.weaponMeshGroup.add(rearNotch);

      // 4. Straight Vertical Stick Magazine
      const magGeo = new THREE.BoxGeometry(0.03, 0.26, 0.05);
      const mag = new THREE.Mesh(magGeo, vintageSteelMat);
      mag.position.set(0, -0.16, -0.06);
      this.weaponMeshGroup.add(mag);

      // Ribbed Magazine Housing Well
      const magWellGeo = new THREE.BoxGeometry(0.044, 0.09, 0.07);
      const magWell = new THREE.Mesh(magWellGeo, vintageSteelMat);
      magWell.position.set(0, -0.05, -0.06);
      this.weaponMeshGroup.add(magWell);

      // 5. Bakelite Ribbed Lower Receiver & Grip
      const bakeliteFrameGeo = new THREE.BoxGeometry(0.042, 0.06, 0.22);
      const bakeliteFrame = new THREE.Mesh(bakeliteFrameGeo, bakeliteMat);
      bakeliteFrame.position.set(0, -0.04, 0.08);
      this.weaponMeshGroup.add(bakeliteFrame);

      const gripGeo = new THREE.BoxGeometry(0.038, 0.15, 0.06);
      const grip = new THREE.Mesh(gripGeo, bakeliteMat);
      grip.position.set(0, -0.12, 0.14);
      grip.rotation.x = -0.38;
      this.weaponMeshGroup.add(grip);

      // 6. Underfolding Skeleton Metal Stock
      const stockArmGeo = new THREE.BoxGeometry(0.06, 0.015, 0.32);
      const stockArm = new THREE.Mesh(stockArmGeo, vintageSteelMat);
      stockArm.position.set(0, -0.02, 0.26);
      this.weaponMeshGroup.add(stockArm);

      const stockButtGeo = new THREE.BoxGeometry(0.07, 0.1, 0.015);
      const stockButt = new THREE.Mesh(stockButtGeo, vintageSteelMat);
      stockButt.position.set(0, -0.04, 0.42);
      stockButt.rotation.x = 0.2;
      this.weaponMeshGroup.add(stockButt);
    } else {
      // === TACTICAL ASSAULT CARBINE / ENERGY RIFLE ===
      const gunBodyGeo = new THREE.BoxGeometry(0.09, 0.15, 0.65);
      const gunBody = new THREE.Mesh(gunBodyGeo, steelMat);
      this.weaponMeshGroup.add(gunBody);

      // Top Picatinny Rail
      const railGeo = new THREE.BoxGeometry(0.04, 0.015, 0.5);
      const rail = new THREE.Mesh(railGeo, vintageSteelMat);
      rail.position.set(0, 0.082, -0.05);
      this.weaponMeshGroup.add(rail);

      // Holographic Sight Housing
      const sightHousingGeo = new THREE.BoxGeometry(0.05, 0.06, 0.08);
      const sightHousing = new THREE.Mesh(sightHousingGeo, polymerMat);
      sightHousing.position.set(0, 0.12, -0.05);
      this.weaponMeshGroup.add(sightHousing);

      // Red Reticle Reticle Glass
      const reticleGeo = new THREE.RingGeometry(0.012, 0.016, 8);
      const reticle = new THREE.Mesh(reticleGeo, sightMat);
      reticle.position.set(0, 0.12, -0.09);
      this.weaponMeshGroup.add(reticle);

      // Barrel & Compensator
      const barrelGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.35, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, steelMat);
      barrel.position.set(0, 0.02, -0.45);
      this.weaponMeshGroup.add(barrel);

      // Tactical Magazine
      const magGeo = new THREE.BoxGeometry(0.035, 0.2, 0.07);
      const mag = new THREE.Mesh(magGeo, polymerMat);
      mag.position.set(0, -0.14, -0.05);
      mag.rotation.x = 0.15;
      this.weaponMeshGroup.add(mag);

      // Pistol Grip
      const gripGeo = new THREE.BoxGeometry(0.038, 0.15, 0.06);
      const grip = new THREE.Mesh(gripGeo, polymerMat);
      grip.position.set(0, -0.12, 0.15);
      grip.rotation.x = -0.35;
      this.weaponMeshGroup.add(grip);
    }

    // Default weapon offset in first person view
    this.weaponMeshGroup.position.set(0.24, -0.22, -0.52);
    this.weaponRig.add(this.weaponMeshGroup);
  }

  // --- INPUT & EVENT LISTENERS ---

  private setupEventListeners() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('resize', this.handleResize);

    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private removeEventListeners() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    this.keys[e.code] = true;

    if (e.code === 'KeyR') {
      this.reload();
    } else if (e.code === 'Digit1') {
      this.switchWeapon(0);
    } else if (e.code === 'Digit2') {
      this.switchWeapon(1);
    } else if (e.code === 'KeyQ') {
      this.switchWeapon(this.currentWeaponIndex === 0 ? 1 : 0);
    } else if (e.code === 'KeyG') {
      this.throwTactical();
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.keys[e.code] = false;
  };

  private handleMouseDown = (e: MouseEvent) => {
    if (!this.isPointerLocked) {
      this.requestPointerLock();
      return;
    }
    if (e.button === 0) {
      this.isFiring = true;
    } else if (e.button === 2) {
      this.isAimingDownSights = true;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.isFiring = false;
    } else if (e.button === 2) {
      this.isAimingDownSights = false;
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isPointerLocked) return;

    const sens = this.graphicsSettings.mouseSensitivity * 0.0016;
    const adsDamp = this.isAimingDownSights ? 0.6 : 1.0;

    this.cameraYaw -= e.movementX * sens * adsDamp;
    this.cameraPitch -= e.movementY * sens * adsDamp;
    this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch));

    // Sway weapon
    this.weaponSway.x -= e.movementX * 0.0003;
    this.weaponSway.y += e.movementY * 0.0003;
  };

  private handlePointerLockChange = () => {
    this.isPointerLocked = document.pointerLockElement === this.container;
    if (this.onPointerLockChange) {
      this.onPointerLockChange(this.isPointerLocked);
    }
  };

  private handleResize = () => {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public requestPointerLock() {
    try {
      if (document.pointerLockElement !== this.container) {
        const res = this.container.requestPointerLock() as unknown;
        if (res && typeof (res as Promise<void>).catch === 'function') {
          (res as Promise<void>).catch(() => {
            // Silently suppress transient browser pointer lock cooldown / gesture rejection
          });
        }
      }
    } catch {
      // Silently suppress sync DOMExceptions
    }
  }

  public exitPointerLock() {
    try {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
    } catch {
      // Silently suppress sync DOMExceptions
    }
  }

  // --- MOBILE TOUCH METHODS ---

  public handleTouchLook(deltaX: number, deltaY: number) {
    const sens = this.graphicsSettings.mouseSensitivity * 0.003;
    const adsDamp = this.isAimingDownSights ? 0.6 : 1.0;
    this.cameraYaw -= deltaX * sens * adsDamp;
    this.cameraPitch -= deltaY * sens * adsDamp;
    this.cameraPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.cameraPitch));
  }

  public setTouchMoveVector(x: number, y: number) {
    this.keys['KeyD'] = x > 0.3;
    this.keys['KeyA'] = x < -0.3;
    this.keys['KeyW'] = y < -0.3;
    this.keys['KeyS'] = y > 0.3;
  }

  public setTouchFire(isPressed: boolean) {
    this.isFiring = isPressed;
  }

  public toggleTouchADS() {
    this.isAimingDownSights = !this.isAimingDownSights;
  }

  public triggerTouchJump() {
    if (this.isGrounded) {
      this.playerVelocity.y = 9.5;
      this.isGrounded = false;
      soundManager.playJump();
    }
  }

  public triggerTouchReload() {
    this.reload();
  }

  // --- WEAPON & COMBAT LOGIC ---

  public switchWeapon(index: number) {
    if (index === this.currentWeaponIndex || index < 0 || index >= this.equippedWeaponIds.length) return;
    const player = this.matchSimulator.getPlayer();
    if (!player || player.isReloading) return;

    this.currentWeaponIndex = index;
    player.currentWeaponId = this.equippedWeaponIds[index];
    player.ammoInMag = WEAPON_REGISTRY[player.currentWeaponId]?.magazineSize || 30;
    soundManager.playButtonClick();
    this.rebuildWeaponViewModel();
  }

  public reload() {
    const player = this.matchSimulator.getPlayer();
    if (!player || player.isReloading) return;
    const weapon = WEAPON_REGISTRY[player.currentWeaponId];
    if (player.ammoInMag >= weapon.magazineSize) return;

    player.isReloading = true;
    player.reloadProgress = 0;
    soundManager.playReload();
  }

  public throwTactical() {
    const player = this.matchSimulator.getPlayer();
    if (!player || !player.isAlive || player.tacticalCooldown > 0) return;

    player.tacticalCooldown = 15.0; // 15 sec cooldown
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ'));
    const origin = this.playerPosition.clone().add(forward.clone().multiplyScalar(0.8));

    if (this.loadout.tacticalId === 'stim') {
      soundManager.playStim();
      player.health = Math.min(player.maxHealth, player.health + 40);
      player.shield = Math.min(player.maxShield, player.shield + 40);
    } else {
      this.projectileManager.spawnGrenade(player.id, origin, forward);
    }
  }

  private performPlayerShoot(weapon: WeaponDef): HitEffect | null {
    const player = this.matchSimulator.getPlayer();
    if (!player || !player.isAlive || player.isReloading) return null;

    if (player.ammoInMag <= 0) {
      soundManager.playEmptyClick();
      this.reload();
      return null;
    }

    player.ammoInMag -= 1;
    player.shotsFired += 1;

    // Recoil kick
    this.recoilPitch += weapon.recoil * 0.8;
    this.recoilYaw += (Math.random() - 0.5) * weapon.recoil * 0.5;

    // Audio by weapon type
    if (weapon.id === 'mp5_tactical') soundManager.playMP5Fire();
    else if (weapon.id === 'mp40_sturm') soundManager.playMP40Fire();
    else if (weapon.id === 'pulse_carbine') soundManager.playPulseCarbine();
    else if (weapon.id === 'arc_blaster') soundManager.playArcBlaster();
    else if (weapon.id === 'vortex_rifle') soundManager.playVortexRifle();
    else if (weapon.id === 'ion_smg') soundManager.playIonSMG();
    else if (weapon.id === 'plasma_launcher') soundManager.playPlasmaLauncher();
    else soundManager.playPhasePistol();

    // Eject realistic brass shell casing to the right
    const rightDir = new THREE.Vector3(1, 0, 0).applyEuler(
      new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ')
    );
    const casingPos = this.playerPosition.clone().addScaledVector(rightDir, 0.2).add(new THREE.Vector3(0, -0.15, 0));
    this.particleSystem.createShellCasing(casingPos, rightDir);

    // Direction with spread
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(
      new THREE.Euler(this.cameraPitch, this.cameraYaw, 0, 'YXZ')
    );

    const spreadFactor = this.isAimingDownSights ? weapon.spread * 0.4 : weapon.spread;
    forward.x += (Math.random() - 0.5) * spreadFactor;
    forward.y += (Math.random() - 0.5) * spreadFactor;
    forward.z += (Math.random() - 0.5) * spreadFactor;
    forward.normalize();

    const muzzlePos = this.playerPosition.clone().add(forward.clone().multiplyScalar(0.7));

    // If Plasma Launcher: spawn projectile
    if (!weapon.isHitscan && weapon.projectileSpeed) {
      this.projectileManager.spawnPlasmaOrb(
        player.id,
        muzzlePos,
        forward,
        weapon.projectileSpeed,
        weapon.damage,
        weapon.splashRadius || 5.0
      );
      return null;
    }

    // HITSCAN RAYCAST
    this.raycaster.set(this.playerPosition, forward);
    this.raycaster.far = weapon.range;

    // Check hit against bots
    let closestHitDistance = weapon.range;
    let hitBot: BotController | null = null;
    let hitIsHeadshot = false;

    for (const bot of this.bots) {
      if (!bot.combatant.isAlive) continue;
      // In TDM do not shoot teammates
      if (this.matchSimulator.settings.mode === 'tdm' && bot.combatant.team === player.team) continue;

      const botPos = new THREE.Vector3(bot.combatant.position.x, bot.combatant.position.y, bot.combatant.position.z);
      // Ray distance to line segment representing bot
      const botBox = new THREE.Box3(
        new THREE.Vector3(botPos.x - 0.5, botPos.y, botPos.z - 0.5),
        new THREE.Vector3(botPos.x + 0.5, botPos.y + 2.0, botPos.z + 0.5)
      );

      const intersection = this.raycaster.ray.intersectBox(botBox, new THREE.Vector3());
      if (intersection) {
        const dist = this.playerPosition.distanceTo(intersection);
        if (dist < closestHitDistance) {
          closestHitDistance = dist;
          hitBot = bot;
          hitIsHeadshot = intersection.y > botPos.y + 1.6;
        }
      }
    }

    // Check hit against arena colliders
    let hitWallPoint: THREE.Vector3 | null = null;
    let hitWallNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

    for (const box of this.arena.colliders) {
      const hitPt = new THREE.Vector3();
      if (this.raycaster.ray.intersectBox(box, hitPt)) {
        const dist = this.playerPosition.distanceTo(hitPt);
        if (dist < closestHitDistance) {
          closestHitDistance = dist;
          hitBot = null;
          hitWallPoint = hitPt;
        }
      }
    }

    const endPoint = this.playerPosition.clone().addScaledVector(forward, closestHitDistance);

    // Tracer visual
    const colorHex = parseInt(weapon.color.replace('#', '0x'));
    if (weapon.beamType === 'arc') {
      this.particleSystem.createArcLightning(muzzlePos, endPoint);
    } else {
      this.particleSystem.createTracerBeam(muzzlePos, endPoint, colorHex, 0.09);
    }

    // Process Hit
    if (hitBot) {
      const damageMultiplier = hitIsHeadshot ? 2.0 : 1.0;
      const finalDmg = Math.round(weapon.damage * damageMultiplier);

      if (hitBot.combatant.shield > 0) {
        this.particleSystem.createShieldDeflection(endPoint, forward.clone().negate());
      } else {
        this.particleSystem.createSparks(endPoint, forward.clone().negate(), 12, 0xef4444);
      }

      this.matchSimulator.applyDamage(hitBot.combatant.id, finalDmg, player.id, weapon.id, hitIsHeadshot);

      return {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
        isHeadshot: hitIsHeadshot,
        damage: finalDmg,
        timestamp: Date.now(),
      };
    } else if (hitWallPoint) {
      this.particleSystem.createSparks(hitWallPoint, hitWallNormal, 8, colorHex);
    }

    return null;
  }

  // --- MAIN SIMULATION LOOP ---

  private startLoop() {
    const loop = (currentTime: number) => {
      if (this.isDisposed) return;
      this.animationFrameId = requestAnimationFrame(loop);

      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      if (!this.isPaused) {
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  private update(dt: number) {
    const player = this.matchSimulator.getPlayer();
    if (!player) return;

    // 1. Update Match Simulation
    this.matchSimulator.update(dt);

    // 2. Handle Player Movement & Physics
    if (player.isAlive) {
      this.updatePlayerMovement(dt, player);
    } else {
      // Spectate or await respawn
      if (player.respawnTimeRemaining <= 0) {
        this.matchSimulator.respawnCombatant(player);
        this.playerPosition.set(player.position.x, player.position.y, player.position.z);
      }
    }

    // 3. Weapon Firing
    let currentHitEffect: HitEffect | null = null;
    const weapon = WEAPON_REGISTRY[player.currentWeaponId] || WEAPON_REGISTRY.pulse_carbine;
    const fireInterval = 1 / weapon.fireRate;
    this.fireTimer += dt;

    if (this.isFiring && this.fireTimer >= fireInterval && player.isAlive && this.isPointerLocked) {
      this.fireTimer = 0;
      currentHitEffect = this.performPlayerShoot(weapon);
    }

    // 4. Update Weapon Viewmodel Animation (Recoil, Sway, ADS)
    this.updateWeaponViewModel(dt, weapon);

    // 5. Update AI Bots
    this.updateBots(dt);

    // 6. Update Projectiles & Particles
    this.projectileManager.update(
      dt,
      this.arena.colliders,
      this.matchSimulator.getCombatantList(),
      (victimId, dmg, shooterId) => {
        this.matchSimulator.applyDamage(victimId, dmg, shooterId, 'plasma_launcher', false);
      }
    );
    this.particleSystem.update(dt);

    // 7. Update Pickups & Jump Pads
    this.updatePickups(dt, player);

    // 8. Capture Ring Animation
    if (this.arena.captureRingMesh) {
      const mode = this.matchSimulator.settings.mode;
      if (mode === 'zone') {
        const mat = this.arena.captureRingMesh.material as THREE.MeshBasicMaterial;
        const controlling = this.matchSimulator.matchState.zoneControllingTeam;
        if (controlling === 'alpha') mat.color.setHex(0x0284c7);
        else if (controlling === 'omega') mat.color.setHex(0xea580c);
        else mat.color.setHex(0x94a3b8);
        this.arena.captureRingMesh.rotation.z += dt * 0.5;
      }
    }

    // 9. Sync HUD to React
    if (this.onHudUpdate) {
      this.onHudUpdate(player, this.matchSimulator, currentHitEffect);
    }
  }

  private updatePlayerMovement(dt: number, player: CombatantState) {
    const charDef = CHARACTER_REGISTRY[player.characterId] || CHARACTER_REGISTRY.kaelen_voss;
    this.isSprinting = this.keys['ShiftLeft'] || this.keys['ShiftRight'];
    this.isCrouching = this.keys['KeyC'] || this.keys['ControlLeft'];

    let speed = 9.0 * charDef.speedMultiplier;
    if (this.isSprinting) speed *= 1.45;
    if (this.isCrouching) speed *= 0.55;
    if (this.isAimingDownSights) speed *= 0.65;

    // Movement Direction
    const moveVector = new THREE.Vector3(0, 0, 0);
    if (this.keys['KeyW']) moveVector.z -= 1;
    if (this.keys['KeyS']) moveVector.z += 1;
    if (this.keys['KeyA']) moveVector.x -= 1;
    if (this.keys['KeyD']) moveVector.x += 1;

    if (moveVector.lengthSq() > 0) {
      moveVector.normalize();
      moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      this.playerVelocity.x = moveVector.x * speed;
      this.playerVelocity.z = moveVector.z * speed;

      // Footsteps
      if (this.isGrounded) {
        this.stepDistance += speed * dt;
        if (this.stepDistance > (this.isSprinting ? 2.4 : 1.8)) {
          this.stepDistance = 0;
          soundManager.playFootstep();
        }
      }
    } else {
      this.playerVelocity.x *= 0.85;
      this.playerVelocity.z *= 0.85;
    }

    // Jump
    if (this.keys['Space'] && this.isGrounded) {
      this.playerVelocity.y = 10.0 * charDef.jumpMultiplier;
      this.isGrounded = false;
      soundManager.playJump();
    }

    // Jump Pad Collision
    for (const pad of this.arena.jumpPads) {
      if (this.playerPosition.distanceTo(pad.position) < 1.8) {
        this.playerVelocity.y = pad.force;
        this.isGrounded = false;
        soundManager.playJumpPad();
      }
    }

    // Gravity
    this.playerVelocity.y -= 26.0 * dt;

    // Compute next tentative position
    const nextPos = this.playerPosition.clone();
    nextPos.x += this.playerVelocity.x * dt;
    nextPos.z += this.playerVelocity.z * dt;
    nextPos.y += this.playerVelocity.y * dt;

    // Ground floor collision
    const standingEyeHeight = this.isCrouching ? 1.2 : 1.8;
    if (nextPos.y <= standingEyeHeight) {
      nextPos.y = standingEyeHeight;
      this.playerVelocity.y = 0;
      this.isGrounded = true;
    }

    // Arena boundary clamp
    nextPos.x = Math.max(-38.5, Math.min(38.5, nextPos.x));
    nextPos.z = Math.max(-38.5, Math.min(38.5, nextPos.z));

    // Collision against arena obstacles
    const playerRadius = 0.45;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - playerRadius, nextPos.y - standingEyeHeight, nextPos.z - playerRadius),
      new THREE.Vector3(nextPos.x + playerRadius, nextPos.y + 0.2, nextPos.z + playerRadius)
    );

    for (const box of this.arena.colliders) {
      if (box.intersectsBox(playerBox)) {
        // Simple slide collision: test X and Z separately
        const boxX = new THREE.Box3(
          new THREE.Vector3(nextPos.x - playerRadius, this.playerPosition.y - standingEyeHeight, this.playerPosition.z - playerRadius),
          new THREE.Vector3(nextPos.x + playerRadius, this.playerPosition.y + 0.2, this.playerPosition.z + playerRadius)
        );
        if (box.intersectsBox(boxX)) {
          nextPos.x = this.playerPosition.x;
          this.playerVelocity.x = 0;
        }

        const boxZ = new THREE.Box3(
          new THREE.Vector3(this.playerPosition.x - playerRadius, this.playerPosition.y - standingEyeHeight, nextPos.z - playerRadius),
          new THREE.Vector3(this.playerPosition.x + playerRadius, this.playerPosition.y + 0.2, nextPos.z + playerRadius)
        );
        if (box.intersectsBox(boxZ)) {
          nextPos.z = this.playerPosition.z;
          this.playerVelocity.z = 0;
        }
      }
    }

    this.playerPosition.copy(nextPos);
    player.position.x = this.playerPosition.x;
    player.position.y = this.playerPosition.y;
    player.position.z = this.playerPosition.z;

    // Apply rotation to Camera
    this.camera.position.copy(this.playerPosition);
    const euler = new THREE.Euler(this.cameraPitch + this.recoilPitch, this.cameraYaw + this.recoilYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    player.rotation.yaw = this.cameraYaw;
    player.rotation.pitch = this.cameraPitch;
  }

  private updateWeaponViewModel(dt: number, weapon: WeaponDef) {
    // Recoil recovery
    this.recoilPitch = THREE.MathUtils.lerp(this.recoilPitch, 0, dt * 14);
    this.recoilYaw = THREE.MathUtils.lerp(this.recoilYaw, 0, dt * 14);

    // Weapon sway recovery
    this.weaponSway.lerp(new THREE.Vector2(0, 0), dt * 10);

    // Walking bobbing
    const isMoving = Math.abs(this.playerVelocity.x) > 0.5 || Math.abs(this.playerVelocity.z) > 0.5;
    if (isMoving && this.isGrounded) {
      this.walkBob += dt * (this.isSprinting ? 14 : 9);
    } else {
      this.walkBob = THREE.MathUtils.lerp(this.walkBob, 0, dt * 6);
    }

    const bobX = Math.cos(this.walkBob) * 0.015;
    const bobY = Math.sin(this.walkBob * 2) * 0.015;

    // Aim Down Sights (ADS) interpolation
    const targetFov = this.isAimingDownSights ? weapon.zoomFov : this.graphicsSettings.fov;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, dt * 14);
    this.camera.updateProjectionMatrix();

    // Weapon position: centered when ADS, hip-fire offset otherwise
    const targetPos = this.isAimingDownSights
      ? new THREE.Vector3(0, -0.15, -0.38)
      : new THREE.Vector3(0.28 + this.weaponSway.x + bobX, -0.25 + this.weaponSway.y + bobY, -0.55);

    this.weaponMeshGroup.position.lerp(targetPos, dt * 16);
  }

  private updateBots(dt: number) {
    const allCombatants = this.matchSimulator.getCombatantList();

    this.bots.forEach((bot) => {
      bot.update(
        dt,
        this.arena,
        allCombatants,
        (shooter, muzzle, dir, wpn) => {
          // Bot fires
          if (!wpn.isHitscan && wpn.projectileSpeed) {
            this.projectileManager.spawnPlasmaOrb(shooter.id, muzzle, dir, wpn.projectileSpeed, wpn.damage, wpn.splashRadius || 5.0);
          } else {
            // Hitscan check against player & other bots
            this.raycaster.set(muzzle, dir);
            this.raycaster.far = wpn.range;

            const player = this.matchSimulator.getPlayer();
            if (player && player.isAlive && (this.matchSimulator.settings.mode === 'ffa' || player.team !== shooter.team)) {
              const pBox = new THREE.Box3(
                new THREE.Vector3(this.playerPosition.x - 0.5, this.playerPosition.y - 1.8, this.playerPosition.z - 0.5),
                new THREE.Vector3(this.playerPosition.x + 0.5, this.playerPosition.y + 0.2, this.playerPosition.z + 0.5)
              );
              const intersection = this.raycaster.ray.intersectBox(pBox, new THREE.Vector3());
              if (intersection) {
                const colorHex = parseInt(wpn.color.replace('#', '0x'));
                this.particleSystem.createTracerBeam(muzzle, intersection, colorHex, 0.08);
                this.matchSimulator.applyDamage(player.id, wpn.damage, shooter.id, wpn.id, false);
                return;
              }
            }

            // Tracer beam into distance
            const hitPoint = muzzle.clone().addScaledVector(dir, Math.min(30, wpn.range));
            const colorHex = parseInt(wpn.color.replace('#', '0x'));
            this.particleSystem.createTracerBeam(muzzle, hitPoint, colorHex, 0.08);
          }
        },
        (botId) => {
          const b = this.matchSimulator.combatants.get(botId);
          if (b && !b.isReloading) {
            b.isReloading = true;
            b.reloadProgress = 0;
          }
        }
      );
    });
  }

  private updatePickups(dt: number, player: CombatantState) {
    this.arena.pickups.forEach((p) => {
      // Rotation animation
      if (p.mesh) {
        p.mesh.rotation.y += dt * 2.0;
      }

      if (!p.isActive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.isActive = true;
          p.mesh.visible = true;
        }
      } else {
        // Check player distance
        if (this.playerPosition.distanceTo(p.position) < 2.0) {
          if (p.type === 'health' && player.health < player.maxHealth) {
            player.health = Math.min(player.maxHealth, player.health + 40);
            p.isActive = false;
            p.respawnTimer = 20.0; // 20s respawn
            p.mesh.visible = false;
            soundManager.playStim();
          } else if (p.type === 'ammo') {
            const wpn = WEAPON_REGISTRY[player.currentWeaponId];
            player.ammoInMag = wpn.magazineSize;
            player.reserveAmmo += wpn.magazineSize * 2;
            p.isActive = false;
            p.respawnTimer = 15.0;
            p.mesh.visible = false;
            soundManager.playReload();
          }
        }
      }
    });
  }

  // --- LIFECYCLE & SETTINGS ---

  public setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.exitPointerLock();
    }
  }

  public updateGraphicsSettings(newSettings: GraphicsSettings) {
    this.graphicsSettings = newSettings;
    soundManager.setVolumes(newSettings.masterVolume, newSettings.sfxVolume, newSettings.musicVolume);
    if (this.camera) {
      this.camera.fov = newSettings.fov;
      this.camera.updateProjectionMatrix();
    }
    if (this.renderer) {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, newSettings.quality === 'high' ? 2 : 1));
      this.renderer.shadowMap.enabled = newSettings.quality !== 'low';
    }
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.removeEventListeners();
    this.particleSystem.clear();
    this.projectileManager.clear();

    if (this.renderer && this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
