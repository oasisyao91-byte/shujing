'use client';

import { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { getBookshelfEntry, saveBookshelfEntry } from '@/app/actions/bookshelf';

export function PersonaReasonBlock({
  doubanId,
  isLoggedIn,
}: {
  doubanId: string;
  isLoggedIn: boolean;
}) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [starred, setStarred] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/books/persona-reason?doubanId=${encodeURIComponent(doubanId)}&mode=detail`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const reader = res.body?.getReader();
        if (!reader) {
          setLoading(false);
          return;
        }
        const decoder = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          if (!cancelled) setText(buf);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doubanId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setStarred(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const entry = await getBookshelfEntry(doubanId);
        if (cancelled) return;
        setStarred(entry.status === 'want_read' || entry.status === 'reading' || entry.status === 'finished');
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doubanId, isLoggedIn]);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 1500);
  };

  return (
    <div className="rounded-2xl bg-brand-blue/5 border border-brand-blue/10 p-4 relative">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="text-xs text-brand-muted">基于你的阅读性格生成</div>
        <button
          type="button"
          aria-label={starred ? '已加入书单' : '点亮并加入书单'}
          disabled={saving}
          onClick={async () => {
            if (!isLoggedIn) {
              window.location.href = `/login`;
              return;
            }
            if (starred) {
              showToast('已收入书境 ✓');
              return;
            }
            setSaving(true);
            try {
              let existingNote = '';
              try {
                const entry = await getBookshelfEntry(doubanId);
                existingNote = entry.note || '';
              } catch {
                existingNote = '';
              }

              const currentReason = text.replace(/\s+/g, ' ').trim();
              const reasonNote = currentReason ? currentReason.slice(0, 500) : '';
              const noteToSave = existingNote || reasonNote;

              await saveBookshelfEntry({ doubanId, status: 'want_read', note: noteToSave });
              setStarred(true);
              window.dispatchEvent(new CustomEvent('bookshelf-updated', { detail: { doubanId } }));
              showToast('这本书已经在等你了 📌');
            } catch {
              showToast('哎，出了点小问题，再试一次？');
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex items-center gap-2 text-xs font-medium text-brand-navy hover:text-brand-blue disabled:opacity-50"
        >
          <Star size={18} className={starred ? 'fill-yellow-400 text-yellow-500' : 'text-brand-muted'} />
        </button>
      </div>
      <div className="text-brand-navy leading-relaxed">
        {loading ? '正在为你写下一句推荐语…' : (text || '暂时无法生成推荐语')}
      </div>
      {toast && (
        <div className="mt-2 text-xs text-brand-muted">{toast}</div>
      )}
    </div>
  );
}
