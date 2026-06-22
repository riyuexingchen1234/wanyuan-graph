import { useState, useEffect, useRef } from 'react';

interface DataCounterProps {
  nodeCount: number;
  edgeCount: number;
  isLoading?: boolean;
}

function AnimatedNumber({ value, isLoading }: { value: number; isLoading?: boolean }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    if (isLoading) {
      setDisplayValue(0);
      return;
    }

    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, isLoading]);

  return <span>{displayValue}</span>;
}

export default function DataCounter({ nodeCount, edgeCount, isLoading }: DataCounterProps) {
  return (
    <div className="absolute bottom-4 right-4 z-20">
      <div className="bg-canvas-900/80 backdrop-blur rounded-arco-lg px-4 py-2">
        <div className="text-arco-xs text-white/60">
          当前展示 <AnimatedNumber value={nodeCount} isLoading={isLoading} /> 个节点 ·{' '}
          <AnimatedNumber value={edgeCount} isLoading={isLoading} /> 条连接
        </div>
        <div className="text-arco-xs text-white/40 mt-0.5">完整图谱开发中</div>
      </div>
    </div>
  );
}