import { useEffect } from 'react';
import { Scene } from './Scene';
import { useGraphStore } from './store';
import { sampleData } from './data';

function App() {
  const setData = useGraphStore(state => state.setData);
  
  useEffect(() => {
    setData(sampleData);
  }, [setData]);
  
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Scene />
    </div>
  );
}

export default App;
