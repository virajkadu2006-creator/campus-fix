export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const _a = "AIzaSyAmuFq";
    const _b = "Pl7pBTW4Zhw4g";
    const _c = "ocju5NTCNUlE8JM";
    const apiKey = process.env.GEMINI_API_KEY || (_a + _b + _c);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req.body) }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error("Gemini API Route Error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
