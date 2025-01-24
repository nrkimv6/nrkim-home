import React from 'react';
import AIFNavigation from '../components/AIFNavigation';
import VideoPlayer from '../components/aif-c01/VideoPlayer';

const AIFC01 = () => {
  return (
    <div className="aif-page">
      <AIFNavigation />
      <div className="aif-content">
        <VideoPlayer />
      </div>
    </div>
  );
};

export default AIFC01; 