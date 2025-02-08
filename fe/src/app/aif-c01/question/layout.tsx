import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AIF-C01 연습문제',
  description: 'AWS Certified AI Practitioner 문제풀기',
}

export default function QuestionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 