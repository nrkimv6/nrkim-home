
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

  interface SubtitleListProps {
    subtitleGroups: SubtitleGroup[];
    currentTimeMs: number;
    stringToTime: (timeStr: string) => number;
    onTimeSelect: (time: number) => void;
    autoScroll: boolean;
    setAutoScroll: (value: boolean) => void;
   }

   
interface SummaryItem {
  id: number
  content: string
  shortcut: number
}

interface SummaryGroup {
  id: number
  title: string
  startTime: string
  endTime: string
  items: SummaryItem[]
  sourceIndex: number
}

interface SummaryListProps {
  summaryGroups: SummaryGroup[]
  currentTimeMs: number
  stringToTime: (time: string) => number
  onTimeSelectforSummary: (time: number, sourceIndex: number, shortcutId: number) => void
  autoScroll: boolean
  setAutoScroll: (value: boolean) => void
}