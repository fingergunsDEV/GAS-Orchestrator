/**
 * Tools_GitHub.gs
 * GitHub integration tools for the Coding Agent.
 */

/**
 * Helper to get the GitHub Token from PropertiesService.
 */
function getGitHubToken() {
  var props = PropertiesService.getScriptProperties();
  return props.getProperty("GITHUB_TOKEN");
}

/**
 * Registers GitHub tools with CoreRegistry.
 */
function registerGitHubTools() {
  if (typeof CoreRegistry === 'undefined') return;

  var tools = [
    {
      name: "github_read_repo_tree",
      description: "Fetches the directory tree of a GitHub repository to understand its structure.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Repository owner (e.g., 'octocat')" },
          repo: { type: "string", description: "Repository name (e.g., 'Hello-World')" },
          branch: { type: "string", description: "Branch name (e.g., 'main'). Defaults to main if omitted." }
        },
        required: ["owner", "repo"]
      }
    },
    {
      name: "github_read_file",
      description: "Reads the content of a specific file from a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          path: { type: "string", description: "Path to the file, e.g., 'src/index.js'" },
          branch: { type: "string" }
        },
        required: ["owner", "repo", "path"]
      }
    },
    {
      name: "github_commit_file",
      description: "Creates or updates a file directly on a specified branch in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          path: { type: "string", description: "Path to the file to create/update" },
          content: { type: "string", description: "The new raw content of the file (unencoded, plain text)" },
          message: { type: "string", description: "Commit message" },
          branch: { type: "string" }
        },
        required: ["owner", "repo", "path", "content", "message", "branch"]
      }
    },
    {
      name: "github_create_branch",
      description: "Creates a new branch from a base branch in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          newBranch: { type: "string", description: "Name of the new branch to create" },
          baseBranch: { type: "string", description: "Name of the base branch to branch off of (e.g., 'main')" }
        },
        required: ["owner", "repo", "newBranch", "baseBranch"]
      }
    },
    {
      name: "github_create_pr",
      description: "Creates a Pull Request in a GitHub repository.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          title: { type: "string", description: "Title of the Pull Request" },
          body: { type: "string", description: "Markdown description of the Pull Request" },
          head: { type: "string", description: "The branch you want to merge (e.g., 'feature-branch')" },
          base: { type: "string", description: "The branch you want to merge into (e.g., 'main')" }
        },
        required: ["owner", "repo", "title", "body", "head", "base"]
      }
    },
    {
      name: "github_sync_full_codebase",
      description: "Synchronize the entire GAS project codebase to a GitHub repository branch directly.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          commitMessage: { type: "string" },
          branch: { type: "string", description: "The branch to push to (e.g., 'main')." }
        },
        required: ["owner", "repo", "commitMessage", "branch"]
      }
    },
    {
      name: "github_rollback_file",
      description: "Fetches a specific version of a file from GitHub (by branch or commit SHA) and overwrites the local Google Drive file.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          path: { type: "string", description: "Path to the file in GitHub, e.g., 'Tools_GitHub.gs'" },
          ref: { type: "string", description: "Branch name or Commit SHA to rollback to. Defaults to main." }
        },
        required: ["owner", "repo", "path"]
      }
    },
    {
      name: "github_fetch_job_logs",
      description: "Fetches the raw text logs of a failed GitHub Actions job to diagnose and heal build/lint/typecheck errors.",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string" },
          repo: { type: "string" },
          jobId: { type: "string", description: "The numeric ID of the GitHub Action job to fetch logs for." }
        },
        required: ["owner", "repo", "jobId"]
      }
    }
  ];

  var implementations = {
    "github_read_repo_tree": executeGithubReadRepoTree,
    "github_read_file": executeGithubReadFile,
    "github_commit_file": executeGithubCommitFile,
    "github_create_branch": executeGithubCreateBranch,
    "github_create_pr": executeGithubCreatePr,
    "github_sync_full_codebase": executeGithubSyncFullCodebase,
    "github_rollback_file": executeGithubRollbackFile,
    "github_fetch_job_logs": executeGithubFetchJobLogs
  };

  var scopes = {
    "CODE_BUILDER": ["github_read_repo_tree", "github_read_file", "github_commit_file", "github_create_branch", "github_create_pr", "github_sync_full_codebase", "github_rollback_file", "github_fetch_job_logs", "delegate_to_team"],
    "DEV_BUILDER": ["github_read_repo_tree", "github_read_file", "github_commit_file", "github_create_branch", "github_create_pr", "github_sync_full_codebase", "github_rollback_file", "github_fetch_job_logs"]
  };

  var team = {
    name: "Coding Engine",
    handlerName: "runCodingAgent",
    description: "Specializes in writing code, refactoring, interacting with GitHub, and executing repository-level tasks."
  };

  CoreRegistry.register("GitHub", tools, implementations, scopes, team);
}

// --- API Implementation ---

function _githubApiRequest(endpoint, method, payload) {
  var token = getGitHubToken();
  if (!token) return { error: "GITHUB_TOKEN is not set in Script Properties." };

  var url = "https://api.github.com" + endpoint;
  var options = {
    method: method || "GET",
    headers: {
      "Authorization": "token " + token,
      "Accept": "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28"
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.contentType = "application/json";
    options.payload = JSON.stringify(payload);
  }

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    var responseText = response.getContentText();
    
    if (code >= 200 && code < 300) {
      if (!responseText) return { success: true };
      return JSON.parse(responseText);
    } else {
      return { error: "GitHub API Error (" + code + "): " + responseText };
    }
  } catch (e) {
    return { error: "Request Failed: " + e.message };
  }
}

function executeGithubReadRepoTree(args) {
  var owner = args.owner;
  var repo = args.repo;
  var branch = args.branch || "main";
  
  // Get branch SHA
  var refData = _githubApiRequest("/repos/" + owner + "/" + repo + "/git/ref/heads/" + branch);
  if (refData.error) return JSON.stringify(refData);
  
  var sha = refData.object.sha;
  
  // Get Tree (recursive=1 to get full tree)
  var treeData = _githubApiRequest("/repos/" + owner + "/" + repo + "/git/trees/" + sha + "?recursive=1");
  if (treeData.error) return JSON.stringify(treeData);
  
  // Limit the tree size if it's too large
  if (treeData.tree && treeData.tree.length > 500) {
     return JSON.stringify({ note: "Tree too large, truncated to first 500 files.", tree: treeData.tree.slice(0, 500) });
  }
  
  return JSON.stringify(treeData);
}

function executeGithubReadFile(args) {
  var owner = args.owner;
  var repo = args.repo;
  var path = args.path;
  var branch = args.branch || "main";
  
  var endpoint = "/repos/" + owner + "/" + repo + "/contents/" + path + "?ref=" + branch;
  var res = _githubApiRequest(endpoint);
  
  if (res.error) return JSON.stringify(res);
  if (res.content) {
    try {
      var decoded = Utilities.newBlob(Utilities.base64Decode(res.content)).getDataAsString();
      return JSON.stringify({ path: path, content: decoded, sha: res.sha });
    } catch(e) {
      return JSON.stringify({ error: "Failed to decode content: " + e.message });
    }
  }
  return JSON.stringify(res);
}

function executeGithubCommitFile(args) {
  var owner = args.owner;
  var repo = args.repo;
  var path = args.path;
  var content = args.content;
  var message = args.message;
  var branch = args.branch;

  var endpoint = "/repos/" + owner + "/" + repo + "/contents/" + path;
  
  // Need the current file SHA to update it
  var currentFile = _githubApiRequest(endpoint + "?ref=" + branch);
  var sha = null;
  if (!currentFile.error && currentFile.sha) {
    sha = currentFile.sha;
  }

  var payload = {
    message: message,
    content: Utilities.base64Encode(content),
    branch: branch
  };
  
  if (sha) payload.sha = sha;

  var res = _githubApiRequest(endpoint, "PUT", payload);
  return JSON.stringify(res);
}

function executeGithubCreateBranch(args) {
  var owner = args.owner;
  var repo = args.repo;
  var newBranch = args.newBranch;
  var baseBranch = args.baseBranch;

  // Get base branch SHA
  var refData = _githubApiRequest("/repos/" + owner + "/" + repo + "/git/ref/heads/" + baseBranch);
  if (refData.error) return JSON.stringify(refData);

  var payload = {
    ref: "refs/heads/" + newBranch,
    sha: refData.object.sha
  };

  var res = _githubApiRequest("/repos/" + owner + "/" + repo + "/git/refs", "POST", payload);
  return JSON.stringify(res);
}

function executeGithubCreatePr(args) {
  var owner = args.owner;
  var repo = args.repo;
  
  var payload = {
    title: args.title,
    body: args.body,
    head: args.head,
    base: args.base
  };
  
  var res = _githubApiRequest("/repos/" + owner + "/" + repo + "/pulls", "POST", payload);
  return JSON.stringify(res);
}

/**
 * executeGithubSyncFullCodebase Implementation
 */
function executeGithubSyncFullCodebase(args) {
  var owner = args.owner;
  var repo = args.repo;
  var branch = args.branch || "main";
  var commitMessage = args.commitMessage;

  var results = [];
  try {
    var scriptId = ScriptApp.getScriptId();
    var scriptFile = DriveApp.getFileById(scriptId);
    
    // In GAS, we are a single file in Drive. To find "our" files, we look in our parent folder.
    var parents = scriptFile.getParents();
    var folder;
    if (parents.hasNext()) {
      folder = parents.next();
    } else {
      folder = DriveApp.getRootFolder();
    }
    
    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      var fileName = file.getName();
      
      // LOGIC UPGRADE: If it's the script project itself, we can't easily get its internal files 
      // without the Apps Script API. However, if the user has uploaded .gs/.html files as 
      // separate files in the same folder (common in dev workflows), we sync them.
      
      var shouldSync = false;
      var syncPath = fileName;
      
      if (fileName.endsWith(".gs") || fileName.endsWith(".html") || fileName === "appsscript.json") {
         shouldSync = true;
      } else if (file.getMimeType() === "application/vnd.google-apps.script") {
         // This is a script project container. We can't sync its internal files directly via DriveApp.
         // We add a result entry to warn the user.
         results.push({ file: fileName, result: { error: "Container project detected. Use Apps Script API or Clasp for full code sync." } });
         continue;
      }
      
      if (shouldSync) {
        var content = file.getBlob().getDataAsString();
        var commitRes = executeGithubCommitFile({
          owner: owner,
          repo: repo,
          path: syncPath,
          content: content,
          message: commitMessage,
          branch: branch
        });
        results.push({ file: fileName, result: JSON.parse(commitRes) });
      }
    }
  } catch (e) {
    return JSON.stringify({ error: "Sync Engine Failure: " + e.message });
  }

  if (results.length === 0) {
    return JSON.stringify({ 
      error: "No standalone .gs or .html files found in the parent folder.",
      context: "Google Apps Script projects are 'containers'. To sync the internal code, enable the Apps Script API in your Google account settings and use a tool designed for project exports."
    });
  }

  return JSON.stringify({
    summary: "Cloud-to-GitHub sync completed for visible files.",
    branch: branch,
    filesProcessed: results.length,
    details: results
  });
}

/**
 * triggerGithubPipeline (v4.13.1)
 * Triggers a real CI/CD pipeline run on GitHub Actions.
 */
function triggerGithubPipeline(args) {
  var sessionId = args.sessionId;
  var owner = args.owner;
  var repo = args.repo;
  var branch = args.branch || "main";
  
  var token = getGitHubToken();
  if (!token) return JSON.stringify({ success: false, message: "No GitHub token found in PropertiesService." });

  // Trigger a repository_dispatch event to start the pipeline
  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/dispatches";
  var payload = {
    event_type: "run-hgm-pipeline",
    client_payload: { branch: branch }
  };

  var options = {
    method: "post",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github.v3+json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      if (typeof logSwarmMessage !== 'undefined') {
        logSwarmMessage(sessionId, "ORCHESTRATOR", "PIPELINE_ENGINE", "TRIGGER_WORKFLOW", "GitHub Action triggered for branch: " + branch);
      }
      return JSON.stringify({ success: true, message: "Pipeline triggered on GitHub Actions." });
    } else {
      return JSON.stringify({ success: false, message: "GitHub API Error: " + response.getContentText() });
    }
  } catch (e) {
    return JSON.stringify({ success: false, message: "Execution error: " + e.message });
  }
}

/**
 * checkGithubPipelineStatus (v4.13.1)
 * Polls the latest GitHub Action run for the UI.
 */
function checkGithubPipelineStatus(args) {
  var owner = args.owner;
  var repo = args.repo;
  var branch = args.branch || "main";
  
  var token = getGitHubToken();
  if (!token) return JSON.stringify({ success: false, message: "No token." });

  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/actions/runs?branch=" + branch + "&per_page=1";
  var options = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github.v3+json"
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) return JSON.stringify({ success: false, message: "Failed to fetch runs." });

    var data = JSON.parse(response.getContentText());
    var runs = data.workflow_runs || [];
    
    if (runs.length === 0) {
      return JSON.stringify({ success: true, stages: [
        { name: "GITHUB ACTION PIPELINE", status: "QUEUED", log: "Awaiting GitHub Actions run..." }
      ]});
    }

    var latestRun = runs[0];
    var status = latestRun.status; 
    var conclusion = latestRun.conclusion;

    // Fetch jobs for details
    var jobsUrl = latestRun.jobs_url;
    var jobsResponse = UrlFetchApp.fetch(jobsUrl, options);
    var jobsData = JSON.parse(jobsResponse.getContentText());
    var jobs = jobsData.jobs || [];

    var stages = jobs.map(function(job) {
       var jobStatus = "QUEUED";
       if (job.status === "in_progress") jobStatus = "RUNNING";
       else if (job.status === "completed") jobStatus = (job.conclusion === "success") ? "PASS" : "FAIL";
       return {
         name: job.name.toUpperCase(),
         status: jobStatus,
         jobId: job.id, // Added ID for fetching logs
         log: "URL: " + job.html_url + "\nStatus: " + job.status + (job.conclusion ? " (" + job.conclusion + ")" : "")
       };
    });

    if (stages.length === 0) {
        var overallStatus = "QUEUED";
        if (status === "in_progress") overallStatus = "RUNNING";
        else if (status === "completed") overallStatus = (conclusion === "success") ? "PASS" : "FAIL";
        stages.push({ name: "GITHUB ACTION PIPELINE", status: overallStatus, log: "Workflow Run: " + latestRun.name + "\nURL: " + latestRun.html_url });
    }

    return JSON.stringify({ success: true, stages: stages, conclusion: conclusion, runId: latestRun.id });
  } catch (e) {
    return JSON.stringify({ success: false, message: "Error: " + e.message });
  }
}

/**
 * executeGithubFetchJobLogs (v4.15.0)
 * Fetches the raw text logs of a specific failed job to feed back into the agentic loop.
 */
function executeGithubFetchJobLogs(args) {
  var owner = args.owner;
  var repo = args.repo;
  var jobId = args.jobId;

  var token = getGitHubToken();
  if (!token) return JSON.stringify({ success: false, message: "No GitHub token found." });

  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/actions/jobs/" + jobId + "/logs";
  var options = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github.v3+json"
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    
    // GitHub logs often return a 302 redirect to a temporary URL. UrlFetchApp follows this automatically.
    if (response.getResponseCode() >= 200 && response.getResponseCode() < 300) {
      var logText = response.getContentText();
      
      // Heuristic: truncate to the last 100 lines so we don't blow up the context window
      var lines = logText.split('\n');
      var tail = lines.slice(Math.max(lines.length - 100, 0)).join('\n');
      
      return JSON.stringify({ success: true, logs: tail });
    } else {
       return JSON.stringify({ success: false, message: "Failed to fetch logs. API returned: " + response.getResponseCode() });
    }
  } catch (e) {
    return JSON.stringify({ success: false, message: "Execution error: " + e.message });
  }
}

/**
 * executeGithubRollbackFile (v4.14.0)
 * Fetches a file from a specific GitHub ref and overwrites the local Drive file.
 */
function executeGithubRollbackFile(args) {
  var owner = args.owner;
  var repo = args.repo;
  var path = args.path;
  var ref = args.ref || "main";
  
  var endpoint = "/repos/" + owner + "/" + repo + "/contents/" + path + "?ref=" + ref;
  var res = _githubApiRequest(endpoint);
  
  if (res.error) return JSON.stringify(res);
  if (res.content) {
    try {
      var decoded = Utilities.newBlob(Utilities.base64Decode(res.content)).getDataAsString();
      
      var scriptId = ScriptApp.getScriptId();
      var scriptFile = DriveApp.getFileById(scriptId);
      var parents = scriptFile.getParents();
      var folder = parents.hasNext() ? parents.next() : DriveApp.getRootFolder();
      
      // Assumes a flat structure in Drive for GAS files
      var fileName = path.split('/').pop(); 
      var files = folder.getFilesByName(fileName);
      
      if (files.hasNext()) {
         var file = files.next();
         // Attempt to overwrite the file content
         file.setContent(decoded);
         return JSON.stringify({ success: true, message: "Successfully rolled back '" + fileName + "' to GitHub ref: " + ref });
      } else {
         return JSON.stringify({ error: "Local file '" + fileName + "' not found in the project folder to overwrite." });
      }
    } catch(e) {
      return JSON.stringify({ error: "Failed to rollback: " + e.message });
    }
  }
  return JSON.stringify({ error: "No content found at ref: " + ref });
}

/**
 * getRecentGithubCommits (v4.15.0)
 * Fetches the recent commit history for the UI.
 */
function getRecentGithubCommits(args) {
  var owner = args.owner;
  var repo = args.repo;
  var branch = args.branch || "main";
  var limit = args.limit || 15;

  var token = getGitHubToken();
  if (!token) return JSON.stringify({ success: false, message: "No token." });

  var url = "https://api.github.com/repos/" + owner + "/" + repo + "/commits?sha=" + branch + "&per_page=" + limit;
  var options = {
    method: "get",
    headers: {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github.v3+json"
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    if (response.getResponseCode() !== 200) return JSON.stringify({ success: false, message: "Failed to fetch commits." });

    var data = JSON.parse(response.getContentText());
    var commits = data.map(function(c) {
      return {
        sha: c.sha.substring(0, 7),
        message: c.commit.message,
        author: c.commit.author.name,
        date: c.commit.author.date,
        url: c.html_url
      };
    });

    return JSON.stringify({ success: true, commits: commits });
  } catch (e) {
    return JSON.stringify({ success: false, message: "Error: " + e.message });
  }
}