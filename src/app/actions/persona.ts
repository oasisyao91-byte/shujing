'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function saveUserPersona(personaData: {
  persona_type: string
  persona_name: string
  persona_tags: string[]
  persona_emoji: string
  persona_desc: string
}) {
  const supabase = createClient() as any
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('未登录')
  }

  const { error } = await supabase
    .from('user_profiles')
    .upsert(
      {
        id: user.id,
        persona_type: personaData.persona_type,
        persona_name: personaData.persona_name,
        persona_tags: personaData.persona_tags,
        persona_emoji: personaData.persona_emoji,
        persona_desc: personaData.persona_desc,
      },
      { onConflict: 'id' }
    )

  if (error) {
    console.error('Failed to save persona:', error)
    throw new Error('保存性格测试结果失败')
  }

  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('recommendation_cache')
    .delete()
    .eq('user_id', user.id)
    .eq('cache_date', today)

  revalidatePath('/')
  return { success: true }
}
