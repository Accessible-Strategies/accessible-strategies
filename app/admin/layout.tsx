'use client';

import { SessionProvider } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import AdminHeader from '@/components/admin/AdminHeader';
import AppProviders from '@/components/layout/AppProviders';
import Backdrop from '@/components/layout/Backdrop';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  return (
    <SessionProvider>
      <AppProviders>
        {!isLoginPage && <AdminHeader />}
        {children}
        <Backdrop />
      </AppProviders>
    </SessionProvider>
  );
}