export function clearSearchHighlights(root: HTMLElement) {
  root.querySelectorAll('mark[data-search-highlight]').forEach((mark) => {
    const parent = mark.parentNode
    if (!parent) return
    parent.replaceChild(document.createTextNode(mark.textContent ?? ''), mark)
    parent.normalize()
  })
}

export function highlightSearchTerm(root: HTMLElement, query: string, anchor: string) {
  clearSearchHighlights(root)
  const needle = query.trim()
  if (!needle) return

  const lowerNeedle = needle.toLocaleLowerCase('zh-CN')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement
      if (
        !parent ||
        parent.closest('mark, script, style, button, input, textarea, .search-exempt') ||
        !node.textContent?.toLocaleLowerCase('zh-CN').includes(lowerNeedle)
      ) {
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  const nodes: Text[] = []
  while (walker.nextNode()) nodes.push(walker.currentNode as Text)

  nodes.forEach((node) => {
    const text = node.textContent ?? ''
    const lowerText = text.toLocaleLowerCase('zh-CN')
    let cursor = 0
    let index = lowerText.indexOf(lowerNeedle)
    const fragment = document.createDocumentFragment()

    while (index >= 0) {
      fragment.append(text.slice(cursor, index))
      const mark = document.createElement('mark')
      mark.dataset.searchHighlight = 'true'
      mark.textContent = text.slice(index, index + needle.length)
      fragment.append(mark)
      cursor = index + needle.length
      index = lowerText.indexOf(lowerNeedle, cursor)
    }
    fragment.append(text.slice(cursor))
    node.replaceWith(fragment)
  })

  const target = document.getElementById(anchor) ?? root.querySelector('mark[data-search-highlight]')
  target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (target instanceof HTMLElement) {
    target.classList.add('search-target-pulse')
    window.setTimeout(() => target.classList.remove('search-target-pulse'), 1600)
  }
}
