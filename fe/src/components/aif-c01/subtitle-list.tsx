import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { useItemsRefSync, useSync } from "./sync-context";
import { SubtitleGroup, SubtitleItem, SubtitleListProps } from "./types";
import { useEffect, useRef, useMemo, useState, forwardRef, ForwardedRef } from "react";
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"
import { ScrollTrigger } from "./types"
import { debug, getSubtitle, getTargetkeyById, stringToTime, getSummary, getSummaryByGroup } from "@/lib/utils"

export function SubtitleList({
  subtitleGroups,
  currentTimeMs,
  onTimeSelect,
  autoScroll,
  setAutoScroll,
  isManualScrolling,
  skipMountScroll
}: SubtitleListProps) {
  const {pendingScroll, activeItem} = useSync();
  const { setItemRef, getItemRef } = useItemsRefSync('subtitle');
  const [targetItem, setTargetItem] = useState<{ id: number, key?: string, trigger: ScrollTrigger } | null>(null);
  // const [targetItem, setTargetItem] = useState<number | null>(null);
  const isInitialScrollCompleteRef = useRef<boolean>(false);

  // const memoizedTargetKey = useMemo(() => targetKey, [targetKey?.key, targetKey?.trigger]);
  const memoizedTargetItem = useMemo(() => targetItem, [targetItem?.id, targetItem?.key, targetItem?.trigger]);

  // 현재 시간에 해당하는 자막 항목들을 찾는 함수
  const getCurrentItems = useMemo(() => {
    const currentItems: SubtitleItem[] = [];
    subtitleGroups.forEach(group => {
      group.items.forEach(item => {
        if (currentTimeMs >= item.startTimeValue &&
          currentTimeMs < item.endTimeValue) {
          currentItems.push(item);
        }
      });
    });
    return currentItems;
  }, [currentTimeMs, subtitleGroups]);

  const getSubtitleItem = (targetKey: string) => {
    const [sourceIndex, sequence] = targetKey.split('-');
    return getSubtitle(subtitleGroups, parseInt(sourceIndex), parseInt(sequence));
  }

  // 스크롤 실행
  useEffect(() => {
    if (memoizedTargetItem?.id) {
      const targetKey = memoizedTargetItem.key || getTargetkey(memoizedTargetItem.id);

      if (!targetKey) {
        console.error(`targetKey is null, id: ${memoizedTargetItem?.id}`);
        return;
      }

      const targetElement = getItemRef(targetKey);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        debug(`targetKey: ${targetKey}, id: ${memoizedTargetItem?.id}, trigger: ${memoizedTargetItem.trigger}, currentTimeMs: ${currentTimeMs}`);

        if (memoizedTargetItem.trigger === ScrollTrigger.AFTER_MOUNT) {
          isInitialScrollCompleteRef.current = true;
        }
      }
    }
  }, [memoizedTargetItem]);

  // useEffect(()=>{},[targetKey]);

  // const setTargetKey = (key: string, trigger: ScrollTrigger) => {
  //   const item = getSubtitleItem(key);
  //   if (item?.id) {
  //     setTargetItem({ id: item?.id, key, trigger });
  //   }
  //   else {
  //     console.error(`targetKey: ${key}, trigger: ${trigger}, item: ${item?.id}`);
  //     setTargetItem({ id: item?.id || 0, key, trigger });
  //   }
  // }

  // 자동 스크롤
  useEffect(() => {
    if (!autoScroll || isManualScrolling || !isInitialScrollCompleteRef.current) return;

    const currentItems = getCurrentItems;
    if (currentItems.length > 0) {
      const firstItem = currentItems[0];
      const group = subtitleGroups.find(g =>
        g.items.some(item => item.id === firstItem.id)
      );
      if (group) {
        // debug(`Autoscroll - firstItem: ${firstItem.id}`);
        setTargetItem({
          id: firstItem.id,
          trigger: ScrollTrigger.AUTO_SCROLL
        }
        );
      }
    }
  }, [currentTimeMs, autoScroll, isManualScrolling]);

  // // 마운트 시 스크롤
  // useEffect(() => {
  //   if (skipMountScroll) return;

  //   if (pendingScroll?.sourceIndex && pendingScroll?.sequence) {
  //     debug(`Mount with scroll - sourceIndex: ${pendingScroll.sourceIndex}, sequence: ${pendingScroll.sequence}`);

  //     setTargetKey(`${pendingScroll.sourceIndex}-${pendingScroll.sequence}`,ScrollTrigger.AFTER_MOUNT);
  //   } else {
  //     // pendingScroll이 없는 경우 현재 시간 기준으로 스크롤
  //     const currentItems = getCurrentItems;
  //     if (currentItems.length > 0) {
  //       const firstItem = currentItems[0];
  //       const group = subtitleGroups.find(g =>
  //         g.items.some(item => item.sequence === firstItem.sequence)
  //       );
  //       if (group) {
  //         debug(`Mount with scroll and no pending- firstItem: ${firstItem.id}`);
  //         setTargetItem({ id: firstItem.id, trigger: ScrollTrigger.AFTER_MOUNT });
  //       }
  //     }
  //   }
  // }, []); // 빈 의존성 배열로 마운트 시 1번만 실행


    // 마운트 시 스크롤
    useEffect(() => {
      if (skipMountScroll) return;
  
      if (pendingScroll?.targetId) {

        debug(`Mount with scroll - targetId: ${pendingScroll.targetId}`);
        setTargetItem({ id: pendingScroll?.targetId, trigger: ScrollTrigger.AFTER_MOUNT });
  
        // setTargetKey(`${pendingScroll.sourceIndex}-${pendingScroll.sequence}`,ScrollTrigger.AFTER_MOUNT);
      } else {
        // pendingScroll이 없는 경우 현재 시간 기준으로 스크롤
        const currentItems = getCurrentItems;
        if (currentItems.length > 0) {
          const firstItem = currentItems[0];
          const group = subtitleGroups.find(g =>
            g.items.some(item => item.sequence === firstItem.sequence)
          );
          if (group) {
            debug(`Mount with scroll and no pending- firstItem: ${firstItem.id}`);
            setTargetItem({ id: firstItem.id, trigger: ScrollTrigger.AFTER_MOUNT });
          }
        }
      }
    }, []); // 빈 의존성 배열로 마운트 시 1번만 실행
  

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
        g.items.some(item => item.id === firstItem.id)
      );
      if (group) {
        const key = `${group.sourceIndex}-${firstItem.sequence}`;
        // setTargetKey(key, trigger );
        debug(`List selection - firstItem: ${firstItem.id}`);
        setTargetItem({ id: firstItem.id, trigger });
      }
    }
  };

  const getTargetkey = (id: number) => {
    return getTargetkeyById(subtitleGroups, id);
  }

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
                currentTimeMs >= item.startTimeValue &&
                currentTimeMs < item.endTimeValue
              ) ? "bg-secondary/20 border-l-4 border-secondary shadow-sm" : "bg-muted border-l-4 border-transparent"
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">
              {group.timestamp}
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
                    currentTimeMs >= subtitle.startTimeValue &&
                      currentTimeMs < subtitle.endTimeValue
                      ? "bg-primary/10 border-l-2 border-primary font-medium scale-[1.02]"
                      : ""
                  )}
                  onClick={() => onTimeSelect(subtitle.startTimeValue, 'subtitle', {
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
