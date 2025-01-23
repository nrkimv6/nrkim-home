"use client"

import React, { useState, useEffect } from "react"
import CRTMonitor from "./CRTMonitor"

export default function HomeScreen() {
  const [text, setText] = useState("")
  const [showButton, setShowButton] = useState(false)
  const [showMonitor, setShowMonitor] = useState(true)
  const [isShuttingDown, setIsShuttingDown] = useState(false)
  const basicText = `
Trying 127.0.0.1...
Connected to narang.kim
Escape character is '^]'.

login: guest
password: ********

Welcome to narang.kim - Personal site
Last login: ${new Date().toLocaleString()}

guest@narang:~$`

  const secondText = `

=== ABOUT ME ===
Name: Kim, Narang
Age: 34
Location: Seoul, South Korea
Keywords: Learning, Curious, Growth, Programming, Feeling, Empowerment

guest@narang:~$`

  const thirdText = `

=== SKILLS ===
Backend:
  - Languages: C++, MFC, C#, Java, SpringBoot, Python, Node.js
  - Databases: SQLite, SQL Server, MySQL, Oracle, PostgreSQL
Frontend:
  - Frameworks: React, Next.js, Vue.js

=== CONTACT ===
Email: risingnrkim@gmail.com

guest@narang:~$ _`

  useEffect(() => {
    let i = 0
    const typing = setInterval(() => {
      setText(basicText.slice(0, i))
      i++
      if (i > basicText.length) {
        clearInterval(typing)
        setShowButton(true) // basicText 완료 후 버튼 표시
        
        // 66초 후에 두 번째 텍스트 타이핑 시작
        setTimeout(() => {
          setShowButton(false) // secondText 시작 전 버튼 제거
          let j = 0
          const secondTyping = setInterval(() => {
            setText(basicText + secondText.slice(0, j))
            j++
            if (j > secondText.length) {
              clearInterval(secondTyping)
              
              // 10초 후에 세 번째 텍스트 타이핑 시작
              setTimeout(() => {
                let k = 0
                const thirdTyping = setInterval(() => {
                  setText(basicText + secondText + thirdText.slice(0, k))
                  k++
                  if (k > thirdText.length) clearInterval(thirdTyping)
                }, 50)
              }, 10000) // 10초 = 10000ms
            }
          }, 50)
        }, 66000) // 66초 = 66000ms
      }
    }, 50)

    return () => clearInterval(typing)
  }, [])

  useEffect(() => {
    const preElement = document.querySelector('pre');
    if (preElement) {
      preElement.scrollTop = preElement.scrollHeight;
    }
  }, [text]); // text가 변경될 때마다 스크롤 위치 업데이트

  const shutDownMonitor = () => {
    setText(prev => prev + "\n\nbye!")
    
    // bye! 메시지가 표시된 후 1초 뒤에 종료 애니메이션 시작
    setTimeout(() => {
      setIsShuttingDown(true)
      // 종료 애니메이션이 끝난 후 모니터를 숨김
      setTimeout(() => {
        setShowMonitor(false)
      }, 1000)
    }, 1000)
  }

  const handleContinue = () => {
    shutDownMonitor()
  }

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // ESC 키 입력 처리
      if (e.key === 'Escape') {
        shutDownMonitor()
      }
      // Enter 키 입력 처리 (버튼이 보일 때만)
      if (e.key === 'Enter' && showButton) {
        shutDownMonitor()
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [showButton])

  return (
    <div className="home-screen">
      {showMonitor && (
        <>
          <CRTMonitor isShuttingDown={isShuttingDown}>
            <pre className="overflow-auto max-h-[70vh]">{text}</pre>
            {showButton && (
              <div className="mt-4">
                <button
                  onClick={handleContinue}
                  className="continue-button bg-black text-green-500 border-2 border-green-500 px-4 py-2 font-mono hover:bg-green-500 hover:text-black transition-colors"
                >
                  [CONTINUE] Press Enter...
                </button>
              </div>
            )}
          </CRTMonitor>
        </>
      )}
    </div>
  )
}

