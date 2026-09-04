'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/ThemeContext';
import SettingsPanel from '@/components/ui/SettingsPanel';
import { SettingsIcon } from '@/components/icons/Icons';

const navLinks = [
  { label: 'About',             href: '/about'             },
  { label: 'Beyond Compliance', href: '/beyond-compliance' },
  { label: 'Portfolio',         href: '/portfolio'         },
  { label: 'Services',          href: '/services'          },
  { label: 'Contact',           href: '/contact'           },
];

export default function Nav() {
  const [menuOpen, setMenuOpen]         = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [anchor, setAnchor]             = useState({ top: 0, right: 0 });
  const { theme }                       = useTheme();
  const pathname                        = usePathname();
  const gearRef                         = useRef<HTMLButtonElement>(null);

  const isDark  = theme === 'dark';
  const logoSrc = isDark
    ? '/images/logo/square-logo-dark-mode.svg'
    : '/images/logo/square-logo-light-mode.svg';

  function openSettings() {
    if (gearRef.current) {
      const rect = gearRef.current.getBoundingClientRect();
      setAnchor({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setSettingsOpen(true);
  }

  function closeSettings() {
    setSettingsOpen(false);
  }

  return (
    <nav aria-label="Main navigation" className="nav">
      <div className="nav__inner container container--header">

        {/* Logo */}
        <Link href="/" aria-label="Accessible Strategies — home">
          <Image
            src={logoSrc}
            alt="Accessible Strategies"
            width={100}
            height={100}
            className="nav__logo"
            priority
          />
        </Link>

        {/* Desktop nav links */}
        <ul role="list" className="nav__links" aria-label="Site pages">
          {navLinks.map(({ label, href }) => (
            <li key={href}>
              <Link
                href={href}
                className="nav-link"
                aria-current={pathname === href ? 'page' : undefined}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Settings gear */}
        <div className="settings-trigger">
          <button
            ref={gearRef}
            className="icon-hover"
            aria-label="Open site settings"
            aria-expanded={settingsOpen}
            aria-haspopup="dialog"
            onClick={openSettings}
          >
            <SettingsIcon />
          </button>

          {settingsOpen && (
            <SettingsPanel onClose={closeSettings} anchor={anchor} />
          )}
        </div>

        {/* Hamburger toggle — mobile only */}
        <button
          className="nav__toggle"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="nav-menu"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span aria-hidden="true">{menuOpen ? '✕' : '☰'}</span>
        </button>

      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div id="nav-menu" className="nav__menu">
          <ul role="list" aria-label="Site pages">
            {navLinks.map(({ label, href }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="nav-link"
                  aria-current={pathname === href ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

    </nav>
  );
}