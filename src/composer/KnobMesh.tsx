"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { useResolvedTheme } from "@/lib/theme";

/**
 * The knob's dial.
 *
 * SHAPE: a smooth disc with a wide rounded shoulder falling away to the rim,
 * and a shallow DOMED face standing inside it. No milling — the reference is a
 * moulded control knob, not a serrated Etch A Sketch dial, and the form does
 * all the work: the shoulder catches the key light as a bright crescent, and
 * the dome, being convex, carries its own highlight on the UPPER face and turns
 * away at the foot.
 *
 * IT WAS A DISH UNTIL 2026-08-29, and the inversion is deliberate rather than a
 * slip. The dished face was the Etch A Sketch's; the device this board became
 * has plain domed caps with a crisp seam and a pip. Worth knowing in both
 * directions: a bowl shadows its NEAR wall and lights the far one, a dome does
 * the opposite, and getting either backwards makes a raised face read as a hole
 * or a hole read as a button. This surface sat inverted for several passes when
 * it was a dish.
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
   way three.js does — because a smooth pale knob has no high-frequency detail
   to hide behind. The first attempt at these numbers rendered as a featureless
   white disc: a face only 0.075 deep tilts its normal by 11 degrees, which under
   ambient 0.62 plus a key of 1.85 on a #ffffff material is entirely above the
   clipping point — the face had to get about three times deeper before the
   surface described itself at all. The dome inherits that floor. */
/**
 * THE DIAL IS MOULDED IN THE CASE'S OWN PLASTIC (2026-08-29) and follows it:
 * `--frame` in both themes, silver on the silver body and charcoal on the
 * charcoal one. It is not the ink, which inverts — the ink's job is to be read
 * AGAINST the chassis, and a knob is a part OF it. It was `#ffffff` in both
 * themes, which on the silver board was a white disc on a near-white panel.
 *
 * THE DARK DIAL IS NOT THE LIGHT ONE WITH A DIFFERENT `color`, and that is the
 * whole reason there are two entries here rather than one string.
 * `meshStandardMaterial` multiplies albedo by the lighting, so the SAME lights
 * that model a 0.74-albedo silver across 171-220 render a 0.085-albedo charcoal
 * at 47-91 — darker than the case it is supposed to match, because a lighting
 * factor is never above 1. The level has to be bought back by raising both
 * terms until the mid-normal lands at the albedo itself.
 *
 *   silver:   albedo 0.738, factor 0.48 + 0.50*NdotL  ->  171..220
 *   charcoal: albedo 0.085, factor 0.30 + 1.15*NdotL  ->   55..98
 *
 * Every intensity carries the factor of PI that BRDF_Lambert divides out — see
 * the note on the lights below, and DESIGN.md §6, which records what happened
 * the one time they did not.
 */
const DIALS = {
  light: {
    body: "#dcdee3",
    mark: "#33363c",
    ambient: 1.51,
    key: 1.57,
    fill: 0.18,
  },
  dark: {
    body: "#4d5158",
    mark: "#dcdfe5",
    ambient: 0.3 * Math.PI,
    key: 1.15 * Math.PI,
    fill: 0.1,
  },
} as const;

const BODY_RADIUS = 1; // the rim, widest point
const FACE_RADIUS = 0.76; // where the dome ends and the shoulder begins
const DOME_RISE = 0.16; // how far the face stands proud of the lip
/* THE SEAM. A vertical step at the lip, so the dome and the shoulder meet at an
   EDGE rather than flowing into one another. Without it the two surfaces share
   a tangent, the normal turns continuously across the join, and the whole dial
   renders as one undifferentiated bubble — which is exactly how it drifted away
   from the CSS build, whose face carries a 1px keyline and therefore always had
   the concentric ring the reference knob shows just inside its rim. */
const LIP_STEP = 0.045;
const SHOULDER_DROP = 0.2; // how far the shoulder falls from lip to rim
const SKIRT = 0.26; // the side wall below the rim

/* The lip is the origin, so every depth below is measured from the one edge the
   eye actually reads — and the pointer, which lives outside the rotated group,
   can be placed at z = 0 without a chain of offsets to get wrong. */

/** Dome, lip and shoulder as one revolved profile. */
function useFaceGeometry() {
  return useMemo(() => {
    const profile: THREE.Vector2[] = [new THREE.Vector2(0, LIP_STEP + DOME_RISE)];

    // The dome: QUADRATIC, where the dish before it was quartic. A fourth power
    // flattens the middle and steepens the edge, which is what a pressed dish
    // does; a moulded cap is closer to a spherical cap, so the slope grows
    // evenly from the centre out and the highlight sits as a soft patch rather
    // than a ring near the rim.
    const DOME_STEPS = 26;
    for (let i = 1; i <= DOME_STEPS; i++) {
      const t = i / DOME_STEPS;
      profile.push(
        new THREE.Vector2(t * FACE_RADIUS, LIP_STEP + DOME_RISE * (1 - t * t)),
      );
    }

    // The seam: straight down at the same radius, so the join is an edge.
    profile.push(new THREE.Vector2(FACE_RADIUS, 0));

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
    // it renders as a dark speck in the dead centre of the face. The correct
    // normal there is simply the axis: the top of a dome faces the viewer, and
    // so did the bottom of the bowl this used to be.
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
  const dial = DIALS[useResolvedTheme()];

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
      /* 3.78, not 4.15. At fov 30 the half-height at distance d is d*tan(15deg),
         so the rim at BODY_RADIUS = 1 fills the frame at d = 3.73; 4.15 left the
         dial spanning only 90% of its canvas, and the canvas is inset to sit
         just inside the ring — so the missing 10% showed up as a black moat
         between ring and knob that the CSS build does not have. The two were
         drawing the same object at different sizes. */
      camera={{ position: [0, 0, 3.78], fov: 30 }}
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
      <ambientLight intensity={dial.ambient} />
      {/* Key from ABOVE and slightly left. The old key sat 70% head-on, which
          lights every normal on a shallow surface almost identically — the
          reason the smooth knob first read as a white disc. Overhead is what
          makes a concave face dark along its near wall and bright along its
          far one, which is the entire cue that it is sunken. */}
      <directionalLight position={[-1.2, 3.2, 1.6]} intensity={dial.key} />
      {/* Fill from below left, carrying the frame's own blue, and kept WEAK on
          purpose. It comes from underneath, so it lights every downward-facing
          surface — which is precisely the dish's upper wall, the one surface
          whose shadow is the entire reason a dish reads as sunken. At 0.57 it
          was erasing that shadow and flattening the knob; the fill's job is
          only to keep the bottom of the shoulder from falling away to nothing,
          and 0.18 does that without arguing with the key. */}
      <directionalLight position={[-0.8, -2.6, 1.2]} intensity={dial.fill} color="#d6dcff" />

      {/* Barely leaned — the real knob is seen head-on; this is just enough for
          the shoulder's curve to register. */}
      <group rotation={[-0.12, 0, 0]}>
        {/* THE BODY DOES NOT TURN — only the pip does, in the group below.
            Rotating a surface of revolution about its own axis is a no-op on
            the shading, so this was never visibly wrong here; it is out of the
            spin group anyway so the two builds say the same thing structurally.
            The CSS build had the rotation on the dial itself, where the dome's
            baked lighting DID swing round with it. */}
        <group rotation={[Math.PI / 2, 0, 0]}>
            <mesh geometry={face}>
              {/* ROUGH, not glossy. At 0.38 the key light returned a tight
                  specular lobe — a wet highlight sitting on top of the shading,
                  which is what made this read as shiny plastic beside the
                  matte CSS dial. The CSS build has no specular term at all, so
                  the mesh has to spread its own out until the two agree: a
                  moulded control knob has a broad sheen, not a hotspot.
                  Metalness goes to a flat 0 — 0.02 was doing nothing except
                  tinting the specular with the albedo. */}
              <meshStandardMaterial
                color={dial.body}
                roughness={0.68}
                metalness={0}
                /* An open surface: without this the skirt's far side vanishes
                   and the knob reads as a shell when it is tilted. */
                side={THREE.DoubleSide}
              />
          </mesh>
        </group>

        <group rotation={[0, 0, -angle]}>
          {/* THE POINTER — A ROUND PIP, moulded into the shoulder. The real
              knob has none, position being meaningless on a physical toy, but
              ours selects a hue and a lightness so the angle must be legible.
              It was a rectangular chip across the lip; the reference device
              carries a small dot instead, and a dot has no orientation of its
              own to disagree with the angle it reports.

              A cylinder, axis turned to face the camera — the group it sits in
              has x right, y up, z toward the viewer, and a cylinder's own axis
              is y. It sits a hair PROUD (z = 0.05), not sunk: the lip is the
              frontmost point of the whole solid, so anything behind it at that
              radius is occluded by the very surface it would be cut into.
              Carving a real dimple needs the lathe swept with a phi gap, which
              is a lot of coordinate-frame reasoning to spend on something six
              pixels across at the size this renders. */}
          {/* Sized and placed from the CSS build: `.toy-knob-mark` is 13% of
              the dial across, centred 84.5% of the way out. Radius 0.13 and
              centre 0.845 are those two numbers in BODY_RADIUS units. */}
          <mesh position={[0, 0.845, LIP_STEP + 0.03]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.115, 0.115, 0.07, 28]} />
            <meshStandardMaterial color={dial.mark} roughness={0.75} />
          </mesh>
        </group>
      </group>
    </Canvas>
  );
}
