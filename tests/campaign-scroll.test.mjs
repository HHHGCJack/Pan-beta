import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/useCampaignScroll.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;

function mount() {
  const effects = [], pending = new Set(), listeners = new Map();
  let layoutReads = 0, observer;
  const window = {
    scrollY: 0,
    addEventListener: (event, callback, options) => listeners.set(event, { callback, options }),
    removeEventListener: event => listeners.delete(event),
  };
  const document = { body: {}, documentElement: { clientHeight: 800 } };
  const motion = {
    frame: { read: callback => pending.add(callback) },
    cancelFrame: callback => pending.delete(callback),
    useMotionValue: initial => ({ value: initial, set(value) { this.value = value; } }),
  };
  class ResizeObserver {
    constructor(callback) { observer = this; this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() { this.disconnected = true; }
  }
  const exports = {};
  vm.runInNewContext(code, {
    exports, window, document, ResizeObserver,
    require: name => name === 'react'
      ? { useLayoutEffect: callback => effects.push(callback()) }
      : motion,
  });
  return {
    window, document, listeners,
    chapter(top, height, offset) {
      const element = {
        dataset: {}, offsetParent: null, top, height,
        get offsetTop() { layoutReads++; return this.top; },
        get offsetHeight() { layoutReads++; return this.height; },
      };
      const { scrollYProgress } = exports.useCampaignScroll({ target: { current: element }, offset });
      return { element, progress: scrollYProgress };
    },
    flush() { for (const callback of pending) { pending.delete(callback); callback(); } },
    scroll(y) { window.scrollY = y; listeners.get('scroll').callback(); this.flush(); },
    resize() { observer.callback(); this.flush(); },
    get layoutReads() { return layoutReads; },
    cleanup() { effects.reverse().forEach(cleanup => cleanup()); },
    get observer() { return observer; },
    pending,
  };
}

test('touch/momentum frames use cached geometry and preserve both chapter progress ranges', () => {
  const fixture = mount();
  const pinned = fixture.chapter(1000, 2400, ['start start', 'end end']);
  const passing = fixture.chapter(1000, 800, ['start end', 'end start']);
  fixture.flush();
  const measuredReads = fixture.layoutReads;
  assert.equal(fixture.listeners.get('scroll').options.passive, true);
  fixture.scroll(1000);
  assert.equal(pinned.progress.value, 0);
  assert.equal(passing.progress.value, .5);
  fixture.scroll(1800);
  assert.equal(pinned.progress.value, .5);
  assert.equal(passing.progress.value, 1);
  fixture.scroll(5000);
  assert.equal(pinned.progress.value, 1);
  assert.equal(pinned.element.dataset.campaignScrollActive, 'false');
  fixture.scroll(0);
  assert.equal(pinned.progress.value, 0);
  assert.equal(pinned.element.dataset.campaignScrollActive, 'true');
  assert.equal(fixture.layoutReads, measuredReads, 'scroll frames must not measure layout');
  fixture.cleanup();
});

test('content reflow refreshes offsets and unmount removes listeners and scheduled work', () => {
  const fixture = mount();
  const chapter = fixture.chapter(1000, 2400, ['start start', 'end end']);
  fixture.scroll(1800);
  assert.equal(chapter.progress.value, .5);
  chapter.element.top = 1400;
  chapter.element.height = 2800;
  fixture.resize();
  assert.equal(chapter.progress.value, .2);
  fixture.listeners.get('scroll').callback();
  fixture.cleanup();
  assert.equal(fixture.listeners.size, 0);
  assert.equal(fixture.pending.size, 0);
  assert.equal(fixture.observer.disconnected, true);
  assert.equal(chapter.element.dataset.campaignScrollActive, undefined);
});
