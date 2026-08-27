"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The knob's dial.
 *
 * SHAPE: a smooth disc with a wide rounded shoulder falling away to the rim,
 * and a shallow dished face recessed inside it. No milling — the reference is a
 * moulded control knob, not a serrated Etch A Sketch dial, and the form does
 * all the work: the shoulder catches the key light as a bright crescent while
 * the dish, being concave, gathers its highlight on the LOWER interior wall.
 * Those two opposed gradients are what read as "raised rim, sunken face"; a
 * flat disc with a painted ring cannot fake it at any size.
 *
 * BUILT AS ONE LATHE, FULL STOP — dish, lip, shoulder and the skirt down the
 * side are a single revolved profile, and there is no second mesh behind it.
 *
 * There WAS one, and it silently erased the knob. A cylinder for the body puts a
 * flat cap across its whole top, and that cap sat in front of the dish at every
 * radius except the lip itself — so the shoulder and the entire dished face were
 * occluded and the knob rendered as a plain white disc with a mark on it. The
 * failure is invisible from the code: both meshes are correct, correctly lit,
 * and in the right place; only their depths relative to each other are wrong.
 * The bowl needs no plug anyway — it is convex-open toward the camera, so every
 * ray through it lands on the surface and there is nothing to see through.
 *
 * The profile starts at a small flat centre rather than exactly r=0: a lathe
 * swept from the axis produces a fan of degenerate triangles whose normals are
 * undefined, and that renders as a dark dot in the middle of the dish.
 *
 * VISUAL ONLY. Pointer, keyboard and ARIA live on the DOM slider layered over
 * this canvas (see Knob.tsx); losing WebGL costs appearance and nothing else.
 */

/* Proportions and lighting were tuned against an analytic render of this exact
   surface — same profile, same three lights, linear shading encoded to sRGB the
   way three.js does — because a smooth white knob has no high-frequency detail
   to hide behind. The first attempt at these numbers rendered as a featureless
   white disc: a dish only 0.075 deep tilts its normal by 11 degrees, which under
   ambient 0.62 plus a key of 1.85 on a #ffffff material is entirely above the
   clipping point — the dish had to get about three times deeper before the
   surface described itself at all. */
const BODY_RADIUS = 1; // the rim, widest point
const FACE_RADIUS = 0.76; // where the dish ends and the shoulder begins
const DISH_DEPTH = 0.24; // how far the face sinks below the lip
const SHOULDER_DROP = 0.2; // how far the shoulder falls from lip to rim
const SKIRT = 0.26; // the side wall below the rim

/* The lip is the origin, so every depth below is measured from the one edge the
   eye actually reads — and the pointer, which lives outside the rotated group,
   can be placed at z = 0 without a chain of offsets to get wrong. */

/** Dish, lip and shoulder as one revolved profile. */
function useFaceGeometry() {
  return useMemo(() => {
    const profile: THREE.Vector2[] = [new THREE.Vector2(0, -DISH_DEPTH)];

    // The dish: QUARTIC, not parabolic. Both are flat at the centre and steep
    // at the lip, but a fourth power doubles the slope where it matters and
    // flattens the middle — which is both what the reference knob looks like
    // and what gives the dish its own shading. Seen rendered for the first
    // time, the parabolic version spanned only 34 levels across the dish and
    // read as a plain white disc with an edge; this spans 58.
    const DISH_STEPS = 26;
    for (let i = 1; i <= DISH_STEPS; i++) {
      const t = i / DISH_STEPS;
      profile.push(
        new THREE.Vector2(t * FACE_RADIUS, -DISH_DEPTH * (1 - t * t * t * t)),
      );
    }

    // The shoulder: a quarter-round from the lip out to the rim. Swept on a
    // sine/cosine pair rather than a straight chamfer, so the surface normal
    // turns continuously and the crescent highlight has somewhere to sit.
    const SHOULDER_STEPS = 18;
    for (let i = 1; i <= SHOULDER_STEPS; i++) {
      const t = (i / SHOULDER_STEPS) * (Math.PI / 2);
      profile.push(
        new THREE.Vector2(
          FACE_RADIUS + (BODY_RADIUS - FACE_RADIUS) * Math.sin(t),
          -SHOULDER_DROP * (1 - Math.cos(t)),
        ),
      );
    }

    // The skirt: straight down the outside. It closes the silhouette when the
    // knob is tilted, and it is what the seating shadow lands against.
    profile.push(new THREE.Vector2(BODY_RADIUS, -SHOULDER_DROP - SKIRT));

    // REVERSED, and this is not cosmetic. A lathe swept from the axis outward
    // winds so that every normal on the face points AWAY from the camera — the
    // knob then only lights correctly because `side: DoubleSide` flips the
    // normal for back-facing fragments. That works until someone removes
    // DoubleSide and the whole knob goes black for no visible reason. Reversing
    // the profile makes the front faces genuinely front, so the material's
    // `side` goes back to being what its own comment claims: insurance for the
    // skirt when the knob is tilted.
    const geometry = new THREE.LatheGeometry(profile.reverse(), 128);
    geometry.computeVertexNormals();

    // The one vertex ON the axis has no well-defined averaged normal — its
    // surrounding triangles fan out in every direction and cancel. Left alone
    // it renders as a dark speck in the dead centre of the dish. The correct
    // normal there is simply the axis: the bottom of a bowl faces the viewer.
    const position = geometry.attributes.position;
    const normal = geometry.attributes.normal;
    for (let i = 0; i < position.count; i++) {
      if (Math.hypot(position.getX(i), position.getZ(i)) < 1e-6) {
        normal.setXYZ(i, 0, 1, 0);
      }
    }
    normal.needsUpdate = true;

    return geometry;
  }, []);
}

export default function KnobMesh({ angle }: { angle: number }) {
  const face = useFaceGeometry();

  return (
    <Canvas
      /* Renders only when something changes. Two knobs on a permanent
         requestAnimationFrame would burn battery to display a still image. */
      frameloop="demand"
      dpr={[1, 2]}
      /* NO TONE MAPPING. R3F defaults the renderer to ACESFilmicToneMapping,
         which exists to roll off the highlights of an HDR photographic scene —
         it caps white at about 205/255 and mutes everything below it. This is a
         white plastic knob on a flat-shaded toy; there is no HDR to roll off,
         only contrast to lose. `flat` makes the pipeline plain linear -> sRGB,
         which is also what the CSS fallback assumes, so the two builds finally
         agree on tone as well as on shape. */
      flat
      camera={{ position: [0, 0, 4.15], fov: 30 }}
      gl={{ antialias: true, alpha: true }}
      /* The DOM slider on top owns every event. */
      style={{ pointerEvents: "none" }}
    >
      {/* WHITE PLASTIC, not grey. Ambient carries most of the level here, and
          that is the point: it lifts every normal equally, so it raises the
          floor without touching the spread. The key is then free to model
          rather than illuminate.

          THESE NUMBERS CARRY A FACTOR OF PI, and that is not decoration.
          `meshStandardMaterial` is physically based: BRDF_Lambert divides by PI,
          and it does so for the ambient term as well as every direct one. So an
          intensity of 0.5 lands on screen at roughly 0.16. Tuned against a
          model that omitted this, the knob measured 184-253 in the preview and
          rendered at 81-130 in the browser — a dead mid grey, and no amount of
          adjusting the material colour would have moved it, because #ffffff was
          already the colour.

          With the PI restored and tone mapping off, the range is 184 to 253:
          unmistakably white, with 68 levels left to draw the dish and shoulder
          in. Ambient carries the level because it lifts every normal equally,
          raising the floor without touching the spread; the key is left to
          model rather than illuminate. Ambient at 0.56*PI whitens the floor to
          197 but spends the modelling down to 55 levels, and the form starts
          flattening back toward the featureless disc this began as. */}
      <ambientLight intensity={1.51} />
      {/* Key from ABOVE and slightly left. The old key sat 70% head-on, which
          lights every normal on a shallow surface almost identically — the
          reason the smooth knob first read as a white disc. Overhead is what
          makes a concave face dark along its near wall and bright along its
          far one, which is the entire cue that it is sunken. */}
      <directionalLight position={[-1.2, 3.2, 1.6]} intensity={1.57} />
      {/* Fill from below left, carrying the frame's own blue, and kept WEAK on
          purpose. It comes from underneath, so it lights every downward-facing
          surface — which is precisely the dish's upper wall, the one surface
          whose shadow is the entire reason a dish reads as sunken. At 0.57 it
          was erasing that shadow and flattening the knob; the fill's job is
          only to keep the bottom of the shoulder from falling away to nothing,
          and 0.18 does that without arguing with the key. */}
      <directionalLight position={[-0.8, -2.6, 1.2]} intensity={0.18} color="#d6dcff" />

      {/* Barely leaned — the real knob is seen head-on; this is just enough for
          the shoulder's curve to register. */}
      <group rotation={[-0.12, 0, 0]}>
        <group rotation={[0, 0, -angle]}>
          {/* Stood on end so the lathe's axis points at the viewer. */}
          <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={face}>
              <meshStandardMaterial
                color="#ffffff"
                roughness={0.38}
                metalness={0.02}
                /* An open surface: without this the skirt's far side vanishes
                   and the knob reads as a shell when it is tilted. */
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>

          {/* THE POINTER, as a chip in the lip rather than a painted bar. The
              real knob has none — position is meaningless on a physical toy —
              but ours selects a hue and a lightness, so the angle must be
              legible. It straddles the lip because that circular edge is the
              one line on the knob the eye is already following, and a break in
              it registers faster than a mark inside an even field.

              It sits a hair PROUD of the lip (z = 0.02), not sunk into it. A
              recessed box would be hidden outright: the lip is the frontmost
              point of the whole solid, so anything behind it at that radius is
              occluded by the very surface it is meant to be cut into. Carving a
              real notch needs the lathe swept with a phi gap, which is a great
              deal of coordinate-frame reasoning to spend on something six
              pixels wide at the size this actually renders. */}
          <mesh position={[0, FACE_RADIUS, 0.02]}>
            <boxGeometry args={[0.115, 0.19, 0.08]} />
            <meshStandardMaterial color="#4a4a4a" roughness={0.75} />
          </mesh>
        </group>
      </group>
    </Canvas>
  );
}
