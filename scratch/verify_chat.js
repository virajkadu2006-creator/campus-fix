const apiKey = "AIzaSyCqGbPgfHPKZbOz3mcXA-FimoF55O-qkJc";
const MODEL = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

async function testChatBuddy() {
  const prompt = `You are CampusFix AI Buddy, a supportive student assistant.
Be helpful, empathetic, and concise. 

Student: How do I report a broken fan in my room?
Buddy:`;

  console.log("🚀 Testing Optimized Chat Buddy (Creative Mode)...");
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.7, 
          topP: 0.8, 
          topK: 40,
          maxOutputTokens: 500 
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();
    if (response.ok) {
      const text = data.candidates[0].content.parts[0].text;
      console.log("🤖 AI BUDDY RESPONSE:", text);
      if (text && text.length > 10) {
        console.log("✅ Chat Buddy is responding fluently.");
      } else {
        console.error("❌ Response too short or empty.");
      }
    } else {
      console.error("❌ API ERROR:", data.error?.message);
    }
  } catch (err) {
    console.error("❌ ERROR:", err.message);
  }
}

testChatBuddy();
