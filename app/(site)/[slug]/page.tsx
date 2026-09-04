import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPageBySlug } from '@/lib/actions/pages';
import RichTextPreview from '@/components/admin/RichTextPreview';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || page.status !== 'published') {
    return {};
  }

  return {
    title: `${page.title} — Accessible Strategies`,
    description: page.metaDescription ?? undefined,
  };
}

export default async function DynamicPage({ params }: PageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  if (!page || page.status !== 'published') {
    notFound();
  }

  return (
    <section className="section container">
      {page.heroImageUrl && (
        <img
          src={page.heroImageUrl}
          alt={page.heroImageAlt ?? ''}
          style={{
            width: '100%',
            maxHeight: '400px',
            objectFit: 'cover',
            borderRadius: 'var(--as-radius-lg)',
            marginBottom: 'var(--as-gap)',
          }}
        />
      )}
      <h1>{page.title}</h1>
      <RichTextPreview html={page.body} />
    </section>
  );
}