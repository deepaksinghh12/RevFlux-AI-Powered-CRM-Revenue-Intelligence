import OpenAI from "openai";
import { ApiError } from "../utils/apiError.js";

// ── Client ────────────────────────────────────────────────────────────────────

let client = null;

const getClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey || apiKey === "your-openrouter-key-here") {
    throw new ApiError(
      503,
      "OpenRouter API is not configured. Add OPENROUTER_API_KEY to the backend .env file."
    );
  }

  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "TTP CRM Dashboard",
      },
    });
  }

  return client;
};

const MODEL = () => process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";

export const isAIConfigured = () => {
  const key = process.env.OPENROUTER_API_KEY;
  return Boolean(key && key !== "your-openrouter-key-here");
};

// ── Core helpers ──────────────────────────────────────────────────────────────

/**
 * Generate a structured JSON response from OpenRouter.
 * Falls back to parsing the raw text if JSON mode fails.
 */
const generateJSON = async (prompt, exampleShape = null) => {
  const ai = getClient();

  const systemMsg = exampleShape
    ? `You are a CRM AI assistant. Always respond with valid JSON only — no markdown, no explanation. Expected shape: ${JSON.stringify(exampleShape)}`
    : `You are a CRM AI assistant. Always respond with valid JSON only — no markdown fences, no extra text.`;

  try {
    const response = await ai.chat.completions.create({
      model: MODEL(),
      messages: [
        { role: "system", content: systemMsg },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.5,
    });

    const raw = response.choices[0].message.content;
    return JSON.parse(raw);
  } catch (err) {
    console.error("OpenRouter JSON error:", err.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

/**
 * Generate a plain text response from OpenRouter.
 */
const generateText = async (prompt, temperature = 0.7) => {
  const ai = getClient();

  try {
    const response = await ai.chat.completions.create({
      model: MODEL(),
      messages: [
        {
          role: "system",
          content:
            "You are a helpful CRM AI assistant for sales teams. Be concise and professional.",
        },
        { role: "user", content: prompt },
      ],
      temperature,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("OpenRouter text error:", err.message || err);
    throw new ApiError(502, "AI request failed. Please try again in a moment.");
  }
};

// ── Public AI functions ───────────────────────────────────────────────────────

/**
 * Generate a lead summary with AI risk score and key insights.
 */
export const generateLeadSummary = async (lead) => {
  const prompt = `
Analyse this CRM lead and return a JSON object with exactly these keys:
- "summary": 2-3 sentence plain-English summary of the lead
- "aiRiskScore": integer 0–100 (0 = very safe/hot lead, 100 = high churn risk)
- "insights": array of 3 short string bullet points about the lead
- "recommendedAction": single sentence on the best next step

Lead data:
${JSON.stringify(lead, null, 2)}
`.trim();

  return generateJSON(prompt, {
    summary: "",
    aiRiskScore: 0,
    insights: [],
    recommendedAction: "",
  });
};

/**
 * Generate a personalised outreach email draft for a lead.
 */
export const generateEmail = async ({ lead, tone = "professional", goal = "follow-up" }) => {
  const prompt = `
Write a ${tone} sales email for the following lead. Goal: ${goal}.
Return a JSON object with exactly these keys:
- "subject": email subject line
- "body": full email body (plain text, use \\n for line breaks)
- "cta": call-to-action phrase

Lead data:
${JSON.stringify(lead, null, 2)}
`.trim();

  return generateJSON(prompt, { subject: "", body: "", cta: "" });
};

/**
 * Generate AI-powered sales insights across the pipeline.
 */
export const generateSalesInsights = async (pipelineData) => {
  const prompt = `
You are a senior sales analyst. Analyse this CRM pipeline data and return a JSON object with exactly these keys:
- "overview": 2-3 sentence summary of pipeline health
- "topOpportunities": array of up to 3 objects, each with "leadName" and "reason"
- "risks": array of up to 3 objects, each with "leadName" and "risk"
- "recommendations": array of 3–5 short string action items
- "forecastNote": one sentence revenue/close forecast

Pipeline data:
${JSON.stringify(pipelineData, null, 2)}
`.trim();

  return generateJSON(prompt, {
    overview: "",
    topOpportunities: [],
    risks: [],
    recommendations: [],
    forecastNote: "",
  });
};

export { generateJSON, generateText };
