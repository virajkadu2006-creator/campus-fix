export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("CRITICAL: OPENAI_API_KEY is missing in backend.");
    return res.status(500).json({ error: "Server Configuration Error" });
  }

  try {
    const url = "https://api.openai.com/v1/chat/completions";

    const response = await fetch(url, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("OpenAI Backend Error:", data.error?.message);
      return res.status(response.status).json(data);
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("OpenAI Handler Crash:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
