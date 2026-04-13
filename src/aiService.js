// ============================================================
// CampusFix AI Service - OPENAI MIGRATION VERSION
// ============================================================

const MODEL = "gpt-4o-mini"; // Standard modern choice for efficiency and speed

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
    reasoning: "⚠️ OpenAI service unavailable — keyword fallback used.",
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

// Rewritten for OpenAI Chat Completions format
async function callOpenAI(prompt, options = {}) {
  const isDev = import.meta.env.DEV;
  const localKey = import.meta.env.VITE_OPENAI_API_KEY;

  const payload = {
    model: MODEL,
    messages: [
      { role: "system", content: "You are an assistant for CampusFix, a university complaint management platform." },
      { role: "user", content: prompt }
    ],
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 1000
  };

  let url;
  let headers = { "Content-Type": "application/json" };

  if (isDev && localKey) {
    url = "https://api.openai.com/v1/chat/completions";
    headers["Authorization"] = `Bearer ${localKey}`;
    console.log("📡 [DEV] Directly calling OpenAI API...");
  } else {
    url = "/api/openai";
    console.log("📡 [PROD] Calling OpenAI proxy...");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response from OpenAI");
  return content;
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
    const rawText = await callOpenAI(prompt, { temperature: 0.1 }); // Use low temp for classification logic
    const parsed = extractJSON(rawText);
    
    if (!parsed || !parsed.category) throw new Error("JSON Format Error");

    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      confidence: Math.max(90, Number(parsed.confidence) || 90),
      department: DEPT[parsed.category] || parsed.department || "General Administration",
      priority: ["High","Medium","Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      reasoning: parsed.reasoning || "Complaint classified by OpenAI GPT-4o-mini.",
      isFallback: false
    };
  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const historyContext = chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join("\n");
    const prompt = `You are the CampusFix AI Buddy. Be helpful and empathetic.
${historyContext}
Student: ${newMessage}
Assistant:`;
    
    return await callOpenAI(prompt, { temperature: 0.7 });
  } catch (err) {
    console.error("Chat Error:", err);
    return "I'm having a small glitch connecting to my neural network. Can you try that again?";
  }
};

export const generateNotificationMessage = async (complaint) => {
  try {
    const prompt = `Write a professional 150-word email notification regarding: ${complaint.description}`;
    return await callOpenAI(prompt, { temperature: 0.5 });
  } catch (err) {
    return `Notification pending for ${complaint.department}.`;
  }
};

export const generateAdminInsights = async (complaints) => {
  try {
    const prompt = `Analyze these 5 complaints and return exactly 3 insights as JSON array:
Data: ${JSON.stringify(complaints.slice(0,5))}`;
    const text = await callOpenAI(prompt, { temperature: 0.2 });
    return extractJSON(text) || [];
  } catch (err) {
    return [];
  }
};
