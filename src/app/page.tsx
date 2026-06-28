'use client';

import GraphScene from '../components/Graph3D/GraphScene';
import SearchOverlay from '../components/UI/SearchOverlay';
import CompassButton from '../components/UI/CompassButton';
import HoverTooltip from '../components/UI/HoverTooltip';
import IntroScreen from '../components/UI/IntroScreen';

export default function Home() {
  return (
    <div className="fixed w-screen h-screen overflow-hidden bg-[#050810]">
      <div className="absolute inset-0">
        <GraphScene />
      </div>

      <div className="absolute top-5 left-6 z-40 pointer-events-none">
        <div className="text-white/60 text-lg font-semibold tracking-widest" style={{ textShadow: '0 0 20px rgba(0,0,0,0.8)' }}>
          万源图谱
        </div>
      </div>

      <SearchOverlay />
      <CompassButton />
      <HoverTooltip />
      <IntroScreen />
    </div>
  );
}
