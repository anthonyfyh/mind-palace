import type { SupabaseClient } from '@supabase/supabase-js'

const DAILY_LIMIT = 20

export async function checkAiQuota(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('check_and_increment_ai_usage', {
    p_user_id: userId,
    p_limit: DAILY_LIMIT,
  })
  if (error) return false
  return data === true
}
