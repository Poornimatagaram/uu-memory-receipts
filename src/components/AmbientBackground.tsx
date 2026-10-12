type AmbientBackgroundProps = {
  // "lively" (the welcome and about pages): the shapes breathe.
  // "calm" (the chat): the shapes are fainter and hold still, so nothing moves
  // behind the conversation.
  mood?: "lively" | "calm";
  // The welcome page's scroll story: the sky turns from dusk at the top of the
  // page to dawn at the bottom (see globals.css).
  scrollStory?: boolean;
};

// The soft background behind every page: a sky, three blurred shapes in peach,
// sage and lavender, and a film grain on top of them. It's decoration only:
// aria-hidden keeps it from screen readers, and pointer-events-none lets every
// click go straight through it.
//
// No "use client": it has no state and no handlers, so it's plain HTML from the
// server, and all of its motion is CSS. It works with JavaScript turned off.
//
// fixed inset-0: it covers the screen and stays put while the page scrolls.
// -z-10: it's drawn behind the page's content, but still in front of the body's
// background color. overflow-hidden trims the shapes, which reach past the
// screen's edges.
//
// Its colors are tokens in globals.css (--dusk-top, --shape-peach, ...), with dark
// mode versions. Every text color on top of it keeps 4.5:1 contrast or better,
// even where all three shapes overlap at full strength over the darkest part of
// the sky, with the grain at its darkest.
export default function AmbientBackground({ mood = "lively", scrollStory = false }: AmbientBackgroundProps) {
  const lively = mood === "lively";
  const strength = lively ? "opacity-70" : "opacity-50";

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* The sky: dusk, and on the welcome page, dawn on top of it (opacity 0
          until the scroll story fades it in). */}
      <div className="ambient-dusk absolute inset-0" />
      {scrollStory && <div className="ambient-dawn absolute inset-0" />}

      {/* Sized in vmax (a percentage of the screen's longer side), so they're
          big soft clouds on a phone and on a wide monitor alike. */}
      <Shape
        place="-top-[20%] -right-[15%] h-[60vmax] w-[70vmax]"
        look={`bg-(--shape-lavender) ${strength}`}
        breathe={lively && "motion-safe:animate-breathe-1"}
      />
      <Shape
        place="top-[30%] -left-[25%] h-[55vmax] w-[60vmax]"
        look={`bg-(--shape-sage) ${strength}`}
        breathe={lively && "motion-safe:animate-breathe-2"}
      />
      <Shape
        place="-right-[10%] -bottom-[30%] h-[60vmax] w-[80vmax]"
        look={`bg-(--shape-peach) ${strength}`}
        breathe={lively && "motion-safe:animate-breathe-3"}
      />

      {/* Film grain, over the sky and the shapes. Static. */}
      <div className="ambient-grain absolute inset-0" />
    </div>
  );
}

// One shape, as two divs:
// - The outer div is where the shape sits and how it moves. Breathing (globals.css)
//   only changes its transform. will-change asks the browser to give it a layer of
//   its own, a picture it can move and scale without drawing it again.
// - The inner div is what it looks like: an oval (rounded-[50%]), a color, a
//   little see-through, and heavily blurred. The blur is a static filter that never
//   animates, so the browser draws the blurred oval into the outer div's layer
//   once, and breathing just moves that picture around.
// data-ambient-shape lets the welcome preview's pause button pause the breathing
// too (globals.css).
function Shape({ place, look, breathe }: { place: string; look: string; breathe: string | false }) {
  return (
    <div
      data-ambient-shape=""
      className={`absolute ${place} ${breathe ? `${breathe} motion-safe:will-change-transform` : ""}`}
    >
      <div className={`size-full rounded-[50%] blur-[80px] ${look}`} />
    </div>
  );
}
