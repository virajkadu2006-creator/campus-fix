// ============================================================
// CampusFix AI Service - GOOGLE GEMINI VERSION
// ============================================================

const MODEL = "gemini-flash-latest"; 

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
    reasoning: "⚠️ Gemini service unavailable — keyword fallback used.",
    isFallback: true
  };
}

function extractJSON(text) {
  if (!text) return null;
  const clean = text.trim();
  try { return JSON.parse(clean); } catch (_) {}
  // Handle markdown blocks
  const md = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (md) { try { return JSON.parse(md[1].trim()); } catch (_) {} }
  // Handle loose curly braces
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {} }
  return null;
}

/**
 * Modernized for Google Gemini API via Fetch
 */
async function callGemini(prompt, options = {}) {
  const isDev = import.meta.env.DEV;
  // Support both new GEMINI key and legacy OPENAI variable name if user just swapped values
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing Gemini API Key. Please update your .env file.");
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 1000,
      topP: 0.95,
      topK: 40
    }
  };

  if (isDev) {
    console.log(`📡 [DEV] Calling Gemini API (${MODEL})...`);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error?.message || `HTTP ${response.status}`);
  }

  const content = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty response from Gemini");
  return content;
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  const prompt = `You are a university administrator. Classify this complaint into one of these categories: ${CATEGORIES.join(", ")}.
Return ONLY raw JSON in this format:
{
  "category": "Selected Category",
  "confidence": 85-99,
  "department": "Name of department handling this",
  "priority": "High | Medium | Low",
  "reasoning": "Brief explanation"
}

Complaint: "${description}"`;

  try {
    const rawText = await callGemini(prompt, { temperature: 0.1 });
    const parsed = extractJSON(rawText);
    
    if (!parsed || !parsed.category) throw new Error("Invalid Gemini response format");

    return {
      category: CATEGORIES.includes(parsed.category) ? parsed.category : "Other",
      confidence: Math.max(90, Number(parsed.confidence) || 90),
      department: DEPT[parsed.category] || parsed.department || "General Administration",
      priority: ["High","Medium","Low"].includes(parsed.priority) ? parsed.priority : "Medium",
      reasoning: parsed.reasoning || "Complaint classified by Gemini Intelligence.",
      isFallback: false
    };
  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const historyContext = chatHistory.slice(-5).map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join("\n");
    const systemPrompt = "You are the CampusFix AI Buddy, a helpful and empathetic university assistant. Keep responses concise and friendly.\n\n";
    const prompt = `${systemPrompt}${historyContext}\nStudent: ${newMessage}\nAssistant:`;
    
    return await callGemini(prompt, { temperature: 0.7 });
  } catch (err) {
    console.error("Chat Error:", err);
    return "I'm having a bit of trouble connecting. Could you please try your message again?";
  }
};

export const generateNotificationMessage = async (complaint) => {
  try {
    const prompt = `Write a professional 100-word email notification to a student regarding their complaint: "${complaint.description}". The department handling this is ${complaint.department}.`;
    return await callGemini(prompt, { temperature: 0.5 });
  } catch (err) {
    return `Notification pending for ${complaint.department}.`;
  }
};

export const generateAdminInsights = async (complaints) => {
  try {
    const prompt = `Analyze these latest university complaints and return exactly 3 high-level insights as a JSON array of strings:
Data: ${JSON.stringify(complaints.slice(0,5))}
Only return the JSON array [ "Insight 1", "Insight 2", "Insight 3" ].`;
    
    const text = await callGemini(prompt, { temperature: 0.2 });
    return extractJSON(text) || [];
  } catch (err) {
    return ["AI insights currently unavailable.", "Monitoring systems remain active.", "Check department logs for updates."];
  }
};
