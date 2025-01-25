"use client"

import { useRef, useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { VideoPlayer } from "./video-player"

interface Video {
  id: number
  videoId: string
  startTime: string
  endTime: string
  durationMs: number
  audio: string | null
}

interface SubtitleItem {
  id: number;
  sequence: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleGroup {
  id: number;
  groupTimestamp: string;
  items: SubtitleItem[];
  sourceIndex: number;
}

export function PlayComponent() {
  const playerRef = useRef<YT.Player | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [activeTab, setActiveTab] = useState("video")
  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [currentImage, setCurrentImage] = useState("")
  const [isPlaying, setIsPlaying] = useState(false)
  const [subtitleGroups, setSubtitleGroups] = useState<SubtitleGroup[]>([])

  const videos: Video[] = [
    { 
      id: 1, 
      videoId: "WZeZZ8_W-M4",
      startTime: "00:00:00.000", 
      endTime: "03:58:19.322",
      durationMs: 14289321,
      audio: null
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
    const loadSubtitles = async () => {
      try {
        const response = await fetch('/data/subtitles.json');
        const data = await response.json();
        setSubtitleGroups(data);
      } catch (error) {
        console.error('자막을 불러오는데 실패했습니다:', error);
      }
    };
    
    loadSubtitles();
  }, []);

  const handlePlayerStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === YT.PlayerState.PLAYING) {
      startTimeSync()
    } else {
      stopTimeSync()
    }
  }

  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  const startTimeSync = () => {
    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime() * 1000
        setCurrentTimeMs(currentTime)
      }
    }, 100)
  }

  const stopTimeSync = () => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current)
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const percent = (e.clientX - rect.left) / rect.width
    const newTimeMs = percent * totalDurationMs
    
    setCurrentTimeMs(newTimeMs)
    playerRef.current?.seekTo(newTimeMs / 1000, true)
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
                <VideoPlayer 
                  videoId={videos[currentVideoIndex].videoId}
                  onReady={() => setPlayerReady(true)}
                  onStateChange={handlePlayerStateChange}
                  onTimeUpdate={setCurrentTimeMs}
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
                {videos[currentVideoIndex].audio && (
                <audio
                  ref={audioRef}
                  src={videos[currentVideoIndex].audio}
                  onTimeUpdate={(e) => {
                    const target = e.target as HTMLAudioElement
                    setCurrentTimeMs(target.currentTime * 1000)
                  }}
                  onPlay={() => setIsPlaying(true)} 
                  onPause={() => setIsPlaying(false)}
                />)}
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
                      style={{ left: `${startPercent}%`, visibility: 'hidden' }}
                      onClick={() => setCurrentVideoIndex(index)}
                    >
                      {video.startTime.split(".")[0]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mt-6 space-y-4 max-h-96 overflow-y-auto">
              {subtitleGroups.map((group) => (
                <div 
                  key={group.id}
                  className={cn(
                    "space-y-2 rounded-md p-4 transition-colors",
                    group.items.some(item => 
                      currentTimeMs >= stringToTime(item.startTime) && 
                      currentTimeMs < stringToTime(item.endTime)
                    ) ? "bg-secondary/30" : "bg-muted"
                  )}
                >
                  <div className="text-sm font-medium text-muted-foreground">
                    {group.groupTimestamp}
                  </div>
                  <div className="space-y-1">
                    {group.items.map((subtitle) => (
                      <div
                        key={subtitle.id}
                        className={cn(
                          "flex gap-4 p-2 rounded transition-colors",
                          currentTimeMs >= stringToTime(subtitle.startTime) && 
                          currentTimeMs < stringToTime(subtitle.endTime)
                            ? "bg-primary/20 font-medium" 
                            : ""
                        )}
                      >
                        <span className="text-muted-foreground min-w-[2rem]">
                          {subtitle.id}
                        </span>
                        <span className="text-foreground">
                          {subtitle.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// YouTube IFrame API 타입 선언
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: typeof YT;
  }
} 