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

    // Replicando todos os cabeçalhos do cliente
    const headers = { ...req.headers };

    // Adicionando cabeçalhos essenciais
    headers["User-Agent"] = headers["user-agent"] || "Mozilla/5.0";
    headers["Referer"] = targetUrl;
    
    // Mantendo o cabeçalho `Range` se presente
    if (req.headers.range) {
      headers["Range"] = req.headers.range;
    }

    // Configuração da requisição para o servidor de origem
    const options = { headers };

    const request = client.get(targetUrl, options, (response) => {
      // Verifica se a resposta é parcial (206 - Partial Content)
      if (response.statusCode === 206) {
        res.statusCode = 206;
      }

      // Remove `Transfer-Encoding: chunked` para evitar buffering
      if (response.headers["transfer-encoding"] === "chunked") {
        delete response.headers["transfer-encoding"];
      }

      // Repassando cabeçalhos importantes
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Range");

      // Envia os cabeçalhos e os dados para o cliente
      res.writeHead(response.statusCode, response.headers);
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
