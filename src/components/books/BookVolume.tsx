'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import type { Book } from '@/types/database';

const COLORS = ['#1E3A5F', '#8B4513', '#2D5A27', '#7B2D8B', '#C4661F', '#1A5276', '#922B21'];

function hashId(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

export function BookVolume({
  book,
  active,
  onOpen,
  width = 132,
  height = 188,
}: {
  book: Book;
  active: boolean;
  onOpen: () => void;
  width?: number;
  height?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const id = String(book.douban_id || book.id);
  const accent = useMemo(() => COLORS[hashId(id) % COLORS.length], [id]);
  const coverSrc = book.cover_url ? `/api/images/proxy?url=${encodeURIComponent(book.cover_url)}` : null;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex-none outline-none transition-transform duration-200"
      style={{
        width,
        height,
        transform: active ? 'translateY(-10px)' : 'translateY(0)',
      }}
    >
      <div
        className="relative h-full w-full"
        style={{
          transformStyle: 'preserve-3d',
          WebkitTransformStyle: 'preserve-3d',
        }}
      >
        <div
          className="absolute inset-0 rounded-xl overflow-hidden"
          style={{
            background: '#ffffff',
            boxShadow: active ? '0 16px 34px rgba(0,0,0,0.22)' : '0 10px 24px rgba(0,0,0,0.16)',
            border: '1px solid rgba(0,0,0,0.08)',
          }}
        >
          <div className="relative w-full h-full">
            {coverSrc && !imgError ? (
              <Image
                src={coverSrc}
                alt={book.title}
                fill
                sizes={`${width}px`}
                className="object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-semibold"
                style={{ background: accent }}
              >
                {book.title.slice(0, 1)}
              </div>
            )}
            <div
              className="absolute inset-x-0 bottom-0 px-3 py-2"
              style={{
                background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.62) 100%)',
              }}
            >
              <div className="text-white text-sm font-semibold line-clamp-2 font-songti">{book.title}</div>
            </div>
          </div>
        </div>

        <div
          className="absolute top-0 right-0 h-full rounded-r-xl"
          style={{
            width: Math.max(8, Math.round(width * 0.075)),
            background: 'linear-gradient(180deg, rgba(255,255,255,0.35) 0%, rgba(0,0,0,0.10) 100%)',
            transform: 'translateX(6px) rotateY(85deg)',
            transformOrigin: 'left',
          }}
        />

        <div
          className="absolute bottom-0 left-0 right-0"
          style={{
            height: Math.max(8, Math.round(height * 0.05)),
            background: 'linear-gradient(90deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.02) 70%)',
            transform: 'translateY(6px) rotateX(85deg)',
            transformOrigin: 'top',
          }}
        />
      </div>
    </button>
  );
}
