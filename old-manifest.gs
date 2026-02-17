/**
 * MANIFEST.gs
 */

var TOOLS_MANIFEST = [
  {
    name: "gmail_search",
    description: "Searches for email threads in Gmail. Returns snippets of matching emails.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        count: { type: "integer" }
      },
      required: ["query"]
    }
  },
  {
    name: "gmail_get_unread_count",
    description: "Returns the number of unread email threads in the inbox.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "gmail_check_sent",
    description: "Checks the 'Sent' folder for the most recent emails. Use this to verify if an email was successfully sent.",
    parameters: {
      type: "object",
      properties: {
        count: { type: "integer", description: "Number of sent threads to retrieve (default 1)." }
      },
      required: []
    }
  },
  {
    name: "gmail_check_sent_delayed",
    description: "Waits 10 seconds and then checks the 'Sent' folder for the most recent emails. Use this to verify if an email was actually sent without relying on search indexes.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "The subject line to look for." }
      },
      required: ["subject"]
    }
  },
  {
    name: "gmail_bulk_send",
    description: "Sends multiple personalized emails using a Google Sheet for data and a Google Doc as a template. Variables in the Doc should be in {{ColumnName}} format.",
    parameters: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The ID of the Google Sheet containing recipient data." },
        range: { type: "string", description: "The range of data (e.g., 'Sheet1!A1:D10'). First row must be headers." },
        templateDocId: { type: "string", description: "The ID of the Google Doc to use as the email body template." },
        subjectTemplate: { type: "string", description: "The subject line (can include {{Variables}})." }
      },
      required: ["spreadsheetId", "range", "templateDocId", "subjectTemplate"]
    }
  },
  {
    name: "crm_manage_leads",
    description: "Adds, updates, or summarizes lead data in the central Growth CRM sheet. Fields: Name, Company, Email, Website, Status, fitScore, Icebreaker, Blackboard.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "update", "get", "summary", "push_blackboard"] },
        leadData: { 
          type: "object",
          properties: {
            name: { type: "string" },
            company: { type: "string" },
            email: { type: "string" },
            website: { type: "string" },
            status: { type: "string" },
            icebreaker: { type: "string" },
            blackboard: { type: "string", description: "JSON string of the Neural Blackboard state." }
          }
        },
        email: { type: "string", description: "Required for 'update', 'get', or 'push_blackboard' actions." }
      },
      required: ["action"]
    }
  },
  {
    name: "crm_generate_icebreaker",
    description: "Analyzes a company website (via scraper) to generate a hyper-personalized outreach icebreaker line.",
    parameters: {
      type: "object",
      properties: {
        website: { type: "string" },
        name: { type: "string" }
      },
      required: ["website"]
    }
  },
  {
    name: "crm_sync_inbox",
    description: "Scans the inbox for replies from leads and updates their status in the CRM automatically.",
    parameters: {
      type: "object",
      properties: {
        crmSheetId: { type: "string" }
      },
      required: []
    }
  },
  {
    name: "crm_enrich_company_profile",
    description: "Scrapes a company website and searches recent news to identify pain points, growth stages, and potential opportunities.",
    parameters: {
      type: "object",
      properties: {
        website: { type: "string" },
        companyName: { type: "string" }
      },
      required: ["website"]
    }
  },
  {
    name: "crm_tech_stack_lookup",
    description: "Analyzes a website's source code to identify marketing and sales technologies being used (e.g. HubSpot, GA4, SEO tools).",
    parameters: {
      type: "object",
      properties: {
        website: { type: "string" }
      },
      required: ["website"]
    }
  },
  {
    name: "crm_find_lookalike_leads",
    description: "Searches the web for companies similar to a target company or ideal customer profile. Returns a list of names and websites.",
    parameters: {
      type: "object",
      properties: {
        description: { type: "string", description: "Description of the ideal company or target industry." },
        count: { type: "integer", description: "Number of leads to find (default 5)." }
      },
      required: ["description"]
    }
  },
  {
    name: "crm_case_study_matcher",
    description: "Searches the internal knowledge base for the most relevant case studies or success stories for a specific lead or industry.",
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string" },
        leadDescription: { type: "string" }
      },
      required: ["industry"]
    }
  },
  {
    name: "crm_audit_teaser_generator",
    description: "Generates a quick marketing/technical insight (teaser) for a prospect's website to include in outreach.",
    parameters: {
      type: "object",
      properties: {
        website: { type: "string" }
      },
      required: ["website"]
    }
  },
  {
    name: "crm_multichannel_drafter",
    description: "Drafts a complete outreach sequence including a LinkedIn connection request, a cold email, and a follow-up message.",
    parameters: {
      type: "object",
      properties: {
        leadName: { type: "string" },
        company: { type: "string" },
        context: { type: "string", description: "Research notes or personalized hook to include." }
      },
      required: ["leadName", "company"]
    }
  },
  {
    name: "crm_fit_score_evaluator",
    description: "Evaluates a lead's data against your Ideal Customer Profile (ICP) and assigns a score from 1-100.",
    parameters: {
      type: "object",
      properties: {
        leadData: { type: "object" },
        icpCriteria: { type: "string", description: "Optional override for ICP criteria." }
      },
      required: ["leadData"]
    }
  },
  {
    name: "crm_intent_classifier",
    description: "Analyzes an incoming email reply to classify lead intent (e.g. Warm, Not Interested, Referral, Meeting Requested).",
    parameters: {
      type: "object",
      properties: {
        emailText: { type: "string" }
      },
      required: ["emailText"]
    }
  },
  {
    name: "crm_auto_nurture_trigger",
    description: "Finds a relevant industry article or value-add content to send as a non-salesy follow-up to a lead.",
    parameters: {
      type: "object",
      properties: {
        industry: { type: "string" },
        topic: { type: "string" }
      },
      required: ["industry"]
    }
  },
  {
    name: "crm_meeting_bridge",
    description: "Generates a scheduling link and prepares a discovery brief for a lead who has expressed interest.",
    parameters: {
      type: "object",
      properties: {
        leadName: { type: "string" },
        email: { type: "string" }
      },
      required: ["leadName", "email"]
    }
  },
  {
    name: "crm_revenue_forecaster",
    description: "Analyzes the current CRM pipeline to predict revenue based on lead status and conversion rates.",
    parameters: {
      type: "object",
      properties: {
        targetMonth: { type: "string" }
      },
      required: []
    }
  },
  {
    name: "crm_newsletter_sync",
    description: "Adds a lead to your marketing newsletter or tagging system based on their interests.",
    parameters: {
      type: "object",
      properties: {
        email: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["email", "tags"]
    }
  },
  {
    name: "crm_social_listening_alert",
    description: "Checks recent public posts (X/LinkedIn if available) for a lead or company to find engagement opportunities.",
    parameters: {
      type: "object",
      properties: {
        companyName: { type: "string" }
      },
      required: ["companyName"]
    }
  },
  {
    name: "knowledge_base_read",
    description: "Reads the System Source of Truth containing architecture, directives, and system rules. Use this to ensure accuracy before complex tasks.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "knowledge_base_update",
    description: "Updates the System Source of Truth with new architecture details or operational rules.",
    parameters: {
      type: "object",
      properties: {
        newContent: { type: "string" },
        mode: { type: "string", enum: ["append", "overwrite"] }
      },
      required: ["newContent"]
    }
  },
  {
    name: "drive_create_doc",
    description: "Creates a new Google Doc.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        content: { type: "string" }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "drive_create_folder",
    description: "Creates a new folder in Google Drive.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string" }
      },
      required: ["name"]
    }
  },
  {
    name: "gsc_inspect_url",
    description: "Inspects a specific URL in Google Search Console to check index status.",
    parameters: {
      type: "object",
      properties: {
        siteUrl: { type: "string", description: "The property URL (e.g. https://example.com/)" },
        inspectionUrl: { type: "string", description: "The specific page URL to inspect" }
      },
      required: ["siteUrl", "inspectionUrl"]
    }
  },
  {
    name: "gsc_query",
    description: "Queries Google Search Console performance data (clicks, impressions).",
    parameters: {
      type: "object",
      properties: {
        siteUrl: { type: "string" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        dimensions: { type: "array", items: { type: "string", enum: ["QUERY", "PAGE", "DEVICE", "COUNTRY"] } },
        rowLimit: { type: "integer", description: "Default 10, max 1000" }
      },
      required: ["siteUrl", "startDate", "endDate"]
    }
  },
  {
    name: "graph_add_node",
    description: "Adds a relationship to the Entity Knowledge Graph. Use this to store permanent structural facts.",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "The source entity (e.g. 'Elon Musk')" },
        predicate: { type: "string", description: "The relationship (e.g. 'is CEO of')" },
        object: { type: "string", description: "The target entity (e.g. 'Tesla')" }
      },
      required: ["subject", "predicate", "object"]
    }
  },
  {
    name: "graph_query",
    description: "Queries the Entity Knowledge Graph for relationships.",
    parameters: {
      type: "object",
      properties: {
        entity: { type: "string", description: "The entity to search for (Subject or Object)." }
      },
      required: ["entity"]
    }
  },
  {
    name: "run_parallel_tasks",
    description: "Executes multiple independent tasks in parallel (or batched). Useful for researching multiple companies or scraping multiple URLs at once.",
    parameters: {
      type: "object",
      properties: {
        tasks: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              toolName: { type: "string" },
              toolArgs: { type: "object" }
            },
            required: ["id", "toolName", "toolArgs"]
          }
        }
      },
      required: ["tasks"]
    }
  },
  {
    name: "create_dynamic_tool",
    description: "Creates a new tool at runtime by saving a JavaScript function. USE WITH CAUTION. The code must be ES5 compatible.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "The name of the new tool (e.g. 'fetch_crypto_price')." },
        description: { type: "string" },
        parameters: { type: "string", description: "JSON schema for parameters (as a string)." },
        code: { type: "string", description: "The JS function body. It receives 'args' as input." }
      },
      required: ["name", "code"]
    }
  },
  {
    name: "vector_store_compact",
    description: "Compacts and summarizes the Long-Term Memory (Vector DB) to improve search speed and accuracy. Use this periodically when memory feels cluttered.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "ga4_run_report",
    description: "Runs a basic report on Google Analytics 4 property.",
    parameters: {
      type: "object",
      properties: {
        propertyId: { type: "string", description: "GA4 Property ID (numeric string)" },
        startDate: { type: "string", description: "YYYY-MM-DD" },
        endDate: { type: "string", description: "YYYY-MM-DD" },
        metric: { type: "string", enum: ["activeUsers", "screenPageViews", "sessions"] }
      },
      required: ["propertyId", "metric"]
    }
  },
  {
    name: "slides_create",
    description: "Creates a new Google Slide presentation.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" }
      },
      required: ["title"]
    }
  },
  {
    name: "drive_export_pdf",
    description: "Exports a Google Doc or Slide as a PDF file.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string" },
        outputName: { type: "string" }
      },
      required: ["fileId"]
    }
  },
  {
    name: "schedule_mission",
    description: "Schedules a recurring mission to run in the background. Use this when the user asks to 'check this every day' or 'monitor this'.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The exact instruction to run (e.g., 'Check GSC stats')." },
        frequency: { type: "string", enum: ["DAILY", "HOURLY"] }
      },
      required: ["prompt", "frequency"]
    }
  },
  {
    name: "ask_knowledge_base",
    description: "Searches the internal knowledge base (Google Drive) for answers to a specific question. Use this for questions about company policy, past projects, or internal data.",
    parameters: {
      type: "object",
      properties: {
        question: { type: "string", description: "The specific question to answer." }
      },
      required: ["question"]
    }
  },
  {
    name: "export_chat_to_doc",
    description: "Saves the current conversation history to a new Google Doc.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for the export document." }
      },
      required: ["title"]
    }
  },
  {
    name: "sheets_operation",
    description: "Read, append, or update data in a Google Sheet. You can provide a 'spreadsheetId' to connect to a specific sheet, otherwise it uses the active one.",
    parameters: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string", description: "The ID of the spreadsheet (from the URL)." },
        range: { type: "string", description: "e.g. 'Sheet1!A1:B10'" },
        action: { type: "string", enum: ["read", "append", "update"] },
        values: { type: "array", items: { type: "array", items: { type: "string" } } }
      },
      required: ["action", "range"]
    }
  },
  {
    name: "sheets_get_info",
    description: "Returns metadata about a spreadsheet, including names of all sheets (tabs). Use this to explore a sheet by ID.",
    parameters: {
      type: "object",
      properties: {
        spreadsheetId: { type: "string" }
      },
      required: ["spreadsheetId"]
    }
  },
  {
    name: "trigger_external_webhook",
    description: "Triggers an external automation in Zapier or Make.com.",
    parameters: {
      type: "object",
      properties: {
        platform: { type: "string", enum: ["ZAPIER", "MAKE"], description: "The target platform." },
        eventName: { type: "string", description: "The specific event or hook ID (e.g., 'new_lead')." },
        payload: { type: "object", description: "Data to send (JSON object)." }
      },
      required: ["platform", "eventName"]
    }
  },
  {
    name: "delegate_lead_researcher",
    description: "Delegates a task to the Lead Researcher Agent. Use this when the user needs deep-dive analysis on a company or topic.",
    parameters: {
      type: "object",
      properties: {
        target: { type: "string", description: "The company or topic to research." }
      },
      required: ["target"]
    }
  },
  {
    name: "delegate_outreach_orchestrator",
    description: "Delegates a task to the Sales Outreach Agent. Use this to draft cold emails or outreach campaigns.",
    parameters: {
      type: "object",
      properties: {
        context: { type: "string", description: "Context for the outreach (target audience, value prop)." }
      },
      required: ["context"]
    }
  },
  {
    name: "delegate_competitor_intel",
    description: "Delegates a task to the Market Watch Agent. Use this for competitive landscape analysis.",
    parameters: {
      type: "object",
      properties: {
        market: { type: "string", description: "The market or industry to analyze." }
      },
      required: ["market"]
    }
  },
  {
    name: "delegate_proposal_architect",
    description: "Delegates a task to the Proposal Architect Agent. Use this to draft project proposals.",
    parameters: {
      type: "object",
      properties: {
        client: { type: "string", description: "The client name." }
      },
      required: ["client"]
    }
  },
  {
    name: "delegate_seo_specialist",
    description: "Delegates a task to the SEO Specialist Agent. Use this for GSC audits, indexing issues, and keyword analysis.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL or domain to audit." }
      },
      required: ["url"]
    }
  },
  {
    name: "delegate_data_analyst",
    description: "Delegates a task to the Data Analyst Agent. Use this for GA4 reports, Sheets analysis, and finding trends.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The data question or topic." }
      },
      required: ["query"]
    }
  },
  {
    name: "delegate_executive_assistant",
    description: "Delegates a task to the Executive Assistant Agent. Use this for calendar management, email triage, and scheduling.",
    parameters: {
      type: "object",
      properties: {
        task: { type: "string", description: "The task to perform." }
      },
      required: ["task"]
    }
  },
  {
    name: "delegate_content_creator",
    description: "Delegates a task to the Content Creator Agent. Use this for making slides, documents, and PDFs.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The content topic." }
      },
      required: ["topic"]
    }
  },
  {
    name: "calendar_manage",
    description: "Manages the user's calendar. Can list, create, or delete events.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["list", "create", "delete"] },
        title: { type: "string" },
        startTime: { type: "string", description: "ISO date string or relative time." },
        endTime: { type: "string" }
      },
      required: ["action"]
    }
  },
  {
    name: "web_scrape",
    description: "Scrapes text content from a public URL.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" }
      },
      required: ["url"]
    }
  },
  {
    name: "send_slack_notification",
    description: "Sends a message to a Slack channel via webhook.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string" },
        webhookUrl: { type: "string", description: "Optional override." }
      },
      required: ["message"]
    }
  },
  {
    name: "gmail_create_draft",
    description: "Creates a draft email in Gmail.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "gmail_send",
    description: "Sends an email immediately. Use this ONLY if the user explicitly asks to 'send' something or after receiving approval for a draft.",
    parameters: {
      type: "object",
      properties: {
        to: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" }
      },
      required: ["to", "subject", "body"]
    }
  },
  {
    name: "drive_find_files",
    description: "Searches for files in Google Drive.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query." },
        mimeType: { type: "string", description: "Optional MIME type filter." }
      },
      required: ["query"]
    }
  },
  {
    name: "doc_summarize",
    description: "Reads a Google Doc and returns its content for summarization.",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" }
      },
      required: ["documentId"]
    }
  },
  {
    name: "google_search",
    description: "Performs a Google Search to find real-time information on the web.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search terms." }
      },
      required: ["query"]
    }
  },
  {
    name: "save_to_knowledge_base",
    description: "Saves text, research, or brainstorming results to the Knowledge Base folder as a Google Doc.",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title of the document." },
        content: { type: "string", description: "The content to save." },
        tags: { type: "string", description: "Comma-separated tags for categorization." }
      },
      required: ["title", "content"]
    }
  },
  {
    name: "contacts_manager",
    description: "Manages Google Contacts. Can create new contacts or search for existing ones.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "search"] },
        firstName: { type: "string" },
        lastName: { type: "string" },
        email: { type: "string" },
        query: { type: "string", description: "For search: name or email to find." }
      },
      required: ["action"]
    }
  },
  {
    name: "forms_manager",
    description: "Manages Google Forms. Can create new forms or read responses from an existing form.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "get_responses"] },
        title: { type: "string", description: "Title for the new form." },
        questions: { type: "array", items: { type: "string" }, description: "List of text questions to add." },
        formId: { type: "string", description: "ID of the form to read responses from." }
      },
      required: ["action"]
    }
  },
  {
    name: "tasks_manager",
    description: "Manages Google Tasks. Can create tasks or list them.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["create", "list"] },
        title: { type: "string", description: "Title of the task." },
        notes: { type: "string", description: "Details or description." },
        listId: { type: "string", description: "Optional: ID of the task list (defaults to primary)." }
      },
      required: ["action"]
    }
  },
  {
    name: "youtube_tools",
    description: "Searches YouTube for videos.",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["search"] },
        query: { type: "string" },
        maxResults: { type: "integer" }
      },
      required: ["action", "query"]
    }
  },
  {
    name: "translate_text",
    description: "Translates text into a target language.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" },
        targetLanguage: { type: "string", description: "2-letter language code (e.g., 'es', 'fr', 'ja')." }
      },
      required: ["text", "targetLanguage"]
    }
  },
  {
    name: "get_system_status",
    description: "Returns a list of loaded agent modules, active teams, and system uptime.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "drive_move_file",
    description: "Moves a file to a specific folder.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string" },
        destinationFolderId: { type: "string" }
      },
      required: ["fileId", "destinationFolderId"]
    }
  },
  {
    name: "drive_share_file",
    description: "Shares a file with a specific email address.",
    parameters: {
      type: "object",
      properties: {
        fileId: { type: "string" },
        email: { type: "string" },
        role: { type: "string", enum: ["viewer", "commenter", "editor"] }
      },
      required: ["fileId", "email", "role"]
    }
  },
  {
    name: "vector_store_upsert",
    description: "Saves important facts, summaries, or context to the Long-Term Memory (Vector DB). Use this to remember user preferences or project details forever.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The text to remember." },
        tags: { type: "string", description: "Optional tags for categorization." }
      },
      required: ["content"]
    }
  },
  {
    name: "vector_store_query",
    description: "Searches the Long-Term Memory (Vector DB) for information. Use this instead of 'ask_knowledge_base' for more complex or semantic queries.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The concept or question to search for." }
      },
      required: ["query"]
    }
  },
  {
    name: "request_human_approval",
    description: "Pauses execution and requests explicit human approval for a sensitive action (e.g., sending mass email, deleting files).",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", description: "Short title of the action." },
        context: { type: "string", description: "Detailed explanation of what you want to do and why." }
      },
      required: ["action", "context"]
    }
  },
  {
    name: "advanced_web_scrape",
    description: "Advanced web scraper capable of reading JavaScript-heavy sites. Use this for deep research.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" }
      },
      required: ["url"]
    }
  },
  {
    name: "generate_image",
    description: "Generates an image using AI (DALL-E / Imagen). Returns a URL.",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "Description of the image to generate." }
      },
      required: ["prompt"]
    }
  },
  {
    name: "execute_python_sandbox",
    description: "Executes Python code in a secure sandbox. Use this for complex data analysis, math, or logic that Apps Script cannot handle.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "The Python code to run." },
        requirements: { type: "array", items: { type: "string" }, description: "Pip packages to install." }
      },
      required: ["code"]
    }
  },
  {
    name: "patch_doc_content",
    description: "Modifies an existing Google Doc by replacing text or appending content. Better than creating new docs.",
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        targetText: { type: "string", description: "Text to find (for replacement)." },
        replacementText: { type: "string", description: "New text." },
        mode: { type: "string", enum: ["replace_all", "append"] }
      },
      required: ["documentId", "mode"]
    }
  },
  {
    name: "configure_daily_routine",
    description: "Configures the autonomous daily agenda. Use this to set a daily schedule of tasks.",
    parameters: {
      type: "object",
      properties: {
        enabled: { type: "boolean", description: "Enable or disable the daily routine." },
        time: { type: "string", description: "Time to run (HH:MM) in 24h format. Default 08:00." },
        tasks: { 
          type: "array", 
          items: { type: "string" }, 
          description: "List of tasks to perform daily (e.g., ['Check GSC', 'Email leads'])." 
        }
      },
      required: ["tasks"]
    }
  },
  {
    name: "create_sentinel",
    description: "Deploys a reactive Sentinel agent to monitor streams (Gmail, Sheets) and trigger a mission when conditions are met.",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["GMAIL", "SHEET"], description: "The stream to watch." },
        condition: { type: "string", description: "The trigger condition (e.g., Gmail query 'from:boss label:urgent', or JSON for Sheets)." },
        mission: { type: "string", description: "The mission prompt to execute when triggered." }
      },
      required: ["type", "condition", "mission"]
    }
  },
  {
    name: "run_system_retrospective",
    description: "Analyzes recent system logs for failures and updates the Knowledge Base with new rules to prevent them. Use this to self-heal.",
    parameters: {
      type: "object",
      properties: {
        hours: { type: "integer", description: "How many hours of logs to analyze (default 24)." }
      },
      required: []
    }
  },
  {
    name: "persona_upsert",
    description: "Creates or updates a specialized 'Persona' (voice/directive) for the system to use in outreach or research.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Name of the persona (e.g., 'The Architect')." },
        voice: { type: "string", description: "The specific system instructions and tone to use." },
        niche: { type: "string", description: "The market this persona specializes in." }
      },
      required: ["name", "voice"]
    }
  },
  {
    name: "persona_list",
    description: "Lists all calibrated personas available in the registry.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "lead_intent_search",
    description: "Searches social platforms and job boards for businesses/people actively looking for website help or automation.",
    parameters: {
      type: "object",
      properties: {
        niche: { type: "string", enum: ["website design", "ai agents"], description: "The specific market to target." }
      },
      required: ["niche"]
    }
  },
  {
    name: "website_redesign_audit",
    description: "Analyzes a URL for technical and UX weaknesses to generate a 'reason to redesign' pitch.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The website URL to audit." }
      },
      required: ["url"]
    }
  },
  {
    name: "agentic_opportunity_analyzer",
    description: "Analyzes a company's career or about page to find manual workflows that can be automated with AI agents.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The company website URL." }
      },
      required: ["url"]
    }
  },
  {
    name: "visual_design_audit",
    description: "Captures a screenshot of a website and performs an AI-driven visual design critique (Vision Audit).",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "The website URL to analyze." }
      },
      required: ["url"]
    }
  },
  {
    name: "lead_scoring",
    description: "Calculates a 'Fit Score' (0-100) for a lead by comparing them semantically against the Ideal Customer Profile (ICP).",
    parameters: {
      type: "object",
      properties: {
        leadDescription: { type: "string", description: "Full text description of the lead (industry, revenue, tech stack, needs)." }
      },
      required: ["leadDescription"]
    }
  },
  {
    name: "sync_dynamic_tools",
    description: "Scans the 'GAS_Dynamic_Tools' Drive folder for .js files and hot-loads them as active tools.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "patch_dynamic_tool",
    description: "Updates or creates a dynamic tool file in Drive and hot-reloads it. Used for fixing bugs or adding new capabilities.",
    parameters: {
      type: "object",
      properties: {
        toolName: { type: "string", description: "The name of the tool (defined in JSDoc @tool)." },
        newCode: { type: "string", description: "The complete JS code including JSDoc headers." }
      },
      required: ["toolName", "newCode"]
    }
  },
  {
    name: "social_profile_analysis",
    description: "Analyzes a social media profile (LinkedIn/X) to determine tone, interests, and conversation starters.",
    parameters: {
      type: "object",
      properties: {
        profileUrl: { type: "string", description: "URL of the profile." }
      },
      required: ["profileUrl"]
    }
  },
  {
    name: "social_trend_scanner",
    description: "Scans for trending topics in a specific niche.",
    parameters: {
      type: "object",
      properties: {
        niche: { type: "string", description: "The industry/niche (e.g. 'AI Agents', 'Web Design')." }
      },
      required: ["niche"]
    }
  },
  {
    name: "finance_create_invoice",
    description: "Generates a PDF invoice for a client.",
    parameters: {
      type: "object",
      properties: {
        clientName: { type: "string" },
        items: { 
          type: "array", 
          items: { type: "object", properties: { desc: {type: "string"}, amount: {type: "number"} } } 
        }
      },
      required: ["clientName", "items"]
    }
  },
  {
    name: "finance_project_estimator",
    description: "Calculates the recommended price for a project based on hours and target margin.",
    parameters: {
      type: "object",
      properties: {
        estimatedHours: { type: "number" },
        hourlyRate: { type: "number" },
        margin: { type: "number", description: "Decimal percentage (e.g. 0.3 for 30%)." }
      },
      required: ["estimatedHours"]
    }
  },
  {
    name: "util_whois_lookup",
    description: "Checks domain age and registration info. Useful for finding old sites that need redesign.",
    parameters: {
      type: "object",
      properties: {
        domain: { type: "string" }
      },
      required: ["domain"]
    }
  },
  {
    name: "util_extract_contacts",
    description: "Extracts email addresses and phone numbers from a block of text.",
    parameters: {
      type: "object",
      properties: {
        text: { type: "string" }
      },
      required: ["text"]
    }
  },
  {
    name: "get_knowledge_base_meta",
    description: "Returns the URLs and IDs for the Knowledge Base Folder, Truth Doc, and Memory Store.",
    parameters: {
      type: "object",
      properties: {},
      required: []
    }
  },
  {
    name: "curate_knowledge_topic",
    description: "Autonomously researches a topic, creates a summary document in the Knowledge Base, and updates long-term memory.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "The subject to research and curate." },
        depth: { type: "string", enum: ["standard", "deep"], description: "Depth of research." }
      },
      required: ["topic"]
    }
  },
  {
    name: "intent_discovery_ads",
    description: "Checks Meta Ad Library or Google Ads Transparency Center for a specific prospect to identify active ad spend.",
    parameters: {
      type: "object",
      properties: {
        companyName: { type: "string" },
        platform: { type: "string", enum: ["META", "GOOGLE"] }
      },
      required: ["companyName", "platform"]
    }
  },
  {
    name: "intent_discovery_technographics",
    description: "Analyzes a website to identify specific high-intent pixel drops (e.g. GA4, HubSpot) or transitions.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" },
        targetPixels: { type: "array", items: { type: "string" }, description: "e.g. ['hubspot', 'ga4', 'facebook_pixel']" }
      },
      required: ["url"]
    }
  },
  {
    name: "seo_geo_readiness_audit",
    description: "Simulates how LLMs (Gemini/Perplexity) summarize a brand. Identifies hallucinations or weak semantic visibility.",
    parameters: {
      type: "object",
      properties: {
        brandName: { type: "string" },
        website: { type: "string" }
      },
      required: ["brandName"]
    }
  },
  {
    name: "seo_json_ld_audit",
    description: "Audits a website for advanced JSON-LD Schema (Product, Service, Organization) that feeds LLMs.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string" }
      },
      required: ["url"]
    }
  },
  {
    name: "finance_margin_calculator",
    description: "Calculates Estimated ARR, SEO Gap Value (CPC loss), and Technical Debt to prioritize leads by margin.",
    parameters: {
      type: "object",
      properties: {
        companyData: { 
          type: "object", 
          properties: {
            headcount: { type: "number" },
            missedKeywords: { type: "array", items: { type: "string" } },
            avgCpc: { type: "number" },
            pageSpeed: { type: "number" }
          }
        }
      },
      required: ["companyData"]
    }
  },
  {
    name: "knowledge_correlation_analysis",
    description: "Searches the memory store for patterns across multiple leads in the same niche (e.g. 'All Dallas MedSpas share X failure').",
    parameters: {
      type: "object",
      properties: {
        niche: { type: "string" }
      },
      required: ["niche"]
    }
  }
];

/**
 * TOOL SCOPES: Defines which tools each role is allowed to access.
 * Enforces the Principle of Least Privilege.
 */
var TOOL_SCOPES = {
  // RESEARCH TEAM
  "RESEARCH_BUILDER": ["google_search", "web_scrape", "advanced_web_scrape", "crm_enrich_company_profile", "crm_tech_stack_lookup", "crm_find_lookalike_leads", "youtube_tools", "save_to_knowledge_base", "vector_store_upsert", "vector_store_query", "vector_store_compact", "graph_add_node", "graph_query", "run_parallel_tasks", "drive_find_files", "knowledge_base_read", "get_knowledge_base_meta", "curate_knowledge_topic", "lead_intent_search", "website_redesign_audit", "agentic_opportunity_analyzer", "visual_design_audit", "lead_scoring", "util_whois_lookup", "util_extract_contacts", "intent_discovery_ads", "intent_discovery_technographics"],
  "RESEARCH_VALIDATOR": ["google_search", "drive_find_files", "doc_summarize", "vector_store_query", "graph_query", "knowledge_base_read", "intent_discovery_ads"],

  // CONTENT TEAM
  "CONTENT_BUILDER": ["drive_create_doc", "patch_doc_content", "slides_create", "generate_image", "drive_export_pdf", "ask_knowledge_base", "vector_store_query", "graph_query", "translate_text", "drive_find_files", "knowledge_base_read"],
  "CONTENT_VALIDATOR": ["drive_find_files", "doc_summarize", "google_search", "knowledge_base_read"],

  // OPS TEAM (General Admin)
  "OPS_BUILDER": ["create_sentinel", "list_sentinels", "configure_daily_routine", "calendar_manage", "tasks_manager", "contacts_manager", "gmail_get_unread_count", "gmail_create_draft", "gmail_send", "gmail_bulk_send", "crm_manage_leads", "crm_sync_inbox", "forms_manager", "drive_find_files", "request_human_approval", "knowledge_base_read"],
  "OPS_VALIDATOR": ["calendar_manage", "tasks_manager", "contacts_manager", "gmail_search", "gmail_get_unread_count", "gmail_check_sent", "gmail_check_sent_delayed", "crm_manage_leads", "knowledge_base_read"],

  // SEO TEAM
  "SEO_BUILDER": ["gsc_inspect_url", "gsc_query", "ga4_run_report", "web_scrape", "advanced_web_scrape", "knowledge_base_read", "seo_geo_readiness_audit", "seo_json_ld_audit"],
  "SEO_VALIDATOR": ["gsc_inspect_url", "google_search", "knowledge_base_read", "seo_geo_readiness_audit"],

  // OUTREACH TEAM (Focus on External)
  "OUTREACH_BUILDER": ["gmail_create_draft", "gmail_send", "gmail_bulk_send", "crm_manage_leads", "crm_generate_icebreaker", "crm_enrich_company_profile", "crm_tech_stack_lookup", "crm_case_study_matcher", "crm_audit_teaser_generator", "crm_multichannel_drafter", "crm_fit_score_evaluator", "crm_auto_nurture_trigger", "crm_social_listening_alert", "contacts_manager", "ask_knowledge_base", "vector_store_query", "request_human_approval", "knowledge_base_read", "lead_intent_search", "website_redesign_audit", "agentic_opportunity_analyzer", "visual_design_audit", "lead_scoring", "util_whois_lookup", "util_extract_contacts"],
  "OUTREACH_VALIDATOR": ["gmail_search", "contacts_manager", "gmail_check_sent", "gmail_check_sent_delayed", "crm_manage_leads", "knowledge_base_read"],

  // --- NEW TEAMS ---

  // DATA TEAM (Sheets & Analysis)
  "DATA_BUILDER": ["gsc_query", "gsc_inspect_url", "sheets_operation", "sheets_get_info", "crm_manage_leads", "crm_revenue_forecaster", "drive_create_doc", "drive_find_files", "ga4_run_report", "execute_python_sandbox", "knowledge_base_read", "lead_scoring"],
  "DATA_VALIDATOR": ["sheets_get_info", "drive_find_files", "crm_manage_leads", "knowledge_base_read"],

  // SOCIAL TEAM (New)
  "SOCIAL_BUILDER": ["social_profile_analysis", "social_trend_scanner", "google_search", "generate_image", "drive_create_doc", "save_to_knowledge_base", "knowledge_correlation_analysis"],
  "SOCIAL_VALIDATOR": ["google_search", "drive_find_files", "knowledge_base_read"],

  // FINANCE TEAM (New)
  "FINANCE_BUILDER": ["finance_create_invoice", "finance_project_estimator", "drive_create_doc", "drive_export_pdf", "drive_find_files", "gmail_create_draft", "crm_manage_leads", "finance_margin_calculator"],
  "FINANCE_VALIDATOR": ["drive_find_files", "gmail_search", "knowledge_base_read"],

  // COMMS TEAM (Inbox Triage & VIP Comms)
  "COMMS_BUILDER": ["gmail_search", "gmail_get_unread_count", "gmail_create_draft", "gmail_send", "gmail_bulk_send", "crm_manage_leads", "crm_intent_classifier", "crm_meeting_bridge", "crm_newsletter_sync", "contacts_manager", "doc_summarize", "drive_create_doc", "request_human_approval", "knowledge_base_read"],
  "COMMS_VALIDATOR": ["gmail_search", "gmail_get_unread_count", "gmail_check_sent", "gmail_check_sent_delayed", "drive_find_files", "knowledge_base_read"],

  // PM TEAM (Project Setup & Organization)
  "PM_BUILDER": ["tasks_manager", "calendar_manage", "drive_create_folder", "drive_create_doc", "patch_doc_content", "drive_move_file", "drive_share_file", "drive_find_files", "vector_store_upsert", "knowledge_base_read", "knowledge_base_update", "get_knowledge_base_meta", "persona_upsert", "persona_list", "sync_dynamic_tools"],
  "PM_VALIDATOR": ["tasks_manager", "drive_find_files", "calendar_manage", "knowledge_base_read"],

  // --- NEW EXPANDED TEAMS ---

  // DEV TEAM (Scripting & Technical Support)
  "DEV_BUILDER": ["run_system_retrospective", "google_search", "ask_knowledge_base", "drive_create_doc", "drive_find_files", "web_scrape", "execute_python_sandbox", "create_dynamic_tool", "knowledge_base_read", "knowledge_base_update", "curate_knowledge_topic", "persona_upsert", "persona_list", "sync_dynamic_tools", "patch_dynamic_tool"],
  "DEV_VALIDATOR": ["google_search", "drive_find_files", "knowledge_base_read"],

  // LEGAL TEAM (Policy & Compliance Review)
  "LEGAL_BUILDER": ["doc_summarize", "drive_find_files", "drive_create_doc", "patch_doc_content", "ask_knowledge_base"],
  "LEGAL_VALIDATOR": ["doc_summarize", "drive_find_files"]
};

var manifestCache = {};

function getManifest(role) {

  // If no role provided, return ALL tools (for the Root Orchestrator or Admin)

  var allTools = TOOLS_MANIFEST;

  var allScopes = TOOL_SCOPES;

  

  if (typeof PluginManager !== 'undefined') {

    allTools = allTools.concat(PluginManager.getPluginTools());

    var pScopes = PluginManager.getPluginScopes();

    for (var r in pScopes) {

      if (!allScopes[r]) allScopes[r] = [];

      allScopes[r] = allScopes[r].concat(pScopes[r]);

    }

  }



  if (!role || !allScopes[role]) {

    return allTools;

  }



  if (manifestCache[role]) return manifestCache[role];



  // Filter the manifest to only include allowed tools

  var allowedTools = allScopes[role];

  var filtered = allTools.filter(function(tool) {

    return allowedTools.indexOf(tool.name) !== -1;

  });

  

  manifestCache[role] = filtered;

  return filtered;

}
