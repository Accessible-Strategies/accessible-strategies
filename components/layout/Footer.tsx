'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@/lib/ThemeContext';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';

export default function Footer() {
  const { theme } = useTheme();
  const isDark     = theme === 'dark';
  const logoSrc    = isDark
    ? '/images/logo/rectangle-logo-dark-mode.svg'
    : '/images/logo/rectangle-logo-light-mode.svg';

  function handleExternalClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    const pref = localStorage.getItem('as-external-links');
    const openInNewTab = pref !== 'same-tab'; // defaults to new-tab
    if (openInNewTab) {
      e.preventDefault();
      window.open(href, '_blank', 'noopener,noreferrer');
    }
    // otherwise let the default same-tab navigation proceed
  }

  return (
    <footer className="footer">
      <div className="footer__inner container container--header">

        <Link href="/" aria-label="Accessible Strategies — home" className="footer__brand">
          <Image
            src={logoSrc}
            alt="Accessible Strategies"
            width={400}
            height={80}
          />
        </Link>

        <nav aria-label="Footer links" className="footer__links">
          <Link href="/accessibility" className="footer-link">Accessibility</Link>
          <Link href="/privacy" className="footer-link">Privacy</Link>
        </nav>

        <div className="footer__social">
          <a
            href="https://bsky.app/profile/accessiblestrategies.com"
            className="icon-hover"
            aria-label="Accessible Strategies on Bluesky"
            onClick={e => handleExternalClick(e, 'https://bsky.app/profile/accessiblestrategies.com')}
          >
            <BlueskyIcon />
          </a>
          <a
            href="https://mastodon.social/@accessiblestrategies"
            className="icon-hover"
            aria-label="Accessible Strategies on Mastodon"
            onClick={e => handleExternalClick(e, 'https://mastodon.social/@accessiblestrategies')}
          >
            <MastodonIcon />
          </a>
        </div>

      </div>
    </footer>
  );
}