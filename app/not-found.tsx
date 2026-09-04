import Link from 'next/link';
import { getSiteSettings } from '@/lib/actions/siteSettings';

export default async function NotFound() {
  const { notFoundTitle, notFoundMessage } = await getSiteSettings();

  return (
    <section className="section container">
      <h1>{notFoundTitle}</h1>
      <p>{notFoundMessage}</p>
      <Link href="/" className="link--cta link--cta-primary">
        Back to home
      </Link>
    </section>
  );
}