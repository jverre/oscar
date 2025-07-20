import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  const [initData, setInitData] = useState<any>(null);

  useEffect(() => {
    // Send readiness ping
    window.parent?.postMessage({ type: 'PLUGIN_READY' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INIT') {
        setInitData(event.data.payload);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const sendBack = () => {
    window.parent?.postMessage({ type: 'PLUGIN_EVENT', payload: { foo: 'bar' } }, '*');
  };

  const close = () => {
    window.parent?.postMessage({ type: 'PLUGIN_CLOSE' }, '*');
  };

  return (
    <div style={{ padding: '1rem', fontFamily: 'sans-serif' }}>
      <h2>Plugin Template</h2>
      <p>Init data: {initData ? JSON.stringify(initData) : 'Waiting...'}</p>
      <button onClick={sendBack}>Send Event</button>
      <button onClick={close} style={{ marginLeft: '1rem' }}>Close Plugin</button>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);