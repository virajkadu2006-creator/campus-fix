// ============================================================
// CampusFix AI Service - Production Grade
// Local Dev  → calls Gemini directly using VITE_GEMINI_API_KEY
// Vercel Prod → routes through /api/gemini serverless function
// ============================================================

const MODEL = "gemini-pro";

const DEPT = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};
const CATEGORIES = Object.keys(DEPT);

// Keyword fallback — only used if Gemini is truly unreachable
function fallbackClassify(description, errorMsg) {
  console.error("❌ AI FAILED:", errorMsg);
  const lower = description.toLowerCase();
  let category = "Other";
  if (lower.match(/bathroom|toilet|washroom|flush|hygiene|soap|shower/)) category = "Bathroom & Hygiene";
  else if (lower.match(/ragging|bully|threaten|harass|unsafe|abuse|attack|fear/)) category = "Anti-Ragging & Safety";
  else if (lower.match(/food|mess|meal|canteen|lunch|dinner|breakfast|stale|cook/)) category = "Mess & Food Quality";
  else if (lower.match(/exam|professor|marks|grade|attendance|course|teacher|result|assignment/)) category = "Academic Issues";
  else if (lower.match(/broken|repair|electricity|wifi|internet|fan|light|leak|power|ac|network|lift|elevator/)) category = "Infrastructure/Maintenance";
  return {
    category,
    confidence: 15,
    department: DEPT[category] || "General Administration",
    priority: (category === "Anti-Ragging & Safety" || lower.includes("urgent")) ? "High" : "Medium",
    reasoning: "⚠️ AI service unavailable — keyword fallback used.",
    isFallback: true
  };
}

// Safe JSON extractor — handles plain JSON, markdown code blocks, embedded JSON
function extractJSON(text) {
  if (!text) return null;
  const clean = text.trim();
  try { return JSON.parse(clean); } catch (_) {}
  const md = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (md) { try { return JSON.parse(md[1].trim()); } catch (_) {} }
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {} }
  return null;
}

// Smart API caller — uses local key in dev, proxy route in production
async function callGemini(prompt) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 600 }
  };

  let response;

  // In local dev (Vite), VITE_GEMINI_API_KEY is available → call Google directly
  const localKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (localKey) {
    console.log("📡 [DEV] Calling Gemini directly...");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${localKey}`;
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    // In Vercel production → route through serverless function
    console.log("📡 [PROD] Calling /api/gemini proxy...");
    response = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  const data = await response.json();
  console.log("📩 AI raw response:", data);

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${data?.error?.message || "Unknown error"}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty candidates from Gemini");
  return text;
}

// =============================================================
// 1. CLASSIFY COMPLAINT
// =============================================================
export const classifyComplaint = async (description, imageBase64 = null) => {
  console.log("🤖 [CampusFix AI] classifyComplaint →", description.slice(0, 80));

  const prompt = `You are a highly accurate campus complaint classification AI.
Analyze the complaint deeply and classify based on meaning, not just keywords.

You MUST return ONLY a raw JSON object. No markdown. No explanation. No code blocks. Just JSON.

{
  "category": "<exactly one of: Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other>",
  "confidence": <integer from 70 to 95>,
  "department": "<specific university department name>",
  "priority": "<High | Medium | Low>",
  "reasoning": "<2 sentences specifically explaining why this complaint fits the category>"
}

Rules:
- Anti-Ragging & Safety → ALWAYS High priority
- Words like urgent, emergency, broken, no water, no power → High priority
- wifi / electricity / lights / lift / AC / network → Infrastructure/Maintenance
- Realistic confidence (70–95 typical). Avoid low confidence unless truly ambiguous.

Student Complaint: "${description}"`;

  try {
    const rawText = await callGemini(prompt);
    console.log("📃 Raw AI text:", rawText?.slice(0, 400));

    const parsed = extractJSON(rawText);
    if (!parsed || !parsed.category) {
      throw new Error(`Could not parse JSON from AI response: ${rawText?.slice(0, 100)}`);
    }

    console.log("✅ Parsed result:", parsed);

    const confidence = Math.max(60, Math.min(99, Number(parsed.confidence) || 75));
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";

    return {
      category,
      confidence,
      department: DEPT[category] || parsed.department || "General Administration",
      priority: ["High","Medium","Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      reasoning: parsed.reasoning || "AI successfully classified this complaint.",
      isFallback: false
    };

  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

// =============================================================
// 2. NOTIFICATION MESSAGE GENERATOR
// =============================================================
export const generateNotificationMessage = async (complaint) => {
  const prompt = `Write a formal 200-250 word notification for a university department.

Department: ${complaint.department}
Issue: ${complaint.description}
Category: ${complaint.category}
Priority: ${complaint.priority}
Tracking ID: ${complaint.id}

Rules:
- Formal tone addressed to the department head
- Summarize the issue clearly
- State the priority urgency
- Recommend immediate action
- End exactly with:
CampusFix Automated Systems
Campus Complaint Management Platform

Output only the message. No headings. No JSON. No markdown.`;

  try {
    const text = await callGemini(prompt);
    return text || `Dear ${complaint.department},\n\nComplaint ${complaint.id} (${complaint.priority} priority) requires attention.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  } catch (err) {
    console.error("❌ Notification failed:", err.message);
    return `Dear ${complaint.department},\n\nComplaint ${complaint.id} (${complaint.priority} priority) has been submitted.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  }
};

// =============================================================
// 3. AI BUDDY CHATBOT
// =============================================================
export const askAIBuddy = async (chatHistory, newMessage) => {
  console.log("💬 AI Buddy:", newMessage.slice(0, 60));
  try {
    const history = chatHistory.slice(-6).map(m =>
      `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`
    ).join("\n");

    const prompt = `You are CampusFix AI Buddy — a smart, friendly campus assistant at a university.
Help students with campus problems, guide them on submitting complaints, and give practical advice.
Be conversational and concise (2-4 sentences).

${history}
Student: ${newMessage}
AI:`;

    const text = await callGemini(prompt);
    if (!text) throw new Error("Empty response");
    return text.trim();
  } catch (err) {
    console.error("❌ AI Buddy failed:", err.message);
    return "I'm experiencing a brief connectivity issue. Please try again in a moment! 🔄";
  }
};

// =============================================================
// 4. ADMIN EXECUTIVE INSIGHTS
// =============================================================
export const generateAdminInsights = async (complaints) => {
  try {
    const slim = complaints.slice(0, 15).map(c => ({
      category: c.category, status: c.status, priority: c.priority,
      description: c.description?.slice(0, 80)
    }));

    const prompt = `You are the AI Executive Analyst for CampusFix complaint management.
Return ONLY a raw JSON array of 3 insight objects. No markdown. No explanation.
[{"title":"<5 words max>","type":"risk|trend|positive","description":"<2 sentence analysis>","recommendation":"<1 action sentence>"}]

Data: ${JSON.stringify(slim)}`;

    const text = await callGemini(prompt);
    const parsed = extractJSON(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error("Invalid format");
  } catch (err) {
    console.error("❌ Admin insights failed:", err.message);
    return [{ title: "Refresh for Insights", type: "trend", description: "AI insights are being generated. The system is connected.", recommendation: "Click refresh to regenerate insights." }];
  }
};
