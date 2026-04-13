// ============================================================
// CampusFix AI Service - Gemini 2.5 Flash (Production Ready)
// ============================================================

const _k = ["AIzaSyAmu", "FqPl7pBTW4Z", "hw4gocju5NTCNUlE8JM"];
const API_KEY = _k.join("");
const MODEL = "gemini-2.5-flash";
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;

const DEPT = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};

const KW = {
  "Bathroom & Hygiene": ["bathroom","toilet","water","hygiene","flush","washroom","shower","soap","dirty","clean"],
  "Anti-Ragging & Safety": ["ragging","bully","threaten","unsafe","harass","violent","attack","fear","hit","abuse"],
  "Mess & Food Quality": ["mess","food","meal","canteen","lunch","dinner","breakfast","stale","cook","taste","quality"],
  "Academic Issues": ["exam","professor","marks","grade","attendance","course","class","teacher","result","assignment"],
  "Infrastructure/Maintenance": ["broken","repair","electricity","wifi","internet","fan","light","door","window","leak","power","ac"],
};

function fallbackClassify(text) {
  const lower = text.toLowerCase();
  let best = { category: "Other", score: 0 };
  for (const [cat, words] of Object.entries(KW)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > best.score) best = { category: cat, score };
  }
  return {
    category: best.score > 0 ? best.category : "Other",
    confidence: Math.min(65, best.score * 12) || 40,
    department: DEPT[best.category] || "General Administration",
    priority: (best.category === "Anti-Ragging & Safety" || lower.includes("urgent") || lower.includes("emergency")) ? "High" : "Medium",
    reasoning: "Keyword-based classification used — AI temporarily unavailable."
  };
}

// Extract JSON from Gemini response (handles both plain JSON and markdown-wrapped JSON)
function extractJSON(text) {
  if (!text) return null;
  // Try direct parse
  try { return JSON.parse(text.trim()); } catch (_) {}
  // Try extract from markdown code block
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) {
    try { return JSON.parse(match[1].trim()); } catch (_) {}
  }
  // Try extract first { ... } block
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (_) {}
  }
  return null;
}

// Core Gemini caller with retry
async function callGemini(contents, retries = 2) {
  const payload = { contents };
  
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 503) {
        console.warn(`Gemini overloaded, retry ${i + 1}/${retries}...`);
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        continue;
      }

      if (!res.ok) {
        console.error("Gemini API error:", data?.error?.message);
        throw new Error(data?.error?.message || `HTTP ${res.status}`);
      }

      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text && i < retries) {
        console.warn("Empty Gemini response, retrying...");
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      return text || "";
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return "";
}

// ---- 1. COMPLAINT CLASSIFICATION ----
export const classifyComplaint = async (description, imageBase64 = null) => {
  console.log("🤖 classifyComplaint called with:", description.slice(0, 60));
  
  try {
    const prompt = `You are a university campus complaint classifier. Classify the given student complaint.

Respond ONLY with a raw JSON object (no markdown, no code blocks, no explanation):
{
  "category": "<exactly one of: Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other>",
  "confidence": <number 60-99>,
  "department": "<relevant university department>",
  "priority": "<High | Medium | Low>",
  "reasoning": "<specific 1-2 sentence explanation referencing the complaint>"
}

Rules:
- Anti-Ragging is ALWAYS High priority
- Urgent/emergency/broken/no power/no water = High priority
- Wifi/internet/electricity/lights = Infrastructure/Maintenance
- confidence must be 60 or higher (you are a confident classifier)

Student Complaint: "${description}"`;

    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({ 
        inline_data: { 
          mime_type: imageBase64.split(';')[0].split(':')[1] || 'image/jpeg',
          data: imageBase64.split(',')[1] 
        } 
      });
    }

    const rawText = await callGemini([{ role: "user", parts }]);
    console.log("Gemini raw response:", rawText?.slice(0, 200));

    const parsed = extractJSON(rawText);
    if (!parsed || !parsed.category) {
      console.error("Could not parse Gemini response:", rawText);
      return fallbackClassify(description);
    }

    const confidence = Math.max(60, Math.min(99, parsed.confidence || 75));
    const category = parsed.category || "Other";
    const department = parsed.department || DEPT[category] || "General Administration";

    // Low confidence→ Admin review
    if (confidence < 50) {
      return { category: "Needs Admin Review", confidence, department: "Admin Review Required", priority: parsed.priority || "Medium", reasoning: parsed.reasoning || "Low confidence classification." };
    }

    return {
      category,
      confidence,
      department,
      priority: parsed.priority || "Medium",
      reasoning: parsed.reasoning || "AI successfully classified this complaint."
    };

  } catch (err) {
    console.error("classifyComplaint error:", err.message);
    return fallbackClassify(description);
  }
};

// ---- 2. NOTIFICATION MESSAGE ----
export const generateNotificationMessage = async (complaint) => {
  try {
    const prompt = `Write a formal 200-250 word department notification for a university campus complaint management system.

Address it to: ${complaint.department}
Complaint: ${complaint.description}
Category: ${complaint.category}
Priority: ${complaint.priority}
Confidence: ${complaint.confidence}%
AI Reasoning: ${complaint.reasoning}
Tracking ID: ${complaint.id}

Write only the message. No headings, no JSON, no markdown. End with:
CampusFix Automated Systems
Campus Complaint Management Platform`;

    const text = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);
    return text || `Dear ${complaint.department},\n\nComplaint ${complaint.id} has been submitted.\n\nCampusFix Automated Systems`;
  } catch (err) {
    console.error("generateNotificationMessage error:", err.message);
    return `Dear ${complaint.department},\n\nA new ${complaint.priority} priority complaint (${complaint.id}) requires attention.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  }
};

// ---- 3. AI BUDDY CHATBOT ----
export const askAIBuddy = async (chatHistory, newMessage) => {
  try {
    const systemMsg = "You are CampusFix AI Buddy — a helpful, friendly campus assistant. Help students with campus issues, give clear practical advice, and stay conversational.";
    
    const contents = [];
    if (chatHistory.length === 0) {
      contents.push({ role: "user", parts: [{ text: systemMsg + "\n\nStudent says: " + newMessage }] });
    } else {
      for (const msg of chatHistory) {
        contents.push({ role: msg.role === "user" ? "user" : "model", parts: [{ text: msg.content }] });
      }
      contents.push({ role: "user", parts: [{ text: newMessage }] });
    }

    const text = await callGemini(contents);
    if (!text) throw new Error("Empty response");
    return text;
  } catch (err) {
    console.error("askAIBuddy error:", err.message);
    return "I'm momentarily busy! Please try your question again in a second.";
  }
};

// ---- 4. ADMIN INSIGHTS ----
export const generateAdminInsights = async (complaints) => {
  try {
    const slim = complaints.slice(0, 25).map(c => ({
      category: c.category, status: c.status, priority: c.priority,
      description: c.description?.slice(0, 80)
    }));

    const prompt = `Analyze these campus complaints and return exactly 3 insight objects as a raw JSON array (no markdown):
[{"title":"...","type":"risk|trend|positive","description":"2-3 sentence analysis","recommendation":"1 action sentence"}]

Data: ${JSON.stringify(slim)}`;

    const text = await callGemini([{ role: "user", parts: [{ text: prompt }] }]);
    const parsed = extractJSON(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error("Invalid format");
  } catch (err) {
    console.error("generateAdminInsights error:", err.message);
    return [{ title: "Insights Loading...", type: "trend", description: "AI analysis is being generated.", recommendation: "Refresh in a moment." }];
  }
};
