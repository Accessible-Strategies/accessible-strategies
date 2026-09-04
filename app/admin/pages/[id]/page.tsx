import PageEditor from '@/components/admin/PageEditor';

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <section className="container admin-content">
      <PageEditor pageId={Number(id)} />
    </section>
  );
}