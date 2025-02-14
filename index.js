import pkg from "follow-redirects";
const { http, https } = pkg;
import express from "express";

const app = express();

// Proxy para vídeos MP4
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

// ✅ Nova rota para streaming HLS (m3u8, ts)
app.get("/hls-proxy", async (req, res) => {
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
    "Origin": "*",
    "Referer": targetUrl,
  };

  if (req.headers.range) {
    headers["Range"] = req.headers.range;
  }

  const client = targetUrl.startsWith("https") ? https : http;

  const request = client.get(targetUrl, { headers }, (response) => {
    if (!res.headersSent) {
      const contentType = response.headers["content-type"];
      res.writeHead(response.statusCode, {
        ...response.headers,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "Origin, Range, Accept-Encoding",
        "Content-Type": contentType || "application/vnd.apple.mpegurl",
      });
    }

    response.pipe(res);

    response.on("error", (err) => {
      console.error("HLS Stream error:", err.message);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error streaming HLS content" });
      }
    });
  });

  request.on("error", (err) => {
    console.error("Error fetching HLS content:", err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error fetching HLS content" });
    }
  });

  request.end();
});

export default app;
