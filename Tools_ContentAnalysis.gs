/**
 * GAS Agentic Orchestrator - Content Analysis Module
 * Analyzes content quality based on 12 distinct dimensions and overall entropy.
 */

var ContentAnalysis = (function() {
  
  /**
   * Main function to trigger analysis
   * @param {Object} payload - { method: 'url'|'text', url: '', text: '', context: { entity, location, topic } }
   * @returns {Object} JSON result of the analysis
   */
  function analyzeContent(payload) {
    try {
      var textToAnalyze = "";
      if (payload.method === 'url') {
        if (!payload.url) throw new Error("URL is required for URL analysis method.");
        textToAnalyze = extractTextFromUrl(payload.url);
      } else {
        if (!payload.text) throw new Error("Text is required for Text analysis method.");
        textToAnalyze = payload.text;
      }
      
      if (!textToAnalyze || textToAnalyze.trim() === "") {
        throw new Error("No text found to analyze.");
      }

      // Truncate to reasonable limit for LLM token boundaries (approx 4000 words max)
      if (textToAnalyze.length > 25000) {
        textToAnalyze = textToAnalyze.substring(0, 25000) + "... [Truncated]";
      }

      var prompt = generateAnalysisPrompt(textToAnalyze, payload.context);
      
      // Call Gemini using the global callGemini function
      var history = [{ role: "user", parts: [{ text: prompt }] }];
      var rawResult = callGemini(history, [], null, "application/json", "flash");
      
      try {
        if (rawResult.error) throw new Error(rawResult.error);
        var jsonText = (rawResult.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
        var parsed = JSON.parse(jsonText);
        return { success: true, data: parsed };
      } catch (e) {
        // Fallback or regex parsing if LLM didn't return perfect JSON
        Logger.log("ContentAnalysis JSON parsing failed. " + e.message);
        return { success: false, error: "Failed to parse analysis results from AI." };
      }

    } catch (error) {
      Logger.log("ContentAnalysis Error: " + error.message);
      return { success: false, error: error.message };
    }
  }

  function extractTextFromUrl(url) {
    var response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (response.getResponseCode() !== 200) {
      throw new Error("Failed to fetch URL. Status: " + response.getResponseCode());
    }
    var html = response.getContentText();
    // Rough HTML strip - since we're feeding it to an LLM, it's pretty resilient
    // Remove script and style tags
    html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
    html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
    // Remove HTML tags
    var text = html.replace(/<[^>]+>/g, " ");
    // Replace multiple spaces with single space
    return text.replace(/\s+/g, " ").trim();
  }

  function generateAnalysisPrompt(text, context) {
    var contextStr = "";
    if (context) {
       contextStr = "Consider the following context for this content:\n";
       if (context.entity) contextStr += "- Business/Entity: " + context.entity + "\n";
       if (context.location) contextStr += "- Location: " + context.location + "\n";
       if (context.topic) contextStr += "- Core Topic: " + context.topic + "\n";
    }

    return "You are an expert SEO and Content Quality Evaluator. Analyze the provided text according to strict dimensions. " +
           contextStr + "\n" +
           "Return ONLY a valid JSON object matching the exact structure below. Be critical and objective in your scoring (1-10, where 10 is excellent/high, and 1 is terrible/low). " +
           "For Entropy Score, provide a value from 1 to 100 (100 being highly unique and unpredictable, 1 being generic and robotic).\n\n" +
           "CRITICAL INSTRUCTION: DO NOT COPY THE EXAMPLE JSON VALUES. YOU MUST GENERATE REAL SCORES AND EXPLANATIONS BASED ON THE TEXT PROVIDED.\n\n" +
           "JSON Structure Example (Use this schema but REPLACE the values with your actual analysis):\n" +
           "{\n" +
           "  \"entropyScore\": 55,\n" +
           "  \"topProblems\": [\n" +
           "    { \"title\": \"Problem Name\", \"description\": \"Detailed explanation of the problem found.\" }\n" +
           "  ],\n" +
           "  \"dimensions\": {\n" +
           "    \"lexicalDiversity\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"syntacticBurstiness\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"semanticDrift\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"informationGain\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"clicheDensity\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"idiomaticRegionalism\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"properNounDensity\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"technicalPrecision\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"emotionalVariance\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"nuancePreservation\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"firstPartyEvidence\": { \"score\": 0, \"explanation\": \"...\" },\n" +
           "    \"entityCoherence\": { \"score\": 0, \"explanation\": \"...\" }\n" +
           "  }\n" +
           "}\n\n" +
           "Text to analyze:\n" + text;
  }

  return {
    analyzeContent: analyzeContent
  };
})();

// GAS Global wrapper for the client
function runContentAnalysis(payload) {
  return ContentAnalysis.analyzeContent(payload);
}
