import { Metadata } from 'next'
import path from 'path'
import fs from 'fs'
import { encrypt } from '@/lib/crypto'

export const metadata: Metadata = {
  title: 'AIF-C01 이론공부',
  description: 'AWS Certified AI Practitioner 이론 공부',
}

async function loadData() {
  const dataPath = path.join(process.cwd(), 'src', 'data', 'aif-c01')
  
  const summaries = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'summaries.json'), 'utf8')
  )
  const slides = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'slides.json'), 'utf8')
  )
  const subtitles = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'subtitles.json'), 'utf8')
  )
  const timestamps = JSON.parse(
    fs.readFileSync(path.join(dataPath, 'timestamps.json'), 'utf8')
  )

  return {
    summaries,
    slides,
    subtitles,
    timestamps
  }
}

export default async function AifC01Layout({
  children,
}: {
  children: React.ReactNode
}) {
  const data = await loadData()
  const encryptedData = encrypt(JSON.stringify(data));
  
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.__INITIAL_DATA__ = "${encryptedData}"`
        }}
      />
      {children}
    </>
  )
} 