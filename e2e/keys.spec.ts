import { expect, test, type Page } from "@playwright/test";

/**
 * The two selectors, and the rule that keeps them apart.
 *
 * CHIPS ARE FLAT because they are drawn on the glass; the BODY'S CONTROLS have
 * depth because they are moulded into the plastic. Depth belongs to the body —
 * that is the board's whole grammar, and it is the thing a refactor is most
 * likely to blur.
 *
 * Pointer and paint behaviour, so Playwright rather than Vitest: jsdom has no
 * layout to measure a drag against and no computed gradients to read.
 *
 * SHAPE IS A THUMBWHEEL SWITCH now (2026-08-30). It was a rack of keys mounted
 * through a panel, then three transport caps in the pad, then a mode list
 * beside a separate ribbed wheel. Each was an object and none of them was ONE
 * object: a row of caps says nothing about which is on until you compare the
 * depth of their faces, and a list beside a wheel is a control next to a
 * picture of a control.
 *
 * WHAT IT IS NOW is a barrel with the values printed on it, read through a
 * window at one end and turned by the knurled grip at the other. Selection is
 * simply what the window is showing — there is no index mark at all, since a
 * mark beside the value is a second thing saying the first thing. */

async function settle(page: Page) {
  await page.evaluate(() =>
    Promise.race([
      Promise.all(document.getAnimations().map((a) => a.finished.catch(() => {}))),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]),
  );
}

/**
 * Every face printed on the drum: whether it is live, how dark its ink is
 * against the plastic it is printed on, and whether it paints its own surface.
 *
 * The colours are read in the page because the two serialisations only exist
 * there: `rgb(… / a)` and `color(srgb … / a)` are both real, and reading one
 * form would measure half the drum.
 */
async function rows(page: Page) {
  return page.evaluate(() => {
    const parse = (value: string) => {
      const srgb = /color\(srgb ([^)]+)\)/.exec(value);
      if (srgb !== null) {
        const parts = srgb[1].trim().split(/[\s/]+/).map(Number);
        return [...parts.slice(0, 3).map((v) => v * 255), parts[3] ?? 1];
      }
      const parts = value.replace(/[^\d,.]/g, "").split(",").map(Number);
      return [...parts.slice(0, 3), parts[3] ?? 1];
    };
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

    // How far the barrel itself has been turned, which every face rides on.
    const reel = (() => {
      const m = new DOMMatrixReadOnly(
        getComputedStyle(document.querySelector(".pixl-drum-reel")!).transform,
      );
      return (Math.atan2(m.m23, m.m22) * 180) / Math.PI;
    })();

    return [
      ...document.querySelectorAll<HTMLElement>('[role="radiogroup"] .pixl-drum-face'),
    ].map((el) => {
      const cs = getComputedStyle(el);
      const ink = parse(cs.color);
      /* THE PAPER IS THE OPENING'S, not the face's. A face that painted its
         own plastic put a crown-to-foot ramp on every panel and a BUMP at every
         join — the drum read as a stack of facets. So the ground is read from
         the paper, and the face is checked for having none.

         `.pixl-thumb-paper`, not `.pixl-thumb-window`: the window is the CUT
         through the panel and paints the chassis walls of the hole, which is
         what makes the paper read as sunken. The drum's surface is what lies at
         the bottom of it. */
      const surface = [
        ...getComputedStyle(
          document.querySelector(".pixl-thumb-paper")!,
        ).backgroundImage.matchAll(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g),
      ].map((m) => parse(m[0]));
      const drum = [0, 1, 2].map(
        (i) => surface.reduce((a, c) => a + c[i], 0) / surface.length,
      );
      return {
        label: (el.textContent ?? "").trim(),
        checked: el.getAttribute("aria-checked") === "true",
        // Composited onto the paper, since the ink is a colour at a strength.
        level:
          mean(ink.slice(0, 3).map((c, i) => c * ink[3] + drum[i] * (1 - ink[3]))) /
          255,
        drumLevel: mean(drum) / 255,
        paperStops: surface.length,
        faceBackground: cs.backgroundImage,
        ink: cs.color,
        /* Where on the cylinder this face is turned to. 0 is the FRONT — the
           lit middle of the window.

           THE REEL'S OWN ROTATION IS IN IT, and that is a correction rather
           than a detail: a face's transform is only where it sits ON the drum,
           and the drum turns underneath it. Reading the face alone happened to
           report 0 for the live value while the default was printed at index 0
           and the reel therefore sat at 0 too — accidentally right, and wrong
           the moment Square moved to the middle of the barrel. */
        angle: (() => {
          const face = new DOMMatrixReadOnly(cs.transform);
          const turned =
            (Math.atan2(face.m23, face.m22) * 180) / Math.PI + reel;
          return ((((turned + 180) % 360) + 360) % 360) - 180;
        })(),
        transform: cs.transform,
      };
    });
  });
}

test("exactly one name is in the window, and the drum is what it is printed on", async ({
  page,
}) => {
  await page.goto("/");
  await settle(page);
  const before = await rows(page);
  expect(before).toHaveLength(3);

  const live = before.filter((r) => r.checked);
  expect(live).toHaveLength(1);
  const standing = before.filter((r) => !r.checked);

  /* SELECTION IS POSITION, NOT INK. Every face is printed in the same colour —
     printing does not get fainter as a drum turns, the SURFACE goes into shadow
     and takes the printing with it. It ran as two inks for a pass and the
     contrast bar refused it outright: at the paper's shaded end even a fully
     opaque held-back ink came to 4.47:1, so no alpha cleared AA. What says
     which value is live is that it is turned to the FRONT of the drum. */
  for (const row of before) expect(row.ink).toBe(live[0].ink);
  expect(live[0].angle, `live face is turned ${live[0].angle}deg away`).toBeCloseTo(
    0,
    1,
  );
  for (const row of standing) {
    expect(
      Math.abs(row.angle),
      `${row.label} is at the front too`,
    ).toBeGreaterThan(20);
  }

  /* THE PAPER IS ONE SURFACE AND THE FACES CARRY NOTHING. A face that paints
     its own plastic runs the same crown-to-foot ramp on every panel, which is a
     bump at every join and a drum made of visible facets — it shipped that way
     twice. Real paper gives you nothing to see, so the printing is the only
     thing that can tell you it moved. */
  expect(before[0].paperStops, "the window paints no paper").toBeGreaterThan(1);
  for (const row of before) {
    expect(row.faceBackground, `${row.label} paints its own plastic`).toBe("none");
    // And each sits at its own angle on the cylinder — a 3D matrix, not `none`.
    expect(row.transform).toMatch(/^matrix3d\(/);
  }
});

/**
 * TWO OPENINGS WITH CASE BETWEEN THEM.
 *
 * They were butted together with a seam drawn down the join, which reads as one
 * slot with a line in it. A strip of the panel between them is what a thumbwheel
 * switch has, and it is what makes them two parts of one thing rather than one
 * part with a scratch.
 */
test("the window and the grip are separate cut-outs, not one slot", async ({
  page,
}) => {
  await page.goto("/");

  const window_ = (await page.locator(".pixl-thumb-window").boundingBox())!;
  const paper = (await page.locator(".pixl-thumb-paper").boundingBox())!;
  const grip = (await page.locator(".pixl-thumb-grip").boundingBox())!;

  /* THE CASE BETWEEN THEM HAS TO OUT-MEASURE THE WALLS EITHER SIDE OF IT, and
     that is the rule rather than a pixel count. Each opening grew its own ring
     of chassis wall on 2026-08-30, so the strip between the two cuts is now
     flanked by a wall on each side — and a strip no wider than the walls it
     sits between reads as a third wall rather than as panel, which is the
     "one slot with a line down it" this whole gap exists to prevent. */
  const wall = paper.x - window_.x;
  const gap = grip.x - (window_.x + window_.width);
  expect(wall, "the openings have no wall").toBeGreaterThan(1);
  expect(
    gap,
    `case between the cuts is ${gap.toFixed(1)}px against ${wall.toFixed(1)}px of wall`,
  ).toBeGreaterThan(wall * 2);

  // Each is cut into the panel on its own: a rounded opening with a shaded top
  // and a wall on each side, like every other recess on this board.
  for (const sel of [".pixl-thumb-window", ".pixl-thumb-grip"]) {
    const walls = await page.evaluate((s) => {
      const cs = getComputedStyle(document.querySelector(s)!);
      return {
        radius: Number.parseFloat(cs.borderTopLeftRadius),
        insets: cs.boxShadow
          .split(/,(?![^(]*\))/)
          .filter((x) => x.includes("inset"))
          .map((x) => {
            const lengths = x
              .replace(/rgba?\([^)]*\)|color\([^)]*\)/g, "")
              .match(/-?[\d.]+px/g);
            return {
              x: Number.parseFloat(lengths?.[0] ?? "0"),
              y: Number.parseFloat(lengths?.[1] ?? "0"),
            };
          }),
      };
    }, sel);
    expect(walls.radius, `${sel} has no rounded opening`).toBeGreaterThan(0);
    expect(walls.insets.some((w) => w.x > 0), `${sel}: no left wall`).toBe(true);
    expect(walls.insets.some((w) => w.x < 0), `${sel}: no right wall`).toBe(true);
    expect(walls.insets.some((w) => w.y > 0), `${sel}: no lip`).toBe(true);
  }
});

/**
 * THE DRUM IS PART OF THE CASE, SO IT INVERTS WITH IT.
 *
 * DESIGN.md §2 sorts every surface on this board into three: parts OF the case
 * follow it, things read AGAINST the case invert with it, and separate parts
 * keep their own material. The barrel was filed on the third shelf for a pass,
 * beside `.pixl-key`'s soft-touch cap — and a thumbwheel is not that. It is
 * moulded in the same shot as the chassis, exactly like a knob, so a charcoal
 * board gets a charcoal drum.
 *
 * THE INK HAS TO GO THE OTHER WAY, and that is the half a palette swap forgets.
 * §2 records `.toy-button` carrying precisely this bug for a week: a value that
 * is right in one theme and invisible in the other, which no single-theme sweep
 * ever sees. The contrast suite cannot catch it either — a constant pale drum
 * with a constant dark ink clears AA in both themes and is still wrong.
 */
test("the drum is moulded in the case's own plastic, and its ink is not", async ({
  page,
}) => {
  await page.goto("/");

  const read = async (theme: "light" | "dark") => {
    await page.evaluate(
      (t) => document.documentElement.setAttribute("data-theme", t),
      theme,
    );
    await settle(page);
    return page.evaluate(() => {
      const level = (c: string) => {
        const n = c.replace(/[^\d,.]/g, "").split(",").map(Number);
        return (n[0] + n[1] + n[2]) / 3;
      };
      const paper = getComputedStyle(
        document.querySelector<HTMLElement>(".pixl-thumb-paper")!,
      ).backgroundImage;
      const stops = [
        ...paper.matchAll(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g),
      ].map((m) =>
        m[0].startsWith("color(")
          ? (() => {
              const n = m[0].slice(11, -1).split(/[\s/]+/).map(Number);
              return ((n[0] + n[1] + n[2]) / 3) * 255;
            })()
          : level(m[0]),
      );
      return {
        crown: Math.max(...stops),
        ink: level(
          getComputedStyle(
            document.querySelector<HTMLElement>(".pixl-drum-face")!,
          ).color,
        ),
        // The grip is the same barrel, so it has to move with the window.
        rib: Math.max(
          ...[
            ...getComputedStyle(
              document.querySelector<HTMLElement>(".pixl-thumb-rib")!,
            ).backgroundImage.matchAll(/rgba?\([^)]+\)/g),
          ].map((m) => level(m[0])),
        ),
      };
    });
  };

  const light = await read("light");
  const dark = await read("dark");

  // THE PLASTIC FOLLOWS THE CASE: pale on the silver board, dark on the
  // charcoal one. A constant barrel passes every other check in this file.
  expect(light.crown, `crown ${light.crown} -> ${dark.crown}`).toBeGreaterThan(
    dark.crown + 60,
  );
  expect(light.rib, `rib ${light.rib} -> ${dark.rib}`).toBeGreaterThan(
    dark.rib + 60,
  );

  // AND THE PRINTING GOES THE OTHER WAY. Ink lies ON that surface, so when the
  // surface turns over the ink has to turn over with it.
  expect(dark.ink, `ink ${light.ink} -> ${dark.ink}`).toBeGreaterThan(
    light.ink + 60,
  );

  // Stated as the relationship rather than as two numbers: in each theme the
  // ink is on the far side of the mid point from the plastic it sits on.
  expect(light.ink).toBeLessThan(128);
  expect(light.crown).toBeGreaterThan(128);
  expect(dark.ink).toBeGreaterThan(128);
  expect(dark.crown).toBeLessThan(128);
});

/**
 * SELECTION IS POSITION, AND THERE IS NOTHING ELSE SAYING IT.
 *
 * The drum wore an index mark for two passes — on the paper, then printed on
 * the case — and it was never what carried the selection: the live value is the
 * one turned to the FRONT, square on and centred in the lit middle of the
 * window, with its neighbours clipped and curving out of the opening. A mark
 * beside that is a second thing saying the first thing.
 *
 * Dropping it also leaves the size rail's marker as the ONE accent on the
 * chassis, which is §7 tightened rather than broken.
 */
test("the live value is the one turned to the front, with no mark beside it", async ({
  page,
}) => {
  await page.goto("/");
  await settle(page);

  const window_ = (await page.locator(".pixl-thumb-window").boundingBox())!;

  /* THE PRINTED WORD, NOT THE BUTTON THAT CARRIES IT — and that is the whole
     difference between an assertion and a decoration here. The faces are
     absolutely positioned at `left: 0; right: 0`, so a face's own box spans the
     opening whatever the text inside it does: measured that way, this passed
     with the value shoved hard against the left wall. A Range around the text
     node is what actually reports where the ink is. */
  const centred = async (label: string) => {
    const live = page.locator('.pixl-drum-face[aria-checked="true"]');
    await expect(live).toHaveText(label);

    const ink = await page.evaluate(() => {
      const face = document.querySelector('.pixl-drum-face[aria-checked="true"]')!;
      const range = document.createRange();
      range.selectNodeContents(face);
      const { x, y, width, height } = range.getBoundingClientRect();
      return { x, y, width, height };
    });

    // Square on: across the middle of the opening, both ways. Off to one side
    // it reads as a list item that happens to be visible.
    expect(
      Math.abs(ink.x + ink.width / 2 - (window_.x + window_.width / 2)),
      `${label} is not centred across the window`,
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(ink.y + ink.height / 2 - (window_.y + window_.height / 2)),
      `${label} is not on the front of the drum`,
    ).toBeLessThanOrEqual(1);
  };

  await centred("Square");

  /* REACHED BY TURNING, NOT BY CLICKING. Only the faces the window is showing
     can be clicked — the rest are round the back of the drum, which is what a
     drum is. That is the control working, not a limitation to route around, so
     the far value is reached the way a person would reach it. */
  await page.locator('.pixl-drum-face[aria-checked="true"]').focus();
  await page.keyboard.press("End");
  await settle(page);
  await centred("Round");

  /* AND NOTHING ON THE CONTROL IS COLOURED. `--indicator` is the body's one
     accent and it belongs to the size rail's marker (§7); a second orange two
     pads above it competes with what that mark exists to mean. Every painted
     surface is walked, because the way this comes back is a small pseudo-
     element nobody thinks to name. */
  const accented = await page.evaluate(() => {
    const orange = getComputedStyle(document.documentElement)
      .getPropertyValue("--indicator")
      .trim();
    const probe = document.createElement("span");
    probe.style.color = orange;
    document.body.append(probe);
    const resolved = getComputedStyle(probe).color;
    probe.remove();

    const hits: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(".pixl-thumb, .pixl-thumb *")) {
      for (const pseudo of [null, "::before", "::after"]) {
        const cs = getComputedStyle(el, pseudo ?? undefined);
        const paint = `${cs.backgroundColor} ${cs.backgroundImage} ${cs.color} ${cs.borderColor}`;
        if (paint.includes(resolved)) hits.push(`${el.className}${pseudo ?? ""}`);
      }
    }
    return hits;
  });
  expect(accented, "the drum is wearing the body's accent").toEqual([]);
});

/**
 * THE PAPER LIES AT THE BOTTOM OF A HOLE, AND THERE IS GLASS OVER IT.
 *
 * It was a rectangle with inset shadows on it for a pass, and that reads as
 * merely flat rather than as obviously wrong — which is why this is measured.
 * A recess is read from the material AROUND the opening: a shadow painted onto
 * the drum darkens the drum, and the mini screen was got wrong in exactly this
 * way twice before it grew a real ring of chassis (DESIGN.md §6).
 */
test("the paper is sunk in a ring of chassis, under a cover with a hard edge", async ({
  page,
}) => {
  await page.goto("/");

  // FOUR WALLS, not two. Every recess on this board had a shaded top and a lit
  // bottom and nothing at the sides until 2026-08-29, and a cut that dies away
  // toward its ends reads shallow however deep the top is made.
  const window_ = (await page.locator(".pixl-thumb-window").boundingBox())!;
  const paper = (await page.locator(".pixl-thumb-paper").boundingBox())!;
  const walls = {
    top: paper.y - window_.y,
    left: paper.x - window_.x,
    right: window_.x + window_.width - (paper.x + paper.width),
    bottom: window_.y + window_.height - (paper.y + paper.height),
  };
  for (const [side, width] of Object.entries(walls)) {
    expect(width, `${side} wall is ${width.toFixed(1)}px`).toBeGreaterThan(1);
  }

  const cut = await page.evaluate(() => {
    const wall = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-thumb-window")!,
    ).backgroundImage;
    const glass = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-drum-glass")!,
    ).backgroundImage;

    const level = (c: string) => {
      const [r, g, b] = c.startsWith("color(")
        ? c
            .slice(11, -1)
            .split(/[\s/]+/)
            .slice(0, 3)
            .map((n) => Number(n) * 255)
        : c
            .replace(/rgba?\(|\)/g, "")
            .split(/[,\s/]+/)
            .slice(0, 3)
            .map(Number);
      return (r + g + b) / 3;
    };
    const stops = [...wall.matchAll(/rgba?\([^)]+\)|color\(srgb [^)]+\)/g)].map(
      (m) => level(m[0]),
    );

    /* PER LAYER, NOT ACROSS THE STACK — and that distinction is the whole
       assertion. Flattening every stop in the background into one list found a
       "hard edge" between the last stop of one gradient and the first of the
       next, which is not an edge at all: they are different layers and both sit
       at 0%. It passed with the cover mutated to a plain wash, which is exactly
       what it exists to catch. Layers are comma-separated at depth zero. */
    const layers: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of glass) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === "," && depth === 0) {
        layers.push(current);
        current = "";
      } else current += ch;
    }
    layers.push(current);

    /* A BOUNDARY IS TWO STOPS AT THE SAME PLACE CARRYING DIFFERENT VALUES.
       Both halves matter: stops a long way apart are a ramp, and stops at the
       same place with the same colour are nothing at all. */
    const hard = layers.some((layer) => {
      const stops = [
        ...layer.matchAll(/(rgba?\([^)]+\)|color\(srgb [^)]+\))\s+([\d.]+)%/g),
      ].map((m) => ({ color: m[1], at: Number.parseFloat(m[2]) }));
      return stops.some(
        (stop, i) =>
          i > 0 &&
          Math.abs(stop.at - stops[i - 1].at) < 1 &&
          stop.color !== stops[i - 1].color,
      );
    });

    return {
      wallTop: stops[0],
      wallBottom: stops[stops.length - 1],
      // Is the glass painted after the reel, so it falls ACROSS the printing?
      glassOverReel: Boolean(
        document
          .querySelector(".pixl-drum-reel")!
          .compareDocumentPosition(document.querySelector(".pixl-drum-glass")!) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ),
      // A HARD EDGE somewhere in the cover. A soft ramp is a wash, and a wash
      // is what this looked like before — nothing in it said a sheet of glass
      // was over the opening at all.
      hardEdge: hard,
    };
  });

  // A HOLE, NOT A DOME: the wall under the lip is in shadow at the top and
  // catching the room at the bottom. Inverted, the same five shadows draw a
  // raised boss — which is the mistake `.pixl-pad` shipped with for a week.
  expect(
    cut.wallTop,
    `wall runs ${cut.wallTop?.toFixed(0)} -> ${cut.wallBottom?.toFixed(0)}`,
  ).toBeLessThan(cut.wallBottom - 20);
  expect(cut.glassOverReel, "the cover is painted under the printing").toBe(true);
  expect(cut.hardEdge, "the cover is a wash, not a reflection").toBe(true);
});

/**
 * THE DRAG BELONGS TO THE DRUM.
 *
 * This is the only drag surface on the board with a WORD under the pointer, and
 * a press on text is a text selection before it is anything else — after which
 * the browser offers to drag the selection, so the control appears to come away
 * from the panel instead of rolling. The composer's slide-to-clear groove has
 * carried both declarations since it was built; this control did not.
 *
 * THE PROPERTY IS WHAT IS ASSERTED, AND ON THE FACE, deliberately. The rendered
 * symptom needs a real pointer: synthetic input selects nothing in either
 * engine, so a "did it select" check passes with the fix removed and proves
 * nothing. Reading the FACE rather than the housing is what makes this bite —
 * the rule landing on the wrong element is the failure mode this stylesheet has
 * now shipped three times (§5c).
 */
test("a drag on the printed word turns the drum and drags nothing", async ({
  page,
}) => {
  await page.goto("/");
  await settle(page);

  const claimed = await page.evaluate(() => {
    const face = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-drum-face")!,
    );
    const thumb = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-thumb")!,
    );
    return {
      // Nothing to select means nothing to drag away.
      select: face.userSelect || face.webkitUserSelect,
      // And the browser must not claim the vertical axis for a scroll first.
      touch: thumb.touchAction,
    };
  });
  expect(claimed.select, "the printed word is selectable").toBe("none");
  expect(claimed.touch, "the browser can pan on the drum").toBe("none");

  // And the gesture still does its job: two detents up, two values on.
  const value = () =>
    page.locator('.pixl-drum-face[aria-checked="true"]').textContent();
  expect(await value()).toBe("Square");

  const word = (await page
    .locator('.pixl-drum-face[aria-checked="true"]')
    .boundingBox())!;
  const x = word.x + word.width / 2;
  const y = word.y + word.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  for (let step = 1; step <= 12; step++) await page.mouse.move(x, y - step * 5);
  await page.mouse.up();
  await settle(page);

  // The drag's own landing stands. A `click` arrives at the end of every drag,
  // and whatever face it lands on did not choose itself.
  expect(await value()).toBe("Round");
  expect(
    await page.evaluate(() => window.getSelection()?.toString() ?? ""),
  ).toBe("");
});

/**
 * THE TWO HALVES ARE ONE BARREL.
 *
 * The window shows what is printed on the drum and the grip is the knurled end
 * you turn it by — a thumbwheel switch. It was a mode list beside a separate
 * ribbed wheel for a pass, which is a control and a picture of a control side
 * by side: the wheel turned and the list did not. So the thing to hold is that
 * they move TOGETHER, by the same angle.
 */
test("the grip and the window turn together, and the ribs track the pointer", async ({
  page,
}) => {
  await page.goto("/");
  await settle(page);

  const label = async () =>
    (
      await page.locator('.pixl-drum-face[aria-checked="true"]').textContent()
    )?.trim();
  const angles = () =>
    page.evaluate(() =>
      [".pixl-drum-reel", ".pixl-thumb-barrel"].map((sel) => {
        const m = new DOMMatrixReadOnly(
          getComputedStyle(document.querySelector(sel)!).transform,
        );
        // The rotateX angle, recovered from the 3D matrix.
        return (Math.atan2(m.m23, m.m22) * 180) / Math.PI;
      }),
    );

  expect(await label()).toBe("Square");
  const box = (await page.locator(".pixl-thumb").boundingBox())!;
  // On the GRIP, which is the end you would actually take hold of.
  const cx = box.x + box.width - 18;
  const cy = box.y + box.height / 2;

  await page.mouse.move(cx, cy);
  await page.mouse.down();

  /* SAMPLED MID-DRAG. Every step turns the barrel, not only the ones that land
     on a detent — a drum derived from the value alone is still between them. */
  const samples: number[][] = [];
  for (let i = 1; i <= 10; i++) {
    await page.mouse.move(cx, cy - i * 5);
    /* LET THE 45ms FOLLOW BRIDGE LAND. The drum gained the bridge on
       2026-09-04 — it had `transition: none` while citing, in its own comment,
       the size rail's measurement that 17 frames in 121 receive no pointer
       event and a stationary frame under a moving finger is the stutter. With a
       bridge the transform is mid-flight for 45ms after each move, so sampling
       immediately reads a value that has not caught up yet and two consecutive
       samples can be equal. This waits for the same reason the rail's own tests
       do: the assertion is about where the drum GOES, not how fast. */
    await page.waitForTimeout(60);
    samples.push(await angles());
  }
  for (let i = 1; i < samples.length; i++) {
    // The angle RISES as the surface is pushed up, because index order runs
    // down the drum: the next value is the one below the live one.
    expect(
      samples[i][0],
      `the window stopped turning at sample ${i}`,
    ).toBeGreaterThan(samples[i - 1][0]);
    // THE SAME ANGLE, both halves, every frame. One barrel.
    expect(Math.abs(samples[i][0] - samples[i][1])).toBeLessThan(0.01);
  }

  // UP GOES FORWARD: the values are printed on the surface, so pushing it up
  // brings what was below into the window.
  expect(await label()).toBe("Round");

  await page.mouse.up();
  await settle(page);

  // And back down again — the drag does NOT wrap: a drum with three detents
  // has two ends and you can feel them.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(cx, cy + i * 5);
  await page.mouse.up();
  await settle(page);
  // Inset is printed at the TOP of the barrel, so a long pull down lands there
  // and stops. Square is the middle face — the default sits where the wheel can
  // be turned either way from rest.
  expect(await label()).toBe("Inset");
  expect((await angles())[0]).toBeCloseTo(0, 1);
});

test("the keyboard still wraps, which the drag does not", async ({ page }) => {
  await page.goto("/");
  const checked = page.locator('.pixl-drum-face[aria-checked="true"]');
  await checked.focus();
  await expect(checked).toHaveText("Square");

  // Square is the MIDDLE face, so one press reaches the top of the barrel...
  await page.keyboard.press("ArrowUp");
  await expect(checked).toHaveText("Inset");

  // ...and the next WRAPS to the bottom. The APG asks radios to wrap; a drum's
  // ends are a pointer affordance, and the drag deliberately stops at them.
  await page.keyboard.press("ArrowUp");
  await expect(checked).toHaveText("Round");

  await page.keyboard.press("Home");
  await expect(checked).toHaveText("Inset");
});

test("reduced motion stops the turn but keeps the value in the window", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  for (const sel of [".pixl-drum-reel", ".pixl-thumb-barrel"]) {
    const duration = await page.evaluate(
      (s) => getComputedStyle(document.querySelector(s)!).transitionDuration,
      sel,
    );
    expect(Number.parseFloat(duration)).toBeLessThan(0.001);
  }

  // The angle is STATE, not motion. A blanket guard that flattened the drum
  // would leave the window showing nothing in particular.
  const live = (await rows(page)).find((r) => r.checked)!;
  expect(live.label).toBe("Square");
});

test("the icon name is shown whole, not clipped to its tile", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("button", { name: /arrow-right/ }).first();
  await card.hover();
  await page.waitForTimeout(300);

  const label = card.locator(".pixl-card-name");
  const { text, scrollW, clientW, boxW, tileW } = await label.evaluate((el) => {
    const tile = el.closest(".pixl-card") as HTMLElement;
    return {
      text: el.textContent ?? "",
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      boxW: el.getBoundingClientRect().width,
      tileW: tile.getBoundingClientRect().width,
    };
  });

  expect(text).toBe("arrow-right");
  // Not truncated: the label's content fits inside the label.
  expect(scrollW).toBeLessThanOrEqual(clientW + 1);
  // And it got there by OVERHANGING the tile rather than by the tile growing —
  // the grid seat is fixed at 64px on purpose.
  expect(boxW).toBeGreaterThan(tileW);
});

/* ---------------------------------------------------------------------------
   The chips — flat, because they are on the glass.
   ------------------------------------------------------------------------ */

/**
 * THE FILL TRAVELS (2026-09-04). It used to be a `background` on the selected
 * chip; it is now ONE capsule behind the row that slides between them, because
 * the board's other tablist already slides and one device should not speak two
 * selection languages.
 *
 * The chip therefore paints no background of its own. That is not an accident
 * to be relaxed: two fills would mean the capsule slides between chips that are
 * already filled, and the travel would be invisible.
 *
 * What the original test protected still holds and is still checked here:
 * exactly one thing is filled, it wears the CATEGORY's own tint rather than a
 * shared accent, the ink never moves between states, and nothing on the glass
 * is moulded.
 */
test("selection is one travelling fill, in the category's own tint", async ({
  page,
}) => {
  await page.goto("/");

  const read = () =>
    page.evaluate(() => {
      const fill = document.querySelector<HTMLElement>(".pixl-chip-fill")!;
      const fillStyle = getComputedStyle(fill);
      return {
        fill: {
          background: fillStyle.backgroundColor,
          box: fill.getBoundingClientRect(),
          // Composited, so a held arrow key retargets instead of restarting.
          transition: fillStyle.transitionProperty,
        },
        chips: [...document.querySelectorAll<HTMLElement>(".pixl-chip")].map(
          (el) => {
            const cs = getComputedStyle(el);
            return {
              // Chips keep a WORD: they are on the glass, and a category has no
              // shape to draw. Only the keys took glyphs.
              label: el.textContent ?? "",
              selected: el.getAttribute("aria-selected") === "true",
              fill: cs.backgroundColor,
              ink: cs.color,
              // Flat by construction — depth belongs to the plastic.
              shadow: cs.boxShadow,
              box: el.getBoundingClientRect(),
            };
          },
        ),
      };
    });

  const transparent = (c: string) =>
    c === "rgba(0, 0, 0, 0)" || c === "transparent";

  const before = await read();
  expect(before.chips.length).toBeGreaterThan(3);

  // NOTHING ON THE GLASS IS MOULDED, and no chip paints its own fill.
  for (const chip of before.chips) {
    expect(chip.shadow, `${chip.label} has a moulded face`).toBe("none");
    expect(
      transparent(chip.fill),
      `${chip.label} paints its own fill, so the travel is invisible`,
    ).toBe(true);
  }

  /* IT IS A CAPSULE, NOT A LOZENGE — and that is what forced the build off
     `scaleX`. Scaling a 1px-wide base is the compositor-friendly way to move
     this, and it cannot draw the shape: `border-radius` resolves against the
     UNSCALED box, so the horizontal radius clamps to 0.5px and the scale
     stretches it into an ellipse with pointed ends.

     THE SHAPE CANNOT BE READ BACK FROM CSS, which is why this asserts the
     SCALE instead. Measured against a probe built the old way: a 1px element at
     `scaleX(132)` still reports `border-top-left-radius: 999px`, because the
     computed value is the specified one and not the clamped one. So a radius
     assertion here passes against the exact bug it names — the same class of
     inert check this stylesheet has shipped before. The scale factor is the one
     readable thing that separates the two builds. */
  expect(before.fill.transition).toContain("transform");
  const scaled = await page.evaluate(() => {
    const t = getComputedStyle(
      document.querySelector<HTMLElement>(".pixl-chip-fill")!,
    ).transform;
    return t.includes("matrix") ? Number(t.split(/[(,]/)[1].trim()) : 1;
  });
  expect(
    scaled,
    "the fill is scaled, which clamps its radius and draws a lozenge",
  ).toBe(1);

  // AND IT IS PARKED ON THE LIVE CHIP.
  const selBefore = before.chips.find((c) => c.selected)!;
  expect(Math.abs(before.fill.box.x - selBefore.box.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(before.fill.box.width - selBefore.box.width),
  ).toBeLessThanOrEqual(1);

  const arcadeInk = before.chips.find((c) => c.label === "Arcade")!.ink;
  await page.getByRole("tab", { name: "Arcade" }).click();
  await page.waitForTimeout(400);

  const after = await read();
  const arcadeNow = after.chips.find((c) => c.label === "Arcade")!;

  // IT TRAVELLED, and landed on the chip that is now live.
  expect(arcadeNow.selected).toBe(true);
  expect(Math.abs(after.fill.box.x - arcadeNow.box.x)).toBeLessThanOrEqual(1);
  expect(
    Math.abs(after.fill.box.width - arcadeNow.box.width),
  ).toBeLessThanOrEqual(1);
  expect(after.fill.box.x).not.toBe(before.fill.box.x);

  // IN ARCADE'S OWN TINT, not a shared accent: the capsule's colour is the live
  // category's, so the fill identifies WHICH rather than meaning "this one".
  const tint = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.className = "pixl-chip-fill";
    probe.setAttribute("data-category", "arcade");
    document.body.append(probe);
    const out = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return out;
  });
  expect(after.fill.background).toBe(tint);
  expect(after.fill.background).not.toBe(before.fill.background);

  // The ink never moved: the tint identifies the category in both states, so
  // nothing about the colour is allowed to mean "this one".
  expect(arcadeNow.ink).toBe(arcadeInk);
});
