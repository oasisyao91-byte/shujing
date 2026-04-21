import { DoubanRankingSection } from '@/components/home/DoubanRankingSection';
import { createClient } from '@/lib/supabase/server';
import { PersonaTestModal } from '@/components/persona/PersonaTestModal';
import { RecommendSection } from '@/components/recommend/RecommendSection';
import { TrendingSection } from '@/components/home/TrendingSection';
import { HeroSection } from '@/components/home/HeroSection';
import { DiscoverSection } from '@/components/home/DiscoverSection';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  let userProfile: any = null;
  let lastBookTitle: string | null = null;
  if (user) {
    const { data } = await (supabase as any)
      .from('user_profiles')
      .select('persona_type, persona_name, persona_desc')
      .eq('id', user.id)
      .maybeSingle();
    userProfile = data;

    const { data: last } = await (supabase as any)
      .from('reading_history')
      .select('updated_at, books(title)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const b = Array.isArray(last?.books) ? last.books[0] : last?.books;
    lastBookTitle = b?.title || null;
  }

  return (
    <div className="space-y-6 pb-16">
      <PersonaTestModal 
        isLoggedIn={!!user}
        initialPersonaType={userProfile?.persona_type} 
      />

      <HeroSection
        isLoggedIn={!!user}
        personaName={userProfile?.persona_name}
        personaDesc={userProfile?.persona_desc}
        personaType={userProfile?.persona_type}
      />

      <div className="container space-y-10 -mt-2 md:-mt-4">
        <RecommendSection
          personaName={userProfile?.persona_name}
          personaType={userProfile?.persona_type}
          lastBookTitle={lastBookTitle}
        />

        <DiscoverSection />

        <div className="grid gap-10 md:grid-cols-2">
          <TrendingSection />
          <DoubanRankingSection />
        </div>
      </div>
    </div>
  );
}
