import { SubtitleGroup, SummaryGroup } from "@/components/aif-c01/types";
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};


export const stringToTime = (timeStr: string): number => {
  if(!timeStr || timeStr === undefined ) return 0;
  // "hh:mm:ss.millisec" 형식 파싱
  const [timepart, millisecpart = "0"] = timeStr.split(".");
  // debug(`timepart: ${timepart}, millisecpart: ${millisecpart}`);
  const [hours, minutes, seconds] = timepart.split(":").map(Number);
  const milliseconds = Number(millisecpart.padEnd(3, "0")); // 밀리초가 3자리가 되도록 패딩

  // debug(`stringToTime: ${timeStr}, hours: ${hours}, minutes: ${minutes}, seconds: ${seconds}, milliseconds: ${milliseconds}`);
  // debug(`result: ${ (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds}`);
  
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
}

export const getSubtitle = (subtitleGroups:SubtitleGroup[], sourceIndex:number, sequence:number)=>{
  for (const group of subtitleGroups) {
    if (group.sourceIndex === sourceIndex) {
      const item = group.items.find(item => item.sequence === sequence);
      if (item) {
        if (process.env.NODE_ENV === 'development') {
          debug(`sourceIndex: ${sourceIndex}, sequence:${sequence}, item: ${item?.id}`);
        }
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

export const getSummaryGroup= (summaryGroups:SummaryGroup[], id:number)=>{
  return summaryGroups.find(item => item.id === id);
}


export const getSummaryByGroup = (summaryGroups:SummaryGroup[], group_id:number)=>{
  const group =  summaryGroups.find(group => group.id === group_id);
  if(!group || group.items.length === 0) return undefined;
  return group.items[0];
}


