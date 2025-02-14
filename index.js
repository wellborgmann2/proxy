import pkg from "follow-redirects";
const { http, https } = pkg;

export default function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL não especificada" });
  }

  try {
    const targetUrl = decodeURIComponent(url);
    const client = targetUrl.startsWith("https") ? https : http;

    const options = {
      headers: {
        "User-Agent": req.headers["user-agent"] || "Mozilla/5.0",
        "Referer": targetUrl, // Pode ser necessário para evitar bloqueios
        "Range": req.headers["range"] || "bytes=0-" // Repassa a requisição parcial
      },
    };

    const request = client.get(targetUrl, options, (response) => {
      res.writeHead(response.statusCode, response.headers);
      response.pipe(res);
    });

    request.on("error", (err) => {
      res.status(500).json({ error: "Erro ao buscar o conteúdo", details: err.message });
    });

    request.end();

  } catch (error) {
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
