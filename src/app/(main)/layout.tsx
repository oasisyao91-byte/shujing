import { createClient } from "@/lib/supabase/server";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let personaType: string | null = null;
  if (user) {
    const { data } = await (supabase as any)
      .from('user_profiles')
      .select('persona_type')
      .eq('id', user.id)
      .maybeSingle();
    personaType = data?.persona_type ?? null;
  }

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23F5F0E8'/%3E%3Crect x='0' y='0' width='1' height='1' fill='%23EDE8DE' opacity='0.5'/%3E%3C/svg%3E\")",
        backgroundSize: '4px 4px',
      }}
    >
      <Navbar user={user} personaType={personaType} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
