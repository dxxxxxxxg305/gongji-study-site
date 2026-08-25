export interface ContentMeta {
  kind: 'overview' | 'day'
  title: string
  day?: number
}

export interface QuizOption {
  key: string
  text: string
}

export interface QuizQuestion {
  id: string
  number: number
  prompt: string
  options: QuizOption[]
  answer: string
  explanationMarkdown: string
}

export interface StudyOverview {
  kind: 'overview'
  filePath: string
  title: string
  markdown: string
}

export interface StudyDay {
  kind: 'day'
  filePath: string
  day: number
  title: string
  knowledgeMarkdown: string
  afterQuizMarkdown: string
  questions: QuizQuestion[]
}

export type StudyPage = StudyOverview | StudyDay

export interface StudyContent {
  overview: StudyOverview
  days: StudyDay[]
}

export interface SearchEntry {
  id: string
  route: string
  pageLabel: string
  sectionTitle: string
  anchor: string
  text: string
  revealQuestionId?: string
}

export interface SearchTarget {
  route: string
  anchor: string
  query: string
  revealQuestionId?: string
  nonce: number
}

export interface FavoriteItem {
  id: string
  route: string
  anchor: string
  title: string
  day?: number
}

export interface FavoriteScope {
  route: string
  day?: number
  favorites: FavoriteItem[]
  onToggleFavorite: (item: FavoriteItem) => void
}

export interface QuizSession {
  answers: Record<string, string>
  revealed: string[]
  submitted: boolean
}
