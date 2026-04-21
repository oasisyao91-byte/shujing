'use client';

import { useEffect, useRef, useState } from 'react';
import { saveUserPersona } from '@/app/actions/persona';
import { useRouter, useSearchParams } from 'next/navigation';

type Dimension = 'I' | 'E' | 'F' | 'T' | 'N' | 'R' | 'W' | 'G';

interface Question {
  id: number;
  text: string;
  options: {
    label: string;
    text: string;
    scores: Partial<Record<Dimension, number>>;
  }[];
}

const questions: Question[] = [
  {
    id: 1,
    text: "周末的午后，阳光正好，你更愿意...",
    options: [
      { label: 'A', text: '找一本引人入胜的小说，一口气读完', scores: { I: 1, N: 1 } },
      { label: 'B', text: '翻阅几本不同领域的杂志或散文', scores: { E: 1, R: 1 } },
    ]
  },
  {
    id: 2,
    text: "在阅读时，你通常更看重...",
    options: [
      { label: 'A', text: '书中流露的情感和引发的共鸣', scores: { F: 1 } },
      { label: 'B', text: '严密的逻辑、深刻的哲理或实用的知识', scores: { T: 1 } },
    ]
  },
  {
    id: 3,
    text: "走进一家书店，你选书的方式通常是...",
    options: [
      { label: 'A', text: '随心所欲，看眼缘和当下的心情', scores: { W: 1 } },
      { label: 'B', text: '带着明确的目的，直奔某个分类或书架', scores: { G: 1 } },
    ]
  },
  {
    id: 4,
    text: "你更享受哪种阅读体验？",
    options: [
      { label: 'A', text: '沉浸在作者构建的奇妙世界或故事中', scores: { I: 1, N: 1 } },
      { label: 'B', text: '了解真实世界的运作规律、历史或前沿科技', scores: { E: 1, R: 1 } },
    ]
  },
  {
    id: 5,
    text: "读完一本好书后，你通常会...",
    options: [
      { label: 'A', text: '沉浸在余韵中，或者写下一段感性的文字', scores: { F: 1, W: 1 } },
      { label: 'B', text: '总结书中的核心观点，提炼出对生活有用的方法', scores: { T: 1, G: 1 } },
    ]
  }
];

const personaMap: Record<string, { name: string, emoji: string, desc: string, tags: string[] }> = {
  'IFNW': { name: '月光漫游者', emoji: '🌙', desc: '你拥有丰富的情感和无穷的想象力，喜欢在文字的海洋中漫无目的地漂流。', tags: ['虚构', '文学', '情感', '随性'] },
  'IFNG': { name: '寻梦探险家', emoji: '🧭', desc: '你在幻想的世界里寻找确定的答案，情感细腻但又带着一丝执着。', tags: ['奇幻', '小说', '情感', '治愈'] },
  'IFRW': { name: '人间观察员', emoji: '☕', desc: '你关注真实世界中的人间烟火，用心感受生活中的每一个微小瞬间。', tags: ['散文', '纪实', '生活', '随笔'] },
  'IFRG': { name: '温暖治愈师', emoji: '🌻', desc: '你希望通过真实的文字找到内心的平静，并将其转化为生活的力量。', tags: ['心理学', '生活美学', '真实', '治愈'] },
  'ITNW': { name: '深思幻想家', emoji: '🌌', desc: '你喜欢用理性的逻辑构建宏大的幻想世界，享受思维的极致漫游。', tags: ['科幻', '悬疑', '哲学', '脑洞'] },
  'ITNG': { name: '架构建造师', emoji: '🏗️', desc: '你对未知充满好奇，同时又喜欢抽丝剥茧，寻找事物底层的逻辑支撑。', tags: ['硬科幻', '推理', '逻辑', '探索'] },
  'ITRW': { name: '冷静旁观者', emoji: '🔍', desc: '你用客观的视角打量现实，喜欢在繁杂的信息中闲庭信步，不急于得出结论。', tags: ['历史', '社科', '纪实', '客观'] },
  'ITRG': { name: '知识工程师', emoji: '⚙️', desc: '你把阅读当作获取知识和提升自我的工具，目标明确，逻辑严密。', tags: ['商业', '科技', '方法论', '实用'] },
  'EFNW': { name: '风语吟游诗人', emoji: '🍃', desc: '你思维跳跃，情感丰富，喜欢在各种奇思妙想中自由穿梭。', tags: ['诗歌', '短篇小说', '灵感', '多元'] },
  'EFNG': { name: '热情造梦者', emoji: '✨', desc: '你总是充满热情地在不同的幻想故事中寻找触动人心的力量。', tags: ['小说', '戏剧', '共鸣', '多元'] },
  'EFRW': { name: '城市拾荒者', emoji: '📸', desc: '你热爱生活的每一面，喜欢广泛涉猎不同的真实故事，收集人间的碎片。', tags: ['传记', '随笔', '人文', '广泛'] },
  'EFRG': { name: '生活体验家', emoji: '🎨', desc: '你积极拥抱现实，通过阅读不同领域的书籍来丰富自己的人生体验。', tags: ['生活方式', '传记', '实用', '多元'] },
  'ETNW': { name: '星际漫步者', emoji: '🚀', desc: '你对各种新奇的理论和概念都感兴趣，喜欢在知识的星海中跳跃。', tags: ['前沿科技', '科幻', '未来', '广泛'] },
  'ETNG': { name: '创意炼金术士', emoji: '🔮', desc: '你擅长将不同领域的虚构概念结合起来，提炼出属于自己的独特见解。', tags: ['创新', '悬疑', '逻辑', '跳跃'] },
  'ETRW': { name: '博学杂家', emoji: '📚', desc: '你的涉猎极其广泛，对真实世界的各个领域都保持着旺盛的求知欲。', tags: ['百科', '历史', '科普', '多元'] },
  'ETRG': { name: '全能破局者', emoji: '⚡', desc: '你为了解决问题而广泛阅读，善于跨界整合信息，是现实中的行动派。', tags: ['商业', '自我提升', '跨界', '实用'] },
};

export function PersonaTestModal({ isLoggedIn, initialPersonaType }: { isLoggedIn: boolean, initialPersonaType?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<Record<Dimension, number>>({ I: 0, E: 0, F: 0, T: 0, N: 0, R: 0, W: 0, G: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const timerRef = useRef<number | null>(null);
  const autoScheduledRef = useRef(false);

  useEffect(() => {
    if (dismissed) return;
    if (!isLoggedIn) return;

    const isTestMode = searchParams?.get('test') === '1';
    if (isTestMode) {
      setIsOpen(true);
      return;
    }

    if (initialPersonaType) return;
    if (autoScheduledRef.current) return;

    autoScheduledRef.current = true;
    timerRef.current = window.setTimeout(() => setIsOpen(true), 1500);
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isLoggedIn, initialPersonaType, searchParams, dismissed]);

  const handleSkip = async () => {
    setDismissed(true);
    setIsOpen(false);
    if (searchParams?.has('test')) {
      router.replace('/');
      router.refresh();
    }
    try {
      await saveUserPersona({
        persona_type: 'skipped',
        persona_name: '自由探索者',
        persona_tags: ['随机', '广泛'],
        persona_emoji: '🕊️',
        persona_desc: '跳过了测试，选择自由探索书海。',
      });
    } catch (e) {
      console.error('Skip failed', e);
    }
  };

  const handleSelect = (optionScores: Partial<Record<Dimension, number>>) => {
    const newScores = { ...scores };
    Object.entries(optionScores).forEach(([key, val]) => {
      newScores[key as Dimension] += val as number;
    });
    setScores(newScores);

    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      calculateResult(newScores);
    }
  };

  const calculateResult = (finalScores: Record<Dimension, number>) => {
    const iOrE = finalScores.I >= finalScores.E ? 'I' : 'E';
    const fOrT = finalScores.F >= finalScores.T ? 'F' : 'T';
    const nOrR = finalScores.N >= finalScores.R ? 'N' : 'R';
    const wOrG = finalScores.W >= finalScores.G ? 'W' : 'G';
    
    const typeCode = `${iOrE}${fOrT}${nOrR}${wOrG}`;
    const matchedPersona = personaMap[typeCode] || personaMap['IFNW'];
    setResult({ typeCode, ...matchedPersona });
  };

  const handleSaveAndExplore = async () => {
    if (!result) return;
    setIsSaving(true);
    try {
      await saveUserPersona({
        persona_type: result.typeCode,
        persona_name: result.name,
        persona_tags: result.tags,
        persona_emoji: result.emoji,
        persona_desc: result.desc,
      });
      router.refresh();
      setDismissed(true);
      setIsOpen(false);
      if (searchParams?.has('test')) {
        router.replace('/');
        router.refresh();
      } else {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
      alert('保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col relative animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header / Skip */}
        {!result && (
          <div className="absolute top-4 right-4 z-10">
            <button onClick={handleSkip} className="text-sm text-brand-muted hover:text-brand-navy">
              先逛逛 &gt;
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-8 md:p-10">
          {!result ? (
            <div className="space-y-8">
              <div className="space-y-2">
                <div className="text-sm font-medium text-brand-blue">
                  Question {currentStep + 1} / {questions.length}
                </div>
                <h3 className="text-2xl font-bold text-brand-navy leading-snug">
                  {questions[currentStep].text}
                </h3>
              </div>

              <div className="space-y-4">
                {questions[currentStep].options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelect(opt.scores)}
                    className="w-full text-left p-4 rounded-xl border-2 border-brand-parchment hover:border-brand-blue hover:bg-brand-blue/5 transition-all group"
                  >
                    <div className="flex items-start">
                      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-parchment group-hover:bg-brand-blue group-hover:text-white flex items-center justify-center font-bold text-brand-navy transition-colors">
                        {opt.label}
                      </span>
                      <span className="ml-4 text-brand-navy mt-1">
                        {opt.text}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-6xl mb-4">{result.emoji}</div>
              <div className="space-y-2">
                <div className="text-sm font-medium text-brand-blue tracking-widest uppercase">
                  你的阅读性格是
                </div>
                <h2 className="text-3xl font-bold text-brand-navy">
                  {result.name} <span className="text-lg text-brand-muted font-normal ml-2">({result.typeCode})</span>
                </h2>
              </div>
              <p className="text-brand-muted text-lg leading-relaxed">
                {result.desc}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {result.tags.map((tag: string) => (
                  <span key={tag} className="px-3 py-1 bg-brand-parchment text-brand-navy rounded-full text-sm">
                    #{tag}
                  </span>
                ))}
              </div>
              <div className="pt-6">
                <button
                  onClick={handleSaveAndExplore}
                  disabled={isSaving}
                  className="w-full py-4 bg-brand-blue hover:bg-brand-navy text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
                >
                  {isSaving ? '正在生成专属书单...' : '开始探索专属书单'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {!result && (
          <div className="h-1.5 bg-brand-parchment w-full">
            <div 
              className="h-full bg-brand-blue transition-all duration-300 ease-out"
              style={{ width: `${((currentStep) / questions.length) * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
