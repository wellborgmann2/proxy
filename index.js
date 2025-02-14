import pkg from "follow-redirects";
const { http, https } = pkg;

export default function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URL não especificada" });
  }

  try {
    const targetUrl = decodeURIComponent(url); // Decodifica a URL corretamente
    const client = targetUrl.startsWith("https") ? https : http;

    const request = client.get(targetUrl, (response) => {
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
