import Link from 'next/link';
import { getSiteSettings } from '@/lib/actions/siteSettings';

export default async function AdminNotFound() {
  const { notFoundTitle, notFoundMessage } = await getSiteSettings();

  return (
    <section className="container admin-content">
      <h1>{notFoundTitle}</h1>
      <p>{notFoundMessage}</p>
      <Link href="/admin" className="btn btn--primary">
        Back to Dashboard
      </Link>
    </section>
  );
}