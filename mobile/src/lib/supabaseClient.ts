import 'react-native-url-polyfill/auto'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
// Set by start-native-mock.cmd so data.ts serves mockData even when .env points at a live project.
const USE_MOCK_DATA = process.env.EXPO_PUBLIC_USE_MOCK_DATA === '1'

let client: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient | null {
  if (USE_MOCK_DATA || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
