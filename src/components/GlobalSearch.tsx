import { Check, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchEntry } from '../content/types'

interface GlobalSearchProps {
  entries: SearchEntry[]
  onSelect: (entry: SearchEntry, query: string) => void
}

function resultSnippet(text: string, query: string) {
  const index = text.toLocaleLowerCase('zh-CN').indexOf(query.toLocaleLowerCase('zh-CN'))
  if (index < 0) return text.slice(0, 88)
  const start = Math.max(0, index - 32)
  const end = Math.min(text.length, index + query.length + 52)
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`
}

function HighlightedText({ text, query }: { text: string; query: string }) {
  const lowerText = text.toLocaleLowerCase('zh-CN')
  const lowerQuery = query.toLocaleLowerCase('zh-CN')
  const parts: React.ReactNode[] = []
  let cursor = 0
  let index = lowerText.indexOf(lowerQuery)

  while (index >= 0 && query) {
    parts.push(text.slice(cursor, index))
    parts.push(<mark key={`${index}-${cursor}`}>{text.slice(index, index + query.length)}</mark>)
    cursor = index + query.length
    index = lowerText.indexOf(lowerQuery, cursor)
  }
  parts.push(text.slice(cursor))
  return parts
}

export function GlobalSearch({ entries, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const normalizedQuery = query.trim()
  const results = useMemo(() => {
    if (!normalizedQuery) return []
    const needle = normalizedQuery.toLocaleLowerCase('zh-CN')
    return entries
      .filter((entry) => entry.text.toLocaleLowerCase('zh-CN').includes(needle))
      .slice(0, 16)
  }, [entries, normalizedQuery])

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  function choose(entry: SearchEntry) {
    onSelect(entry, normalizedQuery)
    setOpen(false)
  }

  return (
    <div className="global-search" ref={rootRef}>
      <Search aria-hidden="true" size={18} className="global-search__icon" />
      <input
        type="search"
        value={query}
        aria-label="全局搜索"
        aria-expanded={open && Boolean(normalizedQuery)}
        aria-controls="global-search-results"
        placeholder="搜索知识点、题目或解析…"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          if (event.key === 'Enter' && results[0]) choose(results[0])
        }}
      />
      {query && (
        <button className="global-search__clear" onClick={() => setQuery('')} aria-label="清空搜索">
          <X size={16} />
        </button>
      )}

      {open && normalizedQuery && (
        <div className="search-results" id="global-search-results" role="listbox">
          <div className="search-results__meta">
            {results.length ? `找到 ${results.length} 个相关位置` : '未找到相关内容'}
          </div>
          {results.map((entry) => {
            const snippet = resultSnippet(entry.text, normalizedQuery)
            return (
              <button
                type="button"
                role="option"
                aria-selected="false"
                className="search-result"
                key={entry.id}
                onClick={() => choose(entry)}
              >
                <span className="search-result__where">
                  <span>{entry.pageLabel}</span>
                  <Check size={12} aria-hidden="true" />
                  <strong>{entry.sectionTitle}</strong>
                </span>
                <span className="search-result__snippet">
                  <HighlightedText text={snippet} query={normalizedQuery} />
                </span>
              </button>
            )
          })}
          {results.length === 16 && <div className="search-results__more">请补充关键词以缩小范围</div>}
        </div>
      )}
    </div>
  )
}
