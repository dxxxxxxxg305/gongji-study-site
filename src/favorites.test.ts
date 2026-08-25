import { beforeEach, describe, expect, it } from 'vitest'
import { FAVORITES_STORAGE_KEY, loadFavorites, saveFavorites } from './favorites'

describe('favorite persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('stores and restores favorite knowledge points from localStorage', () => {
    const favorites = [
      { id: '/day/1::1-二十大的主题', route: '/day/1', anchor: '1-二十大的主题', title: '1. 二十大的主题', day: 1 },
    ]
    saveFavorites(favorites)
    expect(window.localStorage.getItem(FAVORITES_STORAGE_KEY)).toContain('二十大的主题')
    expect(loadFavorites()).toEqual(favorites)
  })

  it('ignores malformed persisted values', () => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([{ id: 'bad' }, 'wrong']))
    expect(loadFavorites()).toEqual([])
  })
})
