import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(400).json({ error: "POST only" });
  }

  const { names } = req.body;

  if (!names || !Array.isArray(names)) {
    return res.status(400).json({ error: "Send names array" });
  }

  const headers = { "User-Agent": "Mozilla/5.0" };

  async function exists(url) {
    try {
      const r = await fetch(url, { headers });
      return r.status === 200;
    } catch {
      return false;
    }
  }

  const results = await Promise.all(
    names.map(async (name) => ({
      name,
      instagram: await exists(`https://www.instagram.com/${name}/`),
      youtube: await exists(`https://www.youtube.com/@${name}`),
      x: await exists(`https://x.com/${name}`),
      linkedin: await exists(`https://www.linkedin.com/in/${name}/`),
    }))
  );

  res.status(200).json({ results });
}
