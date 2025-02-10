import { RefObject } from "react"
import { debug } from "@/lib/utils"

export interface Video {
  id: number
  videoId: string
  startTime: string
  endTime: string
  durationMs: number
  audio: string | null
}

export interface SubtitleRawItem {
  id: number;
  sequence: number;
  startTime: string;
  endTime: string;
  text: string;
}
export interface SubtitleRawGroup {
  id: number;
  timestamp: string;
  items:SubtitleRawItem[];
  sourceIndex: number;
}
export interface SubtitleItem {
  id: number;
  sequence: number;
  startTime: string;
  endTime: string;
  text: string;
  startTimeValue: number
  endTimeValue: number
}

export interface SubtitleGroup {
  id: number;
  timestamp: string;
  items: SubtitleItem[];
  sourceIndex: number;
}

export interface SummaryItem {
  id: number
  content: string
  shortcut: number
}

export interface SummaryRawGroup {
  id: number
  title: string
  startTime: string
  endTime: string
  items: SummaryItem[]
  sourceIndex: number
}
export interface SummaryGroup {
  id: number
  title: string
  startTime: string
  endTime: string
  startTimeValue: number
  endTimeValue: number
  items: SummaryItem[]
  sourceIndex: number
}

export interface TimestampRawItem {
  id: number;
  time: string;
}
export interface TimestampItem {
  id: number;
  time: string;
  timeValue: number;
}

export interface SlideRawItem {
  id: number;
  time: string;
  subtitle: string;
  category: string;
  is_example: boolean;
}
export interface SlideItem {
  id: number;
  timestamp: string;
  timeValue: number;
  title: string;
  category: string;
  is_example: boolean;
}

export interface SlideGroup {
  id: number;
  category: string;
  items: SlideItem[];
}

export interface SubtitleListProps {
  subtitleGroups: SubtitleGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number | null, type: string, options?: { sourceIndex?: number; sequence?: number; }) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  isManualScrolling: boolean;
  skipMountScroll: boolean;
}

export interface SummaryListProps {
  summaryGroups: SummaryGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number|null, type: string, options?: {
    sourceIndex: number;
    sequence?: number;
    shortcut?: number;
  }) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  updateFlag: { flag: number; groupId: string | number };
}
export interface TimestampListProps {
  timestamps: TimestampItem[];
  currentTimeMs: number;
  onTimeSelect: (time: number | null, type:string, data?: any) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
}

export interface SlideListProps {
  slides: SlideItem[];
  currentTimeMs: number;
  onTimeSelect: (time: number | null, type: string) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
}
export enum ScrollTrigger {
  LIST_SELECTION = 'LIST_SELECTION',      // 리스트에서 직접 선택
  SHORTCUT = 'SHORTCUT',                  // 바로가기 링크로 선택
  VIDEO_SEEK = 'VIDEO_SEEK',              // 비디오 시간 변경
  AUTO_SCROLL = 'AUTO_SCROLL',             // 자동 스크롤,              // 비디오 시간 변경
  AFTER_MOUNT = 'AFTER_MOUNT'  
}
