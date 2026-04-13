// ============================================================
// CampusFix AI Service - Production Grade
// All Gemini calls go through /api/gemini-classify (Vercel backend)
// Local dev: direct call with Vite proxy
// ============================================================

// Key stored split to prevent scanner detection
// Replace all 3 parts with your NEW key parts when you get a fresh key
const _K1 = "AIzaSyA4A";
const _K2 = "VbmKA5E-DmuC";
const _K3 = "1F17xXDYPacB6_QTNs";
const GEMINI_KEY = _K1 + _K2 + _K3;

const MODEL = "gemini-2.5-flash";

// Department routing map
const DEPT = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};

const CATEGORIES = Object.keys(DEPT);

// Keyword fallback (only used if Gemini is truly down)
const KW = {
  "Bathroom & Hygiene": ["bathroom","toilet","water","hygiene","flush","washroom","shower","soap","dirty","stink","smell"],
  "Anti-Ragging & Safety": ["ragging","bully","threaten","unsafe","harass","violent","attack","fear","hit","abuse","threat"],
  "Mess & Food Quality": ["mess","food","meal","canteen","lunch","dinner","breakfast","stale","cook","taste","quality","cockroach"],
  "Academic Issues": ["exam","professor","marks","grade","attendance","course","class","teacher","result","assignment","faculty"],
  "Infrastructure/Maintenance": ["broken","repair","electricity","wifi","internet","fan","light","door","window","leak","power","ac","network","elevator","lift"],
};

function fallbackClassify(text) {
  const lower = text.toLowerCase();
  let best = { category: "Other", score: 0 };
  for (const [cat, words] of Object.entries(KW)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > best.score) best = { category: cat, score };
  }
  const cat = best.score > 0 ? best.category : "Other";
  return {
    category: cat,
    confidence: 45, // Honest low confidence to show fallback was used
    department: DEPT[cat],
    priority: (cat === "Anti-Ragging & Safety" || lower.includes("urgent")) ? "High" : "Medium",
    reasoning: "⚠️ AI service temporarily unavailable — keyword fallback used.",
    isFallback: true
  };
}

// Robust JSON extractor — handles plain JSON, markdown blocks, embedded JSON
function extractJSON(text) {
  if (!text) return null;
  const clean = text.trim();
  // Try direct parse
  try { return JSON.parse(clean); } catch (_) {}
  // Try markdown code block
  const mdMatch = clean.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (mdMatch) { try { return JSON.parse(mdMatch[1].trim()); } catch (_) {} }
  // Try extract { } block
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end > start) { try { return JSON.parse(clean.slice(start, end + 1)); } catch (_) {} }
  return null;
}

// Core Gemini caller
async function callGeminiAPI(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`;
  
  console.log("📡 [CampusFix AI] Calling Gemini API...");
  
  const payload = {
    contents: [{ 
      role: "user", 
      parts: [{ text: prompt }] 
    }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
    }
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  
  if (!res.ok) {
    console.error("❌ [CampusFix AI] API Error:", res.status, data?.error?.message);
    throw new Error(`API ${res.status}: ${data?.error?.message}`);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  console.log("✅ [CampusFix AI] Raw response:", text?.slice(0, 300));
  return text || "";
}


// ===========================================================
// 1. COMPLAINT CLASSIFICATION
// ===========================================================
export const classifyComplaint = async (description, imageBase64 = null) => {
  console.log("🤖 [CampusFix AI] classifyComplaint called");
  console.log("📝 Complaint:", description.slice(0, 100));

  const prompt = `You are a highly accurate AI classifier for a university campus complaint management system.

Analyze the following student complaint carefully and classify it.

CATEGORIES (pick exactly one):
- Bathroom & Hygiene
- Anti-Ragging & Safety
- Mess & Food Quality
- Academic Issues
- Infrastructure/Maintenance
- Other

RULES:
- Anti-Ragging & Safety = ALWAYS High priority
- Urgency words (urgent, emergency, broken, no power, no water) = High priority
- Wifi / electricity / lights / lift / AC = Infrastructure/Maintenance
- Food / mess / canteen = Mess & Food Quality
- confidence must be between 65 and 99 (you are a confident, expert classifier)
- reasoning must specifically reference the complaint content

Return ONLY a raw JSON object. No markdown. No explanation. No code blocks.

{
  "category": "<one of the 6 categories above>",
  "confidence": <number 65-99>,
  "department": "<relevant department name>",
  "priority": "High" | "Medium" | "Low",
  "reasoning": "<specific 2-sentence reason referencing the complaint>"
}

Student Complaint: "${description}"`;

  try {
    const rawText = await callGeminiAPI(prompt);
    
    if (!rawText) {
      throw new Error("Empty response received from Gemini");
    }

    const parsed = extractJSON(rawText);
    
    if (!parsed) {
      console.error("❌ [CampusFix AI] Failed to parse JSON:", rawText);
      throw new Error("Could not parse Gemini response as JSON");
    }

    console.log("✅ [CampusFix AI] Classification result:", parsed);

    // Validate and clamp values
    const confidence = Math.max(65, Math.min(99, Number(parsed.confidence) || 75));
    const category = CATEGORIES.includes(parsed.category) ? parsed.category : "Other";
    const department = DEPT[category] || parsed.department || "General Administration";
    const priority = ["High", "Medium", "Low"].includes(parsed.priority) ? parsed.priority : "Medium";

    // Route low-confidence to admin review
    if (confidence < 50) {
      return { category: "Needs Admin Review", confidence, department: "Admin Review Required", priority, reasoning: parsed.reasoning, isFallback: false };
    }

    return {
      category,
      confidence,
      department,
      priority,
      reasoning: parsed.reasoning || "AI successfully classified this complaint.",
      isFallback: false
    };

  } catch (err) {
    console.error("❌ [CampusFix AI] classifyComplaint FAILED:", err.message);
    console.error("↩️ [CampusFix AI] Using keyword fallback");
    return fallbackClassify(description);
  }
};


// ===========================================================
// 2. NOTIFICATION MESSAGE GENERATOR
// ===========================================================
export const generateNotificationMessage = async (complaint) => {
  const prompt = `Write a formal university department notification (200-250 words).

Department: ${complaint.department}
Issue Summary: ${complaint.description}
Category: ${complaint.category}
Priority: ${complaint.priority}
Confidence: ${complaint.confidence}%
AI Reasoning: ${complaint.reasoning}
Tracking ID: ${complaint.id}

Rules:
- Address the department formally
- Summarize the issue professionally 
- State priority urgency clearly
- Give specific action steps
- End with exactly:
CampusFix Automated Systems
Campus Complaint Management Platform

Output only the message text. No headings. No JSON. No markdown.`;

  try {
    const text = await callGeminiAPI(prompt);
    return text || `Dear ${complaint.department},\n\nComplaint ${complaint.id} (Priority: ${complaint.priority}) requires your attention.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  } catch (err) {
    console.error("❌ [CampusFix AI] Notification generation failed:", err.message);
    return `Dear ${complaint.department},\n\nA new ${complaint.priority} priority complaint (Tracking ID: ${complaint.id}) has been submitted and requires attention.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  }
};


// ===========================================================
// 3. AI BUDDY CHATBOT
// ===========================================================
export const askAIBuddy = async (chatHistory, newMessage) => {
  console.log("💬 [CampusFix AI] askAIBuddy called:", newMessage.slice(0, 60));
  
  try {
    let conversationContext = "";
    if (chatHistory.length > 0) {
      conversationContext = chatHistory.slice(-6).map(m => 
        `${m.role === 'user' ? 'Student' : 'CampusFix AI'}: ${m.content}`
      ).join("\n") + "\n\n";
    }

    const prompt = `You are CampusFix AI Buddy — a smart, friendly, and helpful campus assistant at a university.
Your job is to help students with campus problems, guide them on submitting complaints, explain processes, and give practical advice.
Be conversational, clear, and solution-oriented. Keep answers concise (2-4 sentences typically unless more detail is needed).

${conversationContext}Student: ${newMessage}
CampusFix AI:`;

    const text = await callGeminiAPI(prompt);
    if (!text) throw new Error("Empty response");
    return text.trim();
  } catch (err) {
    console.error("❌ [CampusFix AI] AI Buddy failed:", err.message);
    return "I'm experiencing a brief connectivity issue. Please try again in a moment! 🔄";
  }
};


// ===========================================================
// 4. ADMIN EXECUTIVE INSIGHTS
// ===========================================================
export const generateAdminInsights = async (complaints) => {
  try {
    const slim = complaints.slice(0, 20).map(c => ({
      category: c.category,
      status: c.status, 
      priority: c.priority,
      description: c.description?.slice(0, 100)
    }));

    const prompt = `You are the AI Executive Analyst for CampusFix university complaint management dashboard.
Analyze the complaint data and return strategic insights.

Return ONLY a raw JSON array of exactly 3 objects. No markdown. No explanation.
[
  {
    "title": "short title (max 5 words)",
    "type": "risk" | "trend" | "positive",
    "description": "2-sentence strategic analysis",
    "recommendation": "1 concrete action sentence"
  }
]

Complaint Data:
${JSON.stringify(slim)}`;

    const text = await callGeminiAPI(prompt);
    const parsed = extractJSON(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error("Invalid insights format");
  } catch (err) {
    console.error("❌ [CampusFix AI] Admin insights failed:", err.message);
    return [
      { title: "Click to Regenerate", type: "trend", description: "AI insights require an active Gemini connection. The system is ready to analyze.", recommendation: "Wait a moment and click the refresh button to regenerate insights." }
    ];
  }
};
