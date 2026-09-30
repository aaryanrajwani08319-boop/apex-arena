import * as THREE from 'three';

export interface ArenaPickup {
  id: string;
  type: 'health' | 'ammo';
  position: THREE.Vector3;
  mesh: THREE.Group;
  isActive: boolean;
  respawnTimer: number;
}

export interface JumpPad {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  force: number;
}

export interface Waypoint {
  id: number;
  position: THREE.Vector3;
  isCover: boolean;
  isHighGround: boolean;
  neighbors: number[];
}

export interface ArenaData {
  scene: THREE.Group;
  colliders: THREE.Box3[];
  jumpPads: JumpPad[];
  pickups: ArenaPickup[];
  waypoints: Waypoint[];
  spawnPointsAlpha: THREE.Vector3[];
  spawnPointsOmega: THREE.Vector3[];
  spawnPointsFFA: THREE.Vector3[];
  captureZoneCenter: THREE.Vector3;
  captureZoneRadius: number;
  captureRingMesh: THREE.Mesh;
}

export class ArenaBuilder {
  public static buildArena(): ArenaData {
    const arenaGroup = new THREE.Group();
    const colliders: THREE.Box3[] = [];
    const jumpPads: JumpPad[] = [];
    const pickups: ArenaPickup[] = [];

    // --- MATERIALS (Calibrated Sci-Fi Palette) ---
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x111827,
      roughness: 0.65,
      metalness: 0.25,
    });

    const floorTileMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.5,
      metalness: 0.35,
    });

    const wallMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.7,
      metalness: 0.3,
    });

    const wallTrimMaterial = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.4,
      metalness: 0.6,
    });

    const alphaAccentMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });

    const omegaAccentMat = new THREE.MeshStandardMaterial({
      color: 0xea580c,
      emissive: 0xc2410c,
      emissiveIntensity: 0.3,
      roughness: 0.3,
    });

    const crateMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.6,
      metalness: 0.4,
    });

    const energyShieldMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.5,
      transparent: true,
      opacity: 0.4,
      roughness: 0.1,
      metalness: 0.1,
      transmission: 0.6,
    });

    // Helper: add box collider
    const addColliderBox = (min: THREE.Vector3, max: THREE.Vector3) => {
      colliders.push(new THREE.Box3(min.clone(), max.clone()));
    };

    // Helper: add physical wall or obstacle
    const createStructure = (
      width: number,
      height: number,
      depth: number,
      x: number,
      y: number,
      z: number,
      material: THREE.Material,
      receiveShadow = true,
      castShadow = true
    ) => {
      const geo = new THREE.BoxGeometry(width, height, depth);
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set(x, y + height / 2, z);
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      arenaGroup.add(mesh);

      // Add to collision
      const halfW = width / 2;
      const halfD = depth / 2;
      addColliderBox(
        new THREE.Vector3(x - halfW, y, z - halfD),
        new THREE.Vector3(x + halfW, y + height, z + halfD)
      );
      return mesh;
    };

    // 1. GROUND ARENA FLOOR (80m x 80m)
    const groundGeo = new THREE.PlaneGeometry(80, 80);
    const ground = new THREE.Mesh(groundGeo, floorMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    arenaGroup.add(ground);

    // Decorative grid floor patterns
    for (let x = -30; x <= 30; x += 15) {
      for (let z = -30; z <= 30; z += 15) {
        if (Math.abs(x) < 5 && Math.abs(z) < 5) continue; // Keep center clear
        const tile = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorTileMaterial);
        tile.position.set(x, 0.02, z);
        tile.rotation.x = -Math.PI / 2;
        tile.receiveShadow = true;
        arenaGroup.add(tile);
      }
    }

    // 2. PERIMETER BOUNDARY WALLS (Height 8m)
    // North & South (Z = -40, +40)
    createStructure(80, 8, 2, 0, 0, -40, wallMaterial);
    createStructure(80, 8, 2, 0, 0, 40, wallMaterial);
    // East & West (X = -40, +40)
    createStructure(2, 8, 80, -40, 0, 0, wallMaterial);
    createStructure(2, 8, 80, 40, 0, 0, wallMaterial);

    // Team base trim strips on perimeter walls
    const northTrim = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 0.4), alphaAccentMat);
    northTrim.position.set(0, 4, -38.8);
    arenaGroup.add(northTrim);

    const southTrim = new THREE.Mesh(new THREE.BoxGeometry(40, 0.8, 0.4), omegaAccentMat);
    southTrim.position.set(0, 4, 38.8);
    arenaGroup.add(southTrim);

    // 3. CENTRAL MONUMENT & PLAZA (X: [-10, 10], Z: [-10, 10])
    // Central Capture Ring Mesh (Emissive disc)
    const ringGeo = new THREE.RingGeometry(5.2, 5.8, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const captureRingMesh = new THREE.Mesh(ringGeo, ringMat);
    captureRingMesh.rotation.x = -Math.PI / 2;
    captureRingMesh.position.set(0, 0.06, 0);
    arenaGroup.add(captureRingMesh);

    // Central Obelisk / Spire (tactical cover in dead center with 4 cutouts)
    createStructure(3, 7, 3, 0, 0, 0, wallTrimMaterial);
    // Glowing core strips on central obelisk
    const coreGeo = new THREE.BoxGeometry(0.3, 5, 0.3);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    coreMesh.position.set(0, 3.5, 0);
    arenaGroup.add(coreMesh);

    // 4. UPPER CATWALKS / BRIDGES (Height 3.5m)
    // East Platform (X: 18, Z: 0) and West Platform (X: -18, Z: 0)
    createStructure(10, 0.6, 26, 20, 3.5, 0, floorTileMaterial);
    createStructure(10, 0.6, 26, -20, 3.5, 0, floorTileMaterial);

    // Connecting high bridge across the center (Z: 14 and Z: -14)
    createStructure(32, 0.5, 4, 0, 3.5, -16, floorTileMaterial);
    createStructure(32, 0.5, 4, 0, 3.5, 16, floorTileMaterial);

    // Bridge Guardrails
    const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8 });
    createStructure(32, 1.1, 0.2, 0, 4.0, -17.9, railMat);
    createStructure(32, 1.1, 0.2, 0, 4.0, -14.1, railMat);
    createStructure(32, 1.1, 0.2, 0, 4.0, 14.1, railMat);
    createStructure(32, 1.1, 0.2, 0, 4.0, 17.9, railMat);

    // Support pillars for catwalks
    [-20, 20].forEach((px) => {
      [-10, 0, 10].forEach((pz) => {
        createStructure(1.2, 3.5, 1.2, px, 0, pz, wallTrimMaterial);
      });
    });

    // 5. STAIRWAYS / RAMPS
    // East Ramp leading to catwalk (East side)
    const rampSlopeGeo = new THREE.BoxGeometry(8, 0.5, 10);
    const ramp1 = new THREE.Mesh(rampSlopeGeo, floorTileMaterial);
    ramp1.position.set(20, 1.75, 18);
    ramp1.rotation.x = Math.atan2(3.5, 10);
    ramp1.castShadow = true;
    ramp1.receiveShadow = true;
    arenaGroup.add(ramp1);
    addColliderBox(new THREE.Vector3(16, 0, 13), new THREE.Vector3(24, 3.5, 23));

    // West Ramp leading to catwalk (West side)
    const ramp2 = new THREE.Mesh(rampSlopeGeo, floorTileMaterial);
    ramp2.position.set(-20, 1.75, -18);
    ramp2.rotation.x = -Math.atan2(3.5, 10);
    ramp2.castShadow = true;
    ramp2.receiveShadow = true;
    arenaGroup.add(ramp2);
    addColliderBox(new THREE.Vector3(-24, 0, -23), new THREE.Vector3(-16, 3.5, -13));

    // 6. SCI-FI COVER CRATES & BARRICADES
    const coverLocations = [
      // Central ring covers
      { x: -7, z: -5, w: 2.2, h: 1.6, d: 1.2, r: 0.3 },
      { x: 7, z: 5, w: 2.2, h: 1.6, d: 1.2, r: -0.4 },
      { x: -6, z: 6, w: 1.8, h: 1.6, d: 2.4, r: 0.1 },
      { x: 6, z: -6, w: 1.8, h: 1.6, d: 2.4, r: -0.2 },

      // Mid-field tactical blocks
      { x: -14, z: -10, w: 3.5, h: 2.2, d: 1.4, r: 0 },
      { x: 14, z: 10, w: 3.5, h: 2.2, d: 1.4, r: 0 },
      { x: 14, z: -10, w: 3.5, h: 2.2, d: 1.4, r: 0 },
      { x: -14, z: 10, w: 3.5, h: 2.2, d: 1.4, r: 0 },

      // Base defensive bunkers
      { x: -10, z: -28, w: 5, h: 2.5, d: 1.8, r: 0 },
      { x: 10, z: -28, w: 5, h: 2.5, d: 1.8, r: 0 },
      { x: -10, z: 28, w: 5, h: 2.5, d: 1.8, r: 0 },
      { x: 10, z: 28, w: 5, h: 2.5, d: 1.8, r: 0 },
    ];

    coverLocations.forEach((c) => {
      createStructure(c.w, c.h, c.d, c.x, 0, c.z, crateMaterial);
    });

    // 7. ENERGY FORCEFIELD SHIELD WALLS (Semi-transparent cover)
    const shield1 = createStructure(6, 2.4, 0.3, 0, 0, -22, energyShieldMat, false, false);
    const shield2 = createStructure(6, 2.4, 0.3, 0, 0, 22, energyShieldMat, false, false);
    shield1.name = 'energy_shield';
    shield2.name = 'energy_shield';

    // 8. JUMP PADS (Launch player/bots up to upper catwalks)
    const padLocations = [
      { pos: new THREE.Vector3(-10, 0.1, 0), dir: new THREE.Vector3(0, 1, 0), force: 16 },
      { pos: new THREE.Vector3(10, 0.1, 0), dir: new THREE.Vector3(0, 1, 0), force: 16 },
    ];

    padLocations.forEach((pad) => {
      const padGeo = new THREE.CylinderGeometry(1.4, 1.6, 0.2, 16);
      const padMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x38bdf8,
        emissiveIntensity: 0.6,
        roughness: 0.2,
      });
      const padMesh = new THREE.Mesh(padGeo, padMat);
      padMesh.position.copy(pad.pos);
      arenaGroup.add(padMesh);

      jumpPads.push({
        position: pad.pos.clone(),
        direction: pad.dir.clone(),
        force: pad.force,
      });
    });

    // 9. PICKUP STATIONS (Health & Ammo)
    const createPickupMesh = (type: 'health' | 'ammo'): THREE.Group => {
      const grp = new THREE.Group();
      if (type === 'health') {
        const podGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
        const podMat = new THREE.MeshStandardMaterial({
          color: 0x10b981,
          emissive: 0x059669,
          emissiveIntensity: 0.5,
          roughness: 0.2,
        });
        const mesh = new THREE.Mesh(podGeo, podMat);
        grp.add(mesh);
      } else {
        const ammoGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.8, 8);
        const ammoMat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.5,
          roughness: 0.2,
        });
        const mesh = new THREE.Mesh(ammoGeo, ammoMat);
        grp.add(mesh);
      }
      return grp;
    };

    const pickupDefs: { id: string; type: 'health' | 'ammo'; pos: THREE.Vector3 }[] = [
      { id: 'hp_north', type: 'health', pos: new THREE.Vector3(0, 1.2, -32) },
      { id: 'hp_south', type: 'health', pos: new THREE.Vector3(0, 1.2, 32) },
      { id: 'hp_east', type: 'health', pos: new THREE.Vector3(30, 1.2, 0) },
      { id: 'hp_west', type: 'health', pos: new THREE.Vector3(-30, 1.2, 0) },
      { id: 'ammo_catwalk_e', type: 'ammo', pos: new THREE.Vector3(20, 4.5, 0) },
      { id: 'ammo_catwalk_w', type: 'ammo', pos: new THREE.Vector3(-20, 4.5, 0) },
      { id: 'ammo_bridge_n', type: 'ammo', pos: new THREE.Vector3(0, 4.5, -16) },
      { id: 'ammo_bridge_s', type: 'ammo', pos: new THREE.Vector3(0, 4.5, 16) },
    ];

    pickupDefs.forEach((p) => {
      const mesh = createPickupMesh(p.type);
      mesh.position.copy(p.pos);
      arenaGroup.add(mesh);
      pickups.push({
        id: p.id,
        type: p.type,
        position: p.pos.clone(),
        mesh,
        isActive: true,
        respawnTimer: 0,
      });
    });

    // 10. SPAWN POINTS
    const spawnPointsAlpha = [
      new THREE.Vector3(-15, 0.8, -32),
      new THREE.Vector3(0, 0.8, -35),
      new THREE.Vector3(15, 0.8, -32),
      new THREE.Vector3(-8, 0.8, -30),
      new THREE.Vector3(8, 0.8, -30),
    ];

    const spawnPointsOmega = [
      new THREE.Vector3(-15, 0.8, 32),
      new THREE.Vector3(0, 0.8, 35),
      new THREE.Vector3(15, 0.8, 32),
      new THREE.Vector3(-8, 0.8, 30),
      new THREE.Vector3(8, 0.8, 30),
    ];

    const spawnPointsFFA = [
      ...spawnPointsAlpha,
      ...spawnPointsOmega,
      new THREE.Vector3(30, 0.8, 15),
      new THREE.Vector3(-30, 0.8, 15),
      new THREE.Vector3(30, 0.8, -15),
      new THREE.Vector3(-30, 0.8, -15),
      new THREE.Vector3(20, 4.2, 5),
      new THREE.Vector3(-20, 4.2, -5),
    ];

    // 11. STRATEGIC AI WAYPOINT GRAPH
    const waypoints: Waypoint[] = [
      // Central Zone
      { id: 0, position: new THREE.Vector3(0, 0.8, 0), isCover: false, isHighGround: false, neighbors: [1, 2, 3, 4] },
      { id: 1, position: new THREE.Vector3(0, 0.8, -7), isCover: true, isHighGround: false, neighbors: [0, 5, 6, 17] },
      { id: 2, position: new THREE.Vector3(0, 0.8, 7), isCover: true, isHighGround: false, neighbors: [0, 7, 8, 18] },
      { id: 3, position: new THREE.Vector3(-7, 0.8, 0), isCover: true, isHighGround: false, neighbors: [0, 5, 7, 19] },
      { id: 4, position: new THREE.Vector3(7, 0.8, 0), isCover: true, isHighGround: false, neighbors: [0, 6, 8, 20] },

      // Mid-field cover
      { id: 5, position: new THREE.Vector3(-12, 0.8, -10), isCover: true, isHighGround: false, neighbors: [1, 3, 9, 13] },
      { id: 6, position: new THREE.Vector3(12, 0.8, -10), isCover: true, isHighGround: false, neighbors: [1, 4, 10, 14] },
      { id: 7, position: new THREE.Vector3(-12, 0.8, 10), isCover: true, isHighGround: false, neighbors: [2, 3, 11, 15] },
      { id: 8, position: new THREE.Vector3(12, 0.8, 10), isCover: true, isHighGround: false, neighbors: [2, 4, 12, 16] },

      // North & South Bases
      { id: 9, position: new THREE.Vector3(-15, 0.8, -28), isCover: true, isHighGround: false, neighbors: [5, 17] },
      { id: 10, position: new THREE.Vector3(15, 0.8, -28), isCover: true, isHighGround: false, neighbors: [6, 17] },
      { id: 11, position: new THREE.Vector3(-15, 0.8, 28), isCover: true, isHighGround: false, neighbors: [7, 18] },
      { id: 12, position: new THREE.Vector3(15, 0.8, 28), isCover: true, isHighGround: false, neighbors: [8, 18] },

      // East & West wings
      { id: 13, position: new THREE.Vector3(-28, 0.8, -10), isCover: false, isHighGround: false, neighbors: [5, 19] },
      { id: 14, position: new THREE.Vector3(28, 0.8, -10), isCover: false, isHighGround: false, neighbors: [6, 20] },
      { id: 15, position: new THREE.Vector3(-28, 0.8, 10), isCover: false, isHighGround: false, neighbors: [7, 19] },
      { id: 16, position: new THREE.Vector3(28, 0.8, 10), isCover: false, isHighGround: false, neighbors: [8, 20] },

      // Health pick hubs
      { id: 17, position: new THREE.Vector3(0, 0.8, -32), isCover: true, isHighGround: false, neighbors: [1, 9, 10] },
      { id: 18, position: new THREE.Vector3(0, 0.8, 32), isCover: true, isHighGround: false, neighbors: [2, 11, 12] },
      { id: 19, position: new THREE.Vector3(-30, 0.8, 0), isCover: true, isHighGround: false, neighbors: [3, 13, 15] },
      { id: 20, position: new THREE.Vector3(30, 0.8, 0), isCover: true, isHighGround: false, neighbors: [4, 14, 16] },

      // High Ground Catwalks
      { id: 21, position: new THREE.Vector3(20, 4.2, 0), isCover: false, isHighGround: true, neighbors: [20, 22, 23] },
      { id: 22, position: new THREE.Vector3(0, 4.2, 16), isCover: true, isHighGround: true, neighbors: [21, 24] },
      { id: 23, position: new THREE.Vector3(0, 4.2, -16), isCover: true, isHighGround: true, neighbors: [21, 24] },
      { id: 24, position: new THREE.Vector3(-20, 4.2, 0), isCover: false, isHighGround: true, neighbors: [19, 22, 23] },
    ];

    return {
      scene: arenaGroup,
      colliders,
      jumpPads,
      pickups,
      waypoints,
      spawnPointsAlpha,
      spawnPointsOmega,
      spawnPointsFFA,
      captureZoneCenter: new THREE.Vector3(0, 0, 0),
      captureZoneRadius: 5.5,
      captureRingMesh,
    };
  }
}
