import { cn } from "@/lib/utils"
import { useItemsRefSync, useSync } from "./sync-context";
import { stringToTime, ScrollTrigger, TimestampListProps, TimestampItem } from "./types";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { Switch } from "@/components/ui/switch"

export function TimestampList({
  timestamps,
  currentTimeMs,
  onTimeSelect,
  autoScroll,
  setAutoScroll,
}: TimestampListProps) {
  const { activeItem } = useSync();
  const { setItemRef, getItemRef } = useItemsRefSync('timestamp');
  const [isManualScrolling, setIsManualScrolling] = useState(false);

  console.log();

  // 현재 시간에 해당하는 타임스탬프 찾기
  const getCurrentItem = useMemo(() => {
    let currentItem = null;
    for (let i = 0; i < timestamps.length; i++) {
      const currentTime = stringToTime(timestamps[i].time);
      const nextTime = i < timestamps.length - 1 ? stringToTime(timestamps[i + 1].time) : Infinity;
      
      if (currentTimeMs >= currentTime && currentTimeMs < nextTime) {
        currentItem = timestamps[i];
        break;
      }
    }
    return currentItem;
  }, [currentTimeMs, timestamps]);

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

  const handleTimestampClick = (item: TimestampItem) => {
    setIsManualScrolling(true);
    onTimeSelect(stringToTime(item.time), 'timestamp');
    setTimeout(() => setIsManualScrolling(false), 1000);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            <span className="text-sm text-muted-foreground">자동 스크롤</span>
          </div>
          <span className="text-sm text-muted-foreground">
            총 {timestamps.length}개 항목
          </span>
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
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {timestamps.map((item) => (
          <div
            key={item.id}
            ref={(el) => setItemRef(item.id.toString(), el)}
            className={cn(
              "flex justify-between p-3 rounded-md cursor-pointer transition-all duration-300",
              getCurrentItem?.id === item.id
                ? "bg-secondary/20 border-l-4 border-secondary shadow-sm"
                : "bg-muted hover:bg-muted/80 border-l-4 border-transparent",
              activeItem?.type === 'timestamp' && activeItem.id === item.id
                ? "highlight"
                : ""
            )}
            onClick={() => handleTimestampClick(item)}
          >
            <span className="text-muted-foreground min-w-[3rem]">
              #{item.id}
            </span>
            <span className="text-foreground font-medium">
              {item.time}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}