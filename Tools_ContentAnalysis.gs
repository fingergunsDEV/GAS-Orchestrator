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
      
      // Call Gemini using the established GeminiService
      var rawResult = GeminiService.callGemini(prompt, "application/json");
      
      try {
        var parsed = JSON.parse(rawResult);
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
           "JSON Structure:\n" +
           "{\n" +
           "  \"entropyScore\": 25,\n" +
           "  \"topProblems\": [\n" +
           "    { \"title\": \"Pervasive Cliche Usage\", \"description\": \"The page relies heavily on generic marketing phrases.\" }\n" +
           "  ],\n" +
           "  \"dimensions\": {\n" +
           "    \"lexicalDiversity\": { \"score\": 2, \"explanation\": \"Heavily repeats generic terms.\" },\n" +
           "    \"syntacticBurstiness\": { \"score\": 3, \"explanation\": \"Sentences are simple, declarative, similar length.\" },\n" +
           "    \"semanticDrift\": { \"score\": 2, \"explanation\": \"Stays rigidly on topic, repeating same sales points.\" },\n" +
           "    \"informationGain\": { \"score\": 2, \"explanation\": \"Offers little new information beyond stating the obvious.\" },\n" +
           "    \"clicheDensity\": { \"score\": 1, \"explanation\": \"Saturated with low-entropy phrases.\" },\n" +
           "    \"idiomaticRegionalism\": { \"score\": 3, \"explanation\": \"Beyond naming the city, it lacks local nuance.\" },\n" +
           "    \"properNounDensity\": { \"score\": 5, \"explanation\": \"Names locations and a few partners, slight positive.\" },\n" +
           "    \"technicalPrecision\": { \"score\": 2, \"explanation\": \"Service lists are generic with no details.\" },\n" +
           "    \"emotionalVariance\": { \"score\": 2, \"explanation\": \"Flat, consistent corporate pitch.\" },\n" +
           "    \"nuancePreservation\": { \"score\": 1, \"explanation\": \"Relies on absolutes and guarantees lacking specific conditions.\" },\n" +
           "    \"firstPartyEvidence\": { \"score\": 2, \"explanation\": \"Claims reviews but provides no specific cases.\" },\n" +
           "    \"entityCoherence\": { \"score\": 7, \"explanation\": \"Business identity is consistent and clear.\" }\n" +
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
