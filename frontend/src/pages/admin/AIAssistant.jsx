import React, { useState, useRef, useEffect } from "react";
import api from "../../api/axios";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LoadingSpinner from "../../components/ui/LoadingSpinner";
import { useAuth } from "../../context/AuthContext";

const QUICK_QUERIES = [
  "How many open complaints require immediate resolution?",
  "What is our current monthly collection rate?",
  "How many residents are currently pending verification?",
  "Give me recommendations to improve society sanitation and security.",
];

export default function AdminAIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "Hello Admin! 🤖 I am your Society Management AI Assistant. I can analyze complaints, summarize revenue, triage tickets, and guide you on society operations. How may I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("chat");

  // Complaint analyzer
  const [analyzeForm, setAnalyzeForm] = useState({ title: "", description: "" });
  const [analysis, setAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (customText) => {
    const textToSend = customText || input;
    if (!textToSend.trim()) return;

    const userMsg = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
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
          content: "Sorry, I encountered an issue generating a response. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeComplaint = async (e) => {
    e.preventDefault();
    setAnalysis(null);
    setAnalyzing(true);
    try {
      const res = await api.post("/ai/analyze-complaint", analyzeForm);
      setAnalysis(res.data.data.analysis);
    } catch {
      setAnalysis({ error: "Failed to perform AI analysis on complaint." });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">AI Society Intelligence</h1>
          <p className="text-xs text-gray-500 mt-0.5">Automated triage, society analytics assistant, and diagnostics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "chat" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("chat")}
          >
            💬 Interactive Assistant
          </Button>
          <Button
            variant={tab === "analyzer" ? "primary" : "secondary"}
            size="sm"
            onClick={() => setTab("analyzer")}
          >
            🔍 AI Ticket Analyzer
          </Button>
        </div>
      </div>

      {tab === "chat" ? (
        <Card padding={false} className="flex flex-col h-[560px]">
          {/* Messages list */}
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
                  <LoadingSpinner size="sm" /> Analyzing society database...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick query chips */}
          <div className="p-3 border-t border-gray-100 bg-gray-50/60 flex gap-2 overflow-x-auto">
            {QUICK_QUERIES.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 px-3 py-1.5 rounded-full shrink-0 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Chat input */}
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
              placeholder="Ask anything about complaints, pending billing, or society occupancy..."
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
            />
            <Button onClick={() => handleSend()} disabled={!input.trim()} loading={loading}>
              Send
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <h3 className="text-base font-bold text-gray-900 mb-2">Automated Ticket Classifier & Diagnosis</h3>
            <p className="text-xs text-gray-500 mb-4">
              Enter any resident complaint to have the AI suggest appropriate categories, severity triage, and step-by-step action plans.
            </p>

            <form onSubmit={handleAnalyzeComplaint} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Complaint Title *
                </label>
                <input
                  required
                  value={analyzeForm.title}
                  onChange={(e) => setAnalyzeForm({ ...analyzeForm, title: e.target.value })}
                  placeholder="e.g. Basement water flooding near Block B elevator"
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                  Incident Description *
                </label>
                <textarea
                  required
                  rows={4}
                  value={analyzeForm.description}
                  onChange={(e) => setAnalyzeForm({ ...analyzeForm, description: e.target.value })}
                  placeholder="Provide complete breakdown of the reported incident..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <Button type="submit" loading={analyzing}>
                🔍 Run AI Diagnostic
              </Button>
            </form>
          </Card>

          {analysis && (
            <Card>
              <h3 className="text-base font-bold text-gray-900 mb-3">AI Diagnostic Report</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Category</p>
                  <p className="font-bold text-gray-900 mt-0.5">{analysis.suggestedCategory}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Priority Severity</p>
                  <p className="font-bold text-gray-900 mt-0.5">{analysis.suggestedPriority}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[11px] text-gray-500 font-semibold uppercase">Sentiment</p>
                  <p className="font-bold text-gray-900 mt-0.5 capitalize">{analysis.sentiment}</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 mb-4">
                <p className="text-xs font-bold text-indigo-900 mb-1">Executive Summary</p>
                <p className="text-xs text-indigo-700 leading-relaxed">{analysis.summary}</p>
              </div>

              <div>
                <p className="text-xs font-bold text-gray-800 mb-2">Recommended Action Protocol</p>
                <ul className="space-y-1.5 text-xs text-gray-600">
                  {analysis.recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">✓</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
