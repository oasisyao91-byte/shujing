'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getBookshelfEntry, saveBookshelfEntry } from '@/app/actions/bookshelf';

type ShelfStatus = 'want_read' | 'reading' | 'finished' | null;

export function BookshelfActions({
  doubanId,
  isLoggedIn,
}: {
  doubanId: string;
  isLoggedIn: boolean;
}) {
  const [status, setStatus] = useState<ShelfStatus>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);

  const statusLabel = useMemo(() => {
    if (status === 'want_read') return '想读';
    if (status === 'reading') return '在读';
    if (status === 'finished') return '已读';
    return '';
  }, [status]);

  const refreshEntry = useCallback(async (cancelledRef?: { current: boolean }) => {
    const entry = await getBookshelfEntry(doubanId);
    if (cancelledRef?.current) return;
    setStatus(entry.status || null);
    setNote(entry.note || '');
  }, [doubanId]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const cancelledRef = { current: false };
    (async () => {
      try {
        await refreshEntry(cancelledRef);
      } catch {
        return;
      }
    })();
    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ doubanId?: string }>;
      if (ce.detail?.doubanId && ce.detail.doubanId !== doubanId) return;
      refreshEntry(cancelledRef).catch(() => undefined);
    };
    window.addEventListener('bookshelf-updated', onUpdated as EventListener);
    return () => {
      cancelledRef.current = true;
      window.removeEventListener('bookshelf-updated', onUpdated as EventListener);
    };
  }, [doubanId, isLoggedIn, refreshEntry]);

  const triggerSave = (next: { status: ShelfStatus; note: string }) => {
    if (!isLoggedIn) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      setSaving(true);
      try {
        await saveBookshelfEntry({ doubanId, status: next.status, note: next.note });
        if (next.status === 'want_read') setToast('这本书已经在等你了 📌');
        else if (next.status === 'reading') setToast('好好享受这段阅读时光 📖');
        else if (next.status === 'finished') setToast('又读完一本！你真了不起 🎉');
        else setToast('已收入书境 ✓');
        window.setTimeout(() => setToast(null), 1500);
      } catch {
        setToast('哎，出了点小问题，再试一次？');
        window.setTimeout(() => setToast(null), 2000);
      } finally {
        setSaving(false);
      }
    }, 800);
  };

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-brand-parchment bg-white p-4">
        <div className="text-sm text-brand-muted">登录后加入我的书单</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-parchment bg-white p-4 space-y-4">
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'want_read', label: '想读' },
          { key: 'reading', label: '在读' },
          { key: 'finished', label: '已读' },
        ] as const).map(item => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              const nextStatus: ShelfStatus = item.key;
              setStatus(nextStatus);
              triggerSave({ status: nextStatus, note });
            }}
            className={
              status === item.key
                ? 'h-10 px-4 rounded-xl bg-brand-blue text-white font-medium'
                : 'h-10 px-4 rounded-xl bg-brand-parchment text-brand-navy font-medium hover:bg-brand-parchment/70'
            }
          >
            {item.label}
          </button>
        ))}
        <div className="ml-auto text-xs text-brand-muted flex items-center">
          {saving ? '保存中…' : statusLabel ? `状态：${statusLabel}` : ''}
        </div>
      </div>

      <textarea
        value={note}
        onChange={e => {
          const v = e.target.value;
          setNote(v);
          triggerSave({ status, note: v });
        }}
        placeholder="写下此刻的想法…"
        className="w-full min-h-[96px] resize-none rounded-xl border border-brand-parchment bg-white px-4 py-3 text-brand-navy placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
      />

      {toast && (
        <div className="text-xs text-brand-muted">{toast}</div>
      )}
    </div>
  );
}
