'use client';

import { useMemo } from 'react';

const SPINE_COLORS = ['#1E3A5F', '#8B4513', '#2D5A27', '#7B2D8B', '#C4661F', '#1A5276', '#922B21'];

function hashId(id: string) {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function lighten(hex: string, amount = 0.2) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const nr = Math.min(255, Math.round(r + (255 - r) * amount));
  const ng = Math.min(255, Math.round(g + (255 - g) * amount));
  const nb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${nr}, ${ng}, ${nb})`;
}

export function BookSpine({
  id,
  title,
  active,
  onOpen,
}: {
  id: string;
  title: string;
  active: boolean;
  onOpen: () => void;
}) {
  const color = useMemo(() => SPINE_COLORS[hashId(id) % SPINE_COLORS.length], [id]);
  const cap = useMemo(() => lighten(color, 0.22), [color]);
  const shortTitle = useMemo(() => (title || '').slice(0, 8), [title]);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative flex-none outline-none transition-transform duration-200 w-12 md:w-10 h-[200px]"
      style={{
        transform: active ? 'translateY(-12px)' : 'translateY(0)',
      }}
    >
      <div
        className="w-full h-full shadow-sm"
        style={{
          background: color,
          borderRight: '2px solid rgba(0,0,0,0.28)',
          borderBottomLeftRadius: 6,
          borderBottomRightRadius: 6,
          boxShadow: active ? '0 10px 22px rgba(0,0,0,0.22)' : '0 6px 14px rgba(0,0,0,0.16)',
        }}
      >
        <div style={{ height: 8, background: cap }} />
        <div
          className="px-2 pt-3 text-white/90 text-[12px] font-medium leading-snug overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            height: 192,
          }}
        >
          {shortTitle}
        </div>
      </div>
    </button>
  );
}
