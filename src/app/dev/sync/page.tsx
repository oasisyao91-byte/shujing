"use client";

import { useState, useEffect } from 'react';
import { getSyncStats } from './actions';

export default function DevSyncPage() {
  const [stats, setStats] = useState<{ bookCount: number | null, logs: any[] }>({ bookCount: null, logs: [] });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isTrendingSyncing, setIsTrendingSyncing] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') {
      window.location.href = '/';
      return;
    }
    loadStats();
  }, []);

  const loadStats = async () => {
    const data = await getSyncStats();
    if (data) setStats(data);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await fetch('/api/cron/douban-books');
      await loadStats();
    } catch (e) {
      console.error(e);
    }
    setIsSyncing(false);
  };

  const handleTrendingSync = async () => {
    setIsTrendingSyncing(true);
    try {
      await fetch('/api/cron/trending');
      await loadStats();
    } catch (e) {
      console.error(e);
    }
    setIsTrendingSyncing(false);
  };

  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="container py-10 max-w-2xl">
      <h1 className="text-3xl font-bold text-brand-navy mb-8">开发工具：数据同步</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-medium text-brand-navy">当前书籍数量</h2>
          <p className="text-4xl font-bold text-brand-blue mt-2">
            {stats.bookCount !== null ? stats.bookCount : '...'}
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="bg-brand-blue text-white px-6 py-2 rounded hover:bg-brand-navy disabled:opacity-50"
        >
          {isSyncing ? '同步中...' : '立即同步豆瓣数据'}
        </button>

        <button
          onClick={handleTrendingSync}
          disabled={isTrendingSyncing}
          className="bg-brand-parchment text-brand-navy px-6 py-2 rounded hover:bg-brand-parchment/70 disabled:opacity-50"
        >
          {isTrendingSyncing ? '刷新中...' : '强制刷新今日热点'}
        </button>

        <div className="mt-8">
          <h2 className="text-lg font-medium text-brand-navy mb-4">最近同步记录</h2>
          <div className="space-y-2">
            {stats.logs.map(log => (
              <div key={log.id} className="p-3 bg-gray-50 rounded text-sm flex justify-between items-center">
                <div>
                  <span className={`font-bold ${log.status === 'success' ? 'text-green-600' : 'text-red-600'}`}>[{log.status}]</span>
                  <span className="ml-2 text-gray-600">{new Date(log.synced_at).toLocaleString()}</span>
                  {log.error_message && <div className="text-xs text-red-500 mt-1">{log.error_message}</div>}
                </div>
                <div className="text-brand-muted">同步数量: {log.books_synced}</div>
              </div>
            ))}
            {stats.logs.length === 0 && <div className="text-gray-500 text-sm">暂无记录</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
