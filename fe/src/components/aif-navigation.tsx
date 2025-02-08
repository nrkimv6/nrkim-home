"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const aifRoutes = [
  {
    path: "/aif-c01",
    title: "메인",
    visible: true
  },
  {
    path: "/aif-c01/study",
    title: "학습하기",
    visible: false
  },
  {
    path: "/aif-c01/question",
    title: "문제풀기",
    visible: true
  }
]

export function AIFNavigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  return (
    <nav className={cn(
      "fixed left-0 top-0 h-screen bg-background shadow-md transition-transform w-[200px]",
      isMenuOpen ? "translate-x-0" : "-translate-x-[200px]"
    )}>
      <button 
        className="absolute -right-10 top-4 w-8 h-8 bg-background shadow-md flex flex-col justify-center items-center gap-1 rounded-r"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        <span className="w-4 h-0.5 bg-foreground" />
        <span className="w-4 h-0.5 bg-foreground" />
        <span className="w-4 h-0.5 bg-foreground" />
      </button>

      <div className="p-4">
        {aifRoutes
          .filter(route => route.visible)
          .map((route) => (
            <Link
              key={route.path}
              href={route.path}
              className={cn(
                "block py-2 px-4 rounded-md transition-colors",
                pathname === route.path
                  ? "bg-primary/10 font-medium"
                  : "hover:bg-muted"
              )}
            >
              {route.title}
            </Link>
          ))}
      </div>
    </nav>
  )
} 