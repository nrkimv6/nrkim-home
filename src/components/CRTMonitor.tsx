import type React from "react"
import './CRTMonitor.css'  // 새로운 CSS 파일을 만들어서 사용

interface CRTMonitorProps {
  children: React.ReactNode
  isShuttingDown?: boolean
}

export default function CRTMonitor({ children, isShuttingDown = false }: CRTMonitorProps) {
  return (
    <div className={`crt-monitor ${isShuttingDown ? 'animate-crt-shutdown' : ''}`}>
      <div className="crt-screen">
        {children}
      </div>
    </div>
  )
}

