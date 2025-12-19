
import { GoogleGenAI } from "@google/genai";
import { ESProfileResponse } from "../types";

export const analyzeESProfile = async (profileData: ESProfileResponse): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Truncate profile data to focus on major parts if it's too large
  const simplifiedProfile = profileData.profile.shards.map(shard => ({
    shard_id: shard.id,
    searches: shard.searches.map(s => ({
      query: s.query.map(q => ({
        type: q.type,
        time_ms: q.time_in_nanos / 1_000_000,
        description: q.description
      })),
      rewrite_time_ms: s.rewrite_time / 1_000_000,
      collector: s.collector.map(c => ({
        name: c.name,
        time_ms: c.time_in_nanos / 1_000_000
      }))
    })),
    aggregations: shard.aggregations.map(a => ({
      type: a.type,
      time_ms: a.time_in_nanos / 1_000_000,
      description: a.description
    }))
  }));

  const prompt = `
    Analyze this Elasticsearch query profile and provide expert performance optimization advice.
    Focus on:
    1. Identifying the single biggest bottleneck (Query vs Collector vs Aggregations).
    2. If Aggregations are slow, suggest optimizations like "execution_hint", reducing bucket count, or using "breadth_first" collect mode.
    3. Suggesting index mapping changes or query rewrites.
    4. Explaining what slow Lucene operations or specific Aggregation types mean in this context.

    Profile Data (Simplified):
    ${JSON.stringify(simplifiedProfile, null, 2)}

    Please respond in Markdown format with clear sections: Summary, Bottlenecks (prioritized by time), and Recommendations.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 4000 }
      }
    });

    return response.text || "No analysis could be generated.";
  } catch (error) {
    console.error("Gemini analysis error:", error);
    throw new Error("Failed to analyze profile with AI.");
  }
};
