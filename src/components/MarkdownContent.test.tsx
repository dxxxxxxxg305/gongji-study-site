import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MarkdownContent } from './MarkdownContent'
import type { FavoriteItem } from '../content/types'

describe('MarkdownContent favorites', () => {
  it('adds a favorite control to knowledge headings and supports toggling', () => {
    const onToggleFavorite = vi.fn<(item: FavoriteItem) => void>()
    render(
      <MarkdownContent
        markdown={'### 1. 重要知识点\n\n正文内容。'}
        favoriteScope={{ route: '/day/1', day: 1, favorites: [], onToggleFavorite }}
      />,
    )

    const button = screen.getByRole('button', { name: '收藏 1. 重要知识点' })
    fireEvent.click(button)
    expect(onToggleFavorite).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/day/1', day: 1, title: '1. 重要知识点' }),
    )
  })

  it('renders an active control for a persisted favorite', () => {
    const onToggleFavorite = vi.fn<(item: FavoriteItem) => void>()
    render(
      <MarkdownContent
        markdown={'### 1. 重要知识点\n\n正文内容。'}
        favoriteScope={{
          route: '/day/1',
          day: 1,
          favorites: [
            { id: '/day/1::1-重要知识点', route: '/day/1', anchor: '1-重要知识点', title: '1. 重要知识点', day: 1 },
          ],
          onToggleFavorite,
        }}
      />,
    )
    expect(screen.getByRole('button', { name: '取消收藏 1. 重要知识点' })).toHaveAttribute('aria-pressed', 'true')
  })
})
