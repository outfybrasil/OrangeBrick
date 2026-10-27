// physics_bake.mjs: bake a rigid-body simulation (Rapier, Apache-2.0) into per-frame transforms.
//
// HyperFrames renders frames out of order in parallel workers, so a physics engine cannot run inside the page:
// the page must be able to draw any time t on its own. We simulate once here, at a fixed step, and store
// position + quaternion of every body for every video frame. The page (physics_player.js) only reads the bake.
//
// Usage: node physics_bake.mjs <scene.json> <out.json>
// Scene format: see references/physics-3d.md.
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const home = process.env.HEDITOR_HOME || path.join(process.env.HOME, ".heditor");
const require = createRequire(path.join(home, "node", "package.json"));
const RAPIER = require("@dimforge/rapier3d-compat");

const [, , scenePath, outPath] = process.argv;
if (!scenePath || !outPath) {
  console.error("usage: node physics_bake.mjs <scene.json> <out.json>");
  process.exit(2);
}
const scene = JSON.parse(fs.readFileSync(scenePath, "utf8"));
const fps = scene.fps ?? 30;
const duration = scene.duration;
const substeps = scene.substeps ?? 4;
const nFrames = Math.round(duration * fps) + 1;
const dt = 1 / (fps * substeps);
const DEG = Math.PI / 180;

function quatFromEuler([x = 0, y = 0, z = 0] = []) {
  // XYZ order, degrees (same convention as THREE.Euler default)
  const [cx, sx] = [Math.cos((x * DEG) / 2), Math.sin((x * DEG) / 2)];
  const [cy, sy] = [Math.cos((y * DEG) / 2), Math.sin((y * DEG) / 2)];
  const [cz, sz] = [Math.cos((z * DEG) / 2), Math.sin((z * DEG) / 2)];
  return {
    x: sx * cy * cz + cx * sy * sz,
    y: cx * sy * cz - sx * cy * sz,
    z: cx * cy * sz + sx * sy * cz,
    w: cx * cy * cz - sx * sy * sz,
  };
}

function colliderDesc(def) {
  const s = def.size || [];
  let d;
  switch (def.shape ?? "box") {
    case "box":
      d = RAPIER.ColliderDesc.cuboid(s[0] / 2, s[1] / 2, s[2] / 2);
      break;
    case "roundbox": {
      const r = def.radius ?? Math.min(...s) * 0.12;
      d = RAPIER.ColliderDesc.roundCuboid(s[0] / 2 - r, s[1] / 2 - r, s[2] / 2 - r, r);
      break;
    }
    case "ball":
      d = RAPIER.ColliderDesc.ball(def.radius);
      break;
    case "capsule":
      d = RAPIER.ColliderDesc.capsule(def.halfHeight, def.radius);
      break;
    case "cylinder":
      d = RAPIER.ColliderDesc.cylinder(def.halfHeight, def.radius);
      break;
    default:
      throw new Error(`unknown shape ${def.shape}`);
  }
  return d
    .setFriction(def.friction ?? 0.6)
    .setRestitution(def.restitution ?? 0.25)
    .setDensity(def.density ?? 1.0);
}

await RAPIER.init();
const g = scene.gravity ?? [0, -9.81, 0];
const world = new RAPIER.World({ x: g[0], y: g[1], z: g[2] });
world.timestep = dt;

for (const st of scene.static ?? []) {
  const rb = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(...(st.pos ?? [0, 0, 0]))
      .setRotation(quatFromEuler(st.rot)),
  );
  world.createCollider(colliderDesc(st), rb);
}

const bodies = (scene.bodies ?? []).map((def) => ({ def, rb: null, spawn: def.spawn ?? 0 }));
const ids = bodies.map((b, i) => b.def.id ?? `b${i}`);
if (new Set(ids).size !== ids.length) throw new Error("body ids must be unique");
const tracks = Object.fromEntries(ids.map((id) => [id, new Array(nFrames * 7)]));
const impulses = [...(scene.impulses ?? [])].sort((a, b) => a.t - b.t);

function spawnBody(b) {
  const d = b.def;
  const desc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(...d.pos)
    .setRotation(quatFromEuler(d.rot))
    .setLinvel(...(d.vel ?? [0, 0, 0]))
    .setAngvel({ x: (d.angvel ?? [0, 0, 0])[0], y: (d.angvel ?? [0, 0, 0])[1], z: (d.angvel ?? [0, 0, 0])[2] })
    .setLinearDamping(d.linearDamping ?? 0.05)
    .setAngularDamping(d.angularDamping ?? 0.1)
    .setCcdEnabled(d.ccd ?? true);
  // "lock": "rotation" keeps the body upright (clean towers, labels facing the camera);
  // "vertical" also locks x and z translation (a perfectly straight stack that later impacts cannot topple)
  if (d.lock === "rotation" || d.lock === "vertical") desc.lockRotations().setAngvel({ x: 0, y: 0, z: 0 });
  if (d.lock === "vertical") desc.enabledTranslations(false, true, false).setLinvel(0, (d.vel ?? [0, 0, 0])[1], 0);
  if (d.lockRotationAxes) {
    const av = d.angvel ?? [0, 0, 0];
    desc.enabledRotations(...d.lockRotationAxes.map((v) => !v))
      .setAngvel({ x: d.lockRotationAxes[0] ? 0 : av[0], y: d.lockRotationAxes[1] ? 0 : av[1], z: d.lockRotationAxes[2] ? 0 : av[2] });
  }
  b.rb = world.createRigidBody(desc);
  world.createCollider(colliderDesc(d), b.rb);
}

function record(frame) {
  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    const tr = tracks[ids[i]];
    let p, q;
    if (b.rb) {
      p = b.rb.translation();
      q = b.rb.rotation();
    } else {
      p = { x: b.def.pos[0], y: b.def.pos[1], z: b.def.pos[2] };
      q = quatFromEuler(b.def.rot);
    }
    const o = frame * 7;
    tr[o] = +p.x.toFixed(4); tr[o + 1] = +p.y.toFixed(4); tr[o + 2] = +p.z.toFixed(4);
    tr[o + 3] = +q.x.toFixed(5); tr[o + 4] = +q.y.toFixed(5); tr[o + 5] = +q.z.toFixed(5); tr[o + 6] = +q.w.toFixed(5);
  }
}

let step = 0;
let nextImpulse = 0;
let maxSpeedEnd = 0;
for (let frame = 0; frame < nFrames; frame++) {
  const tFrame = frame / fps;
  for (const b of bodies) if (!b.rb && b.spawn <= tFrame + 1e-9) spawnBody(b);
  record(frame);
  if (frame === nFrames - 1) break;
  for (let s = 0; s < substeps; s++, step++) {
    const t = step * dt;
    while (nextImpulse < impulses.length && impulses[nextImpulse].t <= t + 1e-9) {
      const im = impulses[nextImpulse++];
      if (im.unlock) {
        // release locked rotations (e.g. labels kept readable while falling, free to tumble after a blast)
        const ax = im.unlock === true ? [true, true, true] : im.unlock;
        for (const b of bodies) if (b.rb && b.def.lock !== "vertical") b.rb.setEnabledRotations(ax[0], ax[1], ax[2], true);
        if (!im.radius && !im.impulse) continue;
      }
      for (const b of bodies) {
        if (!b.rb) continue;
        const p = b.rb.translation();
        const bid = b.def.id ?? "";
        if (im.id && bid !== im.id) continue;
        if (im.exclude && im.exclude.includes(bid)) continue;
        if (im.radius !== undefined) {
          // radial blast: impulse ∝ (1 - d/r) away from centre, plus a lift
          const c = im.center ?? [0, 0, 0];
          const v = [p.x - c[0], p.y - c[1], p.z - c[2]];
          const dist = Math.hypot(...v);
          if (dist > im.radius || dist === 0) continue;
          const k = (im.strength ?? 6) * (1 - dist / im.radius) * b.rb.mass();
          b.rb.applyImpulse({ x: (v[0] / dist) * k, y: (v[1] / dist) * k + (im.lift ?? 0) * k, z: (v[2] / dist) * k }, true);
        } else if (im.impulse) {
          b.rb.applyImpulse({ x: im.impulse[0], y: im.impulse[1], z: im.impulse[2] }, true);
        }
      }
    }
    world.step();
  }
}
for (const b of bodies) if (b.rb) maxSpeedEnd = Math.max(maxSpeedEnd, Math.hypot(...Object.values(b.rb.linvel())));

const bake = {
  version: 1,
  engine: `rapier3d-compat ${RAPIER.version()}`,
  fps, duration, frames: nFrames, substeps,
  bodies: Object.fromEntries(bodies.map((b, i) => [ids[i], {
    spawn: b.spawn, shape: b.def.shape ?? "box", size: b.def.size, radius: b.def.radius,
    halfHeight: b.def.halfHeight, tag: b.def.tag ?? null,
  }])),
  tracks,
};
fs.writeFileSync(outPath, JSON.stringify(bake));
console.log(JSON.stringify({ out: outPath, bodies: ids.length, frames: nFrames, steps: step,
  impulses: impulses.length, max_speed_end: +maxSpeedEnd.toFixed(3), bytes: fs.statSync(outPath).size }));
