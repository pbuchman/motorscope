/**
 * UserMenu Component
 *
 * Dropdown menu for user actions including logout and language switching.
 * Replaces the standalone logout button across the app.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut, ChevronDown, Globe, Check } from 'lucide-react';
import i18n from '@/i18n';
import { patchRemoteSettings } from '@/api/client';

type Language = 'en' | 'pl';

interface UserMenuProps {
  userEmail: string;
  onLogout: () => void;
  onLanguageChange?: (language: Language) => void;
  variant?: 'light' | 'dark';
  compact?: boolean;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  userEmail,
  onLogout,
  onLanguageChange,
  variant = 'dark',
  compact = false,
}) => {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentLanguage = i18n.language as Language;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handleLanguageChange = async (language: Language) => {
    if (language === currentLanguage) return;

    i18n.changeLanguage(language);

    try {
      await patchRemoteSettings({ language });
    } catch (error) {
      console.error('[UserMenu] Failed to persist language preference:', error);
    }

    onLanguageChange?.(language);
    setIsOpen(false);
  };

  const handleLogout = () => {
    setIsOpen(false);
    onLogout();
  };

  const baseButtonClass = variant === 'dark'
    ? 'bg-slate-700 hover:bg-slate-600 text-white'
    : 'bg-white hover:bg-slate-100 text-slate-900 border border-slate-200';

  const menuClass = variant === 'dark'
    ? 'bg-slate-800 border-slate-700'
    : 'bg-white border-slate-200';

  const menuItemClass = variant === 'dark'
    ? 'hover:bg-slate-700 text-slate-200'
    : 'hover:bg-slate-100 text-slate-700';

  const menuItemActiveClass = variant === 'dark'
    ? 'bg-slate-700'
    : 'bg-slate-100';

  return (
    <div className="relative" ref={menuRef} onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${baseButtonClass}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className={`truncate ${compact ? 'max-w-[120px]' : 'max-w-[180px]'}`}>
          {userEmail}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute right-0 mt-2 w-56 rounded-lg border shadow-lg z-50 py-1 ${menuClass}`}
          role="menu"
          aria-orientation="vertical"
        >
          <div className="px-3 py-2 border-b border-slate-600/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Globe className="w-3 h-3" />
              {t('userMenu.language')}
            </div>
            <div className="flex gap-1 mt-2">
              <button
                onClick={() => handleLanguageChange('en')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  currentLanguage === 'en' ? menuItemActiveClass : menuItemClass
                }`}
                role="menuitemradio"
                aria-checked={currentLanguage === 'en'}
              >
                <span>🇬🇧</span>
                <span>{t('userMenu.languageEn')}</span>
                {currentLanguage === 'en' && <Check className="w-3 h-3" />}
              </button>
              <button
                onClick={() => handleLanguageChange('pl')}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors ${
                  currentLanguage === 'pl' ? menuItemActiveClass : menuItemClass
                }`}
                role="menuitemradio"
                aria-checked={currentLanguage === 'pl'}
              >
                <span>🇵🇱</span>
                <span>{t('userMenu.languagePl')}</span>
                {currentLanguage === 'pl' && <Check className="w-3 h-3" />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${menuItemClass}`}
            role="menuitem"
          >
            <LogOut className="w-4 h-4" />
            {t('userMenu.logout')}
          </button>
        </div>
      )}
    </div>
  );
};

