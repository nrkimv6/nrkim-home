"use client"

import { useRef, useState, useEffect, SetStateAction } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoPlayer } from "./video-player"
import { SubtitleList } from "./subtitle-list"
import { SummaryList } from "./summary-list"
import { useSync } from "./sync-context"
import { stringToTime, SubtitleGroup, SummaryGroup, Video, ScrollTrigger } from "./types"


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
  const [summaryGroups, setSummaryGroups] = useState<SummaryGroup[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [isManualScrolling, setIsManualScrolling] = useState(false)

  const { setActiveItem, setPendingScroll } = useSync();
  const [activeBottomTab, setActiveBottomTab] = useState("summary");

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

  // useEffect(() => {
  //   if (!autoScroll) return

  //   const currentSubtitle = subtitleGroups
  //     .flatMap(group => group.items)
  //     .find(item =>
  //       currentTimeMs >= stringToTime(item.startTime) &&
  //       currentTimeMs < stringToTime(item.endTime)
  //     )

  //   if (currentSubtitle) {
  //     document.querySelector(`[data-subtitle-id="${currentSubtitle.id}"]`)
  //       ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  //   }
  // }, [currentTimeMs, subtitleGroups, autoScroll])

  const totalDurationMs = videos.reduce((acc, video) => acc + video.durationMs, 0)

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

    const loadSummaries = async () => {
      try {
        const response = await fetch('/data/summaries.json');
        const data = await response.json();
        setSummaryGroups(data);
      } catch (error) {
        console.error('요약을 불러오는데 실패했습니다:', error);
      }
    };

    if(subtitleGroups.length === 0){
      loadSubtitles();
    }
    if(summaryGroups.length === 0){
      loadSummaries();
    }
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

  const getSubTitleItem = (sourceIndex:number, sequence:number)=>{
    for (const group of subtitleGroups) {
      if (group.sourceIndex === sourceIndex) {
        const item = group.items.find(item => item.sequence === sequence);
        if (item) return item;
      }
    }
    return undefined;
  }

  const getSummaryTime = (sourceIndex: number, sequence: number) => {
    const subtitleItem = getSubTitleItem(sourceIndex, sequence);
    if( subtitleItem){
      return stringToTime(subtitleItem.startTime);
    }
    return null;
  }

  const onTimeSelect = (time: number | null, type: 'subtitle' | 'summary', options?: {
    sourceIndex?: number;
    sequence?: number;
  }) => {
    if (type === 'summary' && options?.sequence) {
      setIsManualScrolling(true);
      const subTitle = getSubTitleItem(options.sourceIndex || 0, options.sequence);

      if(subTitle){
        console.debug(`subTitle: ${subTitle.id}`)
        const summaryTime = stringToTime(subTitle?.startTime || '00:00:00.000');
        playerRef.current?.seekTo(summaryTime / 1000, true);
        setCurrentTimeMs(summaryTime);
        setPendingScroll({
          sourceIndex: options.sourceIndex,
          sequence: options.sequence,
          trigger: ScrollTrigger.SHORTCUT
        });
      }
      else{
        console.debug(`subTitle not found for ${options.sourceIndex} ${options.sequence}`)
      }

      setActiveBottomTab('subtitle');
      setActiveItem({
        type,
        id: subTitle?.id || null,
        time: time,
        trigger: ScrollTrigger.SHORTCUT
      });

      setTimeout(() => {
        setIsManualScrolling(false);
      }, 1000);
    }
    else {
      if (time) {
        setCurrentTimeMs(time);
        playerRef.current?.seekTo(time / 1000, true);
        setActiveItem({
          type,
          id: null,
          time: time,
          trigger: ScrollTrigger.SHORTCUT
        });
      }
    }
  };

  // 탭 변경 시 현재 시간에 해당하는 항목으로 스크롤
  useEffect(() => {
    if (activeBottomTab === 'subtitle') {
      const subTitle = subtitleGroups
        .flatMap(group => group.items)
        .find(item =>
          currentTimeMs >= stringToTime(item.startTime) &&
          currentTimeMs < stringToTime(item.endTime)
        );

      if (subTitle) {
        const group = subtitleGroups.find(g => 
          g.items.some(item => item.id === subTitle.id)
        );
        if (group) {
          setPendingScroll({
            sourceIndex: group.sourceIndex,
            sequence: subTitle.sequence
          });
          setActiveItem({
            type: 'subtitle',
            id: subTitle.id,
            time: currentTimeMs
          });
        }
      }
    } else if (activeBottomTab === 'summary') {
      const summary = summaryGroups.find(group =>
        currentTimeMs >= stringToTime(group.startTime) &&
        currentTimeMs < stringToTime(group.endTime)
      );

      if (summary) {
        setActiveItem({
          type: 'summary',
          id: summary.id,
          time: currentTimeMs
        });
      }
    }
  }, [activeBottomTab]);

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
                  onPlayerReady={(player) => playerRef.current = player}
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
                style={{ visibility: "hidden" }}
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
          </div>
        </Tabs>

        <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab}>
          <TabsList>
            <TabsTrigger value="summary">요약</TabsTrigger>
            <TabsTrigger value="subtitle">자막</TabsTrigger>
            <TabsTrigger value="timestamp">타임스탬프</TabsTrigger>
          </TabsList>
          <Card>
            <Tabs value={activeBottomTab} onValueChange={setActiveBottomTab}>
              <TabsContent value="summary">
                <SummaryList
                  summaryGroups={summaryGroups}
                  currentTimeMs={currentTimeMs}
                  onTimeSelect={onTimeSelect}
                  autoScroll={autoScroll}
                  setAutoScroll={setAutoScroll}
                />
              </TabsContent>
              <TabsContent value="subtitle">
                <SubtitleList
                  subtitleGroups={subtitleGroups}
                  currentTimeMs={currentTimeMs}
                  onTimeSelect={onTimeSelect}
                  autoScroll={autoScroll}
                  setAutoScroll={setAutoScroll}
                  isManualScrolling={isManualScrolling}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </Tabs>
      </CardContent>
    </Card>
  );
}
