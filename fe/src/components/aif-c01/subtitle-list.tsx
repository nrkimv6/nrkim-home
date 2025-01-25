import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

export function SubtitleList({
  subtitleGroups,
  currentTimeMs,
  stringToTime,
  onTimeSelect,
  autoScroll,
  setAutoScroll
}: SubtitleListProps) {
  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <Switch
          checked={autoScroll}
          onCheckedChange={setAutoScroll}
        />
        <span className="text-sm text-muted-foreground">자동 스크롤</span>
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {subtitleGroups.map((group: SubtitleGroup) => (
          <div
            key={group.id}
            className={cn(
              "space-y-2 rounded-md p-4 transition-all duration-300",
              group.items.some((item: SubtitleItem) =>
                currentTimeMs >= stringToTime(item.startTime) &&
                currentTimeMs < stringToTime(item.endTime)
              ) ? "bg-secondary/20 border-l-4 border-secondary shadow-sm" : "bg-muted border-l-4 border-transparent"
            )}
          >
            <div className="text-sm font-medium text-muted-foreground">
              {group.groupTimestamp}
            </div>
            <div className="space-y-1">
              {group.items.map((subtitle: SubtitleItem) => (
                <div
                  data-subtitle-id={subtitle.id}
                  key={subtitle.id}
                  className={cn(
                    "flex gap-4 p-2 rounded transition-all duration-300 hover:bg-muted/50 cursor-pointer",
                    currentTimeMs >= stringToTime(subtitle.startTime) &&
                      currentTimeMs < stringToTime(subtitle.endTime)
                      ? "bg-primary/10 border-l-2 border-primary font-medium scale-[1.02]"
                      : ""
                  )}
                  onClick={() => {onTimeSelect(stringToTime(subtitle.startTime))}}
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
  )
}