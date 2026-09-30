import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { soundManager } from '../audio/AudioSynthesizer';
import { CombatantState } from '../types';

export interface ActiveProjectile {
  id: string;
  shooterId: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  splashRadius: number;
  gravity: number;
  life: number;
  type: 'plasma' | 'grenade';
}

export class ProjectileManager {
  private scene: THREE.Scene;
  private particleSystem: ParticleSystem;
  private projectiles: ActiveProjectile[] = [];
  private plasmaGeo: THREE.SphereGeometry;
  private plasmaMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene, particleSystem: ParticleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.plasmaGeo = new THREE.SphereGeometry(0.3, 12, 12);
    this.plasmaMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
  }

  public spawnPlasmaOrb(
    shooterId: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    speed: number,
    damage: number,
    splashRadius: number
  ) {
    const mesh = new THREE.Mesh(this.plasmaGeo, this.plasmaMat.clone());
    mesh.position.copy(origin);
    this.scene.add(mesh);

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      shooterId,
      mesh,
      position: origin.clone(),
      velocity: direction.clone().multiplyScalar(speed),
      damage,
      splashRadius,
      gravity: 6.0, // slight parabolic drop
      life: 4.0,
      type: 'plasma',
    });
  }

  public spawnGrenade(
    shooterId: string,
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage = 80,
    splashRadius = 6.0
  ) {
    const geo = new THREE.DodecahedronGeometry(0.25);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x0891b2,
      emissiveIntensity: 0.8,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(origin);
    this.scene.add(mesh);

    const initialVel = direction.clone().multiplyScalar(22);
    initialVel.y += 4; // Toss upward arc

    this.projectiles.push({
      id: Math.random().toString(36).substring(2, 9),
      shooterId,
      mesh,
      position: origin.clone(),
      velocity: initialVel,
      damage,
      splashRadius,
      gravity: 18.0,
      life: 2.2, // Explodes after timer or direct contact
      type: 'grenade',
    });
  }

  public update(
    dt: number,
    colliders: THREE.Box3[],
    combatants: CombatantState[],
    onSplashHit: (victimId: string, damage: number, shooterId: string) => void
  ) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      proj.life -= dt;

      // Integrate physics
      proj.velocity.y -= proj.gravity * dt;
      const step = proj.velocity.clone().multiplyScalar(dt);
      const nextPos = proj.position.clone().add(step);

      let collided = false;
      let hitPoint = nextPos.clone();

      // Check ground floor
      if (nextPos.y <= 0.1) {
        collided = true;
        hitPoint.y = 0.1;
      }

      // Check arena geometry colliders
      if (!collided) {
        const seg = new THREE.Line3(proj.position, nextPos);
        for (const box of colliders) {
          if (box.containsPoint(nextPos)) {
            collided = true;
            hitPoint = nextPos;
            break;
          }
        }
      }

      // Check direct combatant body collisions
      if (!collided) {
        for (const c of combatants) {
          if (!c.isAlive || c.id === proj.shooterId) continue;
          const cPos = new THREE.Vector3(c.position.x, c.position.y + 0.9, c.position.z);
          if (cPos.distanceTo(nextPos) < 1.0) {
            collided = true;
            hitPoint = nextPos;
            break;
          }
        }
      }

      // Time expired detonation
      if (proj.life <= 0) {
        collided = true;
      }

      if (collided) {
        // Trigger explosion VFX & Audio
        this.particleSystem.createExplosion(hitPoint, proj.splashRadius);
        soundManager.playExplosion();

        // Calculate area-of-effect splash damage to all alive combatants
        for (const c of combatants) {
          if (!c.isAlive) continue;
          const cPos = new THREE.Vector3(c.position.x, c.position.y + 0.9, c.position.z);
          const dist = cPos.distanceTo(hitPoint);
          if (dist <= proj.splashRadius) {
            // Damage falloff from center
            const falloff = 1 - dist / proj.splashRadius;
            const appliedDamage = Math.round(proj.damage * Math.max(0.25, falloff));
            onSplashHit(c.id, appliedDamage, proj.shooterId);
          }
        }

        // Clean up
        this.scene.remove(proj.mesh);
        proj.mesh.geometry.dispose();
        if (Array.isArray(proj.mesh.material)) {
          proj.mesh.material.forEach((m) => m.dispose());
        } else {
          proj.mesh.material.dispose();
        }
        this.projectiles.splice(i, 1);
      } else {
        // Advance projectile position
        proj.position.copy(nextPos);
        proj.mesh.position.copy(nextPos);
      }
    }
  }

  public clear() {
    this.projectiles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.projectiles = [];
  }
}
