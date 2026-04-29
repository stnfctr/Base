import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";
import firebaseConfig from "./firebase-applet-config.json" assert { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// In the AI Studio context, default credentials are often available via the environment
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
}

const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId || "(default)");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Seed APIs if database is empty
async function seedDatabase() {
  const apisRef = db.collection("apis");
  const snapshot = await apisRef.limit(1).get();
  if (snapshot.empty) {
    console.log("Seeding initial APIs...");
    const MOCK_APIS = [
      { id: 'ai-vision-01', name: 'Vision Pro', description: 'Real-time object detection and classification.', pricePerCall: 0.05, category: 'AI', provider: 'NanoCore', status: 'active' },
      { id: 'ai-nlp-02', name: 'Semantic Search', description: 'Advanced vector-based semantic retrieval.', pricePerCall: 0.02, category: 'Data', provider: 'NanoCore', status: 'active' },
      { id: 'weather-01', name: 'HyperLocal Weather', description: 'Ultra-precise current weather and forecasts.', pricePerCall: 0.005, category: 'Utility', provider: 'SkyNet', status: 'active' },
      { id: 'stock-01', name: 'Global Equities', description: 'Real-time stock price streaming and history.', pricePerCall: 0.01, category: 'Finance', provider: 'TickStream', status: 'active' },
      { id: 'geo-01', name: 'Reverse Geocoder', description: 'Convert coordinates to human-readable addresses.', pricePerCall: 0.002, category: 'Maps', provider: 'MapsEdge', status: 'active' },
    ];
    for (const a of MOCK_APIS) {
      await apisRef.doc(a.id).set(a);
    }
  }
}
seedDatabase().catch(console.error);

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  // --- API Routes ---

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Simulator Endpoint: "Call" an API
  app.post("/api/call", async (req, res) => {
    const { userId, apiId, prompt } = req.body;

    if (!userId || !apiId) {
      return res.status(400).json({ error: "userId and apiId are required" });
    }

    try {
      // 1. Get User
      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: "User not found" });
      }

      const userData = userDoc.data()!;
      
      // 2. Get API
      const apiRef = db.collection("apis").doc(apiId);
      const apiDoc = await apiRef.get();

      if (!apiDoc.exists) {
        return res.status(404).json({ error: "API not found" });
      }

      const apiData = apiDoc.data()!;
      const price = apiData.pricePerCall || 0.01;

      // 3. Check Balance
      if (userData.balance < price) {
        return res.status(402).json({ error: "Insufficient balance" });
      }

      // 4. Perform "API Work" (using Gemini as a proxy for any AI API)
      let result = "";
      if (apiId.includes("text") || apiId.includes("ai")) {
         const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
         const response = await model.generateContent(prompt || "Hello");
         result = response.response.text();
      } else {
         result = `Success: Mock data for ${apiData.name}`;
      }

      // 5. Deduct Balance & Log Transaction (Atomic Batch)
      const batch = db.batch();
      
      batch.update(userRef, {
        balance: admin.firestore.FieldValue.increment(-price)
      });

      const transactionRef = userRef.collection("transactions").doc();
      batch.set(transactionRef, {
        apiId,
        apiName: apiData.name,
        amount: price,
        type: "usage",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();

      res.json({
        success: true,
        result,
        newBalance: userData.balance - price,
        cost: price
      });

    } catch (error: any) {
      console.error("API Call Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Top-Up Endpoint (Simulation)
  app.post("/api/wallet/topup", async (req, res) => {
    const { userId, amount } = req.body;
    if (!userId || !amount) return res.status(400).json({ error: "Missing data" });

    try {
      const userRef = db.collection("users").doc(userId);
      
      const batch = db.batch();
      batch.update(userRef, {
        balance: admin.firestore.FieldValue.increment(amount)
      });

      const transactionRef = userRef.collection("transactions").doc();
      batch.set(transactionRef, {
        amount,
        type: "deposit",
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });

      await batch.commit();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- End API Routes ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
