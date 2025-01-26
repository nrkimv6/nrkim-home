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
  timestamp: string;
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

export interface TimestampItem {
  id: number;
  time: string;
}


export interface SubtitleListProps {
  subtitleGroups: SubtitleGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number | null, type: 'subtitle' | 'summary' | 'timestamp', options?: { sourceIndex?: number; sequence?: number; }) => void;
  autoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
  isManualScrolling: boolean;
  skipMountScroll: boolean;
}

export interface SummaryListProps {
  summaryGroups: SummaryGroup[];
  currentTimeMs: number;
  onTimeSelect: (time: number|null, type: 'subtitle' | 'summary' | 'timestamp', options?: {
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
  onTimeSelect: (time: number | null, type: 'subtitle' | 'summary' | 'timestamp', data?: any) => void;
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


export const getSubtitle = (subtitleGroups:SubtitleGroup[], sourceIndex:number, sequence:number)=>{
  for (const group of subtitleGroups) {
    if (group.sourceIndex === sourceIndex) {
      const item = group.items.find(item => item.sequence === sequence);
      if (item) {
        console.debug(`sourceIndex: ${sourceIndex}, sequence:${sequence}, item: ${item?.id}`)
        return item;
      }
    }
  }
  return undefined;
}

export const getSubtitleAndGroupById = (subtitleGroups:SubtitleGroup[], id:number)=>{
  for (const group of subtitleGroups) {
    const item = group.items.find(item => item.id === id);
    if (item) return { item, group };
  }
  return undefined;
}


export const getTargetkeyById = (subtitleGroups:SubtitleGroup[], id:number)=>{
  const result = getSubtitleAndGroupById(subtitleGroups, id);
  if(!result) return null;
  const { item, group } = result;

  if( item && group){
    return `${group.sourceIndex}-${item.sequence}`;
  }
  return null;
}


export const getSummary = (summaryGroups:SummaryGroup[], id:number)=>{
  for (const group of summaryGroups) {
      const item = group.items.find(item => item.id === id);
      if (item) return item;
  }
  return undefined;
}


export const getSummaryByGroup = (summaryGroups:SummaryGroup[], group_id:number)=>{
  const group =  summaryGroups.find(group => group.id === group_id);
  if(!group || group.items.length === 0) return undefined;
  return group.items[0];
}


