import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // Sync Google avatar if profile doesn't have one yet
    const { data: { user } } = await supabase.auth.getUser()
    const googleAvatar = user?.user_metadata?.avatar_url
    if (user && googleAvatar) {
      await supabase
        .from('profiles')
        .update({ avatar_url: googleAvatar })
        .eq('id', user.id)
        .is('avatar_url', null)
    }
  }

  return NextResponse.redirect(`${origin}${next}`)
}
