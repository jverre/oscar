import { useState } from 'react';
import { GridCircles } from '@/pages/home/GridCircles';

export default function ChatInput({
  status,
  onSubmit,
  inputRef,
  stop,
}: {
  status: string;
  onSubmit: (text: string) => void;
  inputRef: React.RefObject<HTMLInputElement>;
  stop: () => void;
}) {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim() === '') return;
    onSubmit(text);
    setText('');
  };

  return (
    <div className="flex flex-col mx-2 mt-2">
      <div className="relative border border-sage-green-200/80">
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="p-3 pb-2 w-full bg-transparent text-sm outline-none transition-colors focus-visible:border-sage-green-400 disabled:opacity-50"
            placeholder="Say something..."
            disabled={status !== 'ready'}
            value={text}
            onChange={e => setText(e.target.value)}
          />
        </form>

        {/* Bottom row inside the border */}
        <div className="flex justify-between items-center px-3 pb-2 pt-1 border-sage-green-200/30">
          <span className="text-xs text-sage-green-600">Claude code</span>
          {(status === 'streaming' || status === 'submitted') ? (
            <button
              type="button"
              onClick={stop}
              className="px-3 py-1 text-xs border border-sage-green-200 hover:bg-sage-green-50 transition-colors"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={status !== 'ready' || text.trim() === ''}
              className="px-3 py-1 text-xs border border-sage-green-200 hover:bg-sage-green-50 transition-colors disabled:opacity-50"
            >
              Submit
            </button>
          )}
        </div>

        {/* Grid circles at corners */}
        <GridCircles positions={['left', 'right']} top={true} />
        <GridCircles positions={['left', 'right']} top={false} />
      </div>
    </div>
  );
}