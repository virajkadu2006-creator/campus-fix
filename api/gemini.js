export default async function handler(req, res) {
  // Support ONLY POST exactly as requested
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error("CRITICAL: Server GEMINI_API_KEY Environment Variable is missing.");
      return res.status(500).json({ error: "Server Configuration Error: API key missing" });
    }

    // Google Gemini 1.5 Flash endpoint standard structure
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Gemini API Route Crash:", err);
    return res.status(500).json({ error: "Internal Server Error in API Proxy" });
  }
}
