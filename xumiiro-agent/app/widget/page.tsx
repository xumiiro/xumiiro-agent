'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const WELCOME_MESSAGE = `Xumiiro is a private gallery devoted to immersive audio-visual experiences. We represent visionary artists who transform space, sound, and light into transcendent moments.

Our gallery is closed to the public. The works of 0010×0010 can only be experienced through exclusive private viewings in Beverly Hills or Bangkok.

How may I assist you today?`;

function renderMessageWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.)?xumiiro\.com[^\s]*)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, index) => {
    if (part.match(urlRegex)) {
      const cleanUrl = part.replace(/[.,;:!?]$/, '');
      const trailing = part.slice(cleanUrl.length);
      return (
        <span key={index}>
          <a href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`}
            target="_blank" rel="noopener noreferrer" className="message-link">
            {cleanUrl}
          </a>
          {trailing}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-open if inside iframe
    try {
      if (window.self !== window.top) setIsOpen(true);
    } catch(e) { setIsOpen(true); }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasShownWelcome && messages.length === 0) {
      setMessages([{ role: 'assistant', content: WELCOME_MESSAGE }]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome, messages.length]);

  const handleClose = () => {
    setIsOpen(false);
    try { window.parent.postMessage('widget-close', '*'); } catch(e) {}
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection interrupted. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: transparent; overflow: hidden; }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        .widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* Launcher button */
        .launcher {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0a0a0a;
          border: 1px solid #1f1f1f;
          color: #707070;
          font-size: 10px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 14px 20px;
          cursor: pointer;
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.3s ease;
        }
        .launcher:hover { color: #999; border-color: #333; }
        .launcher::before {
          content: '';
          display: inline-block;
          width: 6px; height: 6px;
          background: #3d7a35;
          border-radius: 50%;
          margin-right: 10px;
          animation: pulse 2.5s ease-in-out infinite;
        }

        /* Panel — always floating, never full screen */
        .panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          height: 540px;
          background: #0a0a0a;
          border: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(16px);
          pointer-events: none;
          transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .panel.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }

        /* Mobile — slightly smaller but still floating */
        @media (max-width: 480px) {
          .panel {
            width: calc(100vw - 24px);
            height: 70vh;
            bottom: 12px;
            right: 12px;
            left: 12px;
          }
          .launcher {
            bottom: 16px;
            right: 16px;
          }
        }

        .header {
          padding: 16px 20px;
          border-bottom: 1px solid #1a1a1a;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .status-dot {
          width: 6px; height: 6px;
          background: #3d7a35;
          border-radius: 50%;
          animation: pulse 2.5s ease-in-out infinite;
        }
        .title {
          font-size: 10px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #555;
        }
        .close {
          background: none;
          border: none;
          color: #404040;
          font-size: 20px;
          cursor: pointer;
          padding: 4px 8px;
          line-height: 1;
          font-weight: 300;
          -webkit-tap-highlight-color: transparent;
          transition: color 0.2s;
        }
        .close:hover { color: #888; }

        .messages {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .messages::-webkit-scrollbar { width: 2px; }
        .messages::-webkit-scrollbar-thumb { background: #1f1f1f; }

        .message {
          font-size: 13px;
          line-height: 1.7;
          animation: fadeUp 0.3s ease;
          white-space: pre-wrap;
        }
        .message.user {
          color: #a0a0a0;
          text-align: right;
          padding-left: 40px;
        }
        .message.assistant {
          color: #707070;
          padding-right: 40px;
        }
        .message-link {
          color: #888;
          text-decoration: underline;
          text-underline-offset: 3px;
        }
        .typing {
          color: #404040;
          font-size: 18px;
          letter-spacing: 0.2em;
          animation: pulse 1s ease-in-out infinite;
        }

        /* Input row with send button */
        .input-area {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 14px 20px;
          padding-bottom: max(14px, env(safe-area-inset-bottom, 14px));
          border-top: 1px solid #1a1a1a;
          flex-shrink: 0;
        }
        .input {
          flex: 1;
          background: transparent;
          border: none;
          color: #909090;
          font-size: 16px;
          font-family: inherit;
          outline: none;
          line-height: 1.4;
          -webkit-appearance: none;
        }
        .input::placeholder {
          color: #2e2e2e;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .input:disabled { opacity: 0.4; }
        .send-btn {
          background: none;
          border: 1px solid #2a2a2a;
          color: #555;
          width: 34px;
          height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          flex-shrink: 0;
          -webkit-tap-highlight-color: transparent;
          transition: all 0.2s ease;
        }
        .send-btn:hover { border-color: #555; color: #888; }
        .send-btn:disabled { opacity: 0.3; cursor: default; }
        .send-btn svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }
      `}</style>

      <div className="widget">
        {!isOpen && (
          <button className="launcher" onClick={() => setIsOpen(true)}>
            Concierge Online
          </button>
        )}

        <div className={`panel ${isOpen ? 'open' : ''}`}>
          <div className="header">
            <div className="header-left">
              <div className="status-dot" />
              <span className="title">Xumiiro</span>
            </div>
            <button className="close" onClick={handleClose}>×</button>
          </div>

          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {renderMessageWithLinks(msg.content)}
              </div>
            ))}
            {isLoading && <div className="typing">···</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              className="input"
              placeholder="Ask anything..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
            <button
              className="send-btn"
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              aria-label="Send"
            >
              <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
