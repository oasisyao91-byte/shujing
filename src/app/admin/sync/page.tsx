'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type SyncLog = {
  id?: string;
  sync_type?: string;
  status?: string;
  books_synced?: number;
  error_message?: string | null;
  synced_at?: string;
};

export default function AdminSyncPage() {
  const [secret, setSecret] = useState('');
  const [bookCount, setBookCount] = useState<number | null>(null);
  const [logs, setLogs] = useState<SyncLog[]>([]);
  const [busy, setBusy] = useState<null | 'douban' | 'trending' | 'stats'>(null);
  const [message, setMessage] = useState<string | null>(null);

  const authHeaders = useMemo(() => {
    const h: Record<string, string> = {};
    if (secret) h.Authorization = `Bearer ${secret}`;
    return h;
  }, [secret]);

  const loadStats = useCallback(async () => {
    if (!secret) return;
    setBusy('stats');
    setMessage(null);
    try {
      const res = await fetch('/api/admin/sync-stats', { headers: authHeaders, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '加载失败');
      setBookCount(typeof data?.bookCount === 'number' ? data.bookCount : null);
      setLogs(Array.isArray(data?.logs) ? data.logs : []);
    } catch (e: any) {
      setMessage(e?.message || '加载失败');
    } finally {
      setBusy(null);
    }
  }, [authHeaders, secret]);

  const trigger = useCallback(async (kind: 'douban' | 'trending') => {
    if (!secret) {
      setMessage('请先填写 CRON_SECRET');
      return;
    }
    setBusy(kind);
    setMessage(null);
    try {
      const path = kind === 'douban' ? '/api/cron/douban-books' : '/api/cron/trending';
      const res = await fetch(path, { headers: authHeaders, cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || '执行失败');
      setMessage(`已触发：${kind === 'douban' ? '高分图书同步' : '今日书页刷新'}（${JSON.stringify(data)}）`);
      await loadStats();
    } catch (e: any) {
      setMessage(e?.message || '执行失败');
    } finally {
      setBusy(null);
    }
  }, [authHeaders, loadStats, secret]);

  useEffect(() => {
    if (!secret) return;
    loadStats();
  }, [secret, loadStats]);

  return (
    <div className="container py-10 max-w-3xl space-y-6">
      <div className="border-l-4 pl-3" style={{ borderColor: '#1E3A5F' }}>
        <h1 className="text-2xl font-bold text-brand-navy" style={{ fontFamily: 'var(--font-display)' }}>
          手动刷新
        </h1>
        <div className="text-sm font-songti" style={{ color: 'var(--color-ink-muted)' }}>
          用于立即同步高分图书与刷新今日书页
        </div>
      </div>

      <div className="rounded-2xl border border-brand-parchment bg-white p-6 space-y-4">
        <div className="space-y-2">
          <div className="text-sm text-brand-muted">CRON_SECRET</div>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="输入 Vercel 环境变量 CRON_SECRET"
            className="w-full h-12 rounded-2xl border border-brand-parchment bg-white px-4 text-slate-800 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => trigger('douban')}
            disabled={busy !== null}
            className="h-11 px-5 rounded-2xl border font-semibold disabled:opacity-60"
            style={{ borderColor: '#1E3A5F', color: '#1E3A5F' }}
          >
            {busy === 'douban' ? '同步中…' : '刷新高分图书'}
          </button>
          <button
            type="button"
            onClick={() => trigger('trending')}
            disabled={busy !== null}
            className="h-11 px-5 rounded-2xl border font-semibold disabled:opacity-60"
            style={{ borderColor: '#1E3A5F', color: '#1E3A5F' }}
          >
            {busy === 'trending' ? '刷新中…' : '刷新今日书页'}
          </button>
          <button
            type="button"
            onClick={loadStats}
            disabled={busy !== null || !secret}
            className="h-11 px-5 rounded-2xl border border-brand-parchment bg-brand-parchment/60 text-brand-navy font-semibold disabled:opacity-60"
          >
            {busy === 'stats' ? '加载中…' : '查看同步状态'}
          </button>
        </div>

        {message && (
          <div className="text-sm text-slate-800 bg-brand-parchment/60 border border-brand-parchment rounded-2xl p-4 whitespace-pre-wrap">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-parchment bg-white p-4">
            <div className="text-sm text-brand-muted">当前书籍数量</div>
            <div className="text-3xl font-bold text-brand-navy mt-2">
              {bookCount === null ? '—' : bookCount}
            </div>
          </div>
          <div className="rounded-2xl border border-brand-parchment bg-white p-4">
            <div className="text-sm text-brand-muted">提示</div>
            <div className="text-sm text-slate-800 mt-2 font-songti leading-relaxed">
              建议只在需要时手动触发；日常由 Vercel Cron 自动执行。
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm text-brand-muted">最近同步记录</div>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-sm text-brand-muted">暂无</div>
            ) : (
              logs.map((log, idx) => (
                <div key={log.id || idx} className="rounded-2xl border border-brand-parchment bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="text-sm text-slate-800">
                      <span className="text-brand-muted">{log.sync_type || 'sync'}</span>
                      <span className="mx-2 text-brand-muted">·</span>
                      <span>{log.status || '-'}</span>
                    </div>
                    <div className="text-xs text-brand-muted">
                      {log.synced_at ? new Date(log.synced_at).toLocaleString() : ''}
                    </div>
                  </div>
                  {log.error_message ? (
                    <div className="text-xs text-red-600 mt-2 whitespace-pre-wrap">{log.error_message}</div>
                  ) : null}
                  <div className="text-xs text-brand-muted mt-2">同步数量：{log.books_synced ?? '-'}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
