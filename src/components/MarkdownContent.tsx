import { isValidElement, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { slugifyHeading } from '../content/parser'
import type { FavoriteScope } from '../content/types'

function reactNodeText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(reactNodeText).join('')
  if (isValidElement<{ children?: ReactNode }>(node)) return reactNodeText(node.props.children)
  return ''
}

function heading(level: 1 | 2 | 3 | 4, favoriteScope?: FavoriteScope) {
  const Tag = `h${level}` as const
  return function Heading({ children }: { children?: ReactNode }) {
    const id = slugifyHeading(reactNodeText(children))
    const title = reactNodeText(children)
    if (level === 3 && favoriteScope) {
      const favoriteId = `${favoriteScope.route}::${id}`
      const favorite = favoriteScope.favorites.some((item) => item.id === favoriteId)
      return (
        <div className="knowledge-heading">
          <Tag id={id}>{children}</Tag>
          <button
            type="button"
            className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
            aria-label={favorite ? `取消收藏 ${title}` : `收藏 ${title}`}
            aria-pressed={favorite}
            title={favorite ? '取消收藏' : '收藏知识点'}
            onClick={() =>
              favoriteScope.onToggleFavorite({
                id: favoriteId,
                route: favoriteScope.route,
                anchor: id,
                title,
                day: favoriteScope.day,
              })
            }
          >
            <span aria-hidden="true">★</span>
          </button>
        </div>
      )
    }
    return <Tag id={id}>{children}</Tag>
  }
}

interface MarkdownContentProps {
  markdown: string
  className?: string
  favoriteScope?: FavoriteScope
}

function makeComponents(favoriteScope?: FavoriteScope): Components {
  return {
    h1: heading(1, favoriteScope),
    h2: heading(2, favoriteScope),
    h3: heading(3, favoriteScope),
    h4: heading(4, favoriteScope),
  table: ({ children }) => (
    <div className="table-scroll" role="region" aria-label="可横向滚动的表格" tabIndex={0}>
      <table>{children}</table>
    </div>
  ),
  a: ({ href, children }) => {
    const external = href?.startsWith('http')
    return (
      <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
        {children}
      </a>
    )
  },
  }
}

export function MarkdownContent({ markdown, className = '', favoriteScope }: MarkdownContentProps) {
  if (!markdown) return null
  return (
    <div className={`markdown-body ${className}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={makeComponents(favoriteScope)}>
        {markdown}
      </ReactMarkdown>
    </div>
  )
}
