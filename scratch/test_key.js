const apiKey = "AIzaSyCqGbPgfHPKZbOz3mcXA-FimoF55O-qkJc";
const model = "gemini-1.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function testKey() {
  console.log("🚀 Testing Gemini API Key...");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, are you working?" }] }]
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log("✅ API is working! Response:");
      console.log(data.candidates[0].content.parts[0].text);
    } else {
      console.error("❌ API Error:", data.error?.message);
    }
  } catch (err) {
    console.error("❌ Network or Fetch Error:", err.message);
  }
}

testKey();
