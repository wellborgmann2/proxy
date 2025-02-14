import pkg from "follow-redirects";
const { http, https } = pkg;
import express from "express";

const app = express();

app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    new URL(targetUrl); // Verifica se a URL é válida
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  // Adiciona suporte ao cabeçalho Range
  if (req.headers.range) {
    headers["Range"] = req.headers.range;
  }

  const client = targetUrl.startsWith("https") ? https : http;

  const request = client.get(targetUrl, { headers }, (response) => {
    if (!res.headersSent) {
      // Ajusta os cabeçalhos corretamente
      res.writeHead(response.statusCode, {
        ...response.headers,
        "Accept-Ranges": "bytes", // Permite requests parciais
        "Content-Type": response.headers["content-type"] || "video/mp4",
      });
    }

    // Transmite os dados diretamente para o cliente
    response.pipe(res);

    response.on("error", (err) => {
      console.error("Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming content" });
      }
    });
  });

  request.on("error", (err) => {
    console.error("Error fetching content:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error fetching content" });
    }
  });

  request.end();
});

export default app;
