const GREETINGS: Record<string, string[]> = {
  IFNW: [
    '那些我们没有读过的书，是另一种形式的失散。今天想找哪本失散已久的书？',
    '有些故事只在夜晚才找得到读者。你现在想去哪个世界漫游？',
  ],
  ITRG: [
    '一本真正好的书，读完后你会成为一个不同的人。今天想深潜哪个领域？',
    '你正在找的答案，某个人已经写成了一本书。告诉我问题，我来帮你找那本书。',
  ],
  EFNW: [
    '好书太多，时间太少——但今天，我们只挑一本最对的。你现在的心情适合哪种故事？',
    '你的书架一定已经很满了，但我们来加一本真正值得的。',
  ],
  ETRG: [
    '解决问题最快的方式，是站在已经解决过它的人的肩膀上。最近在攻克什么？',
    '你想要的不只是一本书，是一套新的思维工具。说说你面对的挑战。',
  ],
  IFNG: [
    '一个好故事会在你心里住上很久。今天想猎的是什么类型的故事？',
    '有时候读书，是为了找到一个能替你说出某种感受的人。',
  ],
  IFRW: [
    '不是每本书都需要读完，有些书只需要在你需要的时刻翻开几页。今天心情如何？',
    '好的书，像一个懂你的老朋友。你现在需要什么样的陪伴？',
  ],
  ETRW: [
    '理解这个时代，从读懂它的脉络开始。今天想拆解哪个现象？',
    '新闻告诉你发生了什么，好书告诉你为什么。你最近在关注什么？',
  ],
  EFNG: [
    '你在找的，是那本读完后让你觉得「原来不只我这样」的书。',
    '有些书不是用来学习的，是用来被理解的。你现在想被理解哪种感受？',
  ],
  DEFAULT: ['书的世界里，总有一本在等着你。今天想找什么样的书？'],
};

export function pickPersonaGreeting(input: {
  personaType?: string | null;
  personaName?: string | null;
  lastBookTitle?: string | null;
  seedExtra?: string | null;
}) {
  const list = (input.personaType && GREETINGS[input.personaType]) ? GREETINGS[input.personaType] : GREETINGS.DEFAULT;
  const seed = `${input.personaType || 'DEFAULT'}|${input.personaName || ''}|${input.lastBookTitle || ''}|${input.seedExtra || ''}`;
  const hash = seed.split('').reduce((acc, c) => (acc * 131 + c.charCodeAt(0)) >>> 0, 7);
  const base = list[hash % list.length];
  const tail = input.lastBookTitle ? `上次你在读《${input.lastBookTitle}》，今天还想继续这个方向，还是换换口味？` : '';
  return [base, tail].filter(Boolean).join('\n');
}
