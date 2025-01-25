import { RefObject } from "react"

export interface Video {
  id: number
  videoId: string
  startTime: string
  endTime: string
  durationMs: number
  audio: string | null
}

export interface SubtitleItem {
  id: number;
  sequence: number;
  startTime: string;
  endTime: string;
  text: string;
}

export interface SubtitleGroup {
  id: number;
  groupTimestamp: string;
  items: SubtitleItem[];
  sourceIndex: number;
}

export interface SummaryItem {
  id: number
  content: string
  shortcut: number
}

export interface SummaryGroup {
  id: number
  title: string
  startTime: string
  endTime: string
  items: SummaryItem[]
  sourceIndex: number
}

export interface SubtitleListProps {
  subtitleGroups: SubtitleGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number|null, type: 'subtitle' | 'summary', options?: {
    sourceIndex: number;
    sequence?: number;
    shortcut?: number;
  }) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
 }
 
 export  interface SummaryListProps {
  summaryGroups: SummaryGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number|null, type: 'subtitle' | 'summary', options?: {
    sourceIndex: number;
    sequence?: number;
    shortcut?: number;
  }) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
 }
 

export const stringToTime = (timeStr: string): number => {
  const [hours, minutes, seconds] = timeStr.split(":").map(Number)
  return (hours * 3600 + minutes * 60 + seconds) * 1000
}

export enum ScrollTrigger {
  LIST_SELECTION = 'LIST_SELECTION',      // 리스트에서 직접 선택
  SHORTCUT = 'SHORTCUT',                  // 바로가기 링크로 선택
  VIDEO_SEEK = 'VIDEO_SEEK',              // 비디오 시간 변경
  AUTO_SCROLL = 'AUTO_SCROLL',             // 자동 스크롤,              // 비디오 시간 변경
  AFTER_MOUNT = 'AFTER_MOUNT'  
}