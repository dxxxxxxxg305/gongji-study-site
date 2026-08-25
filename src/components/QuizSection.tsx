import { CheckCircle2, Eye, EyeOff, RotateCcw, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import type { QuizSession, StudyDay } from '../content/types'
import { MarkdownContent } from './MarkdownContent'

interface QuizSectionProps {
  day: StudyDay
  session: QuizSession
  onChange: (session: QuizSession) => void
  revealQuestionId?: string
}

export function QuizSection({ day, session, onChange, revealQuestionId }: QuizSectionProps) {
  const total = day.questions.length
  const answeredCount = day.questions.filter((question) => session.answers[question.id]).length
  const complete = answeredCount === total
  const correctCount = day.questions.filter(
    (question) => session.answers[question.id] === question.answer,
  ).length
  const accuracy = Math.round((correctCount / total) * 100)

  useEffect(() => {
    if (revealQuestionId && !session.revealed.includes(revealQuestionId)) {
      onChange({ ...session, revealed: [...session.revealed, revealQuestionId] })
    }
  }, [onChange, revealQuestionId, session])

  function choose(questionId: string, answer: string) {
    if (session.submitted) return
    onChange({
      ...session,
      answers: { ...session.answers, [questionId]: answer },
    })
  }

  function toggleReveal(questionId: string) {
    onChange({
      ...session,
      revealed: session.revealed.includes(questionId)
        ? session.revealed.filter((id) => id !== questionId)
        : [...session.revealed, questionId],
    })
  }

  function reset() {
    onChange({ answers: {}, revealed: [], submitted: false })
  }

  return (
    <section className="quiz-section" aria-labelledby="quiz-title">
      <div className="quiz-heading" id="quiz-title">
        <div>
          <p className="eyebrow">今日练习</p>
          <h2>真题自测</h2>
          <p>完成全部题目后提交，系统将统计正确率并统一标注答案。</p>
        </div>
        <div className="quiz-progress" aria-label={`已完成 ${answeredCount} 道，共 ${total} 道`}>
          <strong>{answeredCount}</strong>
          <span>/ {total}</span>
        </div>
      </div>

      <div className="progress-track" aria-hidden="true">
        <span style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <div className="question-list">
        {day.questions.map((question) => {
          const selected = session.answers[question.id]
          const revealed = session.revealed.includes(question.id)
          const reviewing = revealed || session.submitted
          return (
            <article className="question-card" id={question.id} key={question.id}>
              <div className="question-card__number">第 {question.number} 题</div>
              <h3>{question.prompt}</h3>
              <fieldset disabled={session.submitted}>
                <legend className="sr-only">第{question.number}题选项</legend>
                <div className="option-list">
                  {question.options.map((option) => {
                    const isSelected = selected === option.key
                    const isCorrect = option.key === question.answer
                    const isWrongSelection = reviewing && isSelected && !isCorrect
                    const classNames = [
                      'option-card',
                      isSelected ? 'is-selected' : '',
                      reviewing && isCorrect ? 'is-correct' : '',
                      isWrongSelection ? 'is-incorrect' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')
                    return (
                      <label className={classNames} key={option.key}>
                        <input
                          type="radio"
                          name={`day-${day.day}-${question.id}`}
                          value={option.key}
                          checked={isSelected}
                          onChange={() => choose(question.id, option.key)}
                        />
                        <span className="option-card__key">{option.key}</span>
                        <span className="option-card__text">{option.text}</span>
                        {reviewing && isCorrect && <CheckCircle2 size={20} aria-label="正确答案" />}
                        {isWrongSelection && <XCircle size={20} aria-label="选择错误" />}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {!session.submitted && (
                <button
                  type="button"
                  className={`answer-toggle ${revealed ? 'is-open' : ''}`}
                  onClick={() => toggleReveal(question.id)}
                >
                  {revealed ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  {revealed ? '关闭答案' : '显示答案'}
                </button>
              )}

              {reviewing && (
                <div className="answer-panel" role="status">
                  <div className="answer-panel__label">
                    正确答案：<strong>{question.answer}</strong>
                  </div>
                  <MarkdownContent markdown={question.explanationMarkdown} />
                </div>
              )}
            </article>
          )
        })}
      </div>

      <div className="quiz-submit-panel">
        {session.submitted ? (
          <>
            <div className="score-card" role="status">
              <div className="score-card__seal">答</div>
              <div>
                <span>本次答题结果</span>
                <strong>
                  {correctCount} / {total}
                </strong>
                <p>正确率 {accuracy}%</p>
              </div>
            </div>
            <button type="button" className="button button--secondary" onClick={reset}>
              <RotateCcw size={17} aria-hidden="true" />
              重新作答
            </button>
          </>
        ) : (
          <>
            <div>
              <strong>{complete ? '已完成全部题目' : `还需完成 ${total - answeredCount} 道题`}</strong>
              <p>{complete ? '提交后将锁定选项并展示全部解析。' : '请先选择每道题的答案。'}</p>
            </div>
            <button
              type="button"
              className="button button--primary"
              disabled={!complete}
              onClick={() => onChange({ ...session, submitted: true, revealed: day.questions.map((q) => q.id) })}
            >
              答案解析
            </button>
          </>
        )}
      </div>
    </section>
  )
}
