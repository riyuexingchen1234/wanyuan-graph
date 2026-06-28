import { useState, useEffect } from 'react';

export function HelpOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [hasVisited, setHasVisited] = useState(false);
  
  useEffect(() => {
    // 检查是否首次访问
    const visited = localStorage.getItem('wanyuan-visited');
    if (!visited) {
      setIsVisible(true);
      localStorage.setItem('wanyuan-visited', 'true');
    }
  }, []);
  
  if (!isVisible && !hasVisited) return null;
  
  return (
    <>
      {/* 首次访问引导 */}
      {isVisible && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.5s ease'
          }}
        >
          <div
            style={{
              maxWidth: '600px',
              padding: '40px',
              background: 'rgba(30, 30, 50, 0.95)',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: 'white'
            }}
          >
            <h1 style={{ margin: '0 0 20px 0', fontSize: '28px', fontWeight: 'bold' }}>
              万源图谱
            </h1>
            <p style={{ margin: '0 0 24px 0', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.8)' }}>
              世界本来是网状的，但人们习惯用树状的方式讲述。<br/>
              这个工具让你看见那些被遮蔽的连接。
            </p>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', color: '#4a90e2' }}>
                如何探索
              </h3>
              <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8', color: 'rgba(255, 255, 255, 0.7)' }}>
                <li>点击任意节点，相机会飞向它</li>
                <li>相关的节点会动态排列迎接你</li>
                <li>继续点击其他节点，探索跨产业链的连接</li>
                <li>点击空白处返回全局视图</li>
              </ul>
            </div>
            
            <button
              onClick={() => {
                setIsVisible(false);
                setHasVisited(true);
              }}
              style={{
                width: '100%',
                padding: '12px',
                background: '#4a90e2',
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#5a9fe2'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#4a90e2'}
            >
              开始探索
            </button>
          </div>
        </div>
      )}
      
      {/* 帮助按钮 */}
      {!isVisible && (
        <button
          onClick={() => setHasVisited(!hasVisited)}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(0, 0, 0, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: 'white',
            fontSize: '18px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
          title="帮助"
        >
          ?
        </button>
      )}
      
      {/* 快速提示 */}
      {!isVisible && !hasVisited && (
        <div
          style={{
            position: 'absolute',
            bottom: '70px',
            right: '20px',
            padding: '12px 16px',
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '6px',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '13px',
            maxWidth: '250px',
            lineHeight: '1.5'
          }}
        >
          点击任意节点开始探索<br/>
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '12px' }}>
            发现跨产业链的连接
          </span>
        </div>
      )}
    </>
  );
}
