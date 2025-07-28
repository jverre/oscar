import React, { useEffect, useState, useRef } from 'react';
import { createRoot } from 'react-dom/client';

const App = () => {
  const [initData, setInitData] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Send readiness ping
    window.parent?.postMessage({ type: 'PLUGIN_READY' }, '*');

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'INIT') {
        setInitData(event.data.payload);
        // Load existing content if available
        if (event.data.payload?.content) {
          try {
            const parsed = JSON.parse(event.data.payload.content);
            setTitle(parsed.title || '');
            setContent(parsed.content || '');
          } catch (e) {
            setContent(event.data.payload.content);
          }
        }
      } else if (event.data?.type === 'FILE_MESSAGES') {
        // Load saved message from database
        const latestMessage = event.data.payload?.latestMessage;
        if (latestMessage) {
          try {
            const parsed = JSON.parse(latestMessage.content);
            setTitle(parsed.title || '');
            setContent(parsed.content || '');
          } catch (e) {
            // Fallback if content is not JSON
            setContent(latestMessage.content || '');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const saveContent = () => {
    const blogData = {
      title,
      content,
      timestamp: new Date().toISOString()
    };
    
    window.parent?.postMessage({ 
      type: 'SAVE_MESSAGE', 
      payload: {
        content: JSON.stringify(blogData),
        metadata: { title, wordCount: content.split(' ').length }
      }
    }, '*');
    
    setLastSaved(new Date());
  };

  const formatText = (command: string) => {
    document.execCommand(command, false, undefined);
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  const close = () => {
    window.parent?.postMessage({ type: 'PLUGIN_CLOSE' }, '*');
  };

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: '#fafafa'
    }}>
      {/* Header */}
      <div style={{ 
        padding: '1rem', 
        borderBottom: '1px solid #e1e5e9',
        background: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => formatText('bold')} style={buttonStyle}>B</button>
          <button onClick={() => formatText('italic')} style={buttonStyle}>I</button>
          <button onClick={() => formatText('underline')} style={buttonStyle}>U</button>
          <button onClick={() => formatText('insertUnorderedList')} style={buttonStyle}>• List</button>
          <button onClick={() => formatText('insertOrderedList')} style={buttonStyle}>1. List</button>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {lastSaved && (
            <span style={{ fontSize: '0.75rem', color: '#666' }}>
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button onClick={saveContent} style={{ ...buttonStyle, background: '#007acc', color: 'white' }}>
            Save
          </button>
          <button onClick={close} style={buttonStyle}>Close</button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '2rem', maxWidth: '800px', margin: '0 auto', width: '100%' }}>
        <input
          type="text"
          placeholder="Blog post title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          style={{
            fontSize: '2rem',
            fontWeight: 'bold',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            marginBottom: '1rem',
            padding: '0.5rem 0'
          }}
        />
        
        <div
          ref={editorRef}
          contentEditable
          onInput={handleContentChange}
          dangerouslySetInnerHTML={{ __html: content }}
          style={{
            flex: 1,
            minHeight: '400px',
            border: 'none',
            outline: 'none',
            fontSize: '1rem',
            lineHeight: '1.6',
            padding: '1rem',
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}
          placeholder="Start writing your blog post..."
        />
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '0.5rem 1rem',
  border: '1px solid #ddd',
  background: 'white',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.875rem'
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);