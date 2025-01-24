import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Button,
  Card,
  CardContent,
} from '@mui/material';

const Player = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [activeTab, setActiveTab] = useState('video');
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [currentImage, setCurrentImage] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const videos = [
    { 
      id: 1, 
      url: "VIDEO_URL_1", 
      startTime: "00:00:00.000", 
      endTime: "03:58:19.322",
      durationMs: 14289321,
      audio: "AUDIO_URL_1"
    },
    // ... other videos
  ];

  const totalDurationMs = videos.reduce((acc, video) => acc + video.durationMs, 0);

  const subtitles = [
    {
      id: 1,
      startTime: "00:00:00.000",
      endTime: "00:00:05.000",
      text: ["첫 번째 자막입니다."]
    },
    // ... 더 많은 자막 데이터
  ];

  // stringToTime 함수도 필요합니다
  const stringToTime = (timeStr: string): number => {
    const [hours, minutes, seconds] = timeStr.split(':').map(Number);
    return (hours * 3600 + minutes * 60 + seconds) * 1000;
  };

  // 시간을 기반으로 이미지 파일명 생성
  const getImageFilename = (timeMs: number) => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `slide_${String(totalSeconds).padStart(4, '0')}_${String(hours).padStart(2, '0')}-${String(minutes).padStart(2, '0')}-${String(seconds).padStart(2, '0')}.png`;
  };

  // 오디오 재생 제어
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, currentVideoIndex]);

  // 시간 업데이트 핸들러
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const newTimeMs = audioRef.current.currentTime * 1000;
      setCurrentTimeMs(newTimeMs);
      setCurrentImage(getImageFilename(newTimeMs));
    }
  };

  // 프로그레스 바 클릭 핸들러
  const handleProgressClick = (e: { currentTarget: { getBoundingClientRect: () => any; }; clientX: number; }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTimeMs = percent * totalDurationMs;
    
    setCurrentTimeMs(newTimeMs);
    if (audioRef.current) {
      audioRef.current.currentTime = newTimeMs / 1000;
    }
  };

  return (
    <Card sx={{ maxWidth: '6xl', mx: 'auto' }}>
      <CardContent sx={{ p: 6 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
        >
          <Tab label="비디오" value="video" />
          <Tab label="슬라이드" value="slides" />
        </Tabs>

        {activeTab === 'video' && (
          <Box sx={{ position: 'relative', pt: '56.25%' }}>
            <iframe
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
              }}
              src={`${videos[currentVideoIndex].url}?autoplay=1&enablejsapi=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </Box>
        )}

        {activeTab === 'slides' && (
          <Box sx={{ position: 'relative', pt: '56.25%' }}>
            <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
              {currentImage && (
                <Box
                  component="img"
                  src={currentImage}
                  alt="Current slide"
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              )}
              <audio
                ref={audioRef}
                src={videos[currentVideoIndex].audio}
                onTimeUpdate={handleTimeUpdate}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <Button
                variant="contained"
                sx={{
                  position: 'absolute',
                  bottom: 2,
                  left: 2,
                }}
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? '일시정지' : '재생'}
              </Button>
            </Box>
          </Box>
        )}

        <Box sx={{ position: 'relative', mb: 12 }}>
          <Box
            sx={{
              height: 16,
              bgcolor: 'grey.200',
              borderRadius: 1,
              cursor: 'pointer',
            }}
            onClick={handleProgressClick}
          >
            <Box
              sx={{
                height: '100%',
                bgcolor: 'primary.main',
                borderRadius: 1,
                width: `${(currentTimeMs / totalDurationMs) * 100}%`,
              }}
            />
          </Box>

          <Box sx={{ position: 'absolute', bottom: 0, width: '100%' }}>
            {videos.map((video, index) => {
              const startPercent = (index / videos.length) * 100;
              return (
                <Button
                  key={video.id}
                  size="small"
                  sx={{
                    position: 'absolute',
                    px: 1,
                    py: 0.5,
                    bottom: -32,
                    left: `${startPercent}%`,
                    transform: 'translateX(-50%)',
                  }}
                  onClick={() => setCurrentVideoIndex(index)}
                >
                  {video.startTime.split('.')[0]}
                </Button>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ mt: 6, maxHeight: 384, overflowY: 'auto' }}>
          {subtitles?.map((subtitle) => (
            <Box
              key={subtitle.id}
              sx={{
                p: 3,
                borderRadius: 1,
                transition: 'colors 0.2s',
                bgcolor: currentTimeMs >= stringToTime(subtitle.startTime) &&
                  currentTimeMs < stringToTime(subtitle.endTime)
                  ? 'primary.light'
                  : 'grey.100',
                borderLeft: currentTimeMs >= stringToTime(subtitle.startTime) &&
                  currentTimeMs < stringToTime(subtitle.endTime)
                  ? '4px solid'
                  : 'none',
                borderLeftColor: 'primary.main',
              }}
            >
              <Box sx={{ fontSize: 'small', color: 'text.secondary', mb: 1 }}>
                {subtitle.startTime} → {subtitle.endTime}
              </Box>
              {subtitle.text.map((line, index) => (
                <Box key={index} sx={{ color: 'text.primary' }}>
                  {line}
                </Box>
              ))}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default Player;