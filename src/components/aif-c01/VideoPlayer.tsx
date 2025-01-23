import React, { useState, useEffect } from 'react';

const VideoPlayer = () => {
  const videos = [
    { 
      id: 1, 
      url: "VIDEO_URL_1", 
      startTime: "00:00:00.000", 
      endTime: "03:58:19.322",
      durationMs: 14289321
    },
    // ... other videos
  ];

  const totalDurationMs = videos.reduce((total, video) => total + video.durationMs, 0);

  const subtitles = [
    {
      id: 1,
      startTime: "00:00:00.000",
      endTime: "00:00:03.500",
      text: [
        "안녕하세요",
        "오늘은 리액트 강의를 시작하겠습니다"
      ],
      videoId: 1
    },
    // ... other subtitles
  ];

  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  
  // 현재 시간을 문자열로 변환하는 함수
  const timeToString = (ms: number) => {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    const milliseconds = ms % 1000;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
  };

  // 문자열 시간을 밀리초로 변환하는 함수
  const stringToTime = (timeStr: { split: (arg0: string) => [any, any]; }) => {
    const [time, ms] = timeStr.split('.');
    const [hours, minutes, seconds] = time.split(':');
    return (
      parseInt(hours) * 3600000 +
      parseInt(minutes) * 60000 +
      parseInt(seconds) * 1000 +
      parseInt(ms)
    );
  };

  // 현재 시간에 해당하는 자막인지 확인하는 함수
  const isCurrentSubtitle = (subtitle: { id?: number; startTime: any; endTime: any; text?: string[]; videoId?: number; }) => {
    const startMs = stringToTime(subtitle.startTime);
    const endMs = stringToTime(subtitle.endTime);
    return currentTimeMs >= startMs && currentTimeMs < endMs;
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6">
      <div className="space-y-4">
        {/* Video Player */}
        <div className="aspect-video bg-gray-100">
          <iframe
            className="w-full h-full"
            src={`${videos[currentVideoIndex].url}?autoplay=1&enablejsapi=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Timeline */}
        <div className="relative mb-12">
          <div 
            className="h-4 bg-gray-200 rounded cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              setCurrentTimeMs(percent * totalDurationMs);
            }}
          >
            <div 
              className="h-full bg-blue-500 rounded"
              style={{ width: `${(currentTimeMs / totalDurationMs) * 100}%` }}
            />
          </div>

          {/* Video segment markers */}
          <div className="absolute bottom-0 w-full">
            {videos.map((video, index) => {
              const startPercent = (index / videos.length) * 100;
              return (
                <button
                  key={video.id}
                  className="absolute px-2 py-1 -bottom-8 transform -translate-x-1/2 bg-blue-500 text-white rounded text-xs"
                  style={{ left: `${startPercent}%` }}
                  onClick={() => setCurrentVideoIndex(index)}
                >
                  {video.startTime.split('.')[0]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Subtitles */}
        <div className="mt-6 space-y-2 max-h-96 overflow-y-auto">
          {subtitles.map((subtitle) => (
            <div
              key={subtitle.id}
              className={`p-3 rounded transition-colors ${
                isCurrentSubtitle(subtitle)
                  ? "bg-blue-100 border-l-4 border-blue-500"
                  : "bg-gray-50"
              }`}
            >
              <div className="text-sm text-gray-500 mb-1">
                {subtitle.startTime} → {subtitle.endTime}
              </div>
              {subtitle.text.map((line, index) => (
                <p key={index} className="text-gray-900">
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;