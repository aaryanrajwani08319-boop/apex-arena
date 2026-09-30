import * as THREE from 'three';
import { CombatantState, DifficultyLevel, WeaponDef } from '../types';
import { ArenaData, Waypoint } from '../map/ArenaBuilder';
import { WEAPON_REGISTRY } from '../weapons/WeaponRegistry';
import { CHARACTER_REGISTRY } from '../characters/CharacterRegistry';

export type BotState = 'patrol' | 'engage' | 'cover' | 'pickup';

export class BotController {
  public combatant: CombatantState;
  public difficulty: DifficultyLevel;
  public mesh: THREE.Group;
  public state: BotState = 'patrol';

  private currentWaypointId: number = 0;
  private targetCombatantId: string | null = null;
  private fireTimer = 0;
  private stateTimer = 0;
  private strafeDir = 1;
  private strafeTimer = 0;
  private aimTarget = new THREE.Vector3();
  private velocity = new THREE.Vector3();
  private walkCycle = 0;

  // Visual sub-meshes for animation
  private leftLeg!: THREE.Group;
  private rightLeg!: THREE.Group;
  private rightArm!: THREE.Group;
  private visorMesh!: THREE.Mesh;

  constructor(combatant: CombatantState, difficulty: DifficultyLevel, arena: ArenaData) {
    this.combatant = combatant;
    this.difficulty = difficulty;
    this.mesh = this.buildCharacterMesh();

    // Pick initial random waypoint near spawn
    const waypoints = arena.waypoints;
    const initialWp = waypoints[Math.floor(Math.random() * waypoints.length)];
    this.currentWaypointId = initialWp.id;
  }

  private buildCharacterMesh(): THREE.Group {
    const root = new THREE.Group();

    const charDef = CHARACTER_REGISTRY[this.combatant.characterId] || CHARACTER_REGISTRY.kaelen_voss;
    const skin = charDef.skins[0];

    // Uniform & Armor Colors (Realistic Military / Tactical Spec-Ops)
    const isAlpha = this.combatant.team === 'alpha';
    const isOmega = this.combatant.team === 'omega';
    const uniformColor = isAlpha ? 0x1e3a5f : isOmega ? 0x582414 : 0x27272a; // Camo combat uniform
    const vestColor = isAlpha ? 0x0f2942 : isOmega ? 0x431407 : 0x18181b; // Heavy plate carrier
    const skinTone = 0xd4a373; // Natural human skin tone
    const leatherBlack = 0x18181b; // Tactical gloves, boots, holster
    const metalSteel = 0x334155; // Weapon and buckles
    const goggleColor = isAlpha ? 0x38bdf8 : isOmega ? 0xf97316 : 0x10b981;

    // Materials
    const uniformMat = new THREE.MeshStandardMaterial({ color: uniformColor, roughness: 0.85 });
    const vestMat = new THREE.MeshStandardMaterial({ color: vestColor, roughness: 0.7, metalness: 0.1 });
    const skinMat = new THREE.MeshStandardMaterial({ color: skinTone, roughness: 0.6 });
    const gearMat = new THREE.MeshStandardMaterial({ color: leatherBlack, roughness: 0.7, metalness: 0.2 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: metalSteel, roughness: 0.35, metalness: 0.85 });
    const goggleMat = new THREE.MeshPhysicalMaterial({
      color: goggleColor,
      roughness: 0.1,
      metalness: 0.2,
      transmission: 0.7,
      transparent: true,
      opacity: 0.85,
    });

    // --- 1. TORSO & TACTICAL PLATE CARRIER ---
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.15;

    // Inner uniform torso
    const chestGeo = new THREE.BoxGeometry(0.48, 0.55, 0.28);
    const chest = new THREE.Mesh(chestGeo, uniformMat);
    chest.castShadow = true;
    torsoGroup.add(chest);

    // Ballistic Plate Carrier Vest (Layered over chest)
    const vestGeo = new THREE.BoxGeometry(0.52, 0.48, 0.33);
    const vest = new THREE.Mesh(vestGeo, vestMat);
    vest.position.set(0, 0.02, 0);
    vest.castShadow = true;
    torsoGroup.add(vest);

    // Front Magazine Pouches (MOLLE triple mag pouch)
    for (let m = -1; m <= 1; m++) {
      const pouchGeo = new THREE.BoxGeometry(0.1, 0.18, 0.08);
      const pouch = new THREE.Mesh(pouchGeo, gearMat);
      pouch.position.set(m * 0.13, -0.06, 0.19);
      torsoGroup.add(pouch);

      // Top of magazine visible in pouch
      const magTopGeo = new THREE.BoxGeometry(0.08, 0.06, 0.06);
      const magTop = new THREE.Mesh(magTopGeo, metalMat);
      magTop.position.set(m * 0.13, 0.05, 0.19);
      torsoGroup.add(magTop);
    }

    // Radio Transmitter on left shoulder
    const radioGeo = new THREE.BoxGeometry(0.08, 0.16, 0.07);
    const radio = new THREE.Mesh(radioGeo, gearMat);
    radio.position.set(-0.2, 0.22, 0.1);
    torsoGroup.add(radio);

    const antennaGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.22);
    const antenna = new THREE.Mesh(antennaGeo, metalMat);
    antenna.position.set(-0.2, 0.38, 0.1);
    torsoGroup.add(antenna);

    // Duty Tactical Belt & Holster
    const beltGeo = new THREE.BoxGeometry(0.5, 0.1, 0.3);
    const belt = new THREE.Mesh(beltGeo, gearMat);
    belt.position.set(0, -0.3, 0);
    torsoGroup.add(belt);

    // Sidearm holster on right hip
    const holsterGeo = new THREE.BoxGeometry(0.1, 0.22, 0.12);
    const holster = new THREE.Mesh(holsterGeo, gearMat);
    holster.position.set(0.28, -0.32, 0);
    torsoGroup.add(holster);

    root.add(torsoGroup);

    // --- 2. NECK & HEAD ---
    const neckGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.14, 8);
    const neck = new THREE.Mesh(neckGeo, skinMat);
    neck.position.y = 1.48;
    root.add(neck);

    // Human Head & Face
    const headGeo = new THREE.SphereGeometry(0.18, 12, 12);
    headGeo.scale(1, 1.15, 1.1);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.68;
    head.castShadow = true;
    root.add(head);

    // Tactical Fast Helmet (MICH / FAST High-Cut Style)
    const helmetGeo = new THREE.SphereGeometry(0.21, 12, 12);
    helmetGeo.scale(1.05, 0.95, 1.1);
    const helmet = new THREE.Mesh(helmetGeo, vestMat);
    helmet.position.set(0, 1.76, -0.02);
    helmet.castShadow = true;
    root.add(helmet);

    // Tactical Goggles
    const goggleFrameGeo = new THREE.BoxGeometry(0.24, 0.09, 0.08);
    const goggleFrame = new THREE.Mesh(goggleFrameGeo, gearMat);
    goggleFrame.position.set(0, 1.7, 0.16);
    root.add(goggleFrame);

    const goggleLensGeo = new THREE.BoxGeometry(0.21, 0.065, 0.04);
    this.visorMesh = new THREE.Mesh(goggleLensGeo, goggleMat);
    this.visorMesh.position.set(0, 1.7, 0.19);
    root.add(this.visorMesh);

    // Comms Headset (Earcups on sides of helmet)
    const earcupGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 8);
    earcupGeo.rotateZ(Math.PI / 2);
    const leftEarcup = new THREE.Mesh(earcupGeo, gearMat);
    leftEarcup.position.set(-0.21, 1.7, 0);
    root.add(leftEarcup);

    const rightEarcup = new THREE.Mesh(earcupGeo, gearMat);
    rightEarcup.position.set(0.21, 1.7, 0);
    root.add(rightEarcup);

    // --- 3. LEGS & COMBAT BOOTS ---
    // Left Leg Group
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.16, 0.85, 0);

    const thighGeo = new THREE.BoxGeometry(0.18, 0.42, 0.2);
    const leftThigh = new THREE.Mesh(thighGeo, uniformMat);
    leftThigh.position.set(0, -0.2, 0);
    leftThigh.castShadow = true;
    this.leftLeg.add(leftThigh);

    // Knee protector pad
    const kneeGeo = new THREE.BoxGeometry(0.16, 0.14, 0.08);
    const leftKnee = new THREE.Mesh(kneeGeo, gearMat);
    leftKnee.position.set(0, -0.42, 0.1);
    this.leftLeg.add(leftKnee);

    // Lower shin
    const shinGeo = new THREE.BoxGeometry(0.16, 0.35, 0.18);
    const leftShin = new THREE.Mesh(shinGeo, uniformMat);
    leftShin.position.set(0, -0.58, 0);
    leftShin.castShadow = true;
    this.leftLeg.add(leftShin);

    // Combat boot with front toe
    const bootGeo = new THREE.BoxGeometry(0.17, 0.22, 0.26);
    const leftBoot = new THREE.Mesh(bootGeo, bootMat);
    leftBoot.position.set(0, -0.74, 0.04);
    leftBoot.castShadow = true;
    this.leftLeg.add(leftBoot);

    root.add(this.leftLeg);

    // Right Leg Group
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.16, 0.85, 0);

    const rightThigh = new THREE.Mesh(thighGeo, uniformMat);
    rightThigh.position.set(0, -0.2, 0);
    rightThigh.castShadow = true;
    this.rightLeg.add(rightThigh);

    const rightKnee = new THREE.Mesh(kneeGeo, gearMat);
    rightKnee.position.set(0, -0.42, 0.1);
    this.rightLeg.add(rightKnee);

    const rightShin = new THREE.Mesh(shinGeo, uniformMat);
    rightShin.position.set(0, -0.58, 0);
    rightShin.castShadow = true;
    this.rightLeg.add(rightShin);

    const rightBoot = new THREE.Mesh(bootGeo, bootMat);
    rightBoot.position.set(0, -0.74, 0.04);
    rightBoot.castShadow = true;
    this.rightLeg.add(rightBoot);

    root.add(this.rightLeg);

    // --- 4. ARMS & REALISTIC WEAPON HANDLING ---
    // Left Arm (Assisting grip forward)
    const armSleeveGeo = new THREE.BoxGeometry(0.15, 0.35, 0.16);
    const leftArmGroup = new THREE.Group();
    leftArmGroup.position.set(-0.32, 1.35, 0);

    const leftBicep = new THREE.Mesh(armSleeveGeo, uniformMat);
    leftBicep.position.set(0, -0.15, 0.05);
    leftArmGroup.add(leftBicep);

    const leftForearmGeo = new THREE.BoxGeometry(0.13, 0.32, 0.14);
    const leftForearm = new THREE.Mesh(leftForearmGeo, gearMat);
    leftForearm.position.set(0.12, -0.26, 0.28);
    leftForearm.rotation.set(0.8, -0.4, 0.4);
    leftArmGroup.add(leftForearm);
    root.add(leftArmGroup);

    // Right Arm (Holding weapon grip & trigger)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.32, 1.35, 0);

    const rightBicep = new THREE.Mesh(armSleeveGeo, uniformMat);
    rightBicep.position.set(0, -0.15, 0.05);
    this.rightArm.add(rightBicep);

    const rightForearm = new THREE.Mesh(leftForearmGeo, gearMat);
    rightForearm.position.set(-0.08, -0.25, 0.2);
    rightForearm.rotation.set(0.6, 0.2, -0.2);
    this.rightArm.add(rightForearm);

    // --- REALISTIC WEAPON MESH HELD BY COMBATANT ---
    const gunGroup = this.buildHeldRealisticGun(this.combatant.currentWeaponId);
    gunGroup.position.set(-0.16, -0.22, 0.42);
    this.rightArm.add(gunGroup);

    root.add(this.rightArm);

    // Scale and position
    root.position.set(this.combatant.position.x, this.combatant.position.y, this.combatant.position.z);
    return root;
  }

  private buildHeldRealisticGun(weaponId: string): THREE.Group {
    const gun = new THREE.Group();
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.85 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65, metalness: 0.1 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.9 });

    if (weaponId === 'mp40_sturm') {
      // MASCHINE-40 (Realistic vintage stamped steel SMG)
      // Cylindrical receiver
      const recGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10);
      recGeo.rotateX(Math.PI / 2);
      const rec = new THREE.Mesh(recGeo, gunMat);
      gun.add(rec);

      // Slender barrel & muzzle nut
      const barrelGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.32, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, steelMat);
      barrel.position.set(0, 0, 0.35);
      gun.add(barrel);

      // Under-barrel resting bar
      const barGeo = new THREE.BoxGeometry(0.02, 0.03, 0.25);
      const bar = new THREE.Mesh(barGeo, steelMat);
      bar.position.set(0, -0.03, 0.3);
      gun.add(bar);

      // Straight vertical stick magazine
      const magGeo = new THREE.BoxGeometry(0.035, 0.24, 0.05);
      const mag = new THREE.Mesh(magGeo, steelMat);
      mag.position.set(0, -0.14, 0.1);
      gun.add(mag);

      // Pistol grip
      const gripGeo = new THREE.BoxGeometry(0.04, 0.14, 0.05);
      const grip = new THREE.Mesh(gripGeo, polymerMat);
      grip.position.set(0, -0.1, -0.15);
      grip.rotation.x = -0.35;
      gun.add(grip);

      // Underfolding wire stock
      const stockGeo = new THREE.BoxGeometry(0.06, 0.02, 0.28);
      const stock = new THREE.Mesh(stockGeo, steelMat);
      stock.position.set(0, -0.02, -0.32);
      gun.add(stock);
    } else {
      // MP-5X TACTICAL / STANDARD SMG (Realistic roller-delayed 9mm)
      // Upper cylindrical receiver
      const recGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.42, 10);
      recGeo.rotateX(Math.PI / 2);
      const rec = new THREE.Mesh(recGeo, gunMat);
      gun.add(rec);

      // Ribbed front polymer handguard
      const handguardGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.22, 10);
      handguardGeo.rotateX(Math.PI / 2);
      const handguard = new THREE.Mesh(handguardGeo, polymerMat);
      handguard.position.set(0, -0.01, 0.16);
      gun.add(handguard);

      // Barrel & 3-lug muzzle
      const barrelGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.18, 8);
      barrelGeo.rotateX(Math.PI / 2);
      const barrel = new THREE.Mesh(barrelGeo, steelMat);
      barrel.position.set(0, 0, 0.35);
      gun.add(barrel);

      // Curved 30-round banana magazine
      const magGeo = new THREE.BoxGeometry(0.035, 0.22, 0.06);
      const mag = new THREE.Mesh(magGeo, steelMat);
      mag.position.set(0, -0.13, 0.08);
      mag.rotation.x = 0.25; // Curved forward
      gun.add(mag);

      // Ergonomic tactical pistol grip
      const gripGeo = new THREE.BoxGeometry(0.04, 0.14, 0.06);
      const grip = new THREE.Mesh(gripGeo, polymerMat);
      grip.position.set(0, -0.1, -0.12);
      grip.rotation.x = -0.35;
      gun.add(grip);

      // Hooded front sight ring
      const sightRingGeo = new THREE.TorusGeometry(0.025, 0.005, 6, 12);
      const sightRing = new THREE.Mesh(sightRingGeo, steelMat);
      sightRing.position.set(0, 0.055, 0.28);
      gun.add(sightRing);

      // Telescoping stock dual wire rails
      const stockRailGeo = new THREE.BoxGeometry(0.07, 0.015, 0.26);
      const stock = new THREE.Mesh(stockRailGeo, steelMat);
      stock.position.set(0, 0.01, -0.28);
      gun.add(stock);
    }

    return gun;
  }

  public update(
    dt: number,
    arena: ArenaData,
    allCombatants: CombatantState[],
    onShoot: (shooter: CombatantState, origin: THREE.Vector3, direction: THREE.Vector3, weapon: WeaponDef) => void,
    onReload: (botId: string) => void
  ) {
    if (!this.combatant.isAlive) {
      this.mesh.visible = false;
      return;
    }
    this.mesh.visible = true;

    this.stateTimer += dt;
    this.fireTimer += dt;
    this.strafeTimer += dt;

    // Reload handling if empty
    if (this.combatant.ammoInMag <= 0 && !this.combatant.isReloading) {
      onReload(this.combatant.id);
    }

    const currentPos = new THREE.Vector3(
      this.combatant.position.x,
      this.combatant.position.y,
      this.combatant.position.z
    );

    // Check for nearest enemies in line-of-sight
    let nearestEnemy: CombatantState | null = null;
    let nearestDist = Infinity;

    for (const other of allCombatants) {
      if (other.id === this.combatant.id || !other.isAlive) continue;
      // In TDM check teams, in FFA everyone is enemy
      if (this.combatant.team !== 'neutral' && other.team === this.combatant.team) continue;

      const otherPos = new THREE.Vector3(other.position.x, other.position.y, other.position.z);
      const dist = currentPos.distanceTo(otherPos);

      // Vision range based on difficulty
      const maxVision = this.difficulty === 'hard' ? 70 : this.difficulty === 'normal' ? 55 : 40;
      if (dist < maxVision && dist < nearestDist) {
        nearestDist = dist;
        nearestEnemy = other;
      }
    }

    // State Transitions
    if (this.combatant.health < 40 && Math.random() < 0.3) {
      this.state = 'cover';
    } else if (nearestEnemy) {
      this.state = 'engage';
      this.targetCombatantId = nearestEnemy.id;
    } else {
      this.state = 'patrol';
      this.targetCombatantId = null;
    }

    // AI Execution
    const weapon = WEAPON_REGISTRY[this.combatant.currentWeaponId] || WEAPON_REGISTRY.pulse_carbine;
    let moveTarget = currentPos.clone();
    const charDef = CHARACTER_REGISTRY[this.combatant.characterId] || CHARACTER_REGISTRY.kaelen_voss;
    const baseSpeed = 7.0 * charDef.speedMultiplier * (this.difficulty === 'hard' ? 1.15 : this.difficulty === 'easy' ? 0.85 : 1.0);

    if (this.state === 'engage' && nearestEnemy) {
      const enemyPos = new THREE.Vector3(
        nearestEnemy.position.x,
        nearestEnemy.position.y + 1.2,
        nearestEnemy.position.z
      );

      // Smooth aim tracking with difficulty jitter
      const aimSpeed = this.difficulty === 'hard' ? 12 : this.difficulty === 'normal' ? 7 : 4;
      this.aimTarget.lerp(enemyPos, Math.min(1, dt * aimSpeed));

      // Direction vector to enemy
      const aimDir = this.aimTarget.clone().sub(new THREE.Vector3(currentPos.x, currentPos.y + 1.4, currentPos.z)).normalize();

      // Look at enemy
      this.mesh.lookAt(new THREE.Vector3(this.aimTarget.x, currentPos.y, this.aimTarget.z));
      this.rightArm.rotation.x = Math.atan2(aimDir.y, Math.sqrt(aimDir.x * aimDir.x + aimDir.z * aimDir.z));

      // Tactical combat strafing
      if (this.strafeTimer > (this.difficulty === 'hard' ? 1.0 : 2.0)) {
        this.strafeTimer = 0;
        this.strafeDir *= -1;
      }

      // Perpendicular strafe vector
      const rightVec = new THREE.Vector3(-aimDir.z, 0, aimDir.x).normalize();
      const desiredRange = weapon.category === 'cqb' ? 10 : 22;

      let forwardBias = 0;
      if (nearestDist > desiredRange + 4) forwardBias = 1;
      else if (nearestDist < desiredRange - 4) forwardBias = -1;

      const strafeMove = rightVec.multiplyScalar(this.strafeDir * 0.7)
        .add(aimDir.clone().setY(0).multiplyScalar(forwardBias * 0.5))
        .normalize();

      moveTarget = currentPos.clone().addScaledVector(strafeMove, baseSpeed * dt);

      // Firing weapon
      const fireInterval = 1 / weapon.fireRate;
      if (this.fireTimer >= fireInterval && !this.combatant.isReloading && this.combatant.ammoInMag > 0) {
        this.fireTimer = 0;

        // Apply spread error based on difficulty
        const spreadFactor = this.difficulty === 'hard' ? 0.02 : this.difficulty === 'normal' ? 0.05 : 0.09;
        const fireDir = aimDir.clone();
        fireDir.x += (Math.random() - 0.5) * spreadFactor;
        fireDir.y += (Math.random() - 0.5) * spreadFactor;
        fireDir.z += (Math.random() - 0.5) * spreadFactor;
        fireDir.normalize();

        const muzzlePos = new THREE.Vector3(currentPos.x, currentPos.y + 1.3, currentPos.z).addScaledVector(fireDir, 0.8);
        onShoot(this.combatant, muzzlePos, fireDir, weapon);
      }
    } else {
      // PATROL or RETREAT TO COVER
      const waypoints = arena.waypoints;
      let currWp = waypoints.find((w) => w.id === this.currentWaypointId) || waypoints[0];

      // If reached waypoint, pick next neighbor
      if (currentPos.distanceTo(currWp.position) < 2.5) {
        const nextId = currWp.neighbors[Math.floor(Math.random() * currWp.neighbors.length)];
        this.currentWaypointId = nextId;
        currWp = waypoints.find((w) => w.id === nextId) || currWp;
      }

      const dirToWp = currWp.position.clone().sub(currentPos).setY(0).normalize();
      moveTarget = currentPos.clone().addScaledVector(dirToWp, baseSpeed * dt);

      this.mesh.lookAt(new THREE.Vector3(currWp.position.x, currentPos.y, currWp.position.z));
      this.rightArm.rotation.x = 0;
    }

    // Apply movement & collision with arena walls
    this.applyMovement(currentPos, moveTarget, dt, arena);

    // Natural human walk & run animation
    const isMoving = currentPos.distanceTo(moveTarget) > 0.01;
    if (isMoving) {
      this.walkCycle += dt * 11;
      this.leftLeg.rotation.x = Math.sin(this.walkCycle) * 0.55;
      this.rightLeg.rotation.x = -Math.sin(this.walkCycle) * 0.55;
      // Slight vertical pelvic bob during human run
      this.mesh.position.y += Math.abs(Math.sin(this.walkCycle)) * 0.02;
    } else {
      // Natural idle breathing
      this.leftLeg.rotation.x = 0;
      this.rightLeg.rotation.x = 0;
      this.rightArm.position.y = 1.35 + Math.sin(this.stateTimer * 2.2) * 0.01;
    }

    // Update combatant sync state
    this.combatant.position.x = this.mesh.position.x;
    this.combatant.position.y = this.mesh.position.y;
    this.combatant.position.z = this.mesh.position.z;
    this.combatant.rotation.yaw = this.mesh.rotation.y;
  }

  private applyMovement(currPos: THREE.Vector3, targetPos: THREE.Vector3, dt: number, arena: ArenaData) {
    // Jump pad detection
    for (const pad of arena.jumpPads) {
      if (currPos.distanceTo(pad.position) < 1.6) {
        this.velocity.y = pad.force * 0.7;
      }
    }

    // Gravity
    this.velocity.y -= 22 * dt;
    targetPos.y += this.velocity.y * dt;

    if (targetPos.y <= 0) {
      targetPos.y = 0;
      this.velocity.y = 0;
    }

    // Simple bounds clamp within arena
    targetPos.x = Math.max(-38, Math.min(38, targetPos.x));
    targetPos.z = Math.max(-38, Math.min(38, targetPos.z));

    // Check collision boxes
    const botBox = new THREE.Box3(
      new THREE.Vector3(targetPos.x - 0.45, targetPos.y, targetPos.z - 0.45),
      new THREE.Vector3(targetPos.x + 0.45, targetPos.y + 1.8, targetPos.z + 0.45)
    );

    let blocked = false;
    for (const box of arena.colliders) {
      if (box.intersectsBox(botBox)) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      this.mesh.position.copy(targetPos);
    } else {
      // Slide or pick new waypoint
      this.currentWaypointId = Math.floor(Math.random() * arena.waypoints.length);
    }
  }

  public respawn(spawnPos: THREE.Vector3) {
    this.mesh.position.copy(spawnPos);
    this.combatant.position = { x: spawnPos.x, y: spawnPos.y, z: spawnPos.z };
    this.combatant.health = this.combatant.maxHealth;
    this.combatant.shield = this.combatant.maxShield;
    this.combatant.isAlive = true;
    this.combatant.ammoInMag = WEAPON_REGISTRY[this.combatant.currentWeaponId]?.magazineSize || 30;
    this.state = 'patrol';
    this.velocity.set(0, 0, 0);
  }
}
