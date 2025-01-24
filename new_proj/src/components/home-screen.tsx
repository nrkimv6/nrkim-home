"use client"

import { useState, useEffect } from "react"
import { CRTMonitor } from "./crt-monitor"
import { SnakeGame } from "./snake-game"
import { PentrisGame } from "./pentris-game"

export function HomeScreen() {
    const [text, setText] = useState("")
    const [showButton, setShowButton] = useState(false)
    const [showMonitor, setShowMonitor] = useState(true)
    const [isShuttingDown, setIsShuttingDown] = useState(false)
    const [showSnakeGame, setShowSnakeGame] = useState(false)
    const [showPentrisGame, setShowPentrisGame] = useState(false)

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
                setShowButton(true)

                setTimeout(() => {
                    setShowButton(false)
                    let j = 0
                    const secondTyping = setInterval(() => {
                        setText(basicText + secondText.slice(0, j))
                        j++
                        if (j > secondText.length) {
                            clearInterval(secondTyping)

                            setTimeout(() => {
                                let k = 0
                                const thirdTyping = setInterval(() => {
                                    setText(basicText + secondText + thirdText.slice(0, k))
                                    k++
                                    if (k > thirdText.length) clearInterval(thirdTyping)
                                }, 50)
                            }, 10000)
                        }
                    }, 50)
                }, 66000)
            }
        }, 50)

        return () => clearInterval(typing)
    }, [])

    useEffect(() => {
        const preElement = document.querySelector('pre')
        if (preElement) {
            preElement.scrollTop = preElement.scrollHeight
        }
    }, [text])

    const shutDownMonitor = (gameType: 'snake' | 'pentris') => {
        setText(prev => prev + "\n\nbye!")

        setTimeout(() => {
            setIsShuttingDown(true)
            setShowMonitor(false)
            if (gameType === 'snake') {
                setShowSnakeGame(true)
                setShowPentrisGame(false)
            } else {
                setShowPentrisGame(true)
                setShowSnakeGame(false)
            }
        }, 300)
    }

    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (showSnakeGame || showPentrisGame) {
                return
            }

            if (e.key === 'Escape') {
                shutDownMonitor('pentris')
                return
            }

            if (showButton) {
                switch (e.key) {
                    case 'Enter':
                        shutDownMonitor('snake')
                        break
                    case ' ': // Space key
                        shutDownMonitor('pentris')
                        break
                }
            }
        }

        window.addEventListener('keydown', handleKeyPress)
        return () => window.removeEventListener('keydown', handleKeyPress)
    }, [showButton, showSnakeGame, showPentrisGame])

    return (
        <>
            {showMonitor && (
                <div className="home-screen">
                    <CRTMonitor isShuttingDown={isShuttingDown}>
                        <pre className="overflow-auto max-h-[70vh]">{text}</pre>
                        {showButton && (
                            <div className="mt-4">
                                <button
                                    onClick={() => shutDownMonitor('snake')}
                                    className="continue-button bg-transparent text-white border border-white/20 px-4 py-2 font-mono hover:bg-white/10 transition-colors"
                                >
                                    [CONTINUE] Press Enter...
                                </button>
                            </div>
                        )}
                    </CRTMonitor>
                </div>
            )}
            {showSnakeGame && <SnakeGame />}
            {showPentrisGame && <PentrisGame />}
        </>
    )
} 