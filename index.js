import pkg from "follow-redirects";
const { http, https } = pkg;
import express from "express";
import axios from "axios";
const app = express();
import axiosRetry from "axios-retry";
import cors from "cors";
app.use(cors());
// Proxy para vídeos MP4

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "https://tv-kohl-three.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

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
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range;
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

axiosRetry(axios, {
  retries: 5, // Número máximo de tentativas
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000, // Backoff exponencial
  retryCondition: (error) => {
    return error.response?.status >= 500 || error.code === "ECONNABORTED";
  },
});
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
        "Origin": "https://proxy-gold-pi.vercel.app",
        "Referer": "https://proxy-gold-pi.vercel.app",
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


export default app;
