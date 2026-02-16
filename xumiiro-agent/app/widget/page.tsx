'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
      setMessages([...newMessages, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html, body { background: transparent; overflow: hidden; }
        
        .widget {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: fixed;
          bottom: 0;
          right: 0;
        }
        
        .launcher {
          position: fixed;
          bottom: 24px;
          right: 24px;
          background: #0a0a0a;
          border: 1px solid #1a1a1a;
          color: #666;
          font-size: 10px;
          font-weight: 400;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          padding: 14px 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-family: inherit;
        }
        
        .launcher:hover {
          background: #0f0f0f;
          color: #888;
          border-color: #252525;
        }
        
        .launcher::before {
          content: '●';
          color: #2d5a27;
          margin-right: 8px;
          font-size: 8px;
        }
        
        .panel {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 380px;
          height: 520px;
          background: #0a0a0a;
          border: 1px solid #1a1a1a;
          display: flex;
          flex-direction: column;
          opacity: 0;
          transform: translateY(20px);
          pointer-events: none;
          transition: all 0.3s ease;
        }
        
        .panel.open {
          opacity: 1;
          transform: translateY(0);
          pointer-events: all;
        }
        
        .header {
          padding: 18px 20px;
          border-bottom: 1px solid #1a1a1a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .title {
          font-size: 9px;
          font-weight: 400;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #555;
        }
        
        .close {
          background: none;
          border: none;
          color: #333;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        
        .close:hover { color: #555; }
        
        .messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        
        .messages::-webkit-scrollbar { width: 3px; }
        .messages::-webkit-scrollbar-thumb { background: #1a1a1a; }
        
        .message {
          font-size: 13px;
          line-height: 1.65;
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message.user {
          color: #999;
          text-align: right;
          padding-left: 50px;
        }
        
        .message.assistant {
          color: #707070;
          padding-right: 50px;
        }
        
        .welcome {
          color: #555;
          font-size: 13px;
          line-height: 1.65;
        }
        
        .typing {
          color: #444;
          font-size: 13px;
        }
        
        .input-area {
          padding: 18px 20px;
          border-top: 1px solid #1a1a1a;
        }
        
        .input {
          width: 100%;
          background: transparent;
          border: none;
          color: #888;
          font-size: 13px;
          font-family: inherit;
          outline: none;
        }
        
        .input::placeholder {
          color: #2a2a2a;
          font-size: 10px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }

        @media (max-width: 480px) {
          .panel {
            width: calc(100vw - 32px);
            height: calc(100vh - 48px);
            bottom: 16px;
            right: 16px;
          }
          .launcher { bottom: 16px; right: 16px; }
        }
      `}</style>

      <div className="widget">
        {!isOpen && (
          <button className="launcher" onClick={() => setIsOpen(true)}>
            Agent Online
          </button>
        )}

        <div className={`panel ${isOpen ? 'open' : ''}`}>
          <div className="header">
            <span className="title">Xumiiro</span>
            <button className="close" onClick={() => setIsOpen(false)}>×</button>
          </div>

          <div className="messages">
            {messages.length === 0 && (
              <div className="welcome">How may I assist you?</div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>{msg.content}</div>
            ))}

            {isLoading && <div className="typing">...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-area">
            <input
              type="text"
              className="input"
              placeholder="Type your inquiry..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>
    </>
  );
}
