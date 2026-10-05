import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const DATA_DIR = path.join(process.cwd(), "data");
const STATS_FILE = path.join(DATA_DIR, "user_stats.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// In-memory active presence: visitorId -> lastPingTimestamp
const activePresences = new Map<string, number>();

// Persistent set of all unique visitors
let allTimeVisitors = new Set<string>();

if (fs.existsSync(STATS_FILE)) {
  try {
    const raw = fs.readFileSync(STATS_FILE, "utf-8");
    const data = JSON.parse(raw);
    if (Array.isArray(data.visitors)) {
      allTimeVisitors = new Set(data.visitors);
    }
  } catch (e) {
    console.error("Error reading stats file:", e);
  }
}

function saveStatsToFile() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify({
      visitors: Array.from(allTimeVisitors),
      updatedAt: Date.now()
    }, null, 2));
  } catch (e) {
    console.error("Error saving stats file:", e);
  }
}

function getPresenceStats() {
  const now = Date.now();
  const ONLINE_THRESHOLD_MS = 60 * 1000; // 60s
  
  for (const [id, lastSeen] of activePresences.entries()) {
    if (now - lastSeen > 5 * 60 * 1000) {
      activePresences.delete(id);
    }
  }

  let onlineCount = 0;
  for (const lastSeen of activePresences.values()) {
    if (now - lastSeen <= ONLINE_THRESHOLD_MS) {
      onlineCount++;
    }
  }

  return {
    onlineUsers: Math.max(1, onlineCount),
    totalUsers: Math.max(1, allTimeVisitors.size)
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for user online presence & total visitors
  app.post("/api/user-stats/ping", (req, res) => {
    let { visitorId } = req.body;
    if (!visitorId || typeof visitorId !== "string") {
      visitorId = "anon-" + Math.random().toString(36).substring(2, 9);
    }

    const now = Date.now();
    activePresences.set(visitorId, now);

    let needsSave = false;
    if (!allTimeVisitors.has(visitorId)) {
      allTimeVisitors.add(visitorId);
      needsSave = true;
    }

    if (needsSave) {
      saveStatsToFile();
    }

    res.json({
      success: true,
      ...getPresenceStats()
    });
  });

  app.get("/api/user-stats", (req, res) => {
    res.json({
      success: true,
      ...getPresenceStats()
    });
  });

  // API route for etymology proxy
  app.post("/api/etymology", async (req, res) => {
    const { word } = req.body;
    if (!word) {
      return res.status(400).json({ error: "Word is required" });
    }

    const clientId = process.env.IMA_CLIENT_ID;
    const apiKey = process.env.IMA_API_KEY;

    if (!clientId || !apiKey) {
      // Return null so frontend can fallback to Gemini
      return res.json({ success: false, message: "IMA API credentials not configured" });
    }

    try {
      // Based on common Tencent API patterns, we'll try a standard chat-like request
      // Since the exact endpoint for etymology isn't clear, we'll use the chat agent interface
      const response = await axios.post("https://ima.qq.com/agent-interface/api/v1/chat", {
        query: `Analyze the etymology of the word "${word}". Break it down into prefix, root, and suffix with their meanings. Format: "prefix (meaning) + root (meaning) + suffix (meaning)".`,
        client_id: clientId
      }, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        timeout: 5000 // 5 second timeout
      });

      // Assuming the response has a 'text' or 'answer' field
      const result = response.data?.answer || response.data?.text || response.data?.data?.answer;
      
      if (result) {
        res.json({ success: true, root: result });
      } else {
        res.json({ success: false, message: "No result from IMA API" });
      }
    } catch (error: any) {
      console.error("IMA API Error:", error.response?.data || error.message);
      res.json({ success: false, error: "Failed to fetch etymology from external API" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
