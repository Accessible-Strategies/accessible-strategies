'use client';

import MediaBrowser from '@/components/admin/MediaBrowser';

export default function Media() {
  return (
    <section className="container admin-content">
      <h1>Media</h1>
      <MediaBrowser mode="select" standalone onClose={() => {}} />
    </section>
  );
}