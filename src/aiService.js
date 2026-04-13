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
    confidence: Math.min(70, best.score * 15) || 45, // default 45 if completely unmatched
    department: best.score > 0 ? DEPARTMENT_MAP[best.category] : "Admin Review Required",
    priority: (best.category === "Anti-Ragging & Safety" || lower.includes('urgent') || lower.includes('emergency')) ? "High" : "Medium",
    reasoning: "Classified by keyword matching (AI unavailable or key missing)"
  };
}

export const classifyComplaint = async (description, imageBase64 = null) => {
  const apiKey = localStorage.getItem("campusFixGeminiKey") || atob("QUl6YVN5RFBEeDhJVmZiSFhqUHR1SUhUU3NhYkZYMWhpalFQV3RV");
  
  if (!apiKey) {
    console.warn("No Gemini API Key found, using fallback classifier.");
    // Simulate slight delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));
    return fallbackClassify(description);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    // Construct Gemini content parts
    const parts = [{ text: `Classify this complaint: ${description}` }];
    
    if (imageBase64) {
      // imageBase64 format is usually 'data:image/jpeg;base64,...'
      const base64Data = imageBase64.split(',')[1];
      const mimeType = imageBase64.split(';')[0].split(':')[1] || 'image/jpeg';
      parts.unshift({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const payload = {
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: parts
      }],
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
        throw new Error("Invalid response format from Gemini");
    }
    
    try {
        const parsed = JSON.parse(text);
        
        let confidence = parsed.confidence || 50;
        let category = parsed.category || "Other";
        let department = parsed.department || DEPARTMENT_MAP[category || "Other"] || "General Administration";
        
        if (confidence < 50) {
            category = "Needs Admin Review";
            department = "Admin Review Required";
        }

        // Final sanity check of parsed properties
        return {
            category: category,
            confidence: confidence,
            department: department,
            priority: parsed.priority || "Medium",
            reasoning: parsed.reasoning || "AI analyzed the context to assign this category."
        };
    } catch (e) {
        console.error("Failed to parse JSON from Gemini", text);
        return fallbackClassify(description);
    }
    
  } catch (err) {
    console.error("API call failed, using fallback:", err);
    return fallbackClassify(description);
  }
};

const NOTIFICATION_SYSTEM_PROMPT = `You are a formal campus administration notification writer for CampusFix,
an AI-powered campus complaint management system.

Your job is to generate highly detailed, personalized, and professional notification messages to campus departments whenever a new student complaint is assigned to them.
This is NOT a template system. Each message must feel human-written, context-aware, and action-oriented.

OBJECTIVE:
Given a complaint and its AI classification, generate a complete department notification message that:
- Clearly explains the issue
- Justifies why it was routed to that department
- Communicates urgency
- Guides next action

STRICT OUTPUT RULES:
- Output ONLY the message text
- No JSON
- No markdown
- No bullet points
- No headings like "Subject"
- Write in full paragraphs
- Minimum length: 200 words
- Maximum length: 350 words
If output is short or generic, it is incorrect.

WRITING INSTRUCTIONS:
Write a formal, personalized notification message addressed to the given department.
The message MUST include:
1. Proper Opening: Address the department directly. Mention that a new complaint has been assigned via CampusFix.
2. Complaint Summary (Rewritten): Do NOT copy the complaint. Rewrite it clearly and professionally. Show empathy toward student inconvenience.
3. Classification Explanation: Mention category. Explain WHY it was routed to that department. Use AI reasoning naturally.
4. Priority Explanation: Clearly state priority level. Explain urgency: High -> immediate action within 2 hours, Medium -> respond within 24 hours, Low -> respond within 48-72 hours.
5. Confidence Interpretation: Explain what the confidence score means.
6. Image Mention: If image is attached, mention that visual evidence has been provided.
7. Recommended Action: Provide clear, practical steps (inspection, dispatching staff, etc.).
8. Closing: Professional closing. Use this exact signature:
CampusFix Automated Systems
Campus Complaint Management Platform

TONE GUIDELINES: Formal but not robotic. Clear and structured. Empathetic but not emotional. Action-oriented.
WHAT TO AVOID: Do NOT copy the complaint text directly. Do NOT use generic phrases only. Do NOT repeat same sentence structures. Do NOT produce short output. Do NOT sound like a chatbot.
FINAL INSTRUCTION: Generate the best possible notification message that a real university system would send.`;

export const generateNotificationMessage = async (complaint) => {
  const apiKey = localStorage.getItem("campusFixGeminiKey") || atob("QUl6YVN5RFBEeDhJVmZiSFhqUHR1SUhUU3NhYkZYMWhpalFQV3RV");
  
  if (!apiKey) {
    return `Dear ${complaint.department},\n\nA new complaint (${complaint.id}) has been assigned to your department. Visual evidence is ${complaint.imageBase64 ? 'attached' : 'not attached'}.\n\nPlease review and take necessary action.\n\nCampusFix Automated Systems\nCampus Complaint Management Platform`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
    
    // Construct Input Format
    const inputFormat = `
Tracking ID: ${complaint.id}
Student Complaint: ${complaint.description}
Category: ${complaint.category}
Department: ${complaint.department}
Priority: ${complaint.priority}
Confidence Score: ${complaint.confidence}%
AI Reasoning: ${complaint.reasoning || complaint.aiReasoning}
Image Attached: ${complaint.imageBase64 ? 'Yes' : 'No'}
Submitted At: ${complaint.submittedAt}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: NOTIFICATION_SYSTEM_PROMPT }]
      },
      contents: [{
        role: "user",
        parts: [{ text: inputFormat }]
      }],
      generationConfig: {
        responseMimeType: "text/plain"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Notification message unavailable.";
    
  } catch (err) {
    console.error("Notification generation failed:", err);
    return `Dear ${complaint.department},\n\nA new priority ${complaint.priority} issue has been logged. Please review tracking ID ${complaint.id}.\n\nCampusFix Automated Systems`;
  }
};

const BUDDY_SYSTEM_PROMPT = `You are CampusFix AI Buddy, a smart, friendly, and helpful campus assistant. You help students solve basic problems, give guidance, suggest actions, and assist with campus-related issues. Be clear, helpful, slightly conversational, and solution-oriented. Keep answers practical and easy to understand.`;

export const askAIBuddy = async (chatHistory, newMessage) => {
  const apiKey = localStorage.getItem("campusFixGeminiKey") || atob("QUl6YVN5RFBEeDhJVmZiSFhqUHR1SUhUU3NhYkZYMWhpalFQV3RV");
  
  if (!apiKey) {
    return "I am currently running in offline mode. Please add your Gemini API Key in the settings to activate my intelligence!";
  }

  try {
    const contents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));
    
    contents.push({
      role: 'user',
      parts: [{ text: newMessage }]
    });

    const payload = {
      systemInstruction: {
        parts: [{ text: BUDDY_SYSTEM_PROMPT }]
      },
      contents: contents,
      generationConfig: {
        responseMimeType: "text/plain"
      }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble thinking right now. Please try again.";
    
  } catch (err) {
    console.error("AI Buddy failed:", err);
    return "AI assistant is currently unavailable. Please try again.";
  }
};

const ADMIN_INSIGHTS_PROMPT = `You are the AI Executive Analyst for the CampusFix Administrator dashboard.
Your job is to analyze the provided list of active and recent campus complaints and generate strategic insights.

OUTPUT FORMAT:
Respond ONLY with an array of exactly 3 JSON objects representing insight cards. No markdown formatting block, no text before or after.
Each object must have:
- title (string: short, e.g., "Water Shortage in Block B")
- type (string: "risk", "trend", "positive")
- description (string: 2-3 sentence analysis)
- recommendation (string: actionable advice)

Example:
[
  {
    "title": "Unresolved Connectivity Issues",
    "type": "risk",
    "description": "...",
    "recommendation": "..."
  }
]`;

export const generateAdminInsights = async (complaints) => {
  const apiKey = localStorage.getItem("campusFixGeminiKey") || atob("QUl6YVN5RFBEeDhJVmZiSFhqUHR1SUhUU3NhYkZYMWhpalFQV3RV");
  
  if (!apiKey) {
    return [
      {
        title: "API Key Required",
        type: "risk",
        description: "Please provide a Gemini API key in the settings to unlock AI-powered executive insights.",
        recommendation: "Open Settings > Add Key"
      }
    ];
  }

  // Pre-process complaints (strip large images, send only relevant subset)
  const slimComplaints = complaints.slice(0, 50).map(c => ({
    category: c.category,
    status: c.status,
    priority: c.priority,
    department: c.department,
    description: c.description,
    submittedAt: c.submittedAt
  }));

  try {
    const payload = {
      systemInstruction: { parts: [{ text: ADMIN_INSIGHTS_PROMPT }] },
      contents: [{
        role: "user",
        parts: [{ text: "Analyze these complaints:\n" + JSON.stringify(slimComplaints) }]
      }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`API returned ${response.status}`);

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    
    try {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      throw new Error("Invalid array format");
    } catch(e) {
      console.error("AI Insights parsing failed:", text);
      return [];
    }
  } catch (err) {
    console.error("AI Insights failed:", err);
    return [
      {
        title: "Analysis Failed",
        type: "risk",
        description: "An error occurred while generating insights.",
        recommendation: "Try again later or check network connection."
      }
    ];
  }
};
