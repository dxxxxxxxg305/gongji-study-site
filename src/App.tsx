import { BookOpenText, CalendarDays, Home, Menu, Star, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import { GlobalSearch } from './components/GlobalSearch'
import { MarkdownContent } from './components/MarkdownContent'
import { QuizSection } from './components/QuizSection'
import { searchEntries, studyContent } from './content/content'
import type { FavoriteItem, FavoriteScope, QuizSession, SearchEntry, SearchTarget, StudyDay } from './content/types'
import { loadFavorites, saveFavorites } from './favorites'
import { clearSearchHighlights, highlightSearchTerm } from './utils/highlight'

const EMPTY_SESSION: QuizSession = { answers: {}, revealed: [], submitted: false }

function Navigation({
  favorites,
  onNavigate,
  onFavoriteNavigate,
}: {
  favorites: FavoriteItem[]
  onNavigate: () => void
  onFavoriteNavigate: (favorite: FavoriteItem) => void
}) {
  return (
    <nav className="study-nav" aria-label="复习资料导航">
      <div className="study-nav__section-label">复习导航</div>
      <NavLink to="/" end className={({ isActive }) => `nav-home ${isActive ? 'is-active' : ''}`} onClick={onNavigate}>
        <Home size={17} aria-hidden="true" />
        <span>复习计划大纲</span>
      </NavLink>

      <div className="study-nav__section-label study-nav__section-label--days">
        <span>每日资料</span>
        <span>{studyContent.days.length} 天</span>
      </div>
      <div className="day-links">
        {studyContent.days.map((day) => (
          <NavLink
            to={`/day/${day.day}`}
            key={day.day}
            className={({ isActive }) => `day-link ${isActive ? 'is-active' : ''}`}
            onClick={onNavigate}
          >
            <span className="day-link__index">{String(day.day).padStart(2, '0')}</span>
            <span>
              <strong>Day {day.day}</strong>
              <small>{day.questions.length} 道练习</small>
            </span>
          </NavLink>
        ))}
      </div>

      <div className="study-nav__section-label study-nav__section-label--favorites">
        <span>
          <Star size={13} aria-hidden="true" />
          我的收藏
        </span>
        <span>{favorites.length}</span>
      </div>
      {favorites.length ? (
        <div className="favorite-links">
          {favorites.map((favorite) => (
            <NavLink
              to={favorite.route}
              key={favorite.id}
              className="favorite-link"
              onClick={() => {
                onFavoriteNavigate(favorite)
                onNavigate()
              }}
              title={favorite.title}
            >
              <Star size={14} aria-hidden="true" />
              <span>
                <strong>{favorite.title}</strong>
                <small>{favorite.day ? `Day ${favorite.day}` : '复习大纲'}</small>
              </span>
            </NavLink>
          ))}
        </div>
      ) : (
        <p className="favorite-empty">点击知识点旁的星标，建立自己的重点清单。</p>
      )}
    </nav>
  )
}

function usePageSearch(
  rootRef: React.RefObject<HTMLElement | null>,
  target: SearchTarget | null,
  route: string,
  delay = 80,
) {
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (!target || target.route !== route) {
      clearSearchHighlights(root)
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const timer = window.setTimeout(() => {
      if (target.query) {
        highlightSearchTerm(root, target.query, target.anchor)
        return
      }
      clearSearchHighlights(root)
      const anchor = document.getElementById(target.anchor)
      anchor?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      anchor?.classList.add('search-target-pulse')
      if (anchor) window.setTimeout(() => anchor.classList.remove('search-target-pulse'), 1600)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [delay, rootRef, route, target])
}

function OverviewPage({ target }: { target: SearchTarget | null }) {
  const rootRef = useRef<HTMLElement>(null)
  usePageSearch(rootRef, target, '/')

  useEffect(() => {
    document.title = '复习计划大纲｜公基研习册'
  }, [])

  return (
    <article className="paper-page overview-page content-root" ref={rootRef}>
      <div className="page-ornament" aria-hidden="true">
        <span />
        <CalendarDays size={18} />
        <span />
      </div>
      <div className="page-kicker">30 DAYS · STUDY PLAN</div>
      <div id="content-start">
        <MarkdownContent markdown={studyContent.overview.markdown} />
      </div>
    </article>
  )
}

interface DayPageProps {
  day: StudyDay
  session: QuizSession
  favorites: FavoriteItem[]
  target: SearchTarget | null
  onSessionChange: (session: QuizSession) => void
  onToggleFavorite: (item: FavoriteItem) => void
}

function DayPage({ day, session, favorites, target, onSessionChange, onToggleFavorite }: DayPageProps) {
  const rootRef = useRef<HTMLElement>(null)
  const activeTarget = target?.route === `/day/${day.day}` ? target : null
  usePageSearch(rootRef, activeTarget, `/day/${day.day}`, activeTarget?.revealQuestionId ? 180 : 80)

  useEffect(() => {
    document.title = `Day ${day.day}｜公基研习册`
  }, [day.day])

  return (
    <article className="paper-page day-page content-root" ref={rootRef}>
      <div id="content-start">
        <MarkdownContent
          markdown={day.knowledgeMarkdown}
          favoriteScope={{
            route: `/day/${day.day}`,
            day: day.day,
            favorites,
            onToggleFavorite,
          } satisfies FavoriteScope}
        />
      </div>
      <QuizSection
        day={day}
        session={session}
        onChange={onSessionChange}
        revealQuestionId={activeTarget?.revealQuestionId}
      />
      {day.afterQuizMarkdown && (
        <div className="after-quiz">
          <MarkdownContent markdown={day.afterQuizMarkdown} />
        </div>
      )}
    </article>
  )
}

function DayRoute({
  sessions,
  favorites,
  target,
  onSessionChange,
  onToggleFavorite,
}: {
  sessions: Record<number, QuizSession>
  favorites: FavoriteItem[]
  target: SearchTarget | null
  onSessionChange: (day: number, session: QuizSession) => void
  onToggleFavorite: (item: FavoriteItem) => void
}) {
  const params = useParams()
  const dayNumber = Number(params.day)
  const day = studyContent.days.find((item) => item.day === dayNumber)
  if (!day) return <Navigate to="/" replace />
  return (
    <DayPage
      day={day}
      session={sessions[day.day] ?? EMPTY_SESSION}
      favorites={favorites}
      target={target}
      onSessionChange={(session) => onSessionChange(day.day, session)}
      onToggleFavorite={onToggleFavorite}
    />
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [sessions, setSessions] = useState<Record<number, QuizSession>>({})
  const [favorites, setFavorites] = useState<FavoriteItem[]>(loadFavorites)
  const [searchTarget, setSearchTarget] = useState<SearchTarget | null>(null)

  useEffect(() => setMenuOpen(false), [location.pathname])
  useEffect(() => saveFavorites(favorites), [favorites])

  const currentDay = useMemo(() => {
    const match = location.pathname.match(/^\/day\/(\d+)$/)
    return match ? Number(match[1]) : null
  }, [location.pathname])

  function selectSearchResult(entry: SearchEntry, query: string) {
    const target: SearchTarget = {
      route: entry.route,
      anchor: entry.anchor,
      query,
      revealQuestionId: entry.revealQuestionId,
      nonce: Date.now(),
    }
    setSearchTarget(target)
    navigate(entry.route)
  }

  function toggleFavorite(item: FavoriteItem) {
    setFavorites((current) =>
      current.some((favorite) => favorite.id === item.id)
        ? current.filter((favorite) => favorite.id !== item.id)
        : [item, ...current],
    )
  }

  function selectFavorite(favorite: FavoriteItem) {
    setSearchTarget({
      route: favorite.route,
      anchor: favorite.anchor,
      query: '',
      nonce: Date.now(),
    })
    navigate(favorite.route)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu-button" onClick={() => setMenuOpen(true)} aria-label="打开导航菜单">
          <Menu size={22} />
        </button>
        <NavLink to="/" className="brand" aria-label="公基研习册首页">
          <span className="brand__seal">基</span>
          <span className="brand__text">
            <strong>公基研习册</strong>
            <small>每日积累 · 温故知新</small>
          </span>
        </NavLink>
        <GlobalSearch entries={searchEntries} onSelect={selectSearchResult} />
        <div className="topbar__day" aria-label={currentDay ? `当前 Day ${currentDay}` : '当前为复习大纲'}>
          <BookOpenText size={17} aria-hidden="true" />
          <span>{currentDay ? `Day ${currentDay}` : '总览'}</span>
        </div>
      </header>

      <div className="shell-body">
        <aside className={`sidebar ${menuOpen ? 'is-open' : ''}`}>
          <div className="sidebar__mobile-head">
            <strong>复习目录</strong>
            <button onClick={() => setMenuOpen(false)} aria-label="关闭导航菜单">
              <X size={21} />
            </button>
          </div>
          <Navigation
            favorites={favorites}
            onNavigate={() => setMenuOpen(false)}
            onFavoriteNavigate={selectFavorite}
          />
          <div className="sidebar__note">
            <BookOpenText size={16} aria-hidden="true" />
            <p>不积跬步，无以至千里。每日完成一份资料，稳步构建知识体系。</p>
          </div>
        </aside>
        {menuOpen && <button className="sidebar-overlay" aria-label="关闭导航菜单" onClick={() => setMenuOpen(false)} />}

        <main className="main-content">
          <Routes>
            <Route path="/" element={<OverviewPage target={searchTarget} />} />
            <Route
              path="/day/:day"
              element={
                <DayRoute
                  sessions={sessions}
                  favorites={favorites}
                  target={searchTarget}
                  onSessionChange={(day, session) =>
                    setSessions((current) => ({ ...current, [day]: session }))
                  }
                  onToggleFavorite={toggleFavorite}
                />
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <footer className="site-footer">公共基础知识复习资料 · 静心研习，日日精进</footer>
        </main>
      </div>
    </div>
  )
}
