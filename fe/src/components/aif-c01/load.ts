import { SlideRawItem, SubtitleRawItem, SummaryRawGroup, TimestampRawItem } from "@/components/aif-c01/types";
import { stringToTime } from "../../lib/utils";

export const loadSubtitles = async () => {
    try {
      const response = await fetch('/data/aif-c01/subtitles.json');
      const data = await response.json();
      const subtitlesWithTimeValue = data.map((item: SubtitleRawItem) => ({
        ...item,
        startTimeValue: stringToTime(item.startTime),
        endTimeValue: stringToTime(item.endTime),
      }));
      return subtitlesWithTimeValue;
    } catch (error) {
      console.error('자막을 불러오는데 실패했습니다:', error);
    }
  };

export const loadSummaries = async () => {
    try {
      const response = await fetch('/data/aif-c01/summaries.json');
      const data = await response.json();
      const summariesWithTimeValue = data.map((group: SummaryRawGroup) => ({
        ...group,
        startTimeValue: stringToTime(group.startTime),
        endTimeValue: stringToTime(group.endTime),
      }));
      return summariesWithTimeValue;
    } catch (error) {
      console.error('요약을 불러오는데 실패했습니다:', error);
    }
  };

export const loadTimestamps = async () => {
    try {
      const response = await fetch('/data/aif-c01/timestamps.json');
      const data = await response.json();
      const timestampsWithTimeValue = data.images.map((item: TimestampRawItem) => ({
        ...item,
        timeValue: stringToTime(item.time),
      }));  
      return timestampsWithTimeValue;
    } catch (error) {
      console.error('타임스탬프를 불러오는데 실패했습니다:', error);
    }
  };

export const loadSlides = async () => {
    try {
      const response = await fetch('/data/aif-c01/slides.json');
      const data = await response.json();
      // 각 슬라이드에 id 추가
      const slidesWithId = data.map((slide: SlideRawItem, index: number) => ({
        ...slide,
        timestamp: slide.time,
        title: slide.subtitle,
        id: index + 1,  // 1부터 시작하는 id 부여
        timeValue: stringToTime(slide.time)
      }));
      return slidesWithId;
    } catch (error) {
      console.error('슬라이드를 불러오는데 실패했습니다:', error);
    }
  };