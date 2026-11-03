import AsyncStorage from '@react-native-async-storage/async-storage'
import { EMPTY_HISTORY, type CheckInHistory, type CheckInSpot } from './rules'

// Everything here lives on the device: the background task reads it while the app is closed,
// and none of it (in particular, where the user has been) is ever uploaded.

export interface CheckInSettings {
  enabled: boolean
  quietHours: boolean
}

// The prompt scheduled for the spot the user is currently at, if any.
export interface PendingPrompt {
  spotId: string
  notificationId: string
  scheduledAt: number
}

export const DEFAULT_SETTINGS: CheckInSettings = { enabled: false, quietHours: true }

const KEYS = {
  settings: 'spotcheck:check-ins:settings',
  spots: 'spotcheck:check-ins:spots',
  history: 'spotcheck:check-ins:history',
  pending: 'spotcheck:check-ins:pending',
}

async function read<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key).catch(() => null)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const write = (key: string, value: unknown) => AsyncStorage.setItem(key, JSON.stringify(value)).catch(() => {})

export const readSettings = async (): Promise<CheckInSettings> => ({
  ...DEFAULT_SETTINGS,
  ...(await read<Partial<CheckInSettings>>(KEYS.settings, {})),
})
export const writeSettings = (settings: CheckInSettings) => write(KEYS.settings, settings)

export const readSpots = () => read<CheckInSpot[]>(KEYS.spots, [])
export const writeSpots = (spots: CheckInSpot[]) => write(KEYS.spots, spots)

export const readHistory = async (): Promise<CheckInHistory> => ({
  ...EMPTY_HISTORY,
  ...(await read<Partial<CheckInHistory>>(KEYS.history, {})),
})
export const writeHistory = (history: CheckInHistory) => write(KEYS.history, history)

export const readPending = () => read<PendingPrompt | null>(KEYS.pending, null)
export const writePending = (pending: PendingPrompt | null) => write(KEYS.pending, pending)
