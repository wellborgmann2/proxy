const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Habilita CORS para evitar bloqueios no navegador
app.use(cors());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range");
  next();
});

// Proxy para arquivos .m3u8 e segmentos .ts
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

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
