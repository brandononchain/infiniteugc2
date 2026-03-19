import React from 'react';
import { Composition, registerRoot } from 'remotion';
import { CaptionedVideo } from './CaptionedVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="CaptionedVideo"
        component={CaptionedVideo}
        durationInFrames={3000}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          videoUrl: '',
          captions: [],
          captionStyle: null,
          captionPosition: { x: 0.5, y: 0.5 },
          textLayers: [],
          replyOverlay: null,
        }}
      />
    </>
  );
};

// Register the root component - required by Remotion bundler
registerRoot(RemotionRoot);
