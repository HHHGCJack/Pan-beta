import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useTheme } from '../App';
import { scrollToElementSmoothly } from '../src/utils/smoothScroll';

const words = [
  { text: '你好', lang: 'cn' },
  { text: 'Hello', lang: 'en' },
  { text: 'Hola', lang: 'es' },
  { text: 'Bonjour', lang: 'fr' },
  { text: 'こんにちは', lang: 'jp' },
  { text: '안녕하세요', lang: 'kr' },
  { text: 'Привет', lang: 'ru' },
  { text: 'Γεια σας', lang: 'el' }
];

export const Hero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { themeMode, language } = useTheme();

  const translations = {
    zh: {
      slogan: 'Simple . Pure . Powerful'
    },
    en: { slogan: 'Simple . Pure . Powerful' },
    ja: { slogan: 'Simple . Pure . Powerful' },
    ko: { slogan: 'Simple . Pure . Powerful' },
    es: { slogan: 'Simple . Pure . Powerful' },
    fr: { slogan: 'Simple . Pure . Powerful' },
    de: { slogan: 'Simple . Pure . Powerful' }
  };

  const t = (translations as any)[language] || translations.en;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % words.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  const scrollToContent = () => {
    scrollToElementSmoothly('content-section');
  };

  return (
    <section 
      id="hero-cover"
      className={`relative w-full h-screen min-h-screen sm:h-[100dvh] sm:min-h-[100dvh] flex flex-col items-center justify-center transition-colors duration-500 select-none pt-16 md:pt-20 pb-20 sm:pb-24`}
    >
      {/* Main Center Brand Cover - Optically Balanced Midpoint */}
      <div className="flex flex-col items-center justify-center w-full px-4 text-center my-auto -translate-y-2 sm:-translate-y-4">
        <div className="relative h-28 sm:h-36 md:h-48 w-full flex justify-center items-center overflow-visible">
          {words.map((word, index) => {
            const isActive = index === activeIndex;
            return (
              <span
                key={index}
                className={`absolute inset-0 flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                  isActive
                    ? 'opacity-100 transform translate-y-0 scale-100 pointer-events-auto'
                    : 'opacity-0 transform translate-y-4 scale-95 pointer-events-none'
                } ${themeMode === 'dark' ? 'text-white drop-shadow-[0_2px_20px_rgba(255,255,255,0.25)]' : 'text-gray-900 drop-shadow-sm'}`}
                style={{
                  fontFamily: '"SF Pro Rounded", "Arial Rounded MT Bold", "Nunito", "Varela Round", sans-serif',
                  fontWeight: 900,
                  fontSize: ['cn', 'jp', 'kr'].includes(word.lang) 
                    ? 'clamp(2.5rem, 11vw, 6.8rem)' 
                    : 'clamp(2.8rem, 13vw, 8rem)',
                  lineHeight: 1.25,
                  letterSpacing: '-0.02em',
                  willChange: isActive ? 'transform, opacity' : 'auto'
                }}
              >
                {word.text}
              </span>
            );
          })}
        </div>

        <p 
          className={`mt-3 sm:mt-5 md:mt-6 text-[11px] sm:text-xs md:text-sm font-semibold tracking-[0.3em] sm:tracking-[0.4em] uppercase ${
            themeMode === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {t.slogan}
        </p>
      </div>

      {/* Floating Bottom Scroll Prompt Indicator - Positioned naturally near bottom edge */}
      <div className="absolute bottom-5 sm:bottom-6 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center justify-center pointer-events-auto">
        <motion.button
          onClick={scrollToContent}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ 
            opacity: { repeat: Infinity, duration: 2.5, ease: "easeInOut" },
            delay: 0.8
          }}
          className={`flex flex-col items-center justify-center p-2.5 sm:p-3 rounded-full transition-all duration-300 hover:scale-110 active:scale-95 focus:outline-none cursor-pointer liquid-glass ${
            themeMode === 'dark' 
              ? 'liquid-glass-pill-dark text-white/80 hover:text-white' 
              : 'liquid-glass-pill-light text-gray-700 hover:text-black'
          }`}
          aria-label="Scroll down to explore"
        >
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            <ChevronDown size={20} strokeWidth={2.5} />
          </motion.div>
        </motion.button>
      </div>
    </section>
  );
};