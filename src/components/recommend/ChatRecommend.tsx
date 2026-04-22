'use client';

import { useEffect, useState } from 'react';
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import { useChat } from '@ai-sdk/react';
import { BookCard } from '@/components/books/BookCard';
import { pickPersonaGreeting } from '@/lib/persona-greetings';

export function ChatRecommend({
  isLoggedIn,
  personaName,
  personaType,
  lastBookTitle,
  collapsed,
  onExpand,
  prefillText,
}: {
  isLoggedIn: boolean;
  personaName?: string | null;
  personaType?: string | null;
  lastBookTitle?: string | null;
  collapsed?: boolean;
  onExpand?: () => void;
  prefillText?: string | null;
}) {
  const cleanText = (text: string) =>
    String(text || '')
      .replace(/\*\*/g, '')
      .replace(/__/g, '')
      .replace(/`+/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/\n+$/g, '');

  const [openingText, setOpeningText] = useState(() =>
    pickPersonaGreeting({ personaType, personaName, lastBookTitle })
  );
  const [input, setInput] = useState('');
  const [sessionId] = useState(() => {
    if (typeof window === 'undefined') return '00000000-0000-0000-0000-000000000000';
    const key = 'bookmind_chat_session';
    const existing = window.localStorage.getItem(key);
    if (existing) return existing;
    const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now());
    window.localStorage.setItem(key, id);
    return id;
  });

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: sessionId,
    transport: new DefaultChatTransport({ api: '/api/chat', body: { sessionId } }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: async ({ message }) => {
      try {
        if (!message) return;
        await fetch('/api/chat/persist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, message }),
        });
      } catch {
        return;
      }
    },
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/chat/history?sessionId=${encodeURIComponent(sessionId)}`);
        if (!res.ok) return;
        const data = await res.json();
        const history = Array.isArray(data?.messages) ? data.messages : [];
        if (!cancelled && history.length > 0 && messages.length === 0) {
          setMessages(history);
        }
      } catch {
        return;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, setMessages, messages.length]);

  useEffect(() => {
    setOpeningText(pickPersonaGreeting({ personaType, personaName, lastBookTitle }));
    setOpeningText(pickPersonaGreeting({ personaType, personaName, lastBookTitle, seedExtra: String(Math.random()) }));
  }, [personaType, personaName, lastBookTitle]);

  useEffect(() => {
    if (!prefillText) return;
    setInput(prev => (prev.trim() ? prev : prefillText));
  }, [prefillText]);

  const disabled = status !== 'ready';

  if (!isLoggedIn) {
    return (
      <div className="rounded-2xl border border-brand-parchment bg-white p-6 text-center space-y-3">
        <div className="text-brand-navy font-semibold">登录后开启对话寻书</div>
        <div className="text-sm text-brand-muted font-songti leading-relaxed">
          你的对话记录与书单会被保存，书境才能越聊越懂你。
        </div>
        <a
          href="/login?next=/"
          className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-brand-blue text-white font-medium hover:bg-brand-navy transition-colors"
        >
          去登录
        </a>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="rounded-2xl border border-brand-parchment bg-white">
        <div className="p-3 md:p-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              const text = input.trim();
              if (!text || disabled) return;
              sendMessage({ text });
              setInput('');
            }}
            className="flex gap-3 items-end"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="说说你想读什么…"
              className="flex-1 min-h-[44px] max-h-40 resize-none rounded-xl border border-brand-parchment bg-white px-4 py-3 text-slate-800 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              disabled={disabled}
              onFocus={() => onExpand?.()}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const text = input.trim();
                  if (!text || disabled) return;
                  sendMessage({ text });
                  setInput('');
                }
              }}
            />
            <button
              type="submit"
              disabled={disabled}
              className="h-11 px-4 rounded-xl bg-brand-blue text-white font-medium disabled:opacity-50"
            >
              发送
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-brand-parchment bg-white">
        <div className="p-4 md:p-6 space-y-4 max-h-[420px] overflow-y-auto">
          <div className="flex justify-start">
            <div className="w-9 flex items-center justify-center mr-2 select-none">📖</div>
            <div className="max-w-[90%] md:max-w-[70%] rounded-[18px] rounded-bl-[4px] bg-[#F5F0E8] text-slate-800 px-4 py-[10px] whitespace-pre-wrap">
              {openingText}
            </div>
          </div>

          {messages.map((message: any) => (
            <div key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              {message.role !== 'user' && (
                <div className="w-9 flex items-center justify-center mr-2 select-none">📖</div>
              )}
              <div
                className={
                  message.role === 'user'
                    ? 'max-w-[90%] md:max-w-[70%] rounded-[18px] rounded-br-[4px] bg-[#1E3A5F] text-white px-4 py-[10px] whitespace-pre-wrap'
                    : 'max-w-[90%] md:max-w-[70%] rounded-[18px] rounded-bl-[4px] bg-[#F5F0E8] text-slate-800 px-4 py-[10px] whitespace-pre-wrap'
                }
              >
                {message.parts.map((part: any, idx: number) => {
                  if (part.type === 'text') {
                    return (
                      <span key={idx}>
                        {cleanText(part.text)}
                      </span>
                    );
                  }

                  if (part.type === 'tool-recommendBooks') {
                    const callId = part.toolCallId;
                    if (part.state === 'input-streaming' || part.state === 'input-available') {
                      return (
                        <div key={callId} className="mt-3 text-sm text-brand-muted flex items-center gap-2">
                          <span className="inline-flex gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-muted/60 animate-bounce [animation-delay:0ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-muted/60 animate-bounce [animation-delay:120ms]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-muted/60 animate-bounce [animation-delay:240ms]" />
                          </span>
                          正在翻书中
                        </div>
                      );
                    }

                    if (part.state === 'output-available') {
                      const output: any = part.output;
                      const books = Array.isArray(output?.books) ? output.books : [];
                      const label = output?.personaName ? `因为你是【${output.personaName}】` : '为你推荐';

                      return (
                        <div key={callId} className="mt-2 space-y-3">
                          {books.map((b: any) => {
                            if (b.missing || !b.book) {
                              return (
                                <div
                                  key={b.douban_id}
                                  className="rounded-lg bg-[#FAEEDA] text-[#854F0B] px-3 py-2 text-sm"
                                >
                                  📚 这本书好像藏得太深了，暂时没找到踪迹。让我换一本？
                                </div>
                              );
                            }

                            return (
                              <BookCard
                                key={b.book.douban_id}
                                book={b.book}
                                variant="compact"
                                reason={b.reason}
                                reasonLabel={label}
                              />
                            );
                          })}
                        </div>
                      );
                    }

                    if (part.state === 'output-error') {
                      return (
                        <div key={callId} className="mt-3 text-sm text-red-600">
                          {part.errorText}
                        </div>
                      );
                    }
                  }

                  return null;
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-brand-parchment p-3 md:p-4">
          <form
            onSubmit={e => {
              e.preventDefault();
              const text = input.trim();
              if (!text || disabled) return;
              sendMessage({ text });
              setInput('');
            }}
            className="flex gap-3 items-end"
          >
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="说说你想读什么…（Enter 发送，Shift+Enter 换行）"
              className="flex-1 min-h-[44px] max-h-40 resize-none rounded-xl border border-brand-parchment bg-white px-4 py-3 text-slate-800 placeholder:text-brand-muted focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              disabled={disabled}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  const text = input.trim();
                  if (!text || disabled) return;
                  sendMessage({ text });
                  setInput('');
                }
              }}
            />

            {status === 'streaming' || status === 'submitted' ? (
              <button
                type="button"
                onClick={() => stop()}
                className="h-11 px-4 rounded-xl bg-brand-navy text-white font-medium"
              >
                停止
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled}
                className="h-11 px-4 rounded-xl bg-brand-blue text-white font-medium disabled:opacity-50"
              >
                发送
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
