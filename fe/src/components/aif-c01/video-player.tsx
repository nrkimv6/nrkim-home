import { useEffect, useRef } from 'react'

interface VideoPlayerProps {
  videoId: string;
  onReady: () => void;
  onStateChange: (event: YT.OnStateChangeEvent) => void;
  onTimeUpdate: (currentTime: number) => void;
}

export function VideoPlayer({ videoId, onReady, onStateChange, onTimeUpdate }: VideoPlayerProps) {
  const playerRef = useRef<YT.Player | null>(null)
  const timeUpdateInterval = useRef<NodeJS.Timeout | null>(null)

  const startTimeSync = () => {
    timeUpdateInterval.current = setInterval(() => {
      if (playerRef.current) {
        const currentTime = playerRef.current.getCurrentTime() * 1000
        onTimeUpdate(currentTime)
      }
    }, 100)
  }

  const stopTimeSync = () => {
    if (timeUpdateInterval.current) {
      clearInterval(timeUpdateInterval.current)
    }
  }

  const handleStateChange = (event: YT.OnStateChangeEvent) => {
    if (event.data === YT.PlayerState.PLAYING) {
      startTimeSync()
    } else {
      stopTimeSync()
    }
    onStateChange(event)
  }

  useEffect(() => {
    const initPlayer = () => {
      if (!document.getElementById('youtube-player')) return;
      
      playerRef.current = new YT.Player('youtube-player', {
        videoId,
        events: {
          onReady,
          onStateChange: handleStateChange,
        },
        playerVars: {
          autoplay: 1,
          enablejsapi: 1,
        },
      });
    };

    // 이미 스크립트가 로드되어 있는지 확인
    const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);  // firstScriptTag.parentNode.insertBefore 대신 직접 body에 추가
      window.onYouTubeIframeAPIReady = initPlayer;
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      stopTimeSync();
      playerRef.current?.destroy();
    };
  }, [videoId]);

  return <div id="youtube-player" className="w-full h-full" />;
}