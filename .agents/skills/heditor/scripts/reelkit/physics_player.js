// physics_player.js: draw a baked Rapier simulation (physics_bake.mjs) at any HyperFrames time.
// Pure function of t: no physics runs in the page, so parallel render workers produce identical frames.
//
//   import { loadBake, applyBake } from "./assets/physics_player.js";
//   const bake = await loadBake("./assets/physics.json");
//   applyBake(bake, meshesById, t);          // sets position/quaternion/visible on THREE.Object3D
//   bakeState(bake, id, t)                   // {p:[x,y,z], q:[x,y,z,w], visible} for custom use
export async function loadBake(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`physics bake ${url}: HTTP ${res.status}`);
  return res.json();
}

function slerp(a, b, k) {
  let [ax, ay, az, aw] = a;
  let [bx, by, bz, bw] = b;
  let cos = ax * bx + ay * by + az * bz + aw * bw;
  if (cos < 0) { bx = -bx; by = -by; bz = -bz; bw = -bw; cos = -cos; }
  let s0 = 1 - k, s1 = k;
  if (cos < 0.9995) {
    const th = Math.acos(cos), sn = Math.sin(th);
    s0 = Math.sin((1 - k) * th) / sn;
    s1 = Math.sin(k * th) / sn;
  }
  const q = [s0 * ax + s1 * bx, s0 * ay + s1 * by, s0 * az + s1 * bz, s0 * aw + s1 * bw];
  const n = Math.hypot(...q) || 1;
  return q.map((v) => v / n);
}

export function bakeState(bake, id, t) {
  const tr = bake.tracks[id];
  const body = bake.bodies[id];
  const f = Math.min(Math.max(t * bake.fps, 0), bake.frames - 1);
  const f0 = Math.floor(f), f1 = Math.min(f0 + 1, bake.frames - 1), k = f - f0;
  const o0 = f0 * 7, o1 = f1 * 7;
  const p = [0, 1, 2].map((i) => tr[o0 + i] + (tr[o1 + i] - tr[o0 + i]) * k);
  const q = slerp(tr.slice(o0 + 3, o0 + 7), tr.slice(o1 + 3, o1 + 7), k);
  return { p, q, visible: t + 1e-6 >= (body.spawn ?? 0) };
}

export function applyBake(bake, meshesById, t) {
  for (const [id, obj] of Object.entries(meshesById)) {
    if (!bake.tracks[id]) continue;
    const s = bakeState(bake, id, t);
    obj.position.set(s.p[0], s.p[1], s.p[2]);
    obj.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
    obj.visible = s.visible;
  }
}
