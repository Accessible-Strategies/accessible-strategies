'use client';

import { useSession } from 'next-auth/react';

export default function AdminHome() {
  const { data: session } = useSession();

  return (
    <section className="container admin-content">
      <h1>Dashboard</h1>
      <p>Logged in as {session?.user?.name}.</p>
      <p>The scheduler isn't built yet — see the roadmap.</p>
    </section>
  );
}