import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { useScrollSync, useSync } from "./sync-context";
import { stringToTime, SubtitleGroup, SubtitleItem, SubtitleListProps } from "./types";
import { useEffect, useRef, useMemo, useState } from "react";
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { ScrollTrigger } from "./types"

export function SubtitleList({
  subtitleGroups,
  currentTimeMs,
  onTimeSelect,
  autoScroll,
  setAutoScroll,
  isManualScrolling,
}: SubtitleListProps & { isManualScrolling: boolean }) {
  const { activeItem } = useSync();
  const { setItemRef, itemRefs, getItemRef } = useScrollSync('subtitle');
  const [targetKey, setTargetKey] = useState<{ key: string, trigger: ScrollTrigger } | null>(null);
  const [mount, setMount] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // 현재 시간에 해당하는 자막 항목들을 찾는 함수
  const getCurrentItems = useMemo(() => {
    const currentItems: SubtitleItem[] = [];
    subtitleGroups.forEach(group => {
      group.items.forEach(item => {
        if (currentTimeMs >= stringToTime(item.startTime) &&
          currentTimeMs < stringToTime(item.endTime)) {
          currentItems.push(item);
        }
      });
    });
    return currentItems;
  }, [currentTimeMs, subtitleGroups]);

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || isManualScrolling || !mount || !initialized) return;

    const currentItems = getCurrentItems;
    if (currentItems.length > 0) {
      const firstItem = currentItems[0];
      const group = subtitleGroups.find(g =>
        g.items.some(item => item.sequence === firstItem.sequence)
      );
      if (group) {
        const key = `${group.sourceIndex}-${firstItem.sequence}`;
        setTargetKey({ key, trigger: ScrollTrigger.AUTO_SCROLL });
      }
    }
  }, [currentTimeMs, autoScroll, getCurrentItems, subtitleGroups, isManualScrolling, mount, initialized]);

  useEffect(() => {
    if (targetKey && itemRefs.current) {
      const targetElement = getItemRef(targetKey.key);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.debug(`targetKey: ${targetKey.key}, id:${targetElement.id} trigger: ${targetKey.trigger}`)
      }
      else {
        console.debug(`targetKey: ${targetKey?.key} not found`)

      }
    }
  }, [targetKey]);

  const totalItems = useMemo(() =>
    subtitleGroups.reduce((acc, group) => acc + group.items.length, 0)
    , [subtitleGroups]);

  // 수동 스크롤 (현재 위치로 버튼)
  const scrollToCurrentItem = (_e?: React.MouseEvent<HTMLButtonElement>,
    trigger: ScrollTrigger = ScrollTrigger.LIST_SELECTION) => {
    const currentItems = getCurrentItems;
    if (currentItems.length > 0) {
      const firstItem = currentItems[0];
      const group = subtitleGroups.find(g =>
        g.items.some(item => item.sequence === firstItem.sequence)
      );
      if (group) {
        const key = `${group.sourceIndex}-${firstItem.sequence}`;
        setTargetKey({ key, trigger: trigger });
      }
    }
  };

  // 컴포넌트 마운트 또는 탭 전환 시 현재 항목으로 스크롤
  useEffect(() => {
    scrollToCurrentItem(undefined, ScrollTrigger.AFTER_MOUNT);
    setMount(true);
    setTimeout(() => {
      setInitialized(true);
    }, 1000);
  }, []);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoScroll} onCheckedChange={setAutoScroll} />
            <span className="text-sm text-muted-foreground">자동 스크롤</span>
          </div>
          <span className="text-sm text-muted-foreground">
            총 {totalItems}개 항목
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
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {subtitleGroups.map((group) => (
          <div
            key={group.id}
            className={cn(
              "space-y-2 rounded-md p-4 transition-all duration-300",
              group.items.some((item) =>
                currentTimeMs >= stringToTime(item.startTime) &&
                currentTimeMs < stringToTime(item.endTime)
              ) ? "bg-secondary/20 border-l-4 border-secondary shadow-sm" : "bg-muted border-l-4 border-transparent"
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">
              {group.groupTimestamp}
            </div>
            <div className="space-y-1">
              {group.items.map((subtitle) => (
                <div
                  key={subtitle.id}
                  id={`subtitle-${subtitle.id}`}
                  ref={(el) => setItemRef(`${group.sourceIndex}-${subtitle.sequence}`, el)}
                  className={cn(
                    "flex gap-4 p-2 rounded transition-all duration-300 hover:bg-muted/50 cursor-pointer",
                    activeItem?.type === 'subtitle' && activeItem.id === subtitle.id ? "highlight" : "",
                    currentTimeMs >= stringToTime(subtitle.startTime) &&
                      currentTimeMs < stringToTime(subtitle.endTime)
                      ? "bg-primary/10 border-l-2 border-primary font-medium scale-[1.02]"
                      : ""
                  )}
                  onClick={() => onTimeSelect(stringToTime(subtitle.startTime), 'subtitle', {
                    sourceIndex: group.sourceIndex,
                    sequence: subtitle.sequence
                  })}
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
    </>
  );
}
