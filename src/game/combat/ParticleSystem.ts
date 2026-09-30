import * as THREE from 'three';

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  initialScale: number;
}

interface TracerBeam {
  line: THREE.Line;
  life: number;
  maxLife: number;
  initialOpacity: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Particle[] = [];
  private tracers: TracerBeam[] = [];
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.particleGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    this.particleMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  }

  public createSparks(position: THREE.Vector3, normal: THREE.Vector3, count = 12, colorHex = 0x38bdf8) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1 });
      const mesh = new THREE.Mesh(this.particleGeo, mat);
      mesh.position.copy(position);

      // Random cone velocity along normal
      const spread = 1.2;
      const velocity = new THREE.Vector3(
        normal.x + (Math.random() - 0.5) * spread,
        normal.y + (Math.random() - 0.5) * spread + 0.5,
        normal.z + (Math.random() - 0.5) * spread
      )
        .normalize()
        .multiplyScalar(4 + Math.random() * 8);

      const life = 0.2 + Math.random() * 0.25;
      this.scene.add(mesh);

      this.particles.push({
        mesh,
        velocity,
        life,
        maxLife: life,
        initialScale: 0.8 + Math.random() * 0.5,
      });
    }
  }

  public createShellCasing(position: THREE.Vector3, rightDir: THREE.Vector3) {
    const casingGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.045, 6);
    const casingMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Brass gold
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 1,
    });
    const mesh = new THREE.Mesh(casingGeo, casingMat);
    mesh.position.copy(position);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    this.scene.add(mesh);

    // Eject to the right and slightly up/back
    const vel = rightDir
      .clone()
      .multiplyScalar(2.5 + Math.random() * 1.5)
      .add(new THREE.Vector3(0, 1.8 + Math.random(), 0));

    this.particles.push({
      mesh,
      velocity: vel,
      life: 1.2,
      maxLife: 1.2,
      initialScale: 1,
    });
  }

  public createShieldDeflection(position: THREE.Vector3, normal: THREE.Vector3) {
    this.createSparks(position, normal, 16, 0x06b6d4); // Cyan energy sparks

    // Expanding energy ring
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 16);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position).addScaledVector(normal, 0.05);
    ring.lookAt(position.clone().add(normal));
    this.scene.add(ring);

    this.particles.push({
      mesh: ring,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0.3,
      maxLife: 0.3,
      initialScale: 1,
    });
  }

  public createExplosion(position: THREE.Vector3, radius: number) {
    // 1. Central flash sphere
    const flashGeo = new THREE.SphereGeometry(radius * 0.6, 12, 12);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xf97316,
      transparent: true,
      opacity: 0.9,
    });
    const flash = new THREE.Mesh(flashGeo, flashMat);
    flash.position.copy(position);
    this.scene.add(flash);

    this.particles.push({
      mesh: flash,
      velocity: new THREE.Vector3(0, 0.5, 0),
      life: 0.35,
      maxLife: 0.35,
      initialScale: 1,
    });

    // 2. Shockwave ring
    const waveGeo = new THREE.RingGeometry(0.2, 0.8, 24);
    const waveMat = new THREE.MeshBasicMaterial({
      color: 0xfdba74,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
    });
    const wave = new THREE.Mesh(waveGeo, waveMat);
    wave.rotation.x = -Math.PI / 2;
    wave.position.copy(position).setY(position.y + 0.1);
    this.scene.add(wave);

    this.particles.push({
      mesh: wave,
      velocity: new THREE.Vector3(0, 0, 0),
      life: 0.4,
      maxLife: 0.4,
      initialScale: 1,
    });

    // 3. Fiery debris
    for (let i = 0; i < 24; i++) {
      const sparkMat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.4 ? 0xf97316 : 0xfacc15,
        transparent: true,
        opacity: 1,
      });
      const sparkMesh = new THREE.Mesh(this.particleGeo, sparkMat);
      sparkMesh.position.copy(position);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        Math.random() * 1.5 + 0.5,
        (Math.random() - 0.5) * 2
      )
        .normalize()
        .multiplyScalar(6 + Math.random() * 12);

      const life = 0.3 + Math.random() * 0.4;
      this.scene.add(sparkMesh);

      this.particles.push({
        mesh: sparkMesh,
        velocity: vel,
        life,
        maxLife: life,
        initialScale: 1.2,
      });
    }
  }

  public createTracerBeam(start: THREE.Vector3, end: THREE.Vector3, colorHex: number, duration = 0.08) {
    const points = [start.clone(), end.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.9,
      linewidth: 2,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      line,
      life: duration,
      maxLife: duration,
      initialOpacity: 0.9,
    });
  }

  public createArcLightning(start: THREE.Vector3, end: THREE.Vector3) {
    // Procedural jagged lightning bolt segments
    const points: THREE.Vector3[] = [];
    const segments = 6;
    const dir = end.clone().sub(start);
    const len = dir.length();
    const step = 1 / segments;

    points.push(start.clone());
    for (let i = 1; i < segments; i++) {
      const mid = start.clone().addScaledVector(dir, i * step);
      const jitter = (Math.random() - 0.5) * 0.4 * (1 - Math.abs(i / segments - 0.5));
      mid.x += jitter;
      mid.y += jitter;
      mid.z += jitter;
      points.push(mid);
    }
    points.push(end.clone());

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 1,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    this.tracers.push({
      line,
      life: 0.12,
      maxLife: 0.12,
      initialOpacity: 1,
    });
  }

  public update(dt: number) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        if (Array.isArray(p.mesh.material)) {
          p.mesh.material.forEach((m) => m.dispose());
        } else {
          p.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
        continue;
      }

      // Physics integration
      p.mesh.position.addScaledVector(p.velocity, dt);
      p.velocity.y -= 14 * dt; // Gravity on debris

      // Fade & scale out
      const progress = p.life / p.maxLife;
      const mat = p.mesh.material as THREE.Material & { opacity?: number };
      if (mat.opacity !== undefined) {
        mat.opacity = progress;
      }
      p.mesh.scale.setScalar(p.initialScale * progress);
    }

    // Update tracers
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;

      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.tracers.splice(i, 1);
        continue;
      }

      const progress = t.life / t.maxLife;
      (t.line.material as THREE.LineBasicMaterial).opacity = t.initialOpacity * progress;
    }
  }

  public clear() {
    this.particles.forEach((p) => {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    });
    this.particles = [];

    this.tracers.forEach((t) => {
      this.scene.remove(t.line);
      t.line.geometry.dispose();
    });
    this.tracers = [];
  }
}
