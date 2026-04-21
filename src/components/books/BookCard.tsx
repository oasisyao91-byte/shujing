"use client";

import Image from 'next/image';
import { Book } from '@/types/database';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { BookmarkPlus } from 'lucide-react';
import { useState } from 'react';

interface BookCardProps {
  book: Book;
  reason?: string;
  reasonLabel?: string;
  variant?: 'default' | 'compact' | 'ranking';
  rank?: number;
  onAddToBookshelf?: (book: Book) => void;
  className?: string;
}

const colors = ['bg-red-100 text-red-800', 'bg-blue-100 text-blue-800', 'bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-purple-100 text-purple-800'];

export function BookCard({ book, reason, reasonLabel, variant = 'default', rank, onAddToBookshelf, className }: BookCardProps) {
  const [imgError, setImgError] = useState(false);
  const isRanking = variant === 'ranking';
  const isCompact = variant === 'compact';
  
  const coverSize = isCompact || isRanking ? 60 : 80;
  const coverSrc = book.cover_url ? `/api/images/proxy?url=${encodeURIComponent(book.cover_url)}` : null;
  
  const charHash = book.douban_id ? parseInt(book.douban_id.slice(-1), 16) || 0 : 0;
  const placeholderColor = colors[charHash % colors.length];

  return (
    <a
      href={`/book/${book.douban_id || book.id}`}
      className={cn(
        isRanking
          ? 'group block bg-white p-3 rounded-xl border border-transparent transition-all duration-200 hover:bg-[rgba(30,58,95,0.04)] relative'
          : 'block bg-white p-4 rounded-lg shadow-sm border border-transparent hover:border-brand-blue/20 transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative',
        className
      )}
    >
      <div className="flex gap-4 items-start relative">
        {isRanking && rank !== undefined && (
          <div
            className={cn(
              'flex-shrink-0 w-7 text-center',
              rank === 1
                ? 'text-[#B8860B] text-[1.5rem] font-bold'
                : rank === 2
                  ? 'text-[#708090] text-[1.4rem] font-bold'
                  : rank === 3
                    ? 'text-[#CD7F32] text-[1.3rem] font-bold'
                    : 'text-[1rem] font-normal'
            )}
            style={rank >= 4 ? { color: 'var(--color-ink-muted)' } : undefined}
          >
            {rank}
          </div>
        )}
        
        <div className="flex-shrink-0 relative" style={{ width: coverSize, height: coverSize * 1.4 }}>
          {coverSrc && !imgError ? (
            <div className="relative w-full h-full rounded overflow-hidden shadow-sm">
              <Image
                src={coverSrc}
                alt={book.title}
                fill
                sizes={`${coverSize}px`}
                className="object-cover"
                onError={() => setImgError(true)}
              />
            </div>
          ) : (
            <div className={cn("w-full h-full rounded flex items-center justify-center font-bold text-xl shadow-sm", placeholderColor)}>
              {book.title.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 pr-8">
          <h3 className="font-bold text-brand-navy truncate">{book.title}</h3>
          <p className="text-sm text-brand-muted truncate">{book.author}</p>
          
          <div className="flex items-center gap-2 mt-1">
            <div className="flex text-yellow-400 text-sm">
              {'★'.repeat(Math.round((book.rating || 0) / 2))}
              {'☆'.repeat(5 - Math.round((book.rating || 0) / 2))}
            </div>
            <span className="text-sm font-medium text-brand-navy">{book.rating ? book.rating.toFixed(1) : '暂无'}</span>
            {isRanking && book.rating_count && (
              <span className="text-xs text-brand-muted">({book.rating_count}人)</span>
            )}
          </div>

          {!isCompact && !isRanking && book.tags && book.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {book.tags.slice(0, 3).map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">{tag}</Badge>
              ))}
            </div>
          )}

          {!isRanking && reason && (
            <div
              className={cn(
                'mt-2 text-sm',
                isCompact ? 'line-clamp-2' : '',
                isCompact ? 'text-brand-muted' : 'text-brand-blue italic'
              )}
            >
              {reasonLabel && <span className="font-medium mr-1">{reasonLabel}:</span>}
              {reason}
            </div>
          )}
        </div>

        {isRanking && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            →
          </div>
        )}

        {onAddToBookshelf && (
          <button 
            onClick={(e) => {
              e.preventDefault();
              onAddToBookshelf(book);
            }}
            className="absolute top-0 right-0 p-1 text-brand-muted hover:text-brand-blue transition-colors"
            title="加入书单"
          >
            <BookmarkPlus size={20} />
          </button>
        )}
      </div>
    </a>
  );
}
