import { SlideRawItem, SubtitleRawGroup, SubtitleRawItem, SummaryRawGroup, TimestampRawItem } from "@/components/aif-c01/types";
import { decrypt } from "@/lib/crypto";
import { stringToTime } from "@/lib/utils";

declare global {
  interface Window {
    __INITIAL_DATA__: string;
  }
}

export const loadSubtitles = async () => {
  try {
    const encryptedData = window.__INITIAL_DATA__;
    const data = JSON.parse(decrypt(encryptedData));
    const subtitles = data.subtitles;
    return subtitles.map((group: SubtitleRawGroup) => ({
      ...group,
      items: group.items.map(item => ({
        ...item,
        startTimeValue: stringToTime(item.startTime),
        endTimeValue: stringToTime(item.endTime),
      }))
    }));
  } catch (error) {
    console.error('자막을 불러오는데 실패했습니다:', error);
    return [];
  }
};

export const loadSummaries = async () => {
  try {
    const encryptedData = window.__INITIAL_DATA__;
    const data = JSON.parse(decrypt(encryptedData));
    const summaries = data.summaries;
    return summaries.map((group: SummaryRawGroup) => ({
      ...group,
      startTimeValue: stringToTime(group.startTime),
      endTimeValue: stringToTime(group.endTime),
    }));
  } catch (error) {
    console.error('요약을 불러오는데 실패했습니다:', error);
    return [];
  }
};

export const loadTimestamps = async () => {
  try {
    const encryptedData = window.__INITIAL_DATA__;
    const data = JSON.parse(decrypt(encryptedData));
    const timestamps = data.timestamps;
    return timestamps.images.map((item: TimestampRawItem) => ({
      ...item,
      timeValue: stringToTime(item.time),
    }));
  } catch (error) {
    console.error('타임스탬프를 불러오는데 실패했습니다:', error);
    return [];
  }
};

export const loadSlides = async () => {
  try {
    const encryptedData = window.__INITIAL_DATA__;
    const data = JSON.parse(decrypt(encryptedData));
    const slides = data.slides;
    // 각 슬라이드에 id 추가
    return slides.map((slide: SlideRawItem, index: number) => ({
      ...slide,
      timestamp: slide.time,
      title: slide.subtitle,
      id: index + 1,  // 1부터 시작하는 id 부여
      timeValue: stringToTime(slide.time)
    }));
  } catch (error) {
    console.error('슬라이드를 불러오는데 실패했습니다:', error);
    return [];
  }
};