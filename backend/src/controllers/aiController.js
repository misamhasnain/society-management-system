import Complaint from "../models/Complaint.js";
import User from "../models/User.js";
import Payment from "../models/Payment.js";

const ok = (res, status, message, data = {}) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, status, message, errors = []) =>
  res.status(status).json({ success: false, message, errors });

// Calls Gemini API (or returns local fallback if key missing)
async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return null; // fallback
  }
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 1024 },
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.error("Gemini API call failed:", err.message);
    return null;
  }
}

// POST /api/ai/chat
export const chat = async (req, res) => {
  const { message } = req.body || {};
  if (!message || String(message).trim().length < 2) {
    return fail(res, 400, "Message is required.");
  }

  const userMsg = String(message).trim().slice(0, 1000);

  // Build context from DB
  const [totalResidents, pendingComplaints, unpaidCount] = await Promise.all([
    User.countDocuments({ role: "resident", approvalStatus: "approved", isActive: true }),
    Complaint.countDocuments({ status: { $in: ["Pending", "In Progress"] } }),
    Payment.countDocuments({ status: "Unpaid" }),
  ]);

  const systemContext = `You are an AI assistant for a residential society management system. 
Current society stats: ${totalResidents} approved residents, ${pendingComplaints} open complaints, ${unpaidCount} unpaid bills.
You help admins and residents with society-related queries. Be helpful, concise, and professional.
User role: ${req.user.role}. User name: ${req.user.name}.`;

  const fullPrompt = `${systemContext}\n\nUser question: ${userMsg}`;

  const aiReply = await callGemini(fullPrompt);

  if (aiReply) {
    return ok(res, 200, "AI response generated.", { reply: aiReply });
  }

  // Fallback: rule-based responses
  const lower = userMsg.toLowerCase();
  let reply = "";

  if (lower.includes("complaint") && (lower.includes("how") || lower.includes("submit") || lower.includes("file"))) {
    reply = "To submit a complaint, go to the Complaints section in your dashboard and click 'New Complaint'. Fill in the title, description, category, and priority, then submit.";
  } else if (lower.includes("payment") || lower.includes("bill") || lower.includes("maintenance")) {
    reply = `Currently there are ${unpaidCount} unpaid bills in the system. Residents can view their payment status in the Payments section of their dashboard.`;
  } else if (lower.includes("resident") && req.user.role === "admin") {
    reply = `There are currently ${totalResidents} approved residents in the society. You can manage residents from the Residents section in the admin panel.`;
  } else if (lower.includes("complaint") && req.user.role === "admin") {
    reply = `There are ${pendingComplaints} open complaints requiring attention. Visit the Complaints section to review and update their status.`;
  } else if (lower.includes("notice")) {
    reply = "Notices are published from the Notice Board section. Admins can create and manage notices; residents can view all active notices.";
  } else if (lower.includes("visitor")) {
    reply = "Visitor records are managed in the Visitors section. Admins can log visitor entries and mark exits.";
  } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("help")) {
    reply = `Hello ${req.user.name}! I'm your Society AI Assistant. I can help you with information about complaints, payments, residents, notices, and other society matters. What would you like to know?`;
  } else {
    reply = `I understand you're asking about "${userMsg}". As the Society AI Assistant, I can help with complaints, payments, residents, houses, notices, visitors, and general society management queries. Could you be more specific about what you need?`;
  }

  return ok(res, 200, "Response generated.", {
    reply,
    note: process.env.GEMINI_API_KEY ? undefined : "Using smart local rules. Add GEMINI_API_KEY to backend .env for Live AI responses.",
  });
};

// POST /api/ai/analyze-complaint
export const analyzeComplaint = async (req, res) => {
  const { title, description } = req.body || {};
  if (!title || !description) {
    return fail(res, 400, "Title and description are required.");
  }

  const t = String(title).trim();
  const d = String(description).trim();

  const prompt = `Analyze this society complaint and respond with a JSON object only (no markdown, no extra text):
{
  "suggestedCategory": "Water" | "Electricity" | "Sanitation" | "Security" | "Other",
  "suggestedPriority": "Low" | "Medium" | "High",
  "sentiment": "neutral" | "frustrated" | "urgent",
  "summary": "one sentence summary",
  "recommendations": ["action 1", "action 2"]
}

Title: ${t}
Description: ${d}`;

  const aiReply = await callGemini(prompt);

  if (aiReply) {
    try {
      const jsonMatch = aiReply.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return ok(res, 200, "Complaint analyzed.", { analysis: parsed });
      }
    } catch {
      // Fall through to rule-based
    }
  }

  // Rule-based fallback analysis
  const lower = (t + " " + d).toLowerCase();
  let category = "Other";
  let priority = "Medium";
  let sentiment = "neutral";

  if (lower.includes("water") || lower.includes("pipe") || lower.includes("leak") || lower.includes("flood") || lower.includes("tank")) {
    category = "Water";
  } else if (lower.includes("electric") || lower.includes("power") || lower.includes("light") || lower.includes("wiring") || lower.includes("generator") || lower.includes("voltage")) {
    category = "Electricity";
  } else if (lower.includes("garbage") || lower.includes("waste") || lower.includes("smell") || lower.includes("drain") || lower.includes("sewer") || lower.includes("trash")) {
    category = "Sanitation";
  } else if (lower.includes("security") || lower.includes("theft") || lower.includes("guard") || lower.includes("cctv") || lower.includes("stranger") || lower.includes("gate") || lower.includes("lock")) {
    category = "Security";
  }

  if (lower.includes("urgent") || lower.includes("emergency") || lower.includes("immediately") || lower.includes("critical") || lower.includes("danger") || lower.includes("spark")) {
    priority = "High";
    sentiment = "urgent";
  } else if (lower.includes("frustrated") || lower.includes("angry") || lower.includes("unacceptable") || lower.includes("repeated") || lower.includes("again")) {
    sentiment = "frustrated";
    priority = "Medium";
  }

  const recommendations = {
    Water: ["Inspect main valves and plumbing lines immediately", "Contact technician / water board", "Notify affected wing/block residents"],
    Electricity: ["Check breaker panel and isolate current", "Dispatch certified society electrician", "Ensure emergency backup is operational"],
    Sanitation: ["Dispatch sanitation and cleaning crew", "Inspect sewer lines and drainage flow", "Apply odor treatment and schedule follow-up inspection"],
    Security: ["Review gate CCTV logs and checkpoint entries", "Brief on-duty security supervisors", "Alert residents if security protocol was compromised"],
    Other: ["Assign to society maintenance coordinator", "Initiate on-site inspection", "Contact resident for clarification"],
  };

  return ok(res, 200, "Complaint analyzed.", {
    analysis: {
      suggestedCategory: category,
      suggestedPriority: priority,
      sentiment,
      summary: `A ${priority.toLowerCase()} priority ${category.toLowerCase()} issue reported: ${t.slice(0, 80)}`,
      recommendations: recommendations[category] || recommendations.Other,
    },
    note: process.env.GEMINI_API_KEY ? undefined : "Analyzed using built-in society intelligence rules. Set GEMINI_API_KEY for Gemini AI.",
  });
};
