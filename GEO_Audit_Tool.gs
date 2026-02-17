/**
 * GEO_Audit_Tool.gs
 * Part of the SEO Team's Toolkit
 * Purpose: Evaluates a site's visibility and clarity for Generative Search Engines.
 */

const GEO_AUDIT_TOOL = {
  
  /**
   * Main entry point for the agent to audit a URL
   * @param {string} url The prospect's website URL.
   * @param {string} brandName The name of the company.
   */
  runAudit: function(url, brandName) {
    const rawHtml = this.fetchWebsiteContent(url);
    if (!rawHtml) return "Error: Could not reach site.";

    const geoAnalysis = this.analyzeWithGemini(rawHtml, brandName);
    
    // Log results to the Neural Blackboard (Shared State)
    this.updateNeuralBlackboard('seo_audit_results', {
      url: url,
      geo_score: geoAnalysis.score,
      semantic_gaps: geoAnalysis.gaps,
      entity_clarity: geoAnalysis.entity_clarity,
      timestamp: new Date().toISOString()
    });

    return geoAnalysis;
  },

  fetchWebsiteContent: function(url) {
    try {
      const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      // We only need the text/metadata to stay within token limits
      return response.getContentText().substring(0, 15000); 
    } catch (e) {
      console.error("Fetch failed: " + e.toString());
      return null;
    }
  },

  analyzeWithGemini: function(htmlContext, brand) {
    const apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      Act as a Generative Engine Optimization (GEO) specialist. 
      Analyze the following HTML snippet for the brand "${brand}".
      1. Entity Clarity: Can an LLM clearly identify the core services and location?
      2. Citation Potential: Is there unique, data-backed content likely to be cited by Gemini/Perplexity?
      3. Semantic Gap: What key topical authorities are missing?
      
      Return a JSON object with: 
      { "score": 0-100, "entity_clarity": "high/med/low", "gaps": [], "hook": "A 1-sentence sales hook for outreach" }
      
      HTML Content: ${htmlContext}
    `;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" }
    };

    const options = {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(payload)
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    return JSON.parse(response.getContentText()).candidates[0].content.parts[0].text;
  },

  updateNeuralBlackboard: function(key, data) {
    // Accessing your system's shared state (Cache/Properties)
    const blackboard = JSON.parse(CacheService.getScriptCache().get('NEURAL_BLACKBOARD') || '{}');
    blackboard[key] = data;
    CacheService.getScriptCache().put('NEURAL_BLACKBOARD', JSON.stringify(blackboard), 21600);
  }
};