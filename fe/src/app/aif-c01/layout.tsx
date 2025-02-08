import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AIF-C01 이론공부',
  description: 'AWS Certified AI Practitioner 이론 공부',
}

export default function QuestionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
} 