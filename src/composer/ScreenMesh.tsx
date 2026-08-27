"use client";

import { useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The screen's WELL, as real geometry (TECH-STACK.md, Phase 3).
 *
 * A recess is four sloped walls around a floor, and the whole reason it reads
 * as sunken is that those walls face different directions and therefore catch
 * different amounts of light. CSS can only approximate that with inset shadows
 * hand-tuned per edge — which is what BACKLOG.md §A2 has been about since the
 * v9 prototype, and why the snub-in kept looking "slightly off". Here the
 * shading is not authored at all: the walls are lit, and the gradient across
 * each one is whatever the geometry and the light actually produce.
 *
 * DECORATION ONLY, AND DELIBERATELY SO. The drawing grid stays a DOM/SVG layer
 * on top of this canvas, owning every pointer event, every key, and the whole
 * accessibility tree — the rule from CLAUDE.md §5 and INTERACTION.md §8 that
 * editing must never be trapped inside a canvas with no fallback. Lose WebGL
 * and you lose the walls' shading; you lose nothing you can do.
 *
 * ORTHOGRAPHIC, not perspective. The floor has to line up exactly with a DOM
 * element sitting over it, and any perspective divide makes that alignment
 * depend on the camera distance agreeing with a CSS percentage — two numbers
 * that will drift. Straight-on, the mapping is the identity.
 */

/** Half-extent of the floor; the opening is 1, so the walls take the rest. */
const FLOOR = 0.92;
/** How far the floor sits behind the opening. */
const DEPTH = 0.16;

function useWellGeometry() {
  return useMemo(() => {
    const f = FLOOR;
    const d = -DEPTH;
    const points: number[] = [];

    /* Wound counter-clockwise as seen from the camera, so the faces that show
       are front faces and the material's `side` stays a safeguard rather than
       the thing making the mesh visible at all. */
    const quad = (
      a: [number, number, number],
      b: [number, number, number],
      c: [number, number, number],
      e: [number, number, number],
    ) => points.push(...a, ...b, ...c, ...a, ...c, ...e);

    quad([-f, -f, d], [f, -f, d], [f, f, d], [-f, f, d]); // floor
    quad([-1, 1, 0], [-f, f, d], [f, f, d], [1, 1, 0]); // top wall
    quad([1, 1, 0], [f, f, d], [f, -f, d], [1, -1, 0]); // right wall
    quad([1, -1, 0], [f, -f, d], [-f, -f, d], [-1, -1, 0]); // bottom wall
    quad([-1, -1, 0], [-f, -f, d], [-f, f, d], [-1, 1, 0]); // left wall

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    geometry.computeVertexNormals();
    return geometry;
  }, []);
}

/**
 * R3F sizes an orthographic frustum in PIXELS — left = -width/2, and so on — so
 * scaling the unit geometry by half the canvas width maps [-1, 1] onto the
 * element exactly, and keeps doing so through a resize.
 */
function Well({ color }: { color: string }) {
  const geometry = useWellGeometry();
  const size = useThree((state) => state.size);

  return (
    <group scale={size.width / 2}>
      <mesh geometry={geometry}>
        <meshStandardMaterial color={color} roughness={0.86} metalness={0} />
      </mesh>
    </group>
  );
}

export default function ScreenMesh({ color }: { color: string }) {
  return (
    <Canvas
      orthographic
      /* Pinned rather than inherited. R3F drives an orthographic frustum from
         the canvas size in PIXELS (left = -width/2, and so on) at zoom 1, which
         is what makes `scale = width / 2` map the unit geometry onto the
         element exactly. The clip planes are stated so the well — whose depth
         scales with that same factor — can never fall outside them if an
         upstream default moves. */
      camera={{ position: [0, 0, 1000], near: 0.1, far: 4000, zoom: 1 }}
      /* Nothing here animates, so one frame is the whole cost. */
      frameloop="demand"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      /* No tone mapping: R3F would otherwise apply ACES, which is built to roll
         off an HDR scene and here only caps a near-white screen at about 205
         and mutes the walls it is meant to be separating. */
      flat
      className="toy-well-canvas"
    >
      {/* Intensities carry a factor of PI, because meshStandardMaterial's
          BRDF_Lambert divides by it — ambient included. Set so the FLOOR lands
          on the screen token's own colour and the top wall falls to roughly 166
          against it: a real shadow, but nowhere near dark enough to read as
          dirt on a near-white surface. */}
      <ambientLight intensity={1.2} />
      {/* Above and slightly left, like every other light on the toy. Mostly
          head-on, which is what keeps the floor at full colour while still
          turning the four walls away from it by different amounts. */}
      <directionalLight position={[-0.5, 1.1, 1.6]} intensity={2.35} />
      <Well color={color} />
    </Canvas>
  );
}
