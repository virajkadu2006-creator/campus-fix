const apiKey = "AIzaSyCqGbPgfHPKZbOz3mcXA-FimoF55O-qkJc";
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

async function listModels() {
  console.log("🚀 Listing Available Gemini Models...");
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (response.ok) {
      console.log("✅ Models list received:");
      data.models.forEach(m => console.log(`- ${m.name}`));
    } else {
      console.error("❌ API Error:", data.error?.message);
    }
  } catch (err) {
    console.error("❌ Network or Fetch Error:", err.message);
  }
}

listModels();
