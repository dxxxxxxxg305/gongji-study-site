import { describe, expect, it } from 'vitest'
import { useState } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { QuizSection } from './QuizSection'
import type { QuizSession, StudyDay } from '../content/types'

const day: StudyDay = {
  kind: 'day',
  day: 99,
  filePath: 'test.md',
  title: '测试资料',
  knowledgeMarkdown: '',
  afterQuizMarkdown: '',
  questions: [
    {
      id: 'question-1',
      number: 1,
      prompt: '第一题',
      options: [
        { key: 'A', text: '甲' },
        { key: 'B', text: '乙' },
        { key: 'C', text: '丙' },
        { key: 'D', text: '丁' },
      ],
      answer: 'B',
      explanationMarkdown: '第一题解析',
    },
    {
      id: 'question-2',
      number: 2,
      prompt: '第二题',
      options: [
        { key: 'A', text: '甲' },
        { key: 'B', text: '乙' },
        { key: 'C', text: '丙' },
        { key: 'D', text: '丁' },
      ],
      answer: 'A',
      explanationMarkdown: '第二题解析',
    },
  ],
}

function QuizHarness() {
  const [session, setSession] = useState<QuizSession>({ answers: {}, revealed: [], submitted: false })
  return <QuizSection day={day} session={session} onChange={setSession} />
}

describe('QuizSection', () => {
  it('requires all answers, grades selections and supports resetting', () => {
    render(<QuizHarness />)
    const submit = screen.getByRole('button', { name: '答案解析' })
    expect(submit).toBeDisabled()

    const cards = screen.getAllByRole('article')
    fireEvent.click(within(cards[0]).getByRole('button', { name: '显示答案' }))
    expect(within(cards[0]).getByRole('button', { name: '关闭答案' })).toBeInTheDocument()
    expect(within(cards[0]).getByText('正确答案：')).toBeInTheDocument()
    fireEvent.click(within(cards[0]).getByRole('button', { name: '关闭答案' }))
    expect(within(cards[0]).queryByText('正确答案：')).not.toBeInTheDocument()

    fireEvent.click(within(cards[0]).getByRole('radio', { name: /B/ }))
    expect(submit).toBeDisabled()
    fireEvent.click(within(cards[1]).getByRole('radio', { name: /A/ }))
    expect(submit).toBeEnabled()

    fireEvent.click(submit)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getAllByText('第一题解析')).toHaveLength(1)
    expect(screen.getByRole('button', { name: '重新作答' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重新作答' }))
    expect(screen.getByRole('button', { name: '答案解析' })).toBeDisabled()
  })
})
