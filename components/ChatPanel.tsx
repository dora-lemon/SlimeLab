import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage, SimulationConfig } from '../types';
import { getGeminiExplanation } from '../services/geminiService';

interface ChatPanelProps {
  config: SimulationConfig;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ config }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hi! I am your Physics Assistant. Ask me anything about the slime, Mass-Spring models, or why changing the stiffness makes it jittery!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const responseText = await getGeminiExplanation(userMsg.text, config);
    
    setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-100 h-full flex flex-col overflow-hidden">
        <div className="p-4 bg-gradient-to-r from-emerald-500 to-teal-600">
            <h3 className="text-white font-bold flex items-center gap-2">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                AI Physics Tutor
            </h3>
            <p className="text-emerald-100 text-xs mt-1">Powered by Gemini 3 Flash</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" ref={scrollRef}>
            {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div 
                        className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                            msg.role === 'user' 
                            ? 'bg-emerald-600 text-white rounded-br-none' 
                            : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none prose prose-sm prose-emerald'
                        }`}
                    >
                         {/* Simple markdown rendering can be added here, currently text only */}
                         {msg.text.split('\n').map((line, i) => <p key={i} className="mb-1 last:mb-0">{line}</p>)}
                    </div>
                </div>
            ))}
            {isLoading && (
                 <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-500 rounded-2xl rounded-bl-none p-3 text-xs animate-pulse">
                        Thinking about physics...
                    </div>
                </div>
            )}
        </div>

        <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask 'Why does high damping make it slow?'"
                    className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white rounded-lg px-4 py-2 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
  );
};
