'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Welcome messages - rotates randomly
const WELCOME_MESSAGES = [
  "Welcome to Xumiiro. We represent 0010×0010 by appointment only.\n\nAre you here to explore a viewing, acquisition, curatorial advisory, or partnership?",
  "Welcome. Xumiiro is a private gallery presenting 0010×0010.\n\nTell me what brings you here—collecting, installation, or collaboration—and I'll guide you to the right path.",
  "Hello. This is the Xumiiro concierge.\n\nHow may I assist you today? Whether you're exploring the work for the first time or considering an acquisition, I'm here to help."
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Show welcome message when chat opens
  useEffect(() => {
    if (isOpen && !hasShownWelcome && messages.length === 0) {
      const randomWelcome = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
      setMessages([{ role: 'assistant', content: randomWelcome }]);
      setHasShownWelcome(true);
    }
  }, [isOpen, hasShownWelcome, messages.length]);

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
        html, body { background: transparent; overflow: hidden; }
        
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
          position: fixed;
          bottom: 0;
          right: 0;
          -webkit-font-smoothing: antialiased;
        }
        
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
        
        .panel {
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
        
        .panel.open {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }
        
        .header {
          padding: 20px 22px;
          border-bottom: 1px solid #1a1a1a;
          display: flex;
          justify-content: space-between;
          align-items: center;
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
          padding: 0;
          line-height: 1;
          transition: color 0.2s ease;
          font-weight: 300;
        }
        
        .close:hover { color: #666; }
        
        .messages {
          flex: 1;
          overflow-y: auto;
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
        
        .message a, .message-link {
          color: #888;
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        
        .typing {
          color: #484848;
          font-size: 14px;
          animation: pulse 1s ease-in-out infinite;
        }
        
        .input-area {
          padding: 18px 22px;
          border-top: 1px solid #1a1a1a;
        }
        
        .input {
          width: 100%;
          background: transparent;
          border: none;
          color: #909090;
          font-size: 13.5px;
          font-family: inherit;
          outline: none;
          line-height: 1.5;
        }
        
        .input::placeholder {
          color: #353535;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }
        
        .input:disabled {
          opacity: 0.5;
        }

        @media (max-width: 480px) {
          .panel {
            width: calc(100vw - 24px);
            height: calc(100vh - 48px);
            bottom: 12px;
            right: 12px;
          }
          .launcher { 
            bottom: 16px; 
            right: 16px;
            padding: 13px 18px;
            font-size: 9px;
          }
          .message.user { padding-left: 30px; }
          .message.assistant { padding-right: 30px; }
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
              <div className="status-dot"></div>
              <span className="title">Xumiiro</span>
            </div>
            <button className="close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="messages">
            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
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
              autoFocus={isOpen}
            />
          </div>
        </div>
      </div>
    </>
  );
}
