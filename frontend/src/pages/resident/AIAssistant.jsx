import React, { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

const RESIDENT_SUGGESTIONS = [
  "How can I submit a plumbing or electrical complaint?",
  "When is the monthly maintenance due date?",
  "What are society gate rules for delivery couriers?",
  "Who do I contact in case of an urgent society emergency?",
];

export default function ResidentAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hello ${user?.name || "Neighbor"}! 🤖 I am your Society Community Assistant. Need help understanding bylaws, submitting complaints, checking due dates, or getting advice? Ask me anything!`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    setMessages((prev) => [...prev, { role: "user", content: textToSend }]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.post("/ai/chat", { message: textToSend });
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.data.data.reply,
          note: res.data.data.note,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I am having trouble reaching society services. Please try again shortly.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">AI Resident Concierge</h1>
        <p className="text-xs text-gray-500 mt-0.5">Instant guidance for community services, complaints, and rules</p>
      </div>

      <Card padding={false} className="flex flex-col h-[560px]">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                  m.role === "user" ? "bg-indigo-600 text-white" : "bg-violet-100 text-violet-700"
                }`}
              >
                {m.role === "user" ? "You" : "🤖"}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-indigo-600 text-white rounded-tr-xs"
                    : "bg-slate-100 text-slate-800 rounded-tl-xs whitespace-pre-wrap"
                }`}
              >
                {m.content}
                {m.note && (
                  <p className="text-[10px] text-slate-400 mt-2 border-t border-slate-200/50 pt-1 italic">
                    💡 {m.note}
                  </p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-xs">
                🤖
              </div>
              <div className="bg-slate-100 p-3 rounded-2xl rounded-tl-xs flex items-center gap-2 text-xs text-gray-500">
                <LoadingSpinner size="sm" /> Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex gap-2 overflow-x-auto">
          {RESIDENT_SUGGESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-full shrink-0 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        <div className="p-3.5 border-t border-gray-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything about society guidelines, billing, or issue tickets..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
          />
          <Button onClick={() => handleSend()} disabled={!input.trim()} loading={loading}>
            Send
          </Button>
        </div>
      </Card>
    </div>
  );
}
