"use client"

import { PlayComponent } from "@/components/aif-c01/play-component"
import { AIFNavigation } from "@/components/aif-navigation"

export default function AIFC01Page() {
  return (
    <div className="min-h-screen bg-background">
      <AIFNavigation />
      <main className="p-8">
        <PlayComponent />
      </main>
    </div>
  )
} 