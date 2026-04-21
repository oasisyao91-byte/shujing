"use client";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";

const PERSONA_RING: Record<string, string> = {
  IFNW: "#1E3A5F",
  ITRG: "#2D5A27",
  EFNW: "#3A7AB5",
  ETRG: "#1A5276",
  IFNG: "#7B2D8B",
  IFRW: "#C4661F",
  ETRW: "#8B4513",
  EFNG: "#922B21",
};

export function Navbar({
  user,
  personaType,
}: {
  user: User | null;
  personaType?: string | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [scrolled, setScrolled] = useState(false);

  const ringColor = useMemo(() => {
    if (!personaType) return null;
    return PERSONA_RING[personaType] || null;
  }, [personaType]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-50 w-full border-b backdrop-blur-md transition-shadow"
      style={{
        backgroundColor: "rgba(245,240,232,0.95)",
        boxShadow: scrolled ? "0 1px 20px rgba(0,0,0,0.08)" : "none",
      }}
    >
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-4">
          <a
            href="/"
            className="text-xl font-bold tracking-tight text-brand-navy"
            style={{ fontFamily: "var(--font-songti)" }}
          >
            书境
          </a>
        </div>
        <div className="flex-1 flex justify-center">
        </div>
        <div className="flex items-center gap-4">
          {user ? (
            <details className="relative">
              <summary className="list-none cursor-pointer select-none">
                <div className="flex flex-col items-center">
                  <div
                    className="w-9 h-9 rounded-full text-white flex items-center justify-center font-semibold"
                    style={{
                      ...(ringColor ? { outline: `2px solid ${ringColor}`, outlineOffset: 2 } : undefined),
                      backgroundColor: '#3D2314',
                    }}
                  >
                    {(user as any)?.user_metadata?.avatar_emoji || '📚'}
                  </div>
                </div>
              </summary>
              <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-brand-parchment bg-white shadow-sm overflow-hidden">
                <a href="/?test=1" className="block px-4 py-3 text-sm text-brand-navy hover:bg-brand-parchment/60">
                  我的阅读性格
                </a>
                <a href="/bookshelf" className="block px-4 py-3 text-sm text-brand-navy hover:bg-brand-parchment/60">
                  我的书单
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-brand-parchment/60"
                >
                  退出登录
                </button>
              </div>
            </details>
          ) : (
            <div className="flex items-center gap-4">
              <a href="/login" className="text-sm font-medium text-brand-navy hover:text-brand-blue transition-colors duration-150">登录</a>
              <a href="/register" className="px-4 py-2 text-sm font-medium text-white rounded bg-brand-blue hover:bg-brand-navy">注册</a>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
