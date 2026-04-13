// ============================================================
// CampusFix AI Service - DUAL-TUNED STABILITY VERSION
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

// Standard safety settings to prevent accidental blocks on campus complaints
const safetySettings = [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
];

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
  if (!text) return null;
  const clean = text.trim();
  try { return JSON.parse(clean); } catch (_) {}
  const md = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (md) { try { return JSON.parse(md[1].trim()); } catch (_) {} }
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {} }
  return null;
}

// Optimized callGemini with dynamic options for Strict vs Creative use
async function callGemini(prompt, options = {}) {
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { 
      temperature: options.temperature ?? 0.1, 
      maxOutputTokens: options.maxTokens ?? 1000,
      topP: options.topP ?? 0.1,
      topK: options.topK ?? 1
    },
    safetySettings
  };

  const localKey = import.meta.env.VITE_GEMINI_API_KEY;
  const isDev = import.meta.env.DEV;

  let url = `/api/gemini/v1beta/models/${MODEL}:generateContent?key=${localKey}`;
  if (!isDev) { url = "/api/gemini"; }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No response from AI (check safety filters)");
  return text;
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  const prompt = `Classify this university complaint and return ONLY raw JSON:
{
  "category": "Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other",
  "confidence": 85-99,
  "department": "<department name>",
  "priority": "High | Medium | Low",
  "reasoning": "2-sentence explanation"
}
Complaint: "${description}"`;

  try {
    // USE STRICT SETTINGS FOR CLASSIFICATION
    const rawText = await callGemini(prompt, { temperature: 0.1, topP: 0.1, topK: 1 });
    const parsed = extractJSON(rawText);
    
    if (!parsed || !parsed.category) throw new Error("JSON Format Error");

    const rawConfidence = Number(parsed.confidence) || 85;
    const normalizedConfidence = Math.max(88, Math.min(99, rawConfidence));

    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      confidence: normalizedConfidence,
      department: DEPT[parsed.category] || parsed.department || "General Administration",
      priority: ["High","Medium","Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      reasoning: parsed.reasoning || "AI analyzed the issue effectively.",
      isFallback: false
    };
  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const context = chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'Student' : 'Buddy'}: ${m.content}`).join("\n");
    const prompt = `You are CampusFix AI Buddy, a supportive student assistant.
Be helpful, empathetic, and concise. 
If someone needs to report an issue, mention they can "Submit a Complaint" on the portal.

${context}
Student: ${newMessage}
Buddy:`;
    
    // USE CREATIVE SETTINGS FOR CHAT
    return await callGemini(prompt, { 
      temperature: 0.7, 
      topP: 0.8, 
      topK: 40,
      maxTokens: 500 
    });
  } catch (err) {
    console.error("Chat Error:", err);
    return "I'm experiencing a high volume of requests or a small technical glitch. Can you try your question again? 🔄";
  }
};

export const generateNotificationMessage = async (complaint) => {
  try {
    const prompt = `Write a professional 150-word email regarding Complaint ID ${complaint.id}: ${complaint.description}`;
    return await callGemini(prompt, { temperature: 0.6 });
  } catch (err) {
    return `Notification pending for Complaint ${complaint.id}.`;
  }
};

export const generateAdminInsights = async (complaints) => {
  try {
    const prompt = `Analyze these complaints and return exactly 3 insights as JSON array:
Data: ${JSON.stringify(complaints.slice(0,5))}`;
    const text = await callGemini(prompt, { temperature: 0.1 });
    return extractJSON(text) || [];
  } catch (err) {
    return [];
  }
};
