import { parse as parseYaml } from 'yaml'
import type {
  ContentMeta,
  QuizQuestion,
  SearchEntry,
  StudyContent,
  StudyDay,
  StudyOverview,
  StudyPage,
} from './types'

const FRONTMATTER_PATTERN = /^---\s*\n([\s\S]*?)\n---\s*\n?/
const QUIZ_HEADING_PATTERN = /^##\s+今日真题练习(?:（\d+道）|\(\d+道\))?\s*$/m
const QUESTION_HEADING_PATTERN = /^###\s+第\s*(\d+)\s*题\s*$/gm

export class ContentValidationError extends Error {
  readonly issues: string[]

  constructor(issues: string[]) {
    super(issues.join('\n'))
    this.name = 'ContentValidationError'
    this.issues = issues
  }
}

function normalizeSource(source: string) {
  return source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
}

function readFrontmatter(source: string, filePath: string) {
  const match = source.match(FRONTMATTER_PATTERN)
  if (!match) {
    throw new ContentValidationError([
      `${filePath}：缺少 YAML 元数据。文件必须以 --- 包围的 kind、title 等字段开头。`,
    ])
  }

  let rawMeta: unknown
  try {
    rawMeta = parseYaml(match[1])
  } catch (error) {
    throw new ContentValidationError([
      `${filePath}：YAML 元数据无法解析（${error instanceof Error ? error.message : '未知错误'}）。`,
    ])
  }

  if (!rawMeta || typeof rawMeta !== 'object') {
    throw new ContentValidationError([`${filePath}：YAML 元数据必须是一个对象。`])
  }

  const meta = rawMeta as Partial<ContentMeta>
  const issues: string[] = []
  if (meta.kind !== 'overview' && meta.kind !== 'day') {
    issues.push(`${filePath}：kind 必须为 overview 或 day。`)
  }
  if (typeof meta.title !== 'string' || !meta.title.trim()) {
    issues.push(`${filePath}：title 不能为空。`)
  }
  if (meta.kind === 'day' && (!Number.isInteger(meta.day) || Number(meta.day) < 1)) {
    issues.push(`${filePath}：day 必须是大于 0 的整数。`)
  }
  if (issues.length) throw new ContentValidationError(issues)

  return {
    meta: meta as ContentMeta,
    body: source.slice(match[0].length).trim(),
  }
}

function trimQuestionBlock(block: string) {
  return block.replace(/^\s+/, '').replace(/\n---\s*$/, '').trim()
}

function parseQuestion(block: string, number: number, filePath: string): QuizQuestion {
  const issues: string[] = []
  const promptMatch = block.match(/^\*\*(.+?)\*\*\s*$/m)
  const prompt = promptMatch?.[1]?.trim() ?? ''
  if (!prompt) issues.push(`${filePath}：第${number}题缺少加粗题干。`)

  const options = Array.from(block.matchAll(/^([A-D])\.\s+(.+?)\s*$/gm)).map(
    ([, key, text]) => ({ key, text: text.trim() }),
  )
  const optionKeys = options.map((option) => option.key)
  if (options.length !== 4 || optionKeys.join('') !== 'ABCD') {
    issues.push(`${filePath}：第${number}题必须按 A、B、C、D 顺序提供四个选项。`)
  }

  const answer = block.match(/\*\*【答案】\s*([A-D])\s*\*\*/)?.[1] ?? ''
  if (!answer) {
    issues.push(`${filePath}：第${number}题缺少 **【答案】B** 格式的答案。`)
  } else if (!optionKeys.includes(answer)) {
    issues.push(`${filePath}：第${number}题答案 ${answer} 不在已有选项中。`)
  }

  const explanationMatch = block.match(/\*\*解析[：:]\*\*\s*([\s\S]*?)\s*$/)
  const explanationMarkdown = explanationMatch?.[1]?.trim() ?? ''
  if (!explanationMarkdown) issues.push(`${filePath}：第${number}题缺少解析内容。`)

  if (issues.length) throw new ContentValidationError(issues)

  return {
    id: `question-${number}`,
    number,
    prompt,
    options,
    answer,
    explanationMarkdown,
  }
}

function parseDay(meta: ContentMeta, body: string, filePath: string): StudyDay {
  const quizHeading = QUIZ_HEADING_PATTERN.exec(body)
  if (!quizHeading?.index && quizHeading?.index !== 0) {
    throw new ContentValidationError([
      `${filePath}：每日资料必须包含二级标题“## 今日真题练习（N道）”。`,
    ])
  }

  const quizStart = quizHeading.index
  const quizContentStart = quizStart + quizHeading[0].length
  const remainder = body.slice(quizContentStart)
  const nextH2Match = remainder.match(/^##\s+/m)
  const quizEnd = nextH2Match?.index === undefined ? body.length : quizContentStart + nextH2Match.index

  const knowledgeMarkdown = body.slice(0, quizStart).trim()
  const quizMarkdown = body.slice(quizContentStart, quizEnd).trim()
  const afterQuizMarkdown = body.slice(quizEnd).trim()
  const matches = Array.from(quizMarkdown.matchAll(QUESTION_HEADING_PATTERN))

  if (!matches.length) {
    throw new ContentValidationError([`${filePath}：“今日真题练习”下未找到“### 第N题”。`])
  }

  const questions: QuizQuestion[] = []
  const issues: string[] = []
  matches.forEach((match, index) => {
    const number = Number(match[1])
    const blockStart = (match.index ?? 0) + match[0].length
    const blockEnd = matches[index + 1]?.index ?? quizMarkdown.length
    const block = trimQuestionBlock(quizMarkdown.slice(blockStart, blockEnd))
    try {
      questions.push(parseQuestion(block, number, filePath))
    } catch (error) {
      if (error instanceof ContentValidationError) issues.push(...error.issues)
      else throw error
    }
  })

  const expectedNumbers = questions.map((question) => question.number)
  const uniqueNumbers = new Set(expectedNumbers)
  if (uniqueNumbers.size !== expectedNumbers.length) {
    issues.push(`${filePath}：题号不能重复。`)
  }
  if (issues.length) throw new ContentValidationError(issues)

  return {
    kind: 'day',
    filePath,
    day: meta.day as number,
    title: meta.title,
    knowledgeMarkdown,
    afterQuizMarkdown,
    questions,
  }
}

export function parseStudyFile(rawSource: string, filePath: string): StudyPage {
  const source = normalizeSource(rawSource)
  const { meta, body } = readFrontmatter(source, filePath)
  if (meta.kind === 'overview') {
    return {
      kind: 'overview',
      filePath,
      title: meta.title,
      markdown: body,
    }
  }
  return parseDay(meta, body, filePath)
}

export function loadStudyContent(files: Record<string, string>): StudyContent {
  const pages: StudyPage[] = []
  const issues: string[] = []

  Object.entries(files).forEach(([filePath, source]) => {
    try {
      pages.push(parseStudyFile(source, filePath))
    } catch (error) {
      if (error instanceof ContentValidationError) issues.push(...error.issues)
      else throw error
    }
  })

  const overviews = pages.filter((page): page is StudyOverview => page.kind === 'overview')
  const days = pages.filter((page): page is StudyDay => page.kind === 'day')
  if (overviews.length !== 1) {
    issues.push(`资料目录必须且只能包含 1 个 kind: overview 文件，当前为 ${overviews.length} 个。`)
  }

  const seenDays = new Set<number>()
  days.forEach((day) => {
    if (seenDays.has(day.day)) issues.push(`Day ${day.day} 重复，请检查 ${day.filePath}。`)
    seenDays.add(day.day)
  })

  if (issues.length) throw new ContentValidationError(issues)
  days.sort((a, b) => a.day - b.day)
  return { overview: overviews[0], days }
}

export function slugifyHeading(value: string) {
  return (
    value
      .toLocaleLowerCase('zh-CN')
      .replace(/<[^>]+>/g, '')
      .replace(/[`*_~\[\]（）()【】·，。！？：；、“”'"\/\\]/g, ' ')
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '') || 'section'
  )
}

export function stripMarkdown(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[|>*_~`-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function markdownSections(
  markdown: string,
  route: string,
  pageLabel: string,
  idPrefix: string,
): SearchEntry[] {
  const matches = Array.from(markdown.matchAll(/^(#{1,6})\s+(.+?)\s*$/gm))
  if (!matches.length) {
    const text = stripMarkdown(markdown)
    return text
      ? [
          {
            id: `${idPrefix}-content`,
            route,
            pageLabel,
            sectionTitle: pageLabel,
            anchor: 'content-start',
            text,
          },
        ]
      : []
  }

  return matches.map((match, index) => {
    const title = stripMarkdown(match[2])
    const blockEnd = matches[index + 1]?.index ?? markdown.length
    const block = markdown.slice(match.index ?? 0, blockEnd)
    return {
      id: `${idPrefix}-${index}-${slugifyHeading(title)}`,
      route,
      pageLabel,
      sectionTitle: title,
      anchor: slugifyHeading(title),
      text: stripMarkdown(block),
    }
  })
}

export function buildSearchEntries(content: StudyContent): SearchEntry[] {
  const overviewEntries = markdownSections(
    content.overview.markdown,
    '/',
    '复习大纲',
    'overview',
  )

  const dayEntries = content.days.flatMap((day) => {
    const route = `/day/${day.day}`
    const label = `Day ${day.day}`
    const markdownEntries = markdownSections(
      [day.knowledgeMarkdown, day.afterQuizMarkdown].filter(Boolean).join('\n\n'),
      route,
      label,
      `day-${day.day}`,
    )
    const questionEntries: SearchEntry[] = day.questions.map((question) => ({
      id: `day-${day.day}-${question.id}`,
      route,
      pageLabel: label,
      sectionTitle: `第${question.number}题`,
      anchor: question.id,
      text: stripMarkdown(
        [
          question.prompt,
          ...question.options.map((option) => `${option.key}. ${option.text}`),
          `正确答案 ${question.answer}`,
          question.explanationMarkdown,
        ].join(' '),
      ),
      revealQuestionId: question.id,
    }))
    return [...markdownEntries, ...questionEntries]
  })

  return [...overviewEntries, ...dayEntries]
}
