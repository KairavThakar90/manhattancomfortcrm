import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Users,
  Send,
  Paperclip,
  Sparkles,
  Hash,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Bookmark,
  FileText,
} from 'lucide-react';
import { ChatMessage, PurchaseOrder, UserRole } from '../types';
import { toast } from 'react-toastify';

interface TeamChatProps {
  chats: ChatMessage[];
  purchaseOrders: PurchaseOrder[];
  userRole: UserRole;
  onAddChatMessage: (msg: ChatMessage) => void;
  onAddActivity: (
    msg: string,
    type: 'PO Updated' | 'Email Sent' | 'Invoice Uploaded' | 'Vendor Comment',
  ) => void;
}

export default function TeamChat({
  chats,
  purchaseOrders,
  userRole,
  onAddChatMessage,
  onAddActivity,
}: TeamChatProps) {
  const [activeChannel, setActiveChannel] = useState<
    'purchasing' | 'warehouse' | 'finance' | 'management'
  >('purchasing');
  const [inputText, setInputText] = useState('');

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom on load/new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats, activeChannel]);

  // Filter chats by channel
  const currentChannelChats = chats.filter((c) => c.channel === activeChannel);

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
      timestamp: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    onAddChatMessage(newMsg);
    setInputText('');
    toast.success('Message sent successfully');
  };

  // Quick PO mention helper
  const handleMentionPO = (poId: string) => {
    setInputText((prev) => `${prev} ${poId} `.trim());
  };

  return (
    <div className="flex h-[580px] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
      {/* Sidebar: Channels & PO Fast Reference */}
      <div className="flex w-64 flex-col justify-between border-r border-slate-100 bg-slate-50/50">
        <div className="space-y-4 p-4">
          <div>
            <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
              Workspace Channels
            </h3>
            <p className="mt-0.5 text-[10px] text-slate-400">
              Direct inter-department discussions
            </p>
          </div>

          <div className="space-y-1">
            {(
              ['purchasing', 'warehouse', 'finance', 'management'] as const
            ).map((channel) => {
              const channelMsgCount = chats.filter(
                (c) => c.channel === channel,
              ).length;
              return (
                <button
                  key={channel}
                  onClick={() => setActiveChannel(channel)}
                  className={`flex w-full items-center justify-between rounded-lg p-2 text-xs font-semibold capitalize transition ${
                    activeChannel === channel
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Hash className="h-3.5 w-3.5" />
                    <span>{channel}</span>
                  </span>
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                      activeChannel === channel
                        ? 'bg-indigo-700 text-indigo-50'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {channelMsgCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* PO Quick Link Reference Drawer */}
        <div className="border-t border-slate-100 bg-white/70 p-4">
          <div className="mb-2">
            <h4 className="flex items-center gap-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              <Bookmark className="h-3.5 w-3.5 text-indigo-600" />
              <span>Link PO to chat</span>
            </h4>
            <p className="text-[9px] text-slate-400">
              Click a PO code below to insert into chat.
            </p>
          </div>

          <div className="max-h-[180px] space-y-1.5 overflow-y-auto pr-1">
            {purchaseOrders.slice(0, 5).map((po) => (
              <button
                key={po.id}
                onClick={() => handleMentionPO(po.id)}
                className="group flex w-full items-center justify-between rounded-md border border-slate-100 p-1.5 text-left font-mono text-[10px] font-bold text-indigo-950 hover:bg-slate-50"
              >
                <span>{po.id}</span>
                <span className="font-sans text-[8px] font-normal text-slate-400 opacity-0 transition group-hover:opacity-100">
                  Mention +
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Central Chat Interface */}
      <div className="flex flex-1 flex-col justify-between">
        {/* Channel Header Info */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 p-4">
          <div className="flex items-center gap-2">
            <Hash className="h-4.5 w-4.5 text-indigo-600" />
            <h3 className="font-display text-sm font-bold text-slate-900 capitalize">
              {activeChannel} Channel
            </h3>
          </div>
          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
            {currentChannelChats.length} messages active
          </span>
        </div>

        {/* Messaging Logs Feed */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {currentChannelChats.map((chat) => {
            const isUser = chat.user.includes('You');
            return (
              <div
                key={chat.id}
                className={`flex max-w-[85%] items-start gap-3 ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
              >
                {/* Simulated Avatar */}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    isUser
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {chat.user.slice(0, 1)}
                </div>

                <div className="space-y-1">
                  <div
                    className={`flex items-center gap-2 text-[10px] ${isUser ? 'flex-row-reverse' : ''}`}
                  >
                    <span className="font-bold text-slate-900">
                      {chat.user}
                    </span>
                    <span
                      className={`py-0.2 rounded-sm px-1.5 text-[8px] font-bold uppercase ${
                        isUser
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {chat.role}
                    </span>
                    <span className="font-mono text-slate-400">
                      {chat.timestamp.split(' ')[1]}
                    </span>
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`rounded-2xl p-3 text-xs leading-relaxed ${
                      isUser
                        ? 'rounded-tr-none bg-indigo-600 text-white shadow-xs'
                        : 'rounded-tl-none border border-slate-100 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {/* Parse PO hashtags to provide clickable highlights in UI */}
                    {chat.message.split(' ').map((word, idx) => {
                      if (word.startsWith('PO-')) {
                        return (
                          <span
                            key={idx}
                            className="cursor-pointer rounded-sm bg-white/20 px-1 font-mono font-bold underline"
                          >
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
        <form
          onSubmit={handleSendMessage}
          className="flex gap-2 border-t border-slate-100 p-4"
        >
          <input
            type="text"
            placeholder={`Message #${activeChannel}... Mention a Purchase Order code like PO-10025 to link discussion.`}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden"
          />
          <button
            type="submit"
            className="flex items-center gap-1 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
}
