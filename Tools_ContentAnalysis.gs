/**
 * GAS Agentic Orchestrator - Content Analysis Module
 * Analyzes content quality based on 12 distinct dimensions and overall entropy.
 * Now includes a Hybrid Pipeline for forecasting and rewriting.
 */
var ContentAnalysis = (function() {
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
            if (textToAnalyze.length > 25000) {
                textToAnalyze = textToAnalyze.substring(0, 25000) + "... [Truncated]";
            }
            var stats = calculateStats(textToAnalyze);
            var prompt = generateAnalysisPrompt(textToAnalyze, payload.context, stats);
            var history = [{
                role: "user",
                parts: [{
                    text: prompt
                }]
            }];
            var rawResult = callGemini(history, [], null, "application/json", "flash");
            try {
                if (rawResult.error) throw new Error(rawResult.error);
                var jsonText = (rawResult.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
                var parsed = JSON.parse(jsonText);
                return {
                    success: true,
                    data: parsed
                };
            } catch (e) {
                Logger.log("ContentAnalysis JSON parsing failed. " + e.message);
                return {
                    success: false,
                    error: "Failed to parse analysis results from AI."
                };
            }
        } catch (error) {
            Logger.log("ContentAnalysis Error: " + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    function calculateStats(text) {
        var cleanText = text.replace(/[^a-zA-Z0-9\s\.\!\?]/g, "").toLowerCase();
        var words = cleanText.split(/\s+/).filter(function(w) {
            return w.length > 0;
        });
        var wordCount = words.length || 1;
        var sentences = text.split(/[\.\!\?]+/).filter(function(s) {
            return s.trim().length > 0;
        });
        var sentenceCount = sentences.length || 1;
        var avgSentenceLength = wordCount / sentenceCount;
        var uniqueWords = {};
        words.forEach(function(w) {
            uniqueWords[w] = true;
        });
        var uniqueWordCount = Object.keys(uniqueWords).length;
        var ttr = uniqueWordCount / wordCount;
        var sentenceLengths = sentences.map(function(s) {
            return s.trim().split(/\s+/).filter(function(w) {
                return w.length > 0;
            }).length;
        });
        var variance = sentenceLengths.reduce(function(sum, len) {
            var diff = len - avgSentenceLength;
            return sum + (diff * diff);
        }, 0) / sentenceCount;
        var burstiness = Math.sqrt(variance);
        return {
            wordCount: wordCount,
            sentenceCount: sentenceCount,
            avgSentenceLength: avgSentenceLength.toFixed(2),
            typeTokenRatio: ttr.toFixed(3),
            burstinessVariance: burstiness.toFixed(2)
        };
    }

    function extractTextFromUrl(url) {
        var response = UrlFetchApp.fetch(url, {
            muteHttpExceptions: true
        });
        if (response.getResponseCode() !== 200) {
            throw new Error("Failed to fetch URL. Status: " + response.getResponseCode());
        }
        var html = response.getContentText();
        html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, " ");
        html = html.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, " ");
        var text = html.replace(/<[^>]+>/g, " ");
        return text.replace(/\s+/g, " ").trim();
    }

    function generateAnalysisPrompt(text, context, stats) {
        var contextStr = "";
        if (context) {
            contextStr = "Consider the following context for this content:\n";
            if (context.entity) contextStr += "- Business/Entity: " + context.entity + "\n";
            if (context.location) contextStr += "- Location: " + context.location + "\n";
            if (context.topic) contextStr += "- Core Topic: " + context.topic + "\n";
        }
        var statsStr = "HARD METRICS (Use these to inform your scores):\n" +
            "- Word Count: " + stats.wordCount + "\n" +
            "- Sentence Count: " + stats.sentenceCount + "\n" +
            "- Avg Sentence Length: " + stats.avgSentenceLength + " words\n" +
            "- Type-Token Ratio (Lexical Diversity): " + stats.typeTokenRatio + " (higher means more unique vocabulary)\n" +
            "- Sentence Length Standard Deviation (Syntactic Burstiness): " + stats.burstinessVariance + " (higher means more varied sentence structures)\n\n";
        
        return `You are an expert SEO and Content Quality Evaluator. Analyze the provided text according to strict dimensions. ${contextStr}
${statsStr}
Return ONLY a valid JSON object matching the exact structure below. Be critical and objective in your scoring (1-10, where 10 is excellent/high, and 1 is terrible/low). For Entropy Score, provide a value from 1 to 100 (100 being highly unique and unpredictable, 1 being generic and robotic).

CRITICAL INSTRUCTION: DO NOT COPY THE EXAMPLE JSON VALUES. YOU MUST GENERATE REAL SCORES AND EXPLANATIONS BASED ON THE TEXT PROVIDED. USE THE HARD METRICS TO OBJECTIVELY SCORE LEXICAL DIVERSITY AND SYNTACTIC BURSTINESS.

JSON Structure Example (Use this schema but REPLACE the values with your actual analysis):
{
  "entropyScore": 55,
  "topProblems": [
    { "title": "Problem Name", "description": "Detailed explanation of the problem found." }
  ],
  "dimensions": {
    "lexicalDiversity": { "score": 0, "explanation": "..." },
    "syntacticBurstiness": { "score": 0, "explanation": "..." },
    "semanticDrift": { "score": 0, "explanation": "..." },
    "informationGain": { "score": 0, "explanation": "..." },
    "clicheDensity": { "score": 0, "explanation": "..." },
    "idiomaticRegionalism": { "score": 0, "explanation": "..." },
    "properNounDensity": { "score": 0, "explanation": "..." },
    "technicalPrecision": { "score": 0, "explanation": "..." },
    "emotionalVariance": { "score": 0, "explanation": "..." },
    "nuancePreservation": { "score": 0, "explanation": "..." },
    "firstPartyEvidence": { "score": 0, "explanation": "..." },
    "entityCoherence": { "score": 0, "explanation": "..." }
  }
}

Text to analyze:
${text}`;
    }

    function forecastAndRewrite(payload) {
        try {
            var url = payload.url;
            var originalText = payload.text;
            var analysis = payload.analysis;
            var siteUrl = new URL(url).origin;
            var gscData = null;
            var gaData = null;
            var dataError = null;
            try {
                gscData = executeGscUrlTrend({
                    siteUrl: siteUrl,
                    pageUrl: url,
                    dateRange: '3m'
                });
                gaData = executeGa4Advanced({
                    dimensions: ['date'],
                    metrics: ['sessions', 'engagementRate', 'averageSessionDuration'],
                    startDate: '90daysAgo',
                    endDate: 'today',
                });
            } catch (e) {
                dataError = "Failed to fetch performance data: " + e.message;
                Logger.log(dataError);
            }
            var forecastPrompt = generateForecastPrompt(analysis, gscData, gaData, dataError);
            var forecastHistory = [{
                role: "user",
                parts: [{
                    text: forecastPrompt
                }]
            }];
            var forecastResult = callGemini(forecastHistory, [], null, "application/json", "flash");
            var forecast = {
                uplift_clicks: {
                    value: 0,
                    reasoning: "Not enough data for a confident forecast."
                },
                uplift_engagement: {
                    value: 0,
                    reasoning: "Not enough data for a confident forecast."
                },
                confidence: 0
            };
            try {
                if (forecastResult.error) throw new Error(forecastResult.error);
                var fJsonText = (forecastResult.text || "").replace(/```json/g, "").replace(/```/g, "").trim();
                forecast = JSON.parse(fJsonText);
            } catch (e) {
                Logger.log("ContentAnalysis Forecast parsing failed: " + e.message);
            }
            var rewritePrompt = generateRewritePrompt(originalText, analysis);
            var rewriteHistory = [{
                role: "user",
                parts: [{
                    text: rewritePrompt
                }]
            }];
            var rewriteResult = callGemini(rewriteHistory, [], null, null, "pro");
            var rewriteText = "Error: The AI writer failed to generate a new version. " + (rewriteResult.error || "Unknown error.");
            if (rewriteResult.text) {
                rewriteText = rewriteResult.text;
            }
            return {
                success: true,
                data: {
                    forecast: forecast,
                    rewrite: rewriteText
                }
            };
        } catch (error) {
            Logger.log("ContentAnalysis Forecast/Rewrite Error: " + error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    function generateForecastPrompt(analysis, gscData, gaData, dataError) {
        var problemsStr = (analysis.topProblems || []).map(p => `  - ${p.title}: ${p.description}`).join('\n');
        var dataStr = dataError ? `- Data Fetch Error: ${dataError}` : `- GSC Data: ${JSON.stringify(gscData, null, 2)}\n- GA4 Data: ${JSON.stringify(gaData, null, 2)}`;

        return `You are a Data Scientist and SEO Expert.

**TASK:** Analyze the provided content quality report and historical performance data to forecast the potential uplift after an expert content refresh. The refresh will specifically fix all identified 'Top Problems'.

**CONTENT QUALITY REPORT:**
- Entropy Score: ${analysis.entropyScore}/100
- Top Problems:
${problemsStr}

**PERFORMANCE DATA (Last 90 Days):**
${dataStr}

**OUTPUT:**
Return ONLY a valid JSON object in the following structure. Provide realistic, conservative percentage uplift predictions based on fixing the content issues. If there is not enough data, return 0 for uplift and confidence.

{
  "uplift_clicks": { "value": 15, "reasoning": "Improving cliche density and technical precision for this topic typically boosts CTR by 10-20%." },
  "uplift_engagement": { "value": 25, "reasoning": "Increasing emotional variance and adding first-party evidence will likely improve average session duration." },
  "confidence": 85
}`;
    }

    function generateRewritePrompt(originalText, analysis) {
        return `You are an expert technical writer and SEO copywriter with a talent for transforming mediocre content into exceptional, high-ranking articles.

**TASK:** Rewrite the following 'Original Text' to achieve a perfect or near-perfect score (9-10) on the provided 'Content Analysis Report'. Your rewrite must fix every problem identified in the report.

**CONTENT ANALYSIS REPORT (Weaknesses to Fix):**
${JSON.stringify(analysis, null, 2)}

**CRITICAL INSTRUCTIONS:**
- **Preserve Core Message:** Do not change the fundamental topic or intent of the original text.
- **Fix All Flaws:** Directly address the low scores in the report. Increase lexical diversity, vary sentence structures, remove cliches, inject specific data or evidence, and improve the overall tone and quality.
- **Output Raw Text:** Return ONLY the full, rewritten article text. Do not include any commentary, preambles, or markdown formatting.

**ORIGINAL TEXT:**
${originalText}`;
    }
    return {
        analyzeContent: analyzeContent,
        forecastAndRewrite: forecastAndRewrite
    };
})();
// GAS Global wrapper for the client
function runContentAnalysis(payload) {
    return ContentAnalysis.analyzeContent(payload);
}
// GAS Global wrapper for the client
function runForecastAndRewrite(payload) {
    return ContentAnalysis.forecastAndRewrite(payload);
}