import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import { useItemsRefSync, useSync } from "./sync-context";
import { Switch } from "../ui/switch";
import { getSummary, getSummaryByGroup, ScrollTrigger, stringToTime, SummaryGroup, SummaryItem, SummaryListProps } from "./types";
import { useEffect, useMemo, useState } from "react";
import { Link } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"


export function SummaryList({
  summaryGroups,
  currentTimeMs,
  onTimeSelect,
  autoScroll,
  setAutoScroll
 }: SummaryListProps) {
  const { setActiveItem, activeItem } = useSync();

  const { setItemRef, getItemRef, getTypeRefs } = useItemsRefSync('summary');
  const [ targetGroups, setTargetGroups] = useState<number[]>([]);
  const [currentVisibleGroup, setCurrentVisibleGroup] = useState<number | null>(null);
  const [scrollKey, setScrollKey] = useState<number | null>(null);
  const itemRefs = getTypeRefs('summary');
  const [isManualScrolling, setIsManualScrolling] = useState(false);
  const [targetTime, setTargetTime] = useState<number | null>(null);

  // 현재 시간에 해당하는 요약 그룹들을 찾는 함수
  const getCurrentItems = useMemo(() => {
    return summaryGroups.filter(group => 
      currentTimeMs >= stringToTime(group.startTime) &&
      currentTimeMs < stringToTime(group.endTime)
    );
  }, [currentTimeMs, summaryGroups]);

  useEffect(() => {
    if(!activeItem || activeItem.type != 'summary'){
      const currentItems = getCurrentItems;
      if (currentItems.length > 0) {
        const targetGroup = getItemRef(currentItems[0].id.toString());
        const summary =getSummaryByGroup(summaryGroups, currentItems[0].id);
        if(summary){
          setActiveItem({
            type: 'summary',
            id: summary?.id,
            time: null
          });
          console.debug(`setScrollKey by mount: ${currentItems[0].id}, targetElement: ${currentItems[0].id} and ${summary?.id}`);
          setScrollKey(currentItems[0].id);
        }
      }
      }
      else{
        scrollToCurrentItem();
        console.debug(`scroll to currenItem by mount: ${activeItem.id}`);
      }
  }, []);

  // 현재 화면에 보이는 그룹을 추적하는 observer 설정 --> 정상적인 동작 안할거 같음
  useEffect(() => {
    const itemRefs = getTypeRefs('summary');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // ref에서 직접 key를 찾습니다
            const foundKey = Array.from(itemRefs.entries() || [])
              .find(([_, element]) => element === entry.target)?.[0];
            if (foundKey) {
              setCurrentVisibleGroup(Number(foundKey));
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    itemRefs?.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [itemRefs]);

  // currentTimeMs 변경에 따른 스크롤 처리
  useEffect(() => {
    if (!autoScroll || isManualScrolling) return;

    const currentItems = getCurrentItems;
    if (currentItems.length > 0) {
      const newTargetGroups = currentItems.map(group => group.id);
      
      if (currentVisibleGroup && newTargetGroups.includes(currentVisibleGroup)) {
        return;
      }
      
      setTargetGroups(newTargetGroups);
    }
  }, [currentTimeMs, autoScroll, getCurrentItems, currentVisibleGroup, isManualScrolling]);

  useEffect(() => {
    if (targetGroups.length > 0 && itemRefs) {
      const targetElement = getItemRef(targetGroups[0].toString());
      if (targetElement) {
        console.debug(`setScrollKey by targetGroups[0]: ${targetGroups[0]}`);
        setScrollKey(targetGroups[0]);
      }
    }
  }, [targetGroups]);

  useEffect(() => {
    console.debug(`scrollKey: ${scrollKey}`);
    if( scrollKey ){
      const targetElement = getItemRef(scrollKey.toString());
      if (targetElement) {
        // console.debug(`scrollKey: ${scrollKey}, targetElement: ${targetElement}`);
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [scrollKey]);

  useEffect(() => {
    console.debug(`summary-list: ${activeItem?.type}, ${activeItem?.id}, ${activeItem?.time}`)
  }, [activeItem])
 
  const handleShortcutClick = (group: SummaryGroup, summary: SummaryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    onTimeSelect(null, 'summary', {
      sourceIndex: group.sourceIndex,
      sequence: summary.shortcut
    });
  };

  const totalItems = useMemo(() => 
    summaryGroups.reduce((acc, group) => acc + group.items.length, 0)
  , [summaryGroups]);

  const scrollToCurrentItem = (_e?: React.MouseEvent<HTMLButtonElement>) => {
    const currentItems = getCurrentItems;
    if (currentItems.length > 0) {
      const targetGroup = getItemRef(currentItems[0].id.toString());
      if (targetGroup) {
        targetGroup.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // currentTimeMs가 targetTime과 일치하면 수동 스크롤 상태 해제
  useEffect(() => {
    if (targetTime !== null && Math.abs(currentTimeMs - targetTime) < 100) { // 100ms 오차 허용
      setTargetTime(null);
      setIsManualScrolling(false);
    }
  }, [currentTimeMs, targetTime]);

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
        {summaryGroups.map((group) => (
          <div
            key={group.id}
            ref={(el) => setItemRef(`${group.id}`, el)}
            className={cn(
              "space-y-2 rounded-md p-4 transition-all duration-300",
              currentTimeMs >= stringToTime(group.startTime) &&
              currentTimeMs < stringToTime(group.endTime)
                ? "bg-secondary/20 border-l-4 border-secondary shadow-sm" : "bg-muted border-l-4 border-transparent"
            )}
            onClick={() => {
              const summary = getSummaryByGroup(summaryGroups, group.id);
              if (summary) {
                const newTime = stringToTime(group.startTime);
                setTargetTime(newTime);
                setIsManualScrolling(true);
                setActiveItem({
                  type: 'summary',
                  id: summary.id,
                  time: null
                });
                onTimeSelect(newTime, 'summary');
              }
            }}
          >
            <div className={cn(
              "cursor-pointer hover:text-primary transition-colors flex justify-between items-center",
              /\d+\.\d+/.test(group.title) ? "text-lg font-semibold" : "text-xl font-bold"
            )}>
              <span>{group.title}</span>
              <span className="text-sm text-muted-foreground">
                {group.startTime}
              </span>
            </div>
            <div className="space-y-1">
              {group.items.map((summary) => (
                <div
                  key={summary.id}
                  
                  className={
                    cn("flex gap-2 p-2 rounded transition-all duration-300 hover:bg-muted/50 items-start",
                    activeItem?.type === 'summary' && activeItem.id === summary.id ? "highlight" : "",
                  )}
                >
                  <span className="text-muted-foreground mt-1">•</span>
                  <div className="flex-1 flex items-center gap-2">
                    <ReactMarkdown className="text-foreground inline flex-1">
                      {summary.content}
                    </ReactMarkdown>
                    <button
                      onClick={(e) => handleShortcutClick(group, summary, e)}
                      className="text-primary hover:text-primary/80 transition-colors"
                      title={`바로가기 #${summary.shortcut}`}
                    >
                      <Link className="h-4 w-4" />
                    </button>
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