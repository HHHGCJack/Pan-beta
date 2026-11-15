import { useLayoutEffect, type RefObject } from 'react';
import { cancelFrame, frame, useMotionValue, type MotionValue } from 'motion/react';

type Offset = 'start start' | 'start end' | 'end start' | 'end end';
interface ScrollOptions {
  target: RefObject<HTMLElement | null>;
  offset: [Offset, Offset];
}
interface Chapter {
  element: HTMLElement;
  offset: [Offset, Offset];
  progress: MotionValue<number>;
  top: number;
  height: number;
  start: number;
  end: number;
  active?: boolean;
}

const chapters = new Set<Chapter>();
let resizeObserver: ResizeObserver | undefined;
let needsMeasure = true;
let viewportHeight = 0;

function offsetPosition(offset: Offset, top: number, height: number) {
  const [targetEdge, viewportEdge] = offset.split(' ');
  return top + (targetEdge === 'end' ? height : 0)
    - (viewportEdge === 'end' ? viewportHeight : 0);
}

function updateChapters() {
  // Layout is measured only after content/viewport changes. Touch and momentum
  // scroll frames read one scroll position, then update MotionValues directly.
  if (needsMeasure) {
    viewportHeight = document.documentElement.clientHeight;
    for (const chapter of chapters) {
      let top = 0;
      let element: HTMLElement | null = chapter.element;
      // offsetTop is unaffected by the transforms applied to feature cards.
      while (element) {
        top += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }
      chapter.top = top;
      chapter.height = chapter.element.offsetHeight;
      chapter.start = offsetPosition(chapter.offset[0], top, chapter.height);
      chapter.end = offsetPosition(chapter.offset[1], top, chapter.height);
    }
    needsMeasure = false;
  }

  const scrollY = window.scrollY;
  for (const chapter of chapters) {
    const distance = chapter.end - chapter.start;
    const progress = distance > 0 ? (scrollY - chapter.start) / distance : 0;
    chapter.progress.set(Math.max(0, Math.min(1, progress)));

    // Release large offscreen compositor surfaces, warming the next chapter
    // half a viewport before it enters. This never hides or unmounts content.
    const active = scrollY + viewportHeight * 1.5 >= chapter.top
      && scrollY - viewportHeight * .5 <= chapter.top + chapter.height;
    if (active !== chapter.active) {
      chapter.element.dataset.campaignScrollActive = String(active);
      chapter.active = active;
    }
  }
}

function scheduleUpdate() {
  frame.read(updateChapters);
}

function invalidateMeasurements() {
  needsMeasure = true;
  scheduleUpdate();
}

function startTracking() {
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', invalidateMeasurements, { passive: true });
  window.addEventListener('pageshow', invalidateMeasurements);
  resizeObserver = new ResizeObserver(invalidateMeasurements);
  resizeObserver.observe(document.body);
}

function stopTracking() {
  window.removeEventListener('scroll', scheduleUpdate);
  window.removeEventListener('resize', invalidateMeasurements);
  window.removeEventListener('pageshow', invalidateMeasurements);
  resizeObserver?.disconnect();
  resizeObserver = undefined;
  cancelFrame(updateChapters);
}

/** Shared, native document-scroll tracking for the product stories. */
export function useCampaignScroll({ target, offset }: ScrollOptions) {
  const scrollYProgress = useMotionValue(0);
  const [start, end] = offset;

  useLayoutEffect(() => {
    const element = target.current;
    if (!element) return;
    if (chapters.size === 0) startTracking();

    const chapter: Chapter = {
      element, offset: [start, end], progress: scrollYProgress,
      top: 0, height: 0, start: 0, end: 0,
    };
    chapters.add(chapter);
    resizeObserver?.observe(element);
    invalidateMeasurements();

    return () => {
      chapters.delete(chapter);
      resizeObserver?.unobserve(element);
      delete element.dataset.campaignScrollActive;
      if (chapters.size === 0) stopTracking();
    };
  }, [target, start, end, scrollYProgress]);

  return { scrollYProgress };
}
