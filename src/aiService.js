// ============================================================
// CampusFix AI Service - BULLETPROOF VERSION
// ============================================================

const MODEL = "gemini-2.5-flash"; 

const DEPT = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};

const CATEGORIES = Object.keys(DEPT);

function fallbackClassify(description, errorMsg) {
  console.error("❌ AI FAILURE:", errorMsg);
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

function extractJSON(text) {
  const clean = text.trim();
  try { return JSON.parse(clean); } catch (_) {}
  const md = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (md) { try { return JSON.parse(md[1].trim()); } catch (_) {} }
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {} }
  return null;
}

async function callGemini(prompt) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 1000 }
  };

  const localKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isDev = import.meta.env.DEV;

  // In local dev, we use the Vite proxy to /api/gemini
  // In production, we call /api/gemini which Vercel handles
  // We append the key for local proxy because the proxy is just a pass-through
  let url = `/api/gemini/v1beta/models/${MODEL}:generateContent?key=${localKey}`;
  
  // IF we are in production, the backend /api/gemini handles everything (it's a serverless function)
  // So we just call it with the body
  if (!isDev) {
    url = "/api/gemini";
  }

  console.log("📡 Calling AI via:", url);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(isDev ? payload : { contents: payload.contents }) // Match Vercel's req.body expectation
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from AI");
  return text;
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  const prompt = `Classify this university complaint and return ONLY JSON:
{
  "category": "Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other",
  "confidence": 70-99,
  "department": "Name of department",
  "priority": "High | Medium | Low",
  "reasoning": "2-sentence explanation"
}

Complaint: "${description}"`;

  try {
    const rawText = await callGemini(prompt);
    const parsed = extractJSON(rawText);
    if (!parsed) throw new Error("JSON Parse Error");
    return {
      ...parsed,
      confidence: Math.max(70, parsed.confidence),
      isFallback: false
    };
  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const context = chatHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join("\n");
    const prompt = `You are a helpful student assistant. Be concise.
${context}
Student: ${newMessage}
AI:`;
    return await callGemini(prompt);
  } catch (err) {
    console.error("Chat Error:", err);
    return "I'm experiencing a high volume of requests. Please try again in 30 seconds! 🔄";
  }
};

export const generateNotificationMessage = async (complaint) => {
  try {
    const prompt = `Write a professional 150-word email to the Head of ${complaint.department} regarding: ${complaint.description}`;
    return await callGemini(prompt);
  } catch (err) {
    return `Notification for ${complaint.department} pending.`;
  }
};

export const generateAdminInsights = async (complaints) => {
  try {
    const prompt = `Analyze these complaints and return a JSON array of 3 insights: [{"title":"","type":"risk|trend|positive","description":"","recommendation":""}]
Data: ${JSON.stringify(complaints.slice(0,5))}`;
    const text = await callGemini(prompt);
    return extractJSON(text) || [];
  } catch (err) {
    return [];
  }
};
