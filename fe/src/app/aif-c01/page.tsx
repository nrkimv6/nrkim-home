"use client"

import { VideoPlayer } from "@/components/aif-c01/video-player"
import { AIFNavigation } from "@/components/aif-navigation"

export default function AIFC01Page() {
  return (
    <div className="min-h-screen bg-background">
      <AIFNavigation />
      <main className="p-8">
        <VideoPlayer />
      </main>
    </div>
  )
} 