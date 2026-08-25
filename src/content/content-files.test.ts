import { describe, expect, it } from 'vitest'
import { buildSearchEntries } from './parser'
import { searchEntries, studyContent } from './content'

describe('bundled study materials', () => {
  it('loads the overview and all currently available daily files', () => {
    expect(studyContent.overview.kind).toBe('overview')
    const dayNumbers = studyContent.days.map((day) => day.day)
    expect(dayNumbers.length).toBeGreaterThan(0)
    expect(dayNumbers).toEqual([...dayNumbers].sort((left, right) => left - right))
    expect(new Set(dayNumbers).size).toBe(dayNumbers.length)
    expect(dayNumbers).toContain(1)
    expect(studyContent.days[0].questions).toHaveLength(8)
  })

  it('indexes headings and questions for global search', () => {
    const entries = buildSearchEntries(studyContent)
    expect(entries).toEqual(searchEntries)
    expect(entries.some((entry) => entry.text.includes('新质生产力'))).toBe(true)
    expect(entries.find((entry) => entry.revealQuestionId === 'question-1')?.route).toBe('/day/1')
  })
})
