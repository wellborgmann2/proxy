import pkg from "follow-redirects";
const { http, https } = pkg;
import express from "express";
import axios from "axios";
const app = express();
import axiosRetry from "axios-retry";
import cors from "cors";
import { fileURLToPath } from "url";
import path, { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(cors());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Permite requisições de qualquer origem
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  next();
});

// Permite requisições OPTIONS para evitar bloqueios de CORS
app.options("/hls-proxy", (req, res) => {
  res.set({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Range",
  });
  res.sendStatus(200);
});

// Página de teste para o player
app.get("/player", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "player.html"));
});

// 🔁 Proxy para streaming de vídeo HTTP
app.get("/proxy", async (req, res) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    new URL(targetUrl);
  } catch (err) {
    return res.status(400).json({ error: "Invalid URL" });
  }

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range; // Mantém o carregamento progressivo do vídeo
  }

  const client = targetUrl.startsWith("https") ? https : http;

  const request = client.get(targetUrl, { headers }, (response) => {
    if (!res.headersSent) {
      res.writeHead(response.statusCode, {
        ...response.headers,
        "Accept-Ranges": "bytes",
        "Content-Type": response.headers["content-type"] || "video/mp4",
      });
    }

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

// 🔁 Proxy para HLS (M3U8)
app.get("/hls-proxy", async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).send("URL do streaming não fornecida.");
  }

  try {
    console.log(`🔄 Buscando stream: ${videoUrl}`);

    const response = await axios.get(videoUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "Referer": videoUrl, // Pode ser necessário para evitar bloqueios
      },
      responseType: "stream",
    });

    res.set({
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": response.headers["content-type"] || "application/vnd.apple.mpegurl",
    });

    response.data.pipe(res);

  } catch (error) {
    console.error("❌ Erro ao buscar streaming:", error.message);

    if (error.response) {
      res.status(error.response.status).send(`Erro ${error.response.status}: ${error.response.statusText}`);
    } else {
      res.status(500).send("Erro desconhecido ao carregar o vídeo.");
    }
  }
});

// 🚀 Inicia o servidor na porta definida ou na 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy rodando na porta ${PORT}`);
});

export default app;
