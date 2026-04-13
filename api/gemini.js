export default async function handler(req, res) {
  // Support ONLY POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing in environment variables.");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    // Calling Gemini Pro endpoint
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      }
    );

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API Error:", data.error?.message);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("API Handler Crash:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
