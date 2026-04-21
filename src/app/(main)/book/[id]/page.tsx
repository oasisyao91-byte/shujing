import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Image from 'next/image';
import { BookshelfActions } from '@/components/books/BookshelfActions';
import { PersonaReasonBlock } from '@/components/books/PersonaReasonBlock';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const doubanId = params.id;
  const supabase = createClient() as any;
  const { data: book } = await supabase
    .from('books')
    .select('title, author, summary, cover_url')
    .eq('douban_id', doubanId)
    .maybeSingle();

  if (!book) {
    return {
      title: '书页被风吹走了',
      description: '这里是一片知识的荒原，你要找的书页可能被风吹走了。',
    };
  }

  const descBase = (book.summary || '').replace(/\s+/g, ' ').trim();
  const description = descBase ? descBase.slice(0, 120) : `关于《${book.title}》的书籍详情与书单管理。`;
  const image = book.cover_url ? `/api/images/proxy?url=${encodeURIComponent(book.cover_url)}` : '/og-image.svg';

  return {
    title: `《${book.title}》`,
    description,
    openGraph: {
      title: `《${book.title}》`,
      description,
      images: [{ url: image }],
    },
  };
}

export default async function BookDetailPage({ params }: { params: { id: string } }) {
  const doubanId = params.id;
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();

  const { data: book } = await supabase
    .from('books')
    .select('*')
    .eq('douban_id', doubanId)
    .maybeSingle();

  if (!book) {
    notFound();
  }

  return (
    <div className="container py-10">
      <div className="grid gap-8 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden border border-brand-parchment bg-brand-parchment/40">
            {book.cover_url ? (
              <Image
                src={`/api/images/proxy?url=${encodeURIComponent(book.cover_url)}`}
                alt={book.title}
                fill
                sizes="(max-width: 768px) 100vw, 280px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-muted">
                暂无封面
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-brand-parchment bg-white p-4">
            <div className="text-sm text-brand-muted">豆瓣评分</div>
            <div className="text-3xl font-bold text-brand-navy mt-1">
              {book.rating ?? '—'}
            </div>
            {book.rating_count ? (
              <div className="text-xs text-brand-muted mt-1">{book.rating_count} 人评分</div>
            ) : null}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-brand-navy">{book.title}</h1>
            <div className="text-brand-muted">
              {book.author ? <span>{book.author}</span> : null}
              {book.publisher ? <span> · {book.publisher}</span> : null}
              {book.publish_date ? <span> · {book.publish_date}</span> : null}
            </div>
          </div>

          <PersonaReasonBlock doubanId={doubanId} isLoggedIn={!!user} />

          {Array.isArray(book.tags) && book.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {book.tags.slice(0, 12).map((t: string) => (
                <span key={t} className="px-3 py-1 rounded-full bg-brand-parchment text-brand-navy text-sm">
                  #{t}
                </span>
              ))}
            </div>
          ) : null}

          <div className="rounded-2xl border border-brand-parchment bg-white p-5 space-y-3">
            <div className="text-lg font-bold text-brand-navy">简介</div>
            <div className="text-brand-navy/90 leading-relaxed whitespace-pre-wrap">
              {book.summary || '暂无简介'}
            </div>
          </div>

          <BookshelfActions doubanId={doubanId} isLoggedIn={!!user} />
        </div>
      </div>
    </div>
  );
}
