import { useCallback, useLayoutEffect, useRef, useState } from "react";

// A one-time CSS animation, like the chips rising in under a new reply.
//
// The animate-* class is on the element only while `playing` is true. When the
// animation ends, `playing` turns false and the class comes off for good, so a
// re-render or a new message can't start it again.
//
// One more case needs care. With cacheComponents, Next.js hides a page you navigate
// away from (display: none) and shows it again when you come back. The browser
// throws away any CSS animation on a hidden element, and when it's shown again,
// makes a new one that plays from the start. So every time the element is shown
// (React re-runs layout effects then), we compare: is the animation on it the same
// one we started with? If it's a new copy, that's a replay, and we skip it straight
// to its end before the browser draws a single frame of it.
//
// Usage, shaped like useState:
//   const [arriving, arrivalRef] = usePlayOnce(true); // true: play as soon as it appears
//   <li ref={arrivalRef} className={arriving ? "motion-safe:animate-chip-in" : undefined}>
// or start with false and call the third item, play(), when the event happens.
export function usePlayOnce(startPlaying: boolean) {
  const [playing, setPlaying] = useState(startPlaying);
  const elementRef = useRef<HTMLElement | null>(null);
  // The browser's Animation object for the run we wanted. It survives hide and show.
  const firstRunRef = useRef<Animation | null>(null);

  // A callback ref, so it fits any element (<li>, <p>, <del>...).
  const ref = useCallback((element: HTMLElement | null) => {
    elementRef.current = element;
  }, []);

  // A layout effect runs after React updates the page but before the browser
  // paints it: on mount, when `playing` changes, and each time the page is shown again.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!playing || !element) {
      firstRunRef.current = null; // done; a later play() starts a new run
      return;
    }
    // getAnimations() lists the animations on the element right now. subtree: true
    // includes its ::before/::after (the ask-again glow is on ::after), and the
    // filter drops animations on its children (like a chip's ✎).
    const run = element
      .getAnimations({ subtree: true })
      .find((animation) => (animation.effect as KeyframeEffect | null)?.target === element);
    if (!run) {
      return; // nothing running, e.g. with reduced motion
    }
    if (firstRunRef.current === null) {
      firstRunRef.current = run; // the first run: let it play
    } else if (run !== firstRunRef.current) {
      run.finish(); // a new copy after being hidden: jump to the end (fires animationend)
    }
    function settle(event: AnimationEvent) {
      // Animation events bubble up from children too; only our own element's counts.
      if (event.target === element) {
        setPlaying(false);
      }
    }
    element.addEventListener("animationend", settle);
    return () => element.removeEventListener("animationend", settle);
  }, [playing]);

  const play = useCallback(() => setPlaying(true), []);

  // "as const" makes this a fixed-length tuple, so TypeScript knows the first item
  // is a boolean and the second the ref, like useState's [value, setValue].
  return [playing, ref, play] as const;
}
