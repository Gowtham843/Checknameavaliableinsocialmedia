// Vercel Serverless Function - Uses native fetch (Node 18+)
export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed - POST only" });
  }

  const { names } = req.body || {};
  
  if (!names || !Array.isArray(names) || names.length === 0) {
    return res.status(400).json({ error: "Send valid names array" });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  };

  async function checkAvailable(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        headers,
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If status is 404, username is AVAILABLE
      // If status is 200, username is TAKEN
      return response.status === 404 || response.status === 410;
    } catch (error) {
      // On error (timeout, network), assume taken to be safe
      return false;
    }
  }

  try {
    const results = await Promise.all(
      names.map(async (name) => {
        const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
        
        return {
          name: name.trim(),
          instagram: await checkAvailable(`https://www.instagram.com/${cleanName}/`),
          youtube: await checkAvailable(`https://www.youtube.com/@${cleanName}`),
          x: await checkAvailable(`https://x.com/${cleanName}`),
          linkedin: await checkAvailable(`https://www.linkedin.com/in/${cleanName}/`)
        };
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error checking handles:', error);
    return res.status(500).json({ error: "Failed to check handles" });
  }
}