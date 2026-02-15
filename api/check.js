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

  async function checkAvailable(url, platform) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(url, { 
        headers,
        redirect: 'follow',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // For Instagram, check the response body
      if (platform === 'instagram') {
        const text = await response.text();
        console.log(text)
        // Remove all HTML tags and extra spaces for clean text matching
        const cleanText = text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase();
        
        // Check for error messages (username is available)
        if (cleanText.includes("sorry") && cleanText.includes("page") && cleanText.includes("available")) {
          return true;
        }
        
        if (cleanText.includes("page not found") || 
            cleanText.includes("user not found") ||
            cleanText.includes("page may have been removed")) {
          return true;
        }
        
        // If status is 404, also available
        if (response.status === 404 || response.status === 410) {
          return true;
        }
        
        // Check if profile data exists (taken)
        if (cleanText.includes("followers") || 
            cleanText.includes("following") ||
            text.includes('"is_private"') ||
            text.includes('"edge_followed_by"')) {
          return false;
        }
        
        // Default to taken if unsure
        return false;
      }
      
      // For other platforms, check status codes
      // 404/410 = available, 200 = taken
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
          instagram: await checkAvailable(`https://www.instagram.com/${cleanName}/`, 'instagram'),
          youtube: await checkAvailable(`https://www.youtube.com/@${cleanName}`, 'youtube'),
          x: await checkAvailable(`https://x.com/${cleanName}`, 'x'),
          linkedin: await checkAvailable(`https://www.linkedin.com/in/${cleanName}/`, 'linkedin')
        };
      })
    );

    return res.status(200).json({ results });
  } catch (error) {
    console.error('Error checking handles:', error);
    return res.status(500).json({ error: "Failed to check handles" });
  }
}