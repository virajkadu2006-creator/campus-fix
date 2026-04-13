const apiKey = "AIzaSyCqGbPgfHPKZbOz3mcXA-FimoF55O-qkJc";
const MODEL = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

async function testClassification() {
  const prompt = `You are a university complaint classifier. 
Output ONLY raw JSON. No markdown. No conversational text.

{
  "category": "Bathroom & Hygiene | Anti-Ragging & Safety | Mess & Food Quality | Academic Issues | Infrastructure/Maintenance | Other",
  "confidence": <integer 85-99>,
  "department": "<department name>",
  "priority": "High | Medium | Low",
  "reasoning": "2-sentence explanation"
}

Complaint: "The toilets on the second floor are overflowing and it is very unhygienic."`;

  console.log("🚀 Testing Optimized Classification Prompt...");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.1, 
          maxOutputTokens: 1000,
          topP: 0.1,
          topK: 1
        }
      })
    });

    const data = await response.json();
    if (response.ok) {
      const text = data.candidates[0].content.parts[0].text;
      console.log("🤖 AI RAW RESPONSE:", text);
      const isJSON = text.trim().startsWith('{') && text.trim().endsWith('}');
      console.log(isJSON ? "✅ Response is clean JSON" : "❌ Response contains non-JSON text");
    } else {
      console.error("❌ API ERROR:", data.error?.message);
    }
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

testClassification();
