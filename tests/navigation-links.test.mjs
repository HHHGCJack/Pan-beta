import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function loadModule(path, dependencies = {}) {
  const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, URL, Set, Map, Object, require: name => dependencies[name] });
  return exports;
}
const links = loadModule('../src/data/navigationLinks.ts');
const settings = loadModule('../src/utils/siteSettingsModel.ts', { '../data/navigationLinks': links });

test('the inventory covers every fixed destination and defaults preserve existing site data', () => {
  assert.equal(links.NAVIGATION_LINKS.length, 22);
  assert.equal(new Set(links.NAVIGATION_LINKS.map(link => link.id)).size, 22);
  const legacy = settings.normalizeSettings({ productsEnabled: { chat: false } });
  assert.equal(legacy.productsEnabled.chat, false);
  assert.equal(legacy.productsEnabled.pansou, true);
  assert.equal(Object.values(legacy.linksEnabled).every(Boolean), true);
});

test('deep links, reordered queries, site aliases and legacy showcase IDs share their controls', () => {
  const cases = [
    ['/laboratory?game=roadster&category=games&utm_source=search', 'game-roadster'],
    ['/laboratory?tab=json&category=tools', 'tool-json'],
    ['/laboratory#games', 'lab-games'],
    ['https://gongpan.org/showcase/im', 'intro-chat'],
    ['http://localhost:3000/showcase/readingpro', 'intro-reading'],
    ['https://pansou.app/?from=site', 'pansou-backup'],
  ];
  for (const [href, id] of cases) assert.equal(links.findNavigationLink(href)?.id, id, href);
  assert.equal(links.findNavigationLink('https://unrelated.example'), undefined);
});

test('switches block deep links and inherited access without coupling independent destinations', () => {
  const products = { pansou: true, chat: false };
  const disabled = { 'lab-tools': false, 'pansou-primary': false, 'game-roadster': false };
  assert.equal(links.getBlockedNavigationLink('/laboratory?category=tools&tab=json', disabled, products)?.id, 'lab-tools');
  assert.equal(links.getBlockedNavigationLink('https://so.252035.xyz', disabled, products)?.id, 'pansou-primary');
  assert.equal(links.getBlockedNavigationLink('https://pansou.app', disabled, products), undefined);
  assert.equal(links.getBlockedNavigationLink('/showcase/telegram', disabled, products)?.id, 'intro-chat');
  assert.equal(links.getBlockedNavigationLink('/laboratory?category=games&game=roadster', disabled, products)?.id, 'game-roadster');
  assert.equal(links.getBlockedNavigationLink('/admin', { admin: false }, products), undefined);
});

test('sparse cloud rows preserve legacy values and product saves leave link rows independent', () => {
  const base = settings.normalizeSettings({ productsEnabled: { chat: false }, linksEnabled: { research: false } });
  const current = settings.settingsFromRows([{ id: 'link_pansou-primary_enabled', value: false }], base);
  assert.equal(current.productsEnabled.chat, false);
  assert.equal(current.linksEnabled.research, false);
  assert.equal(current.linksEnabled['pansou-primary'], false);
  assert.equal(settings.settingsToRows(current).some(row => row.id.startsWith('link_')), false);
});

test('link persistence writes one row and requires a matching read-back before success', async () => {
  const writes = [];
  let value = false;
  let writeError = null;
  const persistence = loadModule('../src/utils/settings.ts', {
    './siteSettingsModel': settings,
    '../lib/supabase': { supabase: { from: () => ({
      upsert: async row => { writes.push(row); return { error: writeError }; },
      select: () => ({ eq: () => ({ single: async () => ({ data: { value }, error: null }) }) }),
    }) } },
  });
  assert.equal(await persistence.saveLinkSetting('game-roadster', false), true);
  assert.equal(writes[0].id, 'link_game-roadster_enabled');
  assert.equal(writes[0].value, false);
  await assert.rejects(persistence.saveLinkSetting('game-roadster', true), /云端未确认/);
  writeError = { message: 'write denied' };
  await assert.rejects(persistence.saveLinkSetting('game-roadster', false), /write denied/);
  await assert.rejects(persistence.saveLinkSetting('toString', false), /未知/);
});
