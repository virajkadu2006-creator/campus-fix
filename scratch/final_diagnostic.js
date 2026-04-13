const apiKey = "AIzaSyCqGbPgfHPKZbOz3mcXA-FimoF55O-qkJc";
const model = "gemini-2.5-flash";
const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

async function finalTest() {
  console.log(`🔍 FINAL DIAGNOSTIC: Testing ${model}...`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Explain why a university needs a digital complaint system in 1 sentence." }] }]
      })
    });

    const data = await response.json();
    if (response.ok) {
      console.log("✅ SUCCESS: AI is responding perfectly.");
      console.log("🤖 AI Response:", data.candidates[0].content.parts[0].text);
    } else {
      console.error("❌ API ERROR:", data.error?.message);
    }
  } catch (err) {
    console.error("❌ SYSTEM ERROR:", err.message);
  }
}

finalTest();
