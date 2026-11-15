import { supabase } from '../lib/supabase';
import { DEFAULT_SETTINGS, normalizeSettings, settingsFromRows, settingsToRows, type SiteSettings } from './siteSettingsModel';
export { DEFAULT_SETTINGS } from './siteSettingsModel';
export type { SiteSettings, ProductKey } from './siteSettingsModel';

const SETTINGS_STORAGE_KEY = 'gongpan_site_settings_v1';
export const SETTINGS_EVENT = 'gongpan_settings_updated';

export function getStoredSettings(): SiteSettings {
  if (typeof window === 'undefined') return normalizeSettings(DEFAULT_SETTINGS);
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}'));
  } catch {
    return normalizeSettings(DEFAULT_SETTINGS);
  }
}

export function saveSettingsLocal(settings: SiteSettings) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)); }
  catch { /* Browsing with unavailable storage still supports in-page updates. */ }
  window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: settings }));
}

export async function fetchServerSettings(): Promise<SiteSettings> {
  let fetched: SiteSettings | undefined;
  try {
    const response = await fetch(`/api/settings?_t=${Date.now()}`, { cache: 'no-store' });
    if (response.ok) {
      const data = await response.json();
      if (data?.productsEnabled) fetched = normalizeSettings(data);
    }
  } catch { /* Static hosts use the database directly. */ }

  try {
    const { data, error } = await supabase.from('settings').select('id, value');
    if (!error && data?.length) fetched = settingsFromRows(data, fetched);
  } catch { /* Retain the server or local snapshot while offline. */ }

  if (!fetched) return getStoredSettings();
  saveSettingsLocal(fetched);
  return fetched;
}

export async function saveServerSettings(settings: SiteSettings): Promise<{ success: boolean; error?: string }> {
  const previous = getStoredSettings();
  let apiSuccess = false;
  let dbSuccess = false;
  let errorMessage = '';
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch('/api/settings', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}) }, body: JSON.stringify(settings),
    });
    apiSuccess = response.ok;
  } catch { /* Continue with direct database persistence. */ }
  try {
    // Product switches never overwrite independently managed link rows.
    const { error } = await supabase.from('settings').upsert(settingsToRows(settings));
    dbSuccess = !error;
    errorMessage = error?.message || '';
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : '设置保存失败';
  }
  const success = apiSuccess || dbSuccess;
  saveSettingsLocal(success ? settings : previous);
  return { success, error: success ? undefined : errorMessage || '云端保存失败' };
}

export async function saveLinkSetting(key: string, enabled: boolean): Promise<boolean> {
  if (!Object.hasOwn(DEFAULT_SETTINGS.linksEnabled, key)) throw new Error('未知的链接');
  const id = `link_${key}_enabled`;
  // Update one row so simultaneous edits to other links cannot be overwritten.
  const { error } = await supabase.from('settings').upsert({ id, value: enabled });
  if (error) throw new Error(error.message);
  const { data, error: readError } = await supabase.from('settings').select('id, value').eq('id', id).single();
  if (readError || data?.value !== enabled) throw new Error(readError?.message || '云端未确认链接状态');
  return true;
}
