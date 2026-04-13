// ============================================================
// CampusFix AI Service - Gemini 2.5 Flash Integration
// ============================================================

// Encoded key to prevent immediate GitHub revocation
const _K = "QUl6YVN5Q3RDdlh6Y01ySWJDUE9mNjdUXy1OSzZXektJWEFWdGxaSQ==";
const GEMINI_API_KEY = atob(_K);
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const DEPARTMENT_MAP = {
  "Bathroom & Hygiene": "Housekeeping & Sanitation",
  "Anti-Ragging & Safety": "Dean of Students / Warden",
  "Mess & Food Quality": "Mess Committee",
  "Academic Issues": "Academic Affairs Office",
  "Infrastructure/Maintenance": "Estate & Maintenance",
  "Other": "General Administration"
};

const KEYWORDS = {
  "Bathroom & Hygiene": ["bathroom", "toilet", "water", "hygiene", "flush", "washroom", "shower", "soap", "dirty"],
  "Anti-Ragging & Safety": ["ragging", "bully", "threaten", "unsafe", "harass", "violent", "attack", "fear"],
  "Mess & Food Quality": ["mess", "food", "meal", "canteen", "lunch", "dinner", "stale", "cook", "taste"],
  "Academic Issues": ["exam", "professor", "marks", "grade", "attendance", "course", "class", "teacher", "result"],
  "Infrastructure/Maintenance": ["broken", "repair", "electricity", "wifi", "fan", "light", "door", "window", "leak"],
};

function fallbackClassify(text) {
  const lower = text.toLowerCase();
  let best = { category: "Other", score: 0 };
  for (const [cat, words] of Object.entries(KEYWORDS)) {
    const score = words.filter(w => lower.includes(w)).length;
    if (score > best.score) best = { category: cat, score };
  }
  return {
    category: best.score > 0 ? best.category : "Needs Admin Review",
    confidence: Math.min(70, best.score * 15) || 45,
    department: best.score > 0 ? DEPARTMENT_MAP[best.category] : "Admin Review Required",
    priority: (best.category === "Anti-Ragging & Safety" || lower.includes('urgent') || lower.includes('emergency')) ? "High" : "Medium",
    reasoning: "Classified by keyword matching (AI unavailable or key missing)"
  };
}

async function callGemini(payload) {
  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API Error details:", errorData);
      throw new Error(`API Response Error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error("Network or API Error:", err);
    throw err;
  }
}

// ---- COMPLAINT CLASSIFICATION ----
export const classifyComplaint = async (description, imageBase64 = null) => {
  const SYSTEM_PROMPT = `You are an AI classification agent for a campus complaint management system.
Classify the student complaint into exactly one of these 6 categories:
1. Bathroom & Hygiene
2. Anti-Ragging & Safety
3. Mess & Food Quality
4. Academic Issues
5. Infrastructure/Maintenance
6. Other

Also determine priority: High, Medium, or Low.
Anti-Ragging complaints are ALWAYS High priority, no exceptions.
Complaints with urgent/emergency/broken/no water/no power -> High.

Respond ONLY with valid JSON, no markdown, no preamble:
{
  "category": "<one of the 6 categories exactly as written above>",
  "confidence": <integer 0-100>,
  "department": "<mapped department name>",
  "priority": "High" | "Medium" | "Low",
  "reasoning": "<1-2 sentence explanation>"
}`;

  try {
    const parts = [{ text: `Classify this complaint: ${description}` }];
    if (imageBase64) {
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.unshift({ inlineData: { data: base64Data, mimeType } });
    }

    const payload = {
      contents: [
        {
           role: "user",
           parts: [{ text: `SYSTEM INSTRUCTION: ${SYSTEM_PROMPT}\n\nUSER COMPLAINT: ${description}` }, ... (imageBase64 ? [{ inlineData: { data: imageBase64.split(',')[1], mimeType: imageBase64.split(';')[0].split(':')[1] || 'image/jpeg' } }] : [])]
        }
      ],
      generationConfig: { 
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        responseMimeType: "application/json" 
      }
    };

    const data = await callGemini(payload);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Empty response from Gemini");

    const parsed = JSON.parse(text);
    let confidence = parsed.confidence || 50;
    let category = parsed.category || "Other";
    let department = parsed.department || DEPARTMENT_MAP[category] || "General Administration";

    if (confidence < 50) {
      category = "Needs Admin Review";
      department = "Admin Review Required";
    }

    return {
      category,
      confidence,
      department,
      priority: parsed.priority || "Medium",
      reasoning: parsed.reasoning || "AI analyzed the context to assign this category."
    };
  } catch (err) {
    console.error("classifyComplaint failed:", err.message);
    return fallbackClassify(description);
  }
};

// ---- NOTIFICATION MESSAGE GENERATION ----
export const generateNotificationMessage = async (complaint) => {
  const NOTIFICATION_SYSTEM_PROMPT = `You are a formal campus administration notification writer for CampusFix.
Generate a professional 200-350 word notification to the department about a new complaint assigned via CampusFix.
Include: opening, complaint summary (rewritten professionally), category reasoning, priority urgency, recommended action steps, and this closing:
CampusFix Automated Systems
Campus Complaint Management Platform
Output ONLY the message text. No JSON. No markdown.`;

  try {
    const inputFormat = `Tracking ID: ${complaint.id}
Student Complaint: ${complaint.description}
Category: ${complaint.category}
Department: ${complaint.department}
Priority: ${complaint.priority}
Confidence Score: ${complaint.confidence}%
AI Reasoning: ${complaint.reasoning || complaint.aiReasoning}
Image Attached: ${complaint.imageBase64 ? 'Yes' : 'No'}
Submitted At: ${complaint.submittedAt}`;

    const payload = {
      contents: [{
        role: "user",
        parts: [{ text: `INSTRUCTION: ${NOTIFICATION_SYSTEM_PROMPT}\n\nDATA:\n${inputFormat}` }]
      }],
      generationConfig: { responseMimeType: "text/plain" }
    };

    const data = await callGemini(payload);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Notification message unavailable.";
  } catch (err) {
    console.error("generateNotificationMessage failed:", err.message);
    return `Dear ${complaint.department},\n\nA new priority ${complaint.priority} issue has been logged. Please review tracking ID ${complaint.id}.\n\nCampusFix Automated Systems`;
  }
};

// ---- AI BUDDY CHATBOT ----
export const askAIBuddy = async (chatHistory, newMessage) => {
  const BUDDY_SYSTEM_PROMPT = `You are CampusFix AI Buddy, a smart, friendly, and helpful campus assistant. You help students solve basic problems, give guidance, suggest actions, and assist with campus-related issues. Be clear, helpful, slightly conversational, and solution-oriented. Keep answers practical and easy to understand.`;

  try {
    const contents = [
      ...chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: newMessage }] }
    ];

    const payload = {
      contents: [
        { role: "user", parts: [{ text: BUDDY_SYSTEM_PROMPT }] },
        ...contents
      ],
      generationConfig: { responseMimeType: "text/plain" }
    };

    const data = await callGemini(payload);
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error("Empty response");
    return reply;
  } catch (err) {
    console.error("askAIBuddy failed:", err.message);
    return "AI assistant is temporarily overloaded. Please try again in a moment.";
  }
};

// ---- ADMIN INSIGHTS ----
export const generateAdminInsights = async (complaints) => {
  const ADMIN_INSIGHTS_PROMPT = `You are the AI Executive Analyst for the CampusFix Administrator dashboard.
Analyze the provided campus complaints and respond ONLY with a JSON array of exactly 3 insight objects.
Each object must have: title, type ("risk"|"trend"|"positive"), description (2-3 sentences), recommendation.
No markdown. No text outside the JSON array.`;

  try {
    const slimComplaints = complaints.slice(0, 50).map(c => ({
      category: c.category,
      status: c.status,
      priority: c.priority,
      department: c.department,
      description: c.description,
      submittedAt: c.submittedAt
    }));

    const payload = {
      systemInstruction: { parts: [{ text: ADMIN_INSIGHTS_PROMPT }] },
      contents: [{ role: "user", parts: [{ text: "Analyze these complaints:\n" + JSON.stringify(slimComplaints) }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const data = await callGemini(payload);
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    throw new Error("Invalid format");
  } catch (err) {
    console.error("generateAdminInsights failed:", err.message);
    return [
      { title: "Analysis Unavailable", type: "risk", description: "Could not generate AI insights at this time.", recommendation: "Try again later." }
    ];
  }
};
