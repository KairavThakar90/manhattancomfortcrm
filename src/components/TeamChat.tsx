import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, Users, Send, Paperclip, Sparkles, Hash, AlertCircle, 
  HelpCircle, ChevronRight, Bookmark, FileText
} from 'lucide-react';
import { ChatMessage, PurchaseOrder, UserRole } from '../types';

interface TeamChatProps {
  chats: ChatMessage[];
  purchaseOrders: PurchaseOrder[];
  userRole: UserRole;
  onAddChatMessage: (msg: ChatMessage) => void;
  onAddActivity: (msg: string, type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment') => void;
}

export default function TeamChat({
  chats,
  purchaseOrders,
  userRole,
  onAddChatMessage,
  onAddActivity
}: TeamChatProps) {
  const [activeChannel, setActiveChannel] = useState<'purchasing' | 'warehouse' | 'finance' | 'management'>('purchasing');
  const [inputText, setInputText] = useState('');
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on load/new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChannel]);

  // Filter chats by channel
  const currentChannelChats = chats.filter(c => c.channel === activeChannel);

  // Dispatch Chat Message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `CHT-${Math.floor(100 + Math.random() * 900)}`,
      channel: activeChannel,
      user: 'You (Sourcing Lead)',
      role: userRole,
      message: inputText.trim(),
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' ')
    };

    onAddChatMessage(newMsg);
    setInputText('');
  };

  // Quick PO mention helper
  const handleMentionPO = (poId: string) => {
    setInputText((prev) => `${prev} ${poId} `.trim());
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden flex h-[580px]">
      {/* Sidebar: Channels & PO Fast Reference */}
      <div className="w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col justify-between">
        <div className="p-4 space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Workspace Channels</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Direct inter-department discussions</p>
          </div>

          <div className="space-y-1">
            {(['purchasing', 'warehouse', 'finance', 'management'] as const).map(channel => {
              const channelMsgCount = chats.filter(c => c.channel === channel).length;
              return (
                <button
                  key={channel}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-semibold capitalize transition ${
                    activeChannel === channel 
                      ? 'bg-indigo-600 text-white shadow-xs' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    <span>{channel}</span>
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeChannel === channel ? 'bg-indigo-700 text-indigo-50' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {channelMsgCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PO Quick Link Reference Drawer */}
        <div className="p-4 border-t border-slate-100 bg-white/70">
          <div className="mb-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Bookmark className="h-3.5 w-3.5 text-indigo-600" />
              <span>Link PO to chat</span>
            </h4>
            <p className="text-[9px] text-slate-400">Click a PO code below to insert into chat.</p>
          </div>

          <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
            {purchaseOrders.slice(0, 5).map(po => (
              <button
                key={po.id}
                onClick={() => handleMentionPO(po.id)}
                className="w-full text-left p-1.5 hover:bg-slate-50 rounded-md text-[10px] font-mono font-bold text-indigo-950 border border-slate-100 flex items-center justify-between group"
              >
                <span>{po.id}</span>
                <span className="text-[8px] font-sans font-normal text-slate-400 opacity-0 group-hover:opacity-100 transition">Mention +</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Central Chat Interface */}
      <div className="flex-1 flex flex-col justify-between">
        {/* Channel Header Info */}
        <div className="bg-slate-50/30 p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hash className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="font-display font-bold text-slate-900 text-sm capitalize">{activeChannel} Channel</h3>
          </div>
          <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">
            {currentChannelChats.length} messages active
          </span>
        </div>

        {/* Messaging Logs Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentChannelChats.map(chat => {
            const isUser = chat.user.includes('You');
            return (
              <div 
                key={chat.id} 
                className={`flex gap-3 items-start max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Simulated Avatar */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isUser ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {chat.user.slice(0, 1)}
                </div>

                <div className="space-y-1">
                  <div className={`flex items-center gap-2 text-[10px] ${isUser ? 'flex-row-reverse' : ''}`}>
                    <span className="font-bold text-slate-900">{chat.user}</span>
                    <span className={`px-1.5 py-0.2 rounded-sm uppercase text-[8px] font-bold ${
                      isUser ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {chat.role}
                    </span>
                    <span className="text-slate-400 font-mono">{chat.timestamp.split(' ')[1]}</span>
                  </div>

                  {/* Message bubble */}
                  <div className={`p-3 rounded-2xl text-xs leading-relaxed ${
                    isUser 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs' 
                      : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-100'
                  }`}>
                    {/* Parse PO hashtags to provide clickable highlights in UI */}
                    {chat.message.split(' ').map((word, idx) => {
                      if (word.startsWith('PO-')) {
                        return (
                          <span key={idx} className="font-bold font-mono underline cursor-pointer bg-white/20 px-1 rounded-sm">
                            {word}{' '}
                          </span>
                        );
                      }
                      return word + ' ';
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Chat Input form panel */}
        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-100 flex gap-2">
          <input
            type="text"
            placeholder={`Message #${activeChannel}... Mention a Purchase Order code like PO-10025 to link discussion.`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 focus:bg-white transition text-slate-800"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-xs"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
