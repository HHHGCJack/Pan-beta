import { NAVIGATION_LINKS, type ProductKey } from '../data/navigationLinks';
export type { ProductKey } from '../data/navigationLinks';

export interface SiteSettings {
  welcomeModalEnabled: boolean;
  productsEnabled: Record<ProductKey, boolean>;
  linksEnabled: Record<string, boolean>;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  welcomeModalEnabled: false,
  productsEnabled: { pansou: true, 'reading-pro': true, 'ai-agent': true, chat: true },
  linksEnabled: Object.fromEntries(NAVIGATION_LINKS.filter(link => !link.fixed).map(link => [link.id, true])),
};

const PRODUCT_ROWS: Record<ProductKey, string> = {
  pansou: 'pansou_enabled', 'reading-pro': 'reading_pro_enabled', 'ai-agent': 'ai_agent_enabled', chat: 'chat_enabled',
};

export function normalizeSettings(input: Partial<SiteSettings> = {}): SiteSettings {
  const source = input || {};
  return {
    welcomeModalEnabled: typeof source.welcomeModalEnabled === 'boolean' ? source.welcomeModalEnabled : false,
    productsEnabled: Object.fromEntries(Object.keys(PRODUCT_ROWS).map(key => [key, source.productsEnabled?.[key] !== false])) as Record<ProductKey, boolean>,
    linksEnabled: Object.fromEntries(Object.keys(DEFAULT_SETTINGS.linksEnabled).map(key => [key, source.linksEnabled?.[key] !== false])),
  };
}

export function settingsFromRows(rows: Array<{ id: string; value: unknown }>, base?: Partial<SiteSettings>): SiteSettings {
  const settings = normalizeSettings(base);
  const values = new Map(rows.filter(row => typeof row.value === 'boolean').map(row => [row.id, row.value as boolean]));
  settings.welcomeModalEnabled = values.get('welcome_modal_enabled') ?? values.get('welcomeModalEnabled') ?? settings.welcomeModalEnabled;
  for (const [key, row] of Object.entries(PRODUCT_ROWS)) {
    settings.productsEnabled[key] = values.get(row) ?? values.get(key) ?? settings.productsEnabled[key];
  }
  for (const key of Object.keys(settings.linksEnabled)) {
    settings.linksEnabled[key] = values.get(`link_${key}_enabled`) ?? settings.linksEnabled[key];
  }
  return settings;
}

export function settingsToRows(settings: SiteSettings) {
  const normalized = normalizeSettings(settings);
  return [
    ...Object.entries(PRODUCT_ROWS).map(([key, id]) => ({ id, value: normalized.productsEnabled[key] })),
    { id: 'welcome_modal_enabled', value: normalized.welcomeModalEnabled },
  ];
}
