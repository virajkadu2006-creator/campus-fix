export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Support both GEMINI_API_KEY and the build-time VITE_ prefix if available
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: GEMINI_API_KEY is missing in Vercel/Local environment.");
    return res.status(500).json({ error: "API Key Not Configured on Server" });
  }

  try {
    const { model, contents, generationConfig } = req.body;
    
    // Default to gemini-flash-latest if not specified
    const targetModel = model || "gemini-flash-latest";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents, generationConfig })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini Proxy Error:", data.error?.message);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Gemini Proxy Crash:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
