import { cn } from "@/lib/utils"
import { useItemsRefSync, useSync } from "./sync-context";
import { SlideGroup, SlideItem, SlideListProps } from "./types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button"
import { ArrowDown, Beaker, Settings2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { stringToTime } from "@/lib/utils"

export function SlideList({
  slides,
  currentTimeMs,
  onTimeSelect,
  autoScroll,
  setAutoScroll,
}: SlideListProps) {
  const { activeItem } = useSync();
  const { setItemRef, getItemRef } = useItemsRefSync('slide');
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [offsetMs, setOffsetMs] = useState(1000); // 기본값 1초
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // 슬라이드를 그룹으로 구성
  const slideGroups = useMemo(() => {
    const groups: SlideGroup[] = [];
    let groupId = 1;
    
    // 카테고리별로 그룹화
    const groupedSlides = slides.reduce((acc, slide) => {
      if (!acc[slide.category]) {
        acc[slide.category] = [];
      }
      acc[slide.category].push(slide);
      return acc;
    }, {} as Record<string, SlideItem[]>);

    // 그룹 객체 생성
    Object.entries(groupedSlides).forEach(([category, items]) => {
      groups.push({
        id: groupId++,
        category,
        items
      });
    });

    return groups;
  }, [slides]);

  // 현재 시간에 해당하는 슬라이드 찾기
  const getCurrentItem = useMemo(() => {
    let currentItem = null;
    for (let i = 0; i < slides.length; i++) {
      const currentTime = slides[i].timeValue;
      const nextTime = i < slides.length - 1 ? slides[i + 1].timeValue : Infinity;
      
      if (currentTimeMs >= currentTime && currentTimeMs < nextTime) {
        currentItem = slides[i];
        break;
      }
    }
    return currentItem;
  }, [currentTimeMs, slides]);

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || isManualScrolling) return;

    const currentItem = getCurrentItem;
    if (currentItem) {
      const targetElement = getItemRef(currentItem.id.toString());
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTimeMs, autoScroll, isManualScrolling]);

  // 현재 위치로 스크롤
  const scrollToCurrentItem = () => {
    const currentItem = getCurrentItem;
    if (currentItem) {
      const targetElement = getItemRef(currentItem.id.toString());
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // 시간 표시 포맷팅 (밀리초 제거)
  const formatTime = (timeStr: string) => {
    if(!timeStr || timeStr === undefined ) return '00:00';
    return timeStr.split('.')[0];  // 밀리초 부분 제거
  };

  const handleSlideClick = (item: SlideItem) => {
    setIsManualScrolling(true);
    const targetTime = Math.max(0, item.timeValue - offsetMs);
    onTimeSelect(targetTime, 'slide');
    setTimeout(() => setIsManualScrolling(false), 1000);
  };

  const handleOffsetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      setOffsetMs(value * 1000); // 초 단위 입력을 밀리초로 변환
    }
  };

  // 모든 슬라이드의 duration 계산
  const itemDurations = useMemo(() => {
    const durations = new Map<number, number>();
    
    // 시간순으로 정렬된 전체 슬라이드 배열 생성
    const sortedSlides = [...slides].sort((a, b) => 
      a.timeValue - b.timeValue
    );

    // 각 슬라이드의 duration 계산
    sortedSlides.forEach((slide, index) => {
      if (index < sortedSlides.length - 1) {
        const currentTime = slide.timeValue;
        const nextTime = sortedSlides[index + 1].timeValue;
        durations.set(slide.id, Math.round((nextTime - currentTime) / 1000));
      }
    });

    return durations;
  }, [slides]);

  // 그룹의 재생 시간 계산 (소속된 아이템들의 duration 합)
  const getGroupDuration = (group: SlideGroup) => {
    return group.items.reduce((total, item) => {
      return total + (itemDurations.get(item.id) || 0);
    }, 0);
  };

  // 특정 아이템의 duration 가져오기
  const getItemDuration = (item: SlideItem) => {
    return itemDurations.get(item.id);
  };

  // 시간을 hh:mm:ss 형식으로 포맷팅
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 전체 재생시간 계산 함수들
  const getTotalDurations = useMemo(() => {
    const total = Array.from(itemDurations.values()).reduce((sum, duration) => sum + duration, 0);
    
    const theoryTotal = slides
      .filter(slide => !slide.is_example)
      .reduce((sum, slide) => sum + (itemDurations.get(slide.id) || 0), 0);
    
    const exampleTotal = slides
      .filter(slide => slide.is_example)
      .reduce((sum, slide) => sum + (itemDurations.get(slide.id) || 0), 0);

    return {
      total,
      theory: theoryTotal,
      example: exampleTotal
    };
  }, [slides, itemDurations]);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            <span className="text-sm text-muted-foreground">자동 스크롤</span>
          </div>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>슬라이드 설정</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="offset" className="text-right">
                    시작 시간 조정
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="offset"
                      type="number"
                      step="0.1"
                      min="0"
                      max="10"
                      value={offsetMs / 1000}
                      onChange={handleOffsetChange}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">초 전부터 재생</span>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>총 {slides.length}개 항목</span>
            <span className="text-muted-foreground/50">|</span>
            <span title="전체 재생시간">⏱ {formatDuration(getTotalDurations.total)}</span>
            <span className="text-muted-foreground/50">|</span>
            <span title="이론 재생시간">📚 {formatDuration(getTotalDurations.theory)}</span>
            <span className="text-muted-foreground/50">|</span>
            <span title="예제 재생시간">🔬 {formatDuration(getTotalDurations.example)}</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={scrollToCurrentItem}
          className="gap-2"
        >
          <ArrowDown className="h-4 w-4" />
          현재 위치로
        </Button>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {slideGroups.map((group) => (
          <div
            key={group.id}
            className="space-y-2 rounded-md p-4 bg-muted"
          >
            <div className="text-lg font-bold flex items-center justify-between">
              <span>{group.category}</span>
              <span className="text-sm text-muted-foreground">
                ({formatDuration(getGroupDuration(group))})
              </span>
            </div>
            <div className="space-y-2">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  ref={(el) => setItemRef(item.id.toString(), el)}
                  className={cn(
                    "flex justify-between p-3 rounded-md cursor-pointer transition-all duration-300",
                    getCurrentItem?.id === item.id
                      ? "bg-secondary/20 border-l-4 border-secondary shadow-sm"
                      : "bg-muted/80 hover:bg-muted/60 border-l-4 border-transparent",
                    activeItem?.type === 'slide' && activeItem.id === item.id
                      ? "highlight"
                      : ""
                  )}
                  onClick={() => handleSlideClick(item)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-foreground font-medium">
                      {item.title}
                    </span>
                    {item.is_example && (
                      <span className="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 flex items-center gap-1 px-2 py-0.5 rounded-full">
                        <Beaker className="h-3.5 w-3.5" />
                        <span className="text-xs font-sans tracking-tight">예제</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getItemDuration(item) && (
                      <span className="text-sm text-muted-foreground">
                        ({formatDuration(getItemDuration(item)!)})
                      </span>
                    )}
                    <span className="text-muted-foreground min-w-[5rem] text-right">
                      {formatTime(item.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
} 