declare namespace YT {
  class Player {
    constructor(elementId: string, options: PlayerOptions);
    destroy(): void;
    getCurrentTime(): number;
    seekTo(seconds: number, allowSeekAhead: boolean): void;
  }

  interface PlayerOptions {
    videoId: string;
    events: {
      onReady?: () => void;
      onStateChange?: (event: OnStateChangeEvent) => void;
    };
    playerVars?: {
      autoplay?: number;
      enablejsapi?: number;
    };
  }

  interface OnStateChangeEvent {
    data: PlayerState;
  }

  enum PlayerState {
    PLAYING = 1,
  }
} 