import { buildSearchEntries, loadStudyContent } from './parser'

const markdownFiles = import.meta.glob('../../公共基础知识复习资料/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>

export const studyContent = loadStudyContent(markdownFiles)
export const searchEntries = buildSearchEntries(studyContent)
