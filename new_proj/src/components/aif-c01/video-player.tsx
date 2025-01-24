"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Video {
  id: number
  url: string
  startTime: string
  endTime: string
  durationMs: number
  audio: string
}

interface Subtitle {
  id: number
  startTime: string
  endTime: string
  text: string[]
}

export function VideoPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [activeTab, setActiveTab] = useState("video")
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [currentImage, setCurrentImage] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)

  const videos: Video[] = [
    { 
      id: 1, 
      url: "VIDEO_URL_1", 
      startTime: "00:00:00.000", 
      endTime: "03:58:19.322",
      durationMs: 14289321,
      audio: "AUDIO_URL_1"
    },
  ]

  const subtitles: Subtitle[] = [
    {
      id: 1,
      startTime: "00:00:00.000",
      endTime: "00:00:05.000",
      text: ["첫 번째 자막입니다."]
    },
  ]

  const totalDurationMs = videos.reduce((acc, video) => acc + video.durationMs, 0)

  const stringToTime = (timeStr: string): number => {
    const [hours, minutes, seconds] = timeStr.split(":").map(Number)
    return (hours * 3600 + minutes * 60 + seconds) * 1000
  }

  const getImageFilename = (timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `slide_${String(totalSeconds).padStart(4, "0")}_${String(hours).padStart(2, "0")}-${String(minutes).padStart(2, "0")}-${String(seconds).padStart(2, "0")}.png`
  }

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying, currentVideoIndex])

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTimeMs = audioRef.current.currentTime * 1000
      setCurrentTimeMs(newTimeMs)
      setCurrentImage(getImageFilename(newTimeMs))
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTimeMs = percent * totalDurationMs
    
    setCurrentTimeMs(newTimeMs)
    if (audioRef.current) {
      audioRef.current.currentTime = newTimeMs / 1000
    }
  }

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="video">비디오</TabsTrigger>
            <TabsTrigger value="slides">슬라이드</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            <TabsContent value="video">
              <div className="aspect-video bg-muted">
                <iframe
                  className="w-full h-full"
                  src={`${videos[currentVideoIndex].url}?autoplay=1&enablejsapi=1`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </TabsContent>

            <TabsContent value="slides">
              <div className="aspect-video bg-muted relative">
                {currentImage && (
                  <img
                    src={currentImage}
                    alt="Current slide"
                    className="w-full h-full object-contain"
                  />
                )}
                <audio
                  ref={audioRef}
                  src={videos[currentVideoIndex].audio}
                  onTimeUpdate={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />
                <button
                  className="absolute bottom-4 left-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? "일시정지" : "재생"}
                </button>
              </div>
            </TabsContent>

            <div className="relative mb-12">
              <div 
                className="h-4 bg-secondary rounded-md cursor-pointer"
                onClick={handleProgressClick}
              >
                <div 
                  className="h-full bg-primary rounded-md"
                  style={{ width: `${(currentTimeMs / totalDurationMs) * 100}%` }}
                />
              </div>

              <div className="absolute bottom-0 w-full">
                {videos.map((video, index) => {
                  const startPercent = (index / videos.length) * 100
                  return (
                    <button
                      key={video.id}
                      className="absolute px-2 py-1 -bottom-8 transform -translate-x-1/2 bg-primary text-primary-foreground rounded text-xs"
                      style={{ left: `${startPercent}%` }}
                      onClick={() => setCurrentVideoIndex(index)}
                    >
                      {video.startTime.split(".")[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
              {subtitles.map((subtitle) => (
                <div
                  key={subtitle.id}
                  className={cn(
                    "p-3 rounded-md transition-colors",
                    currentTimeMs >= stringToTime(subtitle.startTime) && 
                    currentTimeMs < stringToTime(subtitle.endTime)
                      ? "bg-primary/10 border-l-4 border-primary"
                      : "bg-muted"
                  )}
                >
                  <div className="text-sm text-muted-foreground mb-1">
                    {subtitle.startTime} → {subtitle.endTime}
                  </div>
                  {subtitle.text.map((line, index) => (
                    <p key={index} className="text-foreground">{line}</p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
} 