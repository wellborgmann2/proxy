import pkg from "follow-redirects";
const { http, https } = pkg;

export default function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL não especificada" });
  }

  try {
    const client = url.startsWith("https") ? https : http;
    
    client.get(url, (response) => {
      res.setHeader("Content-Type", response.headers["content-type"] || "application/octet-stream");
      res.setHeader("Cache-Control", "public, max-age=3600");

      response.pipe(res);
    }).on("error", (err) => {
      res.status(500).json({ error: "Erro ao buscar o conteúdo" });
    });

  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
