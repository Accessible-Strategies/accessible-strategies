'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import SettingsPanel from '@/components/ui/SettingsPanel';
import BaseDropdown from '@/components/ui/BaseDropdown';
import { SettingsIcon } from '@/components/icons/Icons';

export default function AdminHeader() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [anchor, setAnchor]             = useState({ top: 0, right: 0 });
  const gearRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const inScheduler = pathname?.startsWith('/admin/socials');

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

  return (
    <header className="admin-header">
      <div className="admin-header__inner">

        <div className="admin-header__left">
          <BaseDropdown
            label="Admin navigation"
            triggerClassName="icon-hover admin-header__trigger"
            trigger={open => <span aria-hidden="true">{open ? '✕' : '☰'}</span>}
          >
            {(close) => (
              <ul role="list">
                <li><Link href="/admin" onClick={close} role="menuitem">Dashboard</Link></li>
                <li><Link href="/admin/socials" onClick={close} role="menuitem">Socials</Link></li>
                {inScheduler && (
                  <li><Link href="/admin/socials/settings" onClick={close} role="menuitem">Settings</Link></li>
                )}
                <li><Link href="/admin/pages" onClick={close} role="menuitem">Pages</Link></li>
                <li><Link href="/admin/media" onClick={close} role="menuitem">Media</Link></li>
                <li><Link href="/admin/settings" onClick={close} role="menuitem">Site Settings</Link></li>
                <li>
                  <button role="menuitem" onClick={() => { close(); signOut({ callbackUrl: '/admin/login' }); }}>
                    Log out
                  </button>
                </li>
              </ul>
            )}
          </BaseDropdown>

          <Link href="/admin" aria-label="Accessible Strategies admin — dashboard">
            <Image
              src="/images/logo/square-logo-dark-mode.svg"
              alt=""
              width={36}
              height={36}
            />
          </Link>
        </div>

        <button
          ref={gearRef}
          className="icon-hover admin-header__trigger"
          aria-label="Open admin settings"
          aria-expanded={settingsOpen}
          aria-haspopup="dialog"
          onClick={openSettings}
        >
          <SettingsIcon />
        </button>

        {settingsOpen && (
          <SettingsPanel onClose={() => setSettingsOpen(false)} anchor={anchor} />
        )}

      </div>
    </header>
  );
}