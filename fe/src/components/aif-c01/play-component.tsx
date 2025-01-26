"use client"

import { useRef, useState, useEffect, SetStateAction, useMemo } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoPlayer } from "./video-player"
import { SubtitleList } from "./subtitle-list"
import { SummaryList } from "./summary-list"
import { useItemsRefSync, useSync } from "./sync-context"
import { stringToTime, SubtitleGroup, SummaryGroup, Video, ScrollTrigger, getSubtitle } from "./types"
import React from "react"


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
  const [skipMountScroll, setSkipMountScroll] = useState(false)

  const { activeItem, setActiveItem, setPendingScroll, pendingScroll, timeState, setCurrentTime, seekTo, disableTimeUpdate, enableTimeUpdate } = useSync();
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

    if (subtitleGroups.length === 0) {
      loadSubtitles();
    }
    if (summaryGroups.length === 0) {
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
        setCurrentTime(currentTime)
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

  const getSubTitleItem = (sourceIndex: number, sequence: number) => {
    return getSubtitle(subtitleGroups, sourceIndex, sequence);
  }

  const getSummaryTime = (sourceIndex: number, sequence: number) => {
    const subtitleItem = getSubTitleItem(sourceIndex, sequence);
    if (subtitleItem) {
      return stringToTime(subtitleItem.startTime);
    }
    return null;
  }

  const onTimeSelect = (time: number | null, type: 'subtitle' | 'summary', options?: {
    sourceIndex?: number;
    sequence?: number;
  }) => {
    console.log(`onTimeSelect: ${time}, type: ${type}, options: ${options}`);

    disableTimeUpdate();  // 시간 업데이트 비활성화

    if (type === 'summary' && options?.sequence) {
      const subTitle = getSubTitleItem(options.sourceIndex || 0, options.sequence);

      if (subTitle) {
        const summaryTime = stringToTime(subTitle.startTime);

        if (activeBottomTab !== 'subtitle') {
          React.startTransition(() => {
            setPendingScroll({
              targetId: subTitle.id,
              trigger: ScrollTrigger.SHORTCUT
            });

            setActiveItem({
              type,
              id: subTitle.id,
              time: summaryTime,
              trigger: ScrollTrigger.SHORTCUT
            });

            setActiveBottomTab('subtitle');

            playerRef.current?.seekTo(summaryTime / 1000, true);
            setCurrentTime(summaryTime);  // setCurrentTimeMs 대신 setCurrentTime 사용
          });
        }
      }
    } else if (time) {
      playerRef.current?.seekTo(time / 1000, true);
      setCurrentTime(time);  // setCurrentTimeMs 대신 setCurrentTime 사용
      if (activeItem?.type === 'summary' && activeItem?.id != null) {
        //skip to setActionItem (itself)
      }
      else {
        setActiveItem({
          type,
          id: null,
          time: time,
          trigger: ScrollTrigger.SHORTCUT
        });
      }
    }

    // 시간 이동이 완료된 후 시간 업데이트 다시 활성화
    setTimeout(enableTimeUpdate, 100);
  };


  const setSubtitleByCurrentTime = () => {
    const subTitle = subtitleGroups
      .flatMap(group => group.items)
      .find(item => currentTimeMs >= stringToTime(item.startTime) &&
        currentTimeMs < stringToTime(item.endTime)
      )

    if (subTitle) {
      const group = subtitleGroups.find(g => g.items.some(item => item.id === subTitle.id)
      )
      if (group) {
        setPendingScroll({
          targetId: subTitle.id,
        })
        setActiveItem({
          type: 'subtitle',
          id: subTitle.id,
          time: currentTimeMs
        })
      }
    }
  }

  const setSummaryByCurrentTime = () => {
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
    else {
      // 현재 그룹이 없는 경우 (이전/다음 그룹 사이) ativeItem 초기화
      setActiveItem({
        type: null,
        id: null,
        time: currentTimeMs
      });
    }
  }
  const setSummaryByCurrentGroup=()=>{
    if (currentGroup?.current) {
      const firstItem = currentGroup.current.items[0];
      if (firstItem) {
        setActiveItem({
          type: 'summary',
          id: firstItem.id,
          time: currentTimeMs
        });
        console.debug('Set active summary from currentGroup:', firstItem.id);
        return true;
      }
    } 
    return false;
  };

  // 탭 변경 시 현재 시간에 해당하는 항목으로 스크롤
  useEffect(() => {
    if (activeBottomTab === 'subtitle') {

      if (pendingScroll?.targetId) {
        //do nothing
      }
      else {
        setSubtitleByCurrentTime()
      }
    } else if (activeBottomTab === 'summary') {
      if( !setSummaryByCurrentGroup()){
        setSummaryByCurrentTime();
      }
    }
  }, [activeBottomTab]);

  // 1) 현재 활성화된 그룹 찾기
  const currentGroup = useMemo(() => {
    if (activeItem?.type === 'summary') {
      // activeItem이 summary인 경우
      const group = summaryGroups.find(group =>
        group.items.some(item => item.id === activeItem.id)
      );
      if (group) {
        return { current: group };
      }
    }

    // 현재 시간에 해당하는 summary 찾기
    const sortedGroups = [...summaryGroups].sort(
      (a, b) => stringToTime(a.startTime) - stringToTime(b.startTime)
    );

    const currentIdx = sortedGroups.findIndex(group =>
      currentTimeMs >= stringToTime(group.startTime) &&
      currentTimeMs < stringToTime(group.endTime)
    );

    if (currentIdx !== -1) {
      return { current: sortedGroups[currentIdx] };
    }

    // 현재 시간이 속한 그룹이 없는 경우, 전후 그룹 찾기
    const nextIdx = sortedGroups.findIndex(group => 
      currentTimeMs < stringToTime(group.startTime)
    );

    if (nextIdx === 0) {
      // 첫 그룹 이전
      return { next: sortedGroups[0] };
    } else if (nextIdx === -1) {
      // 마지막 그룹 이후
      return { previous: sortedGroups[sortedGroups.length - 1] };
    } else {
      // 두 그룹 사이
      return {
        previous: sortedGroups[nextIdx - 1],
        next: sortedGroups[nextIdx]
      };
    }
  }, [activeItem, currentTimeMs, summaryGroups]);

  // 2) 현재 그룹의 title 관리
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);

  useEffect(() => {
    if (currentGroup) {
      if (currentGroup.current) {
        setCurrentTitle(currentGroup.current.title);
      } else if (currentGroup.previous && currentGroup.next) {
        setCurrentTitle(`${currentGroup.previous.title} → ${currentGroup.next.title}`);
      } else if (currentGroup.previous) {
        setCurrentTitle(`${currentGroup.previous.title} 이후`);
      } else if (currentGroup.next) {
        setCurrentTitle(`${currentGroup.next.title} 이전`);
      } else {
        setCurrentTitle(null);
      }
    } else {
      setCurrentTitle(null);
    }
  }, [currentGroup]);

  // 시간 이동이 필요한 경우
  const handleTimeSelect = (time: number) => {
    disableTimeUpdate();  // 일시적으로 자동 시간 업데이트 비활성화
    playerRef.current?.seekTo(time / 1000, true);  // 실제 비디오 시간 변경
    setTimeout(enableTimeUpdate, 100);  // 시간 이동이 완료된 후 다시 활성화
  };

  // 비디오 재생 중 시간 업데이트
  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  // 시간 포맷팅 함수 추가
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

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
                  onTimeUpdate={handleTimeUpdate}
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
                      setCurrentTime(target.currentTime * 1000)
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

        {/* 현재 summary title 표시 */}
        <div className="my-4 px-4 py-2 bg-muted rounded-md flex items-center gap-3">
          <span className="text-sm font-medium text-primary">현재: </span>
          <span className="text-sm text-muted-foreground">
            {currentTitle || "재생 중인 섹션 없음"}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs text-muted-foreground">{formatTime(currentTimeMs)}</span>
          </div>
        </div>

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
                  skipMountScroll={skipMountScroll}
                />
              </TabsContent>
            </Tabs>
          </Card>
        </Tabs>
      </CardContent>
    </Card>
  );
}