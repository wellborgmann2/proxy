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

    // Repassa todos os cabeçalhos originais do cliente
    const headers = { ...req.headers };

    // Adiciona cabeçalhos essenciais para evitar bloqueios
    headers["User-Agent"] = headers["user-agent"] || "Mozilla/5.0";
    headers["Referer"] = targetUrl;

    // Configuração da requisição para o servidor de origem
    const options = { headers };

    const request = client.get(targetUrl, options, (response) => {
      // Remove `Transfer-Encoding: chunked` para evitar problemas de buffering
      if (response.headers["transfer-encoding"] === "chunked") {
        delete response.headers["transfer-encoding"];
      }

      // Envia os cabeçalhos originais para o cliente
      res.writeHead(response.statusCode, response.headers);

      // Transmite os dados para o cliente
      response.pipe(res);
    });

    request.on("error", (err) => {
      console.error("Erro ao buscar o conteúdo:", err.message);
      res.status(500).json({ error: "Erro ao buscar o conteúdo", details: err.message });
    });

    request.end();

  } catch (error) {
    console.error("Erro interno do servidor:", error.message);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
}
