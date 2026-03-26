import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { sanitizeNewsHtml } from "../utils/content";

export type AiDraftInput = {
  rawTitle: string;
  rawDescription: string;
  rawContent: string;
  sourceName: string;
  originalArticleUrl: string;
};

// Initialize Gemini API if key is available in environment
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// We define the schema we expect the model to return
const NewsSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    title: {
      type: SchemaType.STRING,
      description: "A catchy, professional news headline in Bengali.",
    },
    shortSummary: {
      type: SchemaType.STRING,
      description: "A 2-3 sentence engaging summary of the article in Bengali.",
    },
    fullContent: {
      type: SchemaType.STRING,
      description: "The full article rewritten professionally in Bengali, formatted beautifully with semantic HTML tags (like <p>, <h2>, <ul>, <li>). Do NOT include markdown blocks like ```html.",
    },
    tags: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "3 to 5 relevant tags for the news article (in English or Bengali).",
    },
    category: {
      type: SchemaType.STRING,
      description: "A single primary category for the news, such as 'Admission', 'National', 'Education', 'Technology', or 'General'.",
    },
    aiNotes: {
      type: SchemaType.STRING,
      description: "Any notes from the AI (e.g., if the source text was too short or confusing). If none, return an empty string.",
    }
  },
  required: ["title", "shortSummary", "fullContent", "tags", "category", "aiNotes"]
};

/**
 * Fallback function used when API key is missing or API call fails
 */
const generateFallbackDraft = (input: AiDraftInput, errorMessage?: string) => {
  const summary = input.rawDescription || input.rawContent.slice(0, 240);
  const aiNote = errorMessage ? `AI Generation failed: ${errorMessage}` : "API Key missing; using fallback raw text.";

  return {
    title: input.rawTitle.trim() || "Untitled",
    shortSummary: summary.slice(0, 260),
    fullContent: sanitizeNewsHtml(
      `<p>${summary}</p><p>Source: ${input.sourceName} — <a href=\"${input.originalArticleUrl}\" target="_blank">Original article</a></p>`
    ),
    tags: [input.sourceName.toLowerCase()],
    category: "news",
    aiNotes: aiNote
  };
};

export const generateAiDraftFromRss = async (input: AiDraftInput) => {
  const baseText = [input.rawTitle, input.rawDescription, input.rawContent].filter(Boolean).join("\n\n");

  // If the RSS item is completely empty
  if (!baseText.trim()) {
    return {
      title: input.rawTitle || "Untitled",
      shortSummary: "Insufficient source content.",
      fullContent: `<p>Insufficient content from ${input.sourceName}. Read original: <a href=\"${input.originalArticleUrl}\" target="_blank">${input.originalArticleUrl}</a></p>`,
      tags: [],
      category: "general",
      aiNotes: "insufficient content"
    };
  }

  // If we don't have an API key, use fallback
  if (!apiKey) {
    console.warn("[AI Draft] GEMINI_API_KEY is not set. Using basic text fallback.");
    return generateFallbackDraft(input);
  }

  try {
    // We use gemini-1.5-flash which is fast and supports JSON schema
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
      systemInstruction: "You are an expert News Editor and Translator for an educational news portal called 'CampusWay'. Your task is to rewrite the provided raw RSS content into a professional, engaging, and highly readable Bengali news article. NEVER invent or hallucinate facts. ONLY use the information provided in the raw text. Ensure the tone is objective and journalistic.",
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: NewsSchema,
        temperature: 0.4, // Lower temperature to prevent hallucination
      }
    });

    const prompt = `
Please process the following raw news article captured from RSS feeds.

Source Name: ${input.sourceName}
Original Source URL: ${input.originalArticleUrl}
Raw Title: ${input.rawTitle}
Raw Text Content:
${baseText}

Remember: Output strict JSON fitting the specified schema. Ensure "fullContent" uses HTML tags like <p>, <h3> for good readability, but NO markdown. Translate everything beautifully into Bengali.
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON. The model is forced to output JSON matching NewsSchema.
    const parsed = JSON.parse(responseText);

    return {
      title: parsed.title,
      shortSummary: parsed.shortSummary,
      // Add the source URL automatically at the bottom
      fullContent: sanitizeNewsHtml(`${parsed.fullContent}<br/><p><em>Source: <a href="${input.originalArticleUrl}" target="_blank" rel="noopener noreferrer">${input.sourceName}</a></em></p>`),
      tags: parsed.tags && Array.isArray(parsed.tags) ? parsed.tags : [input.sourceName],
      category: parsed.category || "news",
      aiNotes: parsed.aiNotes || null
    };

  } catch (error) {
    console.error("[AI Draft] Gemini API error:", (error as Error).message);
    // Graceful degradation: If AI fails (e.g., quota exceeded), use raw text instead of crashing the ingest job
    return generateFallbackDraft(input, (error as Error).message);
  }
};
