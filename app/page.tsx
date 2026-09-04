import type { Metadata } from 'next';
import { BlueskyIcon, MastodonIcon } from '@/components/icons/Icons';

export const metadata: Metadata = {
  title: 'Accessible Strategies — Coming Soon',
  description:
    "Accessible Strategies is a Digital Accessibility Consultancy launching November 2, 2026. Follow along on Bluesky or Mastodon in the meantime.",
};

// TODO: replace with your real profile URLs
const BLUESKY_URL = 'https://bsky.app/profile/a11ystrategies.bsky.social';
const MASTODON_URL = 'https://mastodon.social/@AccessibleStrategies';

export default function ComingSoonPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'var(--as-bg)',
        color: 'var(--as-text)',
      }}
    >
      <div style={{ maxWidth: '640px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'var(--as-text-3xl, 2rem)', marginBottom: '16px' }}>
          Welcome to Accessible Strategies!
        </h1>

        <div style={{ fontSize: 'var(--as-text-md, 1rem)', lineHeight: 1.6, textAlign: 'left' }}>
          <p>
            Thanks for coming. This site will detail the products and services I&rsquo;ll offer as a
            Digital Accessibility Consultant. I&rsquo;ll also be putting up work I have done as I&rsquo;m
            ready.
          </p>

          <p>
            The site isn&rsquo;t quite ready yet. I&rsquo;m hoping to launch it by <strong>November 2nd</strong>,
            so please check back then.
          </p>

          <p>
            Visit me on{' '}
            <a href={BLUESKY_URL} target="_blank" rel="noopener noreferrer">
              Bluesky
            </a>{' '}
            or{' '}
            <a href={MASTODON_URL} target="_blank" rel="noopener noreferrer">
              Mastodon
            </a>{' '}
            to check out what I&rsquo;m doing in the meantime!
          </p>

          <p style={{ marginTop: '32px' }}>
            Blessings,
            <br />
            Mark at Accessible Strategies
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '16px',
            marginTop: '24px',
          }}
        >
          <a
            href={BLUESKY_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Accessible Strategies on Bluesky"
            className="icon-hover"
          >
            <BlueskyIcon size={28} />
          </a>
          
          <a
            href={MASTODON_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Accessible Strategies on Mastodon"
            className="icon-hover"
          >
            <MastodonIcon size={28} />
          </a>
        </div>
      </div>
    </main>
  );
}