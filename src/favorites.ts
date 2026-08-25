import type { FavoriteItem } from './content/types'

export const FAVORITES_STORAGE_KEY = 'gongji-study-favorites-v1'

function isFavoriteItem(value: unknown): value is FavoriteItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<FavoriteItem>
  return (
    typeof item.id === 'string' &&
    typeof item.route === 'string' &&
    typeof item.anchor === 'string' &&
    typeof item.title === 'string' &&
    (item.day === undefined || typeof item.day === 'number')
  )
}

export function loadFavorites(): FavoriteItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(FAVORITES_STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isFavoriteItem) : []
  } catch {
    return []
  }
}

export function saveFavorites(favorites: FavoriteItem[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites))
  } catch {
    // Private browsing or a blocked storage area should not break reading.
  }
}
