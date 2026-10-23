import { useEffect, useState } from 'react'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import type { Session } from '@supabase/supabase-js'
import { getSupabaseClient } from './supabaseClient'

// Closes the auth popup when the app is reopened by the OAuth redirect (no-op on native).
WebBrowser.maybeCompleteAuthSession()

export type OAuthProvider = 'google' | 'apple'

// spotcheck://auth/callback in a build; must be listed under Supabase → Auth → URL Configuration.
export const AUTH_REDIRECT_URL = Linking.createURL('auth/callback')

function readAuthParams(url: string): URLSearchParams {
  // Implicit flow returns tokens in the fragment; PKCE returns ?code= in the query.
  const [beforeHash, hash = ''] = url.split('#')
  const query = beforeHash.split('?')[1] ?? ''
  return new URLSearchParams([query, hash].filter(Boolean).join('&'))
}

async function createSessionFromUrl(url: string): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) return
  const params = readAuthParams(url)

  const errorDescription = params.get('error_description')
  if (errorDescription) throw new Error(errorDescription)

  const code = params.get('code')
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) throw error
    return
  }

  const accessToken = params.get('access_token')
  const refreshToken = params.get('refresh_token')
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    })
    if (error) throw error
  }
}

// Opens the provider's sign-in page in an in-app browser tab and stores the resulting session.
// Resolves without a session if the user cancels.
export async function signInWithProvider(provider: OAuthProvider): Promise<void> {
  const supabase = getSupabaseClient()
  if (!supabase) throw new Error("Sign-in isn't available: Supabase isn't configured.")

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: AUTH_REDIRECT_URL, skipBrowserRedirect: true },
  })
  if (error) throw error

  const result = await WebBrowser.openAuthSessionAsync(data.url, AUTH_REDIRECT_URL)
  if (result.type === 'success') await createSessionFromUrl(result.url)
}

export async function signOut(): Promise<void> {
  await getSupabaseClient()?.auth.signOut()
}

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null)
  // Nothing to load when Supabase isn't configured.
  const [loading, setLoading] = useState(() => getSupabaseClient() !== null)

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, loading }
}
