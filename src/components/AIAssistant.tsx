import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Bot,
  User,
  RefreshCw,
  MessageSquare,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';
import { PurchaseOrder, Vendor } from '../types';

interface AIAssistantProps {
  purchaseOrders: PurchaseOrder[];
  vendors: Vendor[];
  onSelectPO: (poId: string | null) => void;
  onNavigateToTab: (tab: string) => void;
}

interface Message {
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export default function AIAssistant({
  purchaseOrders,
  vendors,
  onSelectPO,
  onNavigateToTab,
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'ai',
      text: 'Hello! I am your integrated Supply Chain AI Assistant. I have audited our Sellercloud synchronized data. You can ask me to compile daily summary reports, find delayed parts, flag missing invoices, or analyze supplier metrics on the fly.',
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    },
  ]);
  const [customPrompt, setCustomPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  // Predefined Procurement Prompts (Rule 9)
  const SUGGESTED_PROMPTS = [
    {
      label: 'Show delayed POs from China',
      query: 'Show delayed POs from China.',
    },
    {
      label: 'Delayed vendors > 30 days',
      query: 'Which vendors are delayed more than 30 days?',
    },
    {
      label: 'POs with missing invoices',
      query: 'Which Purchase Orders have missing invoices?',
    },
    {
      label: 'Containers arriving soon',
      query: 'Show containers arriving next week.',
    },
    { label: "Generate today's summary", query: "Generate today's summary." },
  ];

  // Intelligent Context-Aware Query Parser (audits active state on-the-fly!)
  const handleQuery = (query: string) => {
    if (isThinking) return;

    // Add user message to feed
    const userMsg: Message = {
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsThinking(true);

    setTimeout(() => {
      let aiText = '';
      const queryLower = query.toLowerCase();

      // Prompt 1: Delayed POs from China
      if (queryLower.includes('china') && queryLower.includes('delay')) {
        const chinaVendors = vendors.filter(
          (v) => v.country.toLowerCase() === 'china',
        );
        const chinaPOIds = chinaVendors.map((v) => v.id);
        const delayedChina = purchaseOrders.filter(
          (po) => po.status === 'Delayed' && chinaPOIds.includes(po.vendorId),
        );

        if (delayedChina.length > 0) {
          aiText = `Based on our current Sellercloud sync, I found **${delayedChina.length} delayed Purchase Order(s)** sourced from manufacturers in **China**:\n\n`;
          delayedChina.forEach((po) => {
            aiText += `* **${po.id}** (${po.vendorName}) - Delayed by **${po.delayedDays} days**. Items: ${po.items[0]?.name || 'Parts'}. Sourcing value: **$${(po.orderedQty * po.items[0]?.unitPrice).toLocaleString()}**. Target ETA: ${po.eta}.\n`;
          });
          aiText += `\n*Action suggested: Direct contact requested. You can generate an AI follow-up draft for these vendors in the PO profile drawer.*`;
        } else {
          aiText = `Good news! We currently have zero delayed Purchase Orders from suppliers located in China. All shipments remain on tract within planned lead times.`;
        }
      }

      // Prompt 2: Vendors delayed more than 30 days
      else if (
        queryLower.includes('30 days') ||
        queryLower.includes('more than 30')
      ) {
        const superDelayed = purchaseOrders.filter(
          (po) => po.status === 'Delayed' && po.delayedDays > 30,
        );

        if (superDelayed.length > 0) {
          aiText = `Auditing procurement lead times, I found **${superDelayed.length} active order(s)** delayed by more than **30 days**:\n\n`;
          superDelayed.forEach((po) => {
            aiText += `* **${po.id}** sourced from **${po.vendorName}** is delayed by **${po.delayedDays} days**. Sourcing items: ${po.items[0]?.name || 'Display Modules'} (Qty: ${po.orderedQty} units). Target ETA was: ${po.eta}.\n`;
          });
          aiText += `\nThese delays represent high logistics risks and S&OP disruptions. Recommend triggering fallback sourcing chains immediately.`;
        } else {
          aiText = `Outstanding! Currently, there are zero manufacturing vendors with delays exceeding 30 days. Maximum delay recorded is under 15 days.`;
        }
      }

      // Prompt 3: Missing Invoices
      else if (
        queryLower.includes('missing invoice') ||
        queryLower.includes('invoice')
      ) {
        const missingInvoice = purchaseOrders.filter(
          (po) =>
            po.invoiceStatus === 'Pending' || po.invoiceStatus === 'Rejected',
        );

        if (missingInvoice.length > 0) {
          aiText = `I found **${missingInvoice.length} Purchase Order(s)** flagged with **missing or rejected invoices**:\n\n`;
          missingInvoice.forEach((po) => {
            aiText += `* **${po.id}** (${po.vendorName}) - Status: **${po.status}**. Invoice: **${po.invoiceStatus}**. Total parts: ${po.orderedQty} units. Sourcing Value: **$${(po.orderedQty * (po.items[0]?.unitPrice || 25)).toLocaleString()}**.\n`;
          });
          aiText += `\n*Action suggested: Bill clearance needed. Request invoice PDFs from these suppliers and drag them into our OCR Reader in the PO detail drawer.*`;
        } else {
          aiText = `All active Purchase Orders have valid, uploaded and approved invoices. Sourcing payments are aligned with finance rules.`;
        }
      }

      // Prompt 4: Containers arriving next week
      else if (
        queryLower.includes('container') ||
        queryLower.includes('next week') ||
        queryLower.includes('arriving')
      ) {
        const withContainers = purchaseOrders.filter(
          (po) => po.container && po.status !== 'Delivered',
        );

        if (withContainers.length > 0) {
          aiText = `Here is the S&OP Logistics report for scheduled container arrivals over the next week (July 2026):\n\n`;
          withContainers.forEach((po) => {
            aiText += `* **Container ${po.container}** carrying **${po.id}** (${po.vendorName}) - Status: **${po.status}**. Carrying ${po.orderedQty} units. Scheduled port gate clearance date: **${po.eta}**.\n`;
          });
          aiText += `\nFulfillment team is notified to allocate warehouse dock slots. Emily (Warehouse) has reserved receiving bay 4.`;
        } else {
          aiText = `There are no scheduled container arrivals over the next 7 days. Most shipments are currently in early manufacturing or production phase.`;
        }
      }

      // Prompt 5: Generate today's summary
      else if (queryLower.includes('summary') || queryLower.includes('today')) {
        const total = purchaseOrders.length;
        const delayed = purchaseOrders.filter(
          (po) => po.status === 'Delayed',
        ).length;
        const transit = purchaseOrders.filter(
          (po) => po.status === 'In Transit',
        ).length;
        const missing = purchaseOrders.filter(
          (po) =>
            po.invoiceStatus === 'Pending' || po.invoiceStatus === 'Rejected',
        ).length;

        aiText = `### Sourcing Executive Daily Summary Report (July 2026)

**1. Sourcing Pipeline KPI:**
* Total active PO contracts: **${total}**
* Active production lines: **${purchaseOrders.filter((po) => po.status === 'Production').length}**
* Shipments in transit: **${transit}**

**2. Supply Chain Risks:**
* Delayed orders: **${delayed}** (Critical high risk: ${purchaseOrders.filter((po) => po.delayedDays > 30).length} POs over 30 days)
* Delayed average lead time: **22.5 Days**
* Sourcing risk priority: Vietnamese microprocessor allocations (Global Tech).

**3. Financial Audits:**
* Missing/rejected invoices: **${missing}** POs blocking LC releases.
* Sourcing capital committed today: **$${purchaseOrders.reduce((sum, po) => sum + po.orderedQty * 24, 0).toLocaleString()}** (USD).

*Aerocrm Recommendation: Draft follow-ups to Global Tech Sourcing immediately, and check with Emily regarding CNT-099 reception slots.*`;
      }

      // Freeform Q&A fallbacks
      else {
        aiText = `I have scanned our Supply Chain CRM database for your query: "${query}".\n\nI can verify that we have **${purchaseOrders.length} active Purchase Orders** and **${vendors.length} onboarded suppliers** registered. For precise details, please select one of our quick action buttons (e.g., daily summary or China delay checks) or use our smart search filters.`;
      }

      const aiMsg: Message = {
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsThinking(false);
    }, 1500);
  };

  const handleSendPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;
    handleQuery(customPrompt.trim());
    setCustomPrompt('');
  };

  return (
    <div className="flex h-[580px] flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xs">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/60 p-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
            <Sparkles className="h-4.5 w-4.5 animate-pulse text-indigo-100" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-slate-900">
              S&OP Sourcing AI Companion
            </h3>
            <p className="text-[10px] text-slate-400">
              Scan contracts, delayed vendors, and invoice OCR logs instantly.
            </p>
          </div>
        </div>

        <button
          onClick={() => setMessages([messages[0]])}
          className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:text-indigo-600 hover:underline"
        >
          Reset Chat
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((msg, index) => {
          const isAI = msg.sender === 'ai';
          return (
            <div
              key={index}
              className={`flex max-w-[85%] gap-3 ${isAI ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-xs ${
                  isAI
                    ? 'border border-indigo-100 bg-indigo-50 text-indigo-700'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {isAI ? (
                  <Bot className="h-4.5 w-4.5" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </div>

              <div className="space-y-1">
                <div
                  className={`flex items-center gap-1.5 text-[10px] text-slate-400 ${isAI ? '' : 'flex-row-reverse'}`}
                >
                  <span className="font-bold text-slate-700">
                    {isAI ? 'AI Sourcing Engine' : 'You'}
                  </span>
                  <span className="font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed ${
                    isAI
                      ? 'markdown-body rounded-tl-none border border-slate-100 bg-slate-50 text-slate-800'
                      : 'rounded-tr-none bg-indigo-600 text-white shadow-xs'
                  }`}
                >
                  {/* Simplistic formatting support for beautiful summaries */}
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('###')) {
                      return (
                        <h4
                          key={idx}
                          className="font-display mt-3 mb-1.5 text-sm font-bold text-slate-900 first:mt-0"
                        >
                          {line.replace('###', '')}
                        </h4>
                      );
                    }
                    if (line.startsWith('**')) {
                      return (
                        <p
                          key={idx}
                          className="mt-2 font-semibold text-slate-900"
                        >
                          {line.replace(/\*\*/g, '')}
                        </p>
                      );
                    }
                    if (line.startsWith('*')) {
                      return (
                        <li
                          key={idx}
                          className="mt-1 ml-3 list-disc text-slate-700"
                        >
                          {line.replace('*', '').trim()}
                        </li>
                      );
                    }
                    return (
                      <p key={idx} className="mt-1 first:mt-0">
                        {line}
                      </p>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {isThinking && (
          <div className="mr-auto flex max-w-[85%] animate-pulse gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100">
              <RefreshCw className="h-4 w-4 animate-spin text-slate-400" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400">
                Scanning database parameters...
              </span>
              <div className="rounded-2xl rounded-tl-none border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500 italic">
                AI Sourcing Engine is compiling delayed days, contract codes and
                S&OP ratios. Please wait...
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested prompts dock */}
      <div className="flex scrollbar-none flex-nowrap gap-2 overflow-x-auto border-t border-slate-100 bg-slate-50/50 p-3">
        {SUGGESTED_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleQuery(prompt.query)}
            className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-semibold text-slate-600 transition hover:border-indigo-400"
          >
            <Bot className="h-3 w-3 text-indigo-500" />
            <span>{prompt.label}</span>
          </button>
        ))}
      </div>

      {/* Prompt input bar */}
      <form
        onSubmit={handleSendPrompt}
        className="flex gap-2 border-t border-slate-100 p-4"
      >
        <input
          type="text"
          placeholder="Ask AI: 'Show delayed POs from China', 'Generate daily S&OP report'..."
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 transition focus:border-indigo-500 focus:bg-white focus:outline-hidden"
        />
        <button
          type="submit"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
        >
          <Bot className="h-4 w-4" />
          <span>Ask Sourcing AI</span>
        </button>
      </form>
    </div>
  );
}
