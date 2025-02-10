import { Metadata } from 'next'
import path from 'path'
import fs from 'fs'
import { encrypt } from '@/lib/crypto'

export const metadata: Metadata = {
  title: 'AIF-C01 연습문제',
  description: 'AWS Certified AI Practitioner 문제풀기',
}

async function loadQuestions() {
  const dataPath = path.join(process.cwd(), 'src', 'data', 'aif-c01')
  const questions_en = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'questions_en.json'), 'utf8')
  )
  const questions_ko = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'questions_ko.json'), 'utf8')
  )
  return { questions_en, questions_ko }
}

export default async function QuestionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const data = await loadQuestions()
  const encryptedData = encrypt(JSON.stringify(data))

  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__INITIAL_QUESTIONS__ = "${encryptedData}"`
        }}
      />
      {children}
    </>
  )
} 