// ============================================================
// CampusFix AI Service - Senior Full-Stack Refactor
// Calls secure backend route: /api/gemini
// ============================================================

const DEPT = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};

// Keyword fallback (ONLY used if API explicitly fails)
function fallbackClassify(description, errorMsg) {
  console.warn("⚠️ AI SERVICE FAILED: ", errorMsg);
  const lower = description.toLowerCase();
  let category = "Other";
  
  if (lower.includes("bathroom") || lower.includes("toilet") || lower.includes("water")) category = "Bathroom & Hygiene";
  else if (lower.includes("ragging") || lower.includes("bully") || lower.includes("secure")) category = "Anti-Ragging & Safety";
  else if (lower.includes("food") || lower.includes("mess") || lower.includes("meal")) category = "Mess & Food Quality";
  else if (lower.includes("exam") || lower.includes("professor") || lower.includes("marks")) category = "Academic Issues";
  else if (lower.includes("broken") || lower.includes("fan") || lower.includes("electricity") || lower.includes("wifi")) category = "Infrastructure/Maintenance";

  return {
    category,
    confidence: 15, // Real low value for fallback
    department: DEPT[category] || "General Administration",
    priority: (category === "Anti-Ragging & Safety" || lower.includes("urgent")) ? "High" : "Medium",
    reasoning: "⚠️ AI service unavailable — keyword fallback used.",
    isFallback: true
  };
}

// Safer JSON extraction
function extractJSON(text) {
  try { return JSON.parse(text); } catch (e) {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch (e2) { return null; }
    }
    return null;
  }
}

// Step 1: Securely call backend proxy
async function callInternalAPI(payload) {
  console.log("📡 [CampusFix AI] Sending to AI:", payload);
  
  const response = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  console.log("📡 [CampusFix AI] AI raw response:", data);
  
  if (!response.ok) throw new Error(data.error?.message || "Internal API Error");
  return data;
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  const prompt = `You are a highly accurate campus complaint classification AI.

Analyze the complaint deeply and classify based on meaning, not just keywords.

Classify this complaint into one category and return ONLY JSON:

{
  "category": "Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other",
  "confidence": number (0-100),
  "department": "Name of department",
  "priority": "High | Medium | Low",
  "reasoning": "Short 1-2 sentence explanation"
}

Ensure:
- No extra text
- No markdown
- Always valid JSON
- Realistic confidence (70–95 typical)
- Avoid low confidence unless truly ambiguous.

Complaint:
"${description}"`;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };

    const data = await callInternalAPI(payload);
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("No text candidates returned from AI");

    const parsed = extractJSON(rawText);
    if (!parsed) throw new Error("Could not parse AI response as JSON");

    console.log("✅ [CampusFix AI] Parsed result:", parsed);

    // Step 5: Confidence Clamp Fix
    const confidence = Math.max(parsed.confidence || 75, 60);

    return {
      category: parsed.category || "Other",
      confidence: confidence,
      department: parsed.department || DEPT[parsed.category] || "General Administration",
      priority: parsed.priority || "Medium",
      reasoning: parsed.reasoning || "AI successfully analyzed your complaint",
      isFallback: false
    };

  } catch (err) {
    return fallbackClassify(description, err.message);
  }
};

export const askAIBuddy = async (chatHistory, newMessage) => {
  const prompt = `You are CampusFix AI Buddy — a smart, friendly campus assistant.
Help students with campus-related issues, give clear practical advice, and stay conversational.

${chatHistory.map(m => `${m.role}: ${m.content}`).join("\n")}
user: ${newMessage}`;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const data = await callInternalAPI(payload);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm sorry, I couldn't process that.";
  } catch (err) {
    console.error("AI Buddy Error:", err);
    return "AI assistant is currently unavailable. Please try again.";
  }
};

// Insights using the same proxy
export const generateAdminInsights = async (complaints) => {
  const prompt = `Analyze these campus complaints and return exactly 3 insight objects as JSON:
[{"title":"...","type":"risk|trend|positive","description":"...","recommendation":"..."}]

Data: ${JSON.stringify(complaints.slice(0, 10))}`;

  try {
    const payload = {
      contents: [{ parts: [{ text: prompt }] }]
    };
    const data = await callInternalAPI(payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return extractJSON(text) || [];
  } catch (err) {
    console.error("Admin Insights Error:", err);
    return [];
  }
};
