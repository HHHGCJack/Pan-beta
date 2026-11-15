import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useTheme } from '../App';

/** Enforce switches for ordinary links and direct internal route visits. */
export const NavigationAccess: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { checkNavigation, isNavigationEnabled, language } = useTheme();
  const location = useLocation();
  const href = location.pathname + location.search + location.hash;

  useEffect(() => {
    const interceptLink = (event: MouseEvent) => {
      const anchor = (event.target as Element)?.closest?.('a[href]');
      const address = anchor?.getAttribute('href');
      if (!address || checkNavigation(address)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    document.addEventListener('click', interceptLink, true);
    document.addEventListener('auxclick', interceptLink, true);
    return () => {
      document.removeEventListener('click', interceptLink, true);
      document.removeEventListener('auxclick', interceptLink, true);
    };
  }, [checkNavigation]);

  if (isNavigationEnabled(href)) return <>{children}</>;
  return <section className="min-h-[80svh] grid place-items-center p-6 pt-24">
    <div className="text-center max-w-md">
      <Lock className="mx-auto mb-5 text-gray-400" size={30} />
      <h1 className="text-2xl font-semibold">{language === 'zh' ? '此功能暂时暂停访问' : 'Temporarily unavailable'}</h1>
      <Link to="/" className="inline-flex mt-7 px-6 py-3 rounded-full liquid-glass liquid-glass-pill-light text-gray-900">{language === 'zh' ? '返回首页' : 'Back home'}</Link>
    </div>
  </section>;
};
