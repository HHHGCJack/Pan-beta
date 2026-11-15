import React, { useState } from 'react';
import { NAVIGATION_LINKS } from '../src/data/navigationLinks';
import { useTheme } from '../App';

export const LinkSettings: React.FC = () => {
  const { themeMode, linksEnabled, setLinkEnabled, isNavigationEnabled } = useTheme();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');
  const isDark = themeMode === 'dark';
  const links = NAVIGATION_LINKS.filter(link => `${link.name} ${link.href} ${link.group}`.toLowerCase().includes(query.toLowerCase()));
  const groups = [...new Set(links.map(link => link.group))];

  async function toggle(id: string, name: string) {
    setPending(id);
    setMessage('正在保存到云端…');
    try {
      const enabled = linksEnabled[id] === false;
      await setLinkEnabled(id, enabled);
      setMessage(`${name}已${enabled ? '开启' : '关闭'}，云端已确认。`);
    } catch (error) {
      setMessage(`保存失败，${error instanceof Error ? error.message : '请稍后重试'}`);
    } finally {
      setPending(null);
    }
  }

  return <section className={`p-6 sm:p-7 rounded-3xl border liquid-glass ${isDark ? 'liquid-glass-dark' : 'liquid-glass-light'}`} aria-labelledby="link-settings-title">
    <h3 id="link-settings-title" className="text-lg font-bold">跳转链接与独立开关</h3>
    <p className="text-sm text-gray-500 mt-2">共 {NAVIGATION_LINKS.length} 个目标。关闭后保留入口，点击时提示暂停访问。产品和分类总开关也会影响其下属入口。</p>
    <input aria-label="搜索跳转链接" placeholder="搜索名称或目标地址" value={query} onChange={event => setQuery(event.target.value)} className="w-full mt-5 mb-2 px-4 py-3 rounded-xl border border-gray-400/20 bg-transparent text-sm" />
    <p role="status" className="text-sm min-h-6 mt-2 text-blue-500">{message}</p>
    {groups.map(group => <div key={group} className="mt-5">
      <h4 className="font-semibold text-sm mb-3">{group}</h4>
      <div className="space-y-2">
        {links.filter(link => link.group === group).map(link => {
          const enabled = linksEnabled[link.id] !== false;
          const available = isNavigationEnabled(link.href);
          return <div key={link.id} className={`flex items-center justify-between gap-5 rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-black/20' : 'border-gray-200/70 bg-white/40'}`}>
            <div className="min-w-0">
              <p className="text-sm font-semibold">{link.name}</p>
              <p className="text-xs mt-1 break-all text-gray-500 select-text">{link.href}</p>
              {link.aliases?.map(alias => <p key={alias} className="text-xs mt-1 break-all text-gray-500 select-text">站内入口 {alias}</p>)}
              <p className="text-xs mt-2 text-gray-500">{link.fixed ? '基础导航，始终开放' : !enabled ? '已关闭' : available ? '已开启' : '已开启，上级开关已关闭'}</p>
            </div>
            {!link.fixed && <button type="button" role="switch" aria-label={`${link.name}访问开关`} aria-checked={enabled} disabled={pending !== null} onClick={() => toggle(link.id, link.name)}
              className={`relative inline-flex items-center shrink-0 w-14 h-8 rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-gray-400/40'} disabled:opacity-50`}>
              <span className={`w-6 h-6 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>}
          </div>;
        })}
      </div>
    </div>)}
    {links.length === 0 && <p className="text-sm text-gray-500 py-5">没有匹配的链接</p>}
  </section>;
};
