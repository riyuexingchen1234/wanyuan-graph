import { useEffect } from 'react';
import { Scene } from './Scene';
import { InfoPanel } from './InfoPanel';
import { HelpOverlay } from './HelpOverlay';
import { useGraphStore } from './store';
import { sampleData } from './data';

function App() {
  const setData = useGraphStore(state => state.setData);
  
  useEffect(() => {
    setData(sampleData);
  }, [setData]);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Scene />
      <InfoPanel />
      <HelpOverlay />
    </div>
  );
}

export default App;
