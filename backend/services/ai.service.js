import { copilotTools, executeTool } from "./aiTools.service.js";
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
        "X-Title": "RevFlux CRM",
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
  if (process.env.OPENROUTER_API_KEY === "test") {
    return exampleShape || {};
  }

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
  if (process.env.OPENROUTER_API_KEY === "test") {
    return "Mock AI response";
  }

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
- "suggestedPriority": "High" | "Medium" | "Low"
- "insights": array of 3 short string bullet points about the lead
- "recommendedAction": single sentence on the best next step

Lead data:
${JSON.stringify(lead, null, 2)}
`.trim();

  const res = await generateJSON(prompt, {
    summary: "",
    aiRiskScore: 0,
    suggestedPriority: "Medium",
    insights: [],
    recommendedAction: "",
  });

  const aiRiskScore = typeof res.aiRiskScore === "number" ? res.aiRiskScore : (Number(res.aiRiskScore) || 0);
  const action = res.recommendedAction || res.nextBestAction || "Follow up promptly with the client.";

  return {
    ...res,
    aiRiskScore,
    riskScore: aiRiskScore,
    suggestedPriority: res.suggestedPriority || (aiRiskScore > 66 ? "High" : aiRiskScore > 33 ? "Medium" : "Low"),
    recommendedAction: action,
    nextBestAction: action,
  };
};

/**
 * Generate a personalised outreach email draft for a lead.
 */
export const generateEmail = async (lead, purpose = "follow-up", tone = "professional", sender = {}) => {
  const prompt = `
Write a ${tone} sales email for the following lead. Goal: ${purpose}.
Make sure to fill in all variables like names and companies (do not output placeholders like [Lead Name]). 
Sender Name: ${sender.name || "Sales Rep"}
Sender Company: ${sender.company || "Our Company"}

Return a JSON object with exactly these keys:
- "subject": email subject line
- "body": full email body (plain text, use \\n for line breaks, no placeholders)
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
- "healthScore": integer 0-100 indicating overall pipeline health
- "headline": 1-sentence executive headline
- "overview": 2-3 sentence summary of pipeline health
- "insights": array of 3-4 short string observations about the pipeline
- "topOpportunities": array of up to 3 objects, each with "leadName" and "reason"
- "risks": array of up to 3 objects, each with "leadName" and "risk"
- "recommendations": array of 3–5 short string action items
- "forecastNote": one sentence revenue/close forecast

Pipeline data:
${JSON.stringify(pipelineData, null, 2)}
`.trim();

  const res = await generateJSON(prompt, {
    healthScore: 75,
    headline: "",
    overview: "",
    insights: [],
    topOpportunities: [],
    risks: [],
    recommendations: [],
    forecastNote: "",
  });

  const headline = res.headline || res.overview || "Pipeline performance is stable.";
  const overview = res.overview || headline;
  const insights = Array.isArray(res.insights) && res.insights.length > 0 
    ? res.insights 
    : (Array.isArray(res.topOpportunities) ? res.topOpportunities.map(o => `${o.leadName}: ${o.reason}`) : ["Pipeline is actively tracking prospects."]);

  return {
    ...res,
    healthScore: typeof res.healthScore === "number" ? res.healthScore : (Number(res.healthScore) || 75),
    headline,
    overview,
    insights,
    recommendations: Array.isArray(res.recommendations) && res.recommendations.length > 0 ? res.recommendations : ["Review upcoming deal milestones."],
  };
};

export { generateJSON, generateText };

/**
 * Copilot Chat Response
 * Takes an array of messages and optionally a system prompt to maintain context.
 */
export const generateChatResponse = async (messages, systemContext, contextParams = {}) => {
  const ai = getClient();
  
  const payloadMessages = [];
  if (systemContext) {
    payloadMessages.push({ role: "system", content: systemContext });
  }
  
  // ensure we map standard roles
  messages.forEach(m => {
    payloadMessages.push({ role: m.role, content: m.content });
  });

  const MAX_TURNS = 5;
  let turn = 0;

  while (turn < MAX_TURNS) {
    turn++;
    const completion = await ai.chat.completions.create({
      model: MODEL(),
      messages: payloadMessages,
      tools: copilotTools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0].message;
    payloadMessages.push(responseMessage);

    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
      for (const toolCall of responseMessage.tool_calls) {
        const args = JSON.parse(toolCall.function.arguments);
        console.log(`[Copilot Tool Call] ${toolCall.function.name}`, args);
        
        let toolResult = "";
        try {
          toolResult = await executeTool(toolCall.function.name, args, contextParams);
        } catch (e) {
          toolResult = `Error executing tool: ${e.message}`;
        }

        payloadMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
          content: String(toolResult)
        });
      }
    } else {
      return responseMessage.content;
    }
  }

  return payloadMessages[payloadMessages.length - 1].content || "Max reasoning steps reached.";
};
