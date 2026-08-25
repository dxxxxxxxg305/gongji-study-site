import { describe, expect, it } from 'vitest'
import { ContentValidationError, loadStudyContent, parseStudyFile } from './parser'

const overview = `---
kind: overview
title: 复习计划
---

# 复习计划

## 第一周

先打基础。
`

const validDay = `---
kind: day
day: 2
title: 第二天资料
---

# Day 2

## 模块C：经济学

### 1. 供需

基础知识。

## 今日真题练习（1道）

### 第1题

**下列说法正确的是（ ）**

A. 选项一
B. 选项二
C. 选项三
D. 选项四

**【答案】B**

**解析：** B项正确。

## 今日复习小结

明日继续。
`

describe('study markdown parser', () => {
  it('parses metadata, knowledge, questions and closing markdown', () => {
    const page = parseStudyFile(validDay, 'Day02.md')
    expect(page.kind).toBe('day')
    if (page.kind !== 'day') return
    expect(page.day).toBe(2)
    expect(page.questions).toHaveLength(1)
    expect(page.questions[0]).toMatchObject({ number: 1, answer: 'B', prompt: '下列说法正确的是（ ）' })
    expect(page.knowledgeMarkdown).toContain('模块C：经济学')
    expect(page.afterQuizMarkdown).toContain('明日继续')
  })

  it('reports malformed choices with the file and question number', () => {
    const malformed = validDay.replace('D. 选项四', 'E. 选项四')
    expect(() => parseStudyFile(malformed, 'Day02.md')).toThrowError(ContentValidationError)
    try {
      parseStudyFile(malformed, 'Day02.md')
    } catch (error) {
      expect(error).toBeInstanceOf(ContentValidationError)
      expect((error as ContentValidationError).message).toContain('Day02.md：第1题')
    }
  })

  it('rejects duplicate day numbers and invalid metadata', () => {
    expect(() => loadStudyContent({ '大纲.md': overview, 'Day02-a.md': validDay, 'Day02-b.md': validDay })).toThrow(
      /Day 2 重复/,
    )
    expect(() => parseStudyFile(validDay.replace('day: 2', 'day: 0'), 'bad.md')).toThrow(/day 必须/)
  })
})
