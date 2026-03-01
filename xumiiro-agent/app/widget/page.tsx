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
          <a 
            href={cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="message-link"
          >
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
  const [inIframe, setInIframe] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Detect if inside iframe and auto-open
    const isEmbedded = window.self !== window.top;
    setInIframe(isEmbedded);
    if (isEmbedded) {
      setIsOpen(true);
    }
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
    } catch (error) {
      setMessages([...newMessages, { role: 'assistant', content: 'Connection interrupted. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        html, body {
          background: transparent;
          overflow: hidden;
          height: 100%;
          width: 100%;
          position: fixed;
        }
        
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        
        .widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          height: 100%;
          width: 100%;
        }

        /* === STANDALONE MODE (not in iframe) === */
        .launcher {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0a0a0a;
          border: 1px solid #1f1f1f;
          color: #707070;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 15px 22px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-family: inherit;
          -webkit-tap-highlight-color: transparent;
        }
        .launcher:hover {
          background: #0f0f0f;
          color: #909090;
          border-color: #2a2a2a;
          transform: translateY(-1px);
        }
        .launcher::before {
          content: '';
          display: inline-block;
          width: 6px;
          height: 6px;
          background: #3d7a35;
          border-radius: 50%;
          margin-right: 10px;
          animation: pulse 2.5s ease-in-out infinite;
        }

        /* === PANEL - IFRAME MODE (full screen) === */
        .panel-iframe {
          position: fixed;
          inset: 0;
          background: #0a0a0a;
          display: flex;
          flex-direction: column;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease;
        }
        .panel-iframe.open {
          opacity: 1;
          pointer-events: all;
        }

        /* === PANEL - STANDALONE MODE (floating) === */
        .panel-standalone {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 400px;
          height: 560px;
          background: #0a0a0a;
          border: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(20px) scale(0.98);
          pointer-events: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .panel-standalone.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }

        /* === SHARED PANEL STYLES === */
        .header {
          padding: 20px 22px;
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
          width: 6px;
          height: 6px;
          background: #3d7a35;
          border-radius: 50%;
          animation: pulse 2.5s ease-in-out infinite;
        }
        .title {
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #606060;
        }
        .close {
          background: none;
          border: none;
          color: #404040;
          font-size: 22px;
          cursor: pointer;
          padding: 4px 10px;
          line-height: 1;
          transition: color 0.2s ease;
          font-weight: 300;
          -webkit-tap-highlight-color: transparent;
        }
        .close:hover { color: #666; }

        .messages {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          padding: 24px 22px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .messages::-webkit-scrollbar { width: 3px; }
        .messages::-webkit-scrollbar-track { background: transparent; }
        .messages::-webkit-scrollbar-thumb { background: #1f1f1f; border-radius: 3px; }

        .message {
          font-size: 13.5px;
          line-height: 1.7;
          letter-spacing: 0.01em;
          animation: fadeUp 0.4s ease;
          white-space: pre-wrap;
        }
        .message.user {
          color: #a0a0a0;
          text-align: right;
          padding-left: 45px;
        }
        .message.assistant {
          color: #787878;
          padding-right: 45px;
        }
        .message-link {
          color: #9a9a9a;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-color: #4a4a4a;
          cursor: pointer;
        }
        .typing {
          color: #484848;
          font-size: 14px;
          animation: pulse 1s ease-in-out infinite;
        }

        .input-area {
          padding: 18px 22px;
          padding-bottom: max(18px, env(safe-area-inset-bottom, 18px));
          border-top: 1px solid #1a1a1a;
          flex-shrink: 0;
        }
        .input {
          width: 100%;
          background: transparent;
          border: none;
          color: #909090;
          font-size: 16px;
          font-family: inherit;
          outline: none;
          line-height: 1.5;
          -webkit-appearance: none;
        }
        .input::placeholder {
          color: #353535;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        .input:disabled { opacity: 0.5; }
      `}</style>

      <div className="widget">
        {/* Launcher — only shown in standalone mode when closed */}
        {!inIframe && !isOpen && (
          <button className="launcher" onClick={() => setIsOpen(true)}>
            Concierge Online
          </button>
        )}

        {/* Panel — different class depending on context */}
        <div className={`${inIframe ? 'panel-iframe' : 'panel-standalone'} ${isOpen ? 'open' : ''}`}>
          <div className="header">
            <div className="header-left">
              <div className="status-dot"></div>
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
            {isLoading && <div className="typing">...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              className="input"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
