import { Router } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

router.post("/api/translate", async (req, res) => {
  const { text, context } = req.body as { text?: string; context?: string };

  if (!text?.trim()) {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Translation service not configured" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    const systemPrompt = `You are a medical translator for an ophthalmology e-prescription app used in Bangladesh. Translate the following English text to Bengali (Bangla). Keep medical terminology appropriate for a prescription pad. Use standard Bengali script. Preserve any numbers, measurements, symbols (+/- signs, degrees °). Return ONLY the Bengali translation, no explanations.${context ? `\nContext: ${context}` : ""}`;

    const result = await model.generateContent(`${systemPrompt}\n\nText to translate: ${text}`);
    const translated = result.response.text().trim();

    res.json({ translated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Translation failed";
    req.log.error({ err }, "Gemini translation error");
    res.status(500).json({ error: message });
  }
});

export default router;
