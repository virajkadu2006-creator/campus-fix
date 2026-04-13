// ============================================================
// CampusFix AI Service - High Reliability Version
// ============================================================

const MODEL = "gemini-1.5-flash"; // More reliable model for newer keys

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
  console.error("❌ AI CLASSIFICATION FAILED:", errorMsg);
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
  if (!text) return null;
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
    generationConfig: { temperature: 0.1, maxOutputTokens: 800 }
  };

  const isDev = import.meta.env.DEV;
  const localKey = import.meta.env.VITE_GEMINI_API_KEY;

  let url;
  let response;

  // LOGGING FOR DEBUGGING
  console.log("🛠️ AI Calling Mode:", isDev ? "LOCAL-DEV" : "PRODUCTION-PROXY");

  if (isDev && localKey) {
    url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${localKey}`;
    console.log("📡 [DEV] Directly calling Google API...");
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } else {
    url = "/api/gemini";
    console.log("📡 [PROD] Calling Vercel proxy...");
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`API ${response.status}: ${errorData?.error?.message || response.statusText}`);
  }

  const data = await response.json();
  console.log("📩 AI Raw Data:", data);

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("AI returned no content candidates");
  return text;
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  console.log("🤖 Classifying:", description.slice(0, 100) + "...");

  const prompt = `You are an expert university campus complaint classifier.
Analyze the complaint and classify it into one category. 

Return ONLY valid JSON. No markdown tags. No explanations.

{
  "category": "Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other",
  "confidence": <integer between 70 and 99>,
  "department": "<correct department name>",
  "priority": "High | Medium | Low",
  "reasoning": "<concise 2-sentence reason based on complaint details>"
}

Rules:
- Anti-Ragging = ALWAYS High priority
- Urgent issues (leaks, no water, no power) = High priority
- wifi / electrical / lights / lift = Infrastructure/Maintenance
- hygiene / toilets = Bathroom & Hygiene

Complaint: "${description}"`;

  try {
    const rawText = await callGemini(prompt);
    const parsed = extractJSON(rawText);
    
    if (!parsed || !parsed.category) throw new Error("Invalid format from AI");

    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      confidence: Math.max(60, Math.min(99, Number(parsed.confidence) || 75)),
      department: DEPT[parsed.category] || parsed.department || "General Administration",
      priority: ["High","Medium","Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      reasoning: parsed.reasoning || "AI successfully classified this complaint.",
      isFallback: false
    };
  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const generateNotificationMessage = async (complaint) => {
  const prompt = `Write a professional 200-word university department notification email.
Address it to the Head of ${complaint.department}.
Subject: Urgent Action Required: Complaint ID ${complaint.id}
Issue: ${complaint.description}
Priority: ${complaint.priority}
Confidence: ${complaint.confidence}%

Rules:
- Professional tone
- Clear urgency
- End with: 
CampusFix Automated Systems
Campus Complaint Management Platform

Output only the message text.`;

  try {
    const text = await callGemini(prompt);
    return text || `Dear Head of ${complaint.department},\n\nA new complaint (${complaint.id}) has been submitted.\n\nCampusFix Automated Systems`;
  } catch (err) {
    return `Dear Head of ${complaint.department},\n\nA new complaint (${complaint.id}) requires attention.\n\nCampusFix Automated Systems`;
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const history = chatHistory.slice(-4).map(m => `${m.role === 'user' ? 'Student' : 'AI'}: ${m.content}`).join("\n");
    const prompt = `You are CampusFix AI Buddy, a helpful student assistant. 
Keep answers brief (1-3 sentences).
${history}
Student: ${newMessage}
AI:`;

    const text = await callGemini(prompt);
    return text.trim();
  } catch (err) {
    return "I'm having a small technical glitch. Can you try your question again?";
  }
};

export const generateAdminInsights = async (complaints) => {
  try {
    const data = complaints.slice(0, 10).map(c => ({ cat: c.category, pri: c.priority }));
    const prompt = `Analyze these complaints and return exactly 3 insight objects as JSON array:
[{"title":"...","type":"risk|trend|positive","description":"...","recommendation":"..."}]
Data: ${JSON.stringify(data)}`;

    const text = await callGemini(prompt);
    const parsed = extractJSON(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
};
