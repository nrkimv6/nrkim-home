"use client"

import { ReactNode } from "react"
import styles from "./styles.module.css"
import { cn } from "@/lib/utils"

interface CRTMonitorProps {
  children: ReactNode
  className?: string
  isShuttingDown?: boolean
}

export function CRTMonitor({ children, className, isShuttingDown = false }: CRTMonitorProps) {
  return (
    <div className={cn(styles.crtMonitor, isShuttingDown && styles.animateCrtShutdown, className)}>
      <div className={styles.crtScreen}>
        {children}
      </div>
    </div>
  )
} 