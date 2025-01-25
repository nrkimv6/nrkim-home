import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'


export function SummaryList({
  summaryGroups,
  currentTimeMs,
  stringToTime,
  onTimeSelectforSummary,
  autoScroll,
  setAutoScroll
}: SummaryListProps) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {summaryGroups.map((group: SummaryGroup) => (
        <div
          key={group.id}
          className={cn(
            "space-y-2 rounded-md p-4 transition-all duration-300",
            currentTimeMs >= stringToTime(group.startTime) &&
            currentTimeMs < stringToTime(group.endTime)
              ? "bg-secondary/20 border-l-4 border-secondary shadow-sm"
              : "bg-muted border-l-4 border-transparent"
          )}
        >
          <div className="text-sm font-medium text-muted-foreground">
            {group.title}
          </div>
          <div className="space-y-1">
            {group.items.map((summary: SummaryItem) => (
              <div
                key={summary.id}
                className={cn(
                  "flex gap-2 p-2 rounded transition-all duration-300 hover:bg-muted/50 cursor-pointer items-start",
                )}
                onClick={() => {
                  onTimeSelectforSummary(
                    stringToTime(group.startTime),
                    group.sourceIndex,
                    summary.shortcut
                  )
                }}
              >
                <span className="text-muted-foreground mt-1">•</span>
                <ReactMarkdown className="text-foreground flex-1">
                  {summary.content}
                </ReactMarkdown>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}