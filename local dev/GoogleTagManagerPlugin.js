/**
 * GoogleTagManagerPlugin.gs
 * GTM Management for GAS Orchestrator.
 */

function initGtmPlugin() {
  if (typeof PluginManager === 'undefined') return;

  PluginManager.register({
    name: "Google Tag Manager Toolkit",
    version: "1.0.0",
    description: "Manage GTM containers and tags.",
    tools: [
      {
        name: "gtm_list_accounts",
        description: "Lists all GTM accounts accessible by the user.",
        parameters: { type: "object", properties: {}, required: [] }
      },
      {
        name: "gtm_list_containers",
        description: "Lists containers in a GTM account.",
        parameters: {
          type: "object",
          properties: { accountId: { type: "string" } },
          required: ["accountId"]
        }
      },
      {
        name: "gtm_get_tags",
        description: "Lists all tags in a specific GTM workspace.",
        parameters: {
          type: "object",
          properties: {
            accountId: { type: "string" },
            containerId: { type: "string" }
          },
          required: ["accountId", "containerId"]
        }
      }
    ],
    scopes: {
      "DEV_BUILDER": ["gtm_list_accounts", "gtm_list_containers", "gtm_get_tags"],
      "SEO_BUILDER": ["gtm_get_tags"]
    },
    team: {
      name: "Tag Manager Specialist",
      description: "Audits and configures GTM tags/triggers.",
      handlerName: "runGtmSpecialist"
    }
  }, {
    "gtm_list_accounts": executeGtmListAccounts,
    "gtm_list_containers": executeGtmListContainers,
    "gtm_get_tags": executeGtmGetTags,
    "runGtmSpecialist": runGtmSpecialist
  });
}

// NOTE: Requires 'TagManager' advanced service to be enabled in GAS.

function executeGtmListAccounts() {
  try {
    if (typeof TagManager === 'undefined') return "Error: 'Google Tag Manager API' service must be enabled in Apps Script editor.";
    var accounts = TagManager.Accounts.list();
    if (!accounts.account) return "No GTM accounts found.";

    return accounts.account.map(function(a) {
      return "Name: " + a.name + " | ID: " + a.accountId;
    }).join("\n");
  } catch (e) {
    return "GTM Error: " + e.message;
  }
}

function executeGtmListContainers(args) {
  try {
    if (typeof TagManager === 'undefined') return "Error: GTM Service disabled.";
    var path = "accounts/" + args.accountId;
    var containers = TagManager.Accounts.Containers.list(path);
    if (!containers.container) return "No containers found in account " + args.accountId;

    return containers.container.map(function(c) {
      return "Name: " + c.name + " | ID: " + c.containerId + " | UsageContext: " + c.usageContext;
    }).join("\n");
  } catch (e) {
    return "GTM Error: " + e.message;
  }
}

function executeGtmGetTags(args) {
  try {
    if (typeof TagManager === 'undefined') return "Error: GTM Service disabled.";
    // Get default workspace (usually ID is just the number, but API needs path)
    // Path format: accounts/{accountId}/containers/{containerId}/workspaces/{workspaceId}
    // We first list workspaces to find the default one.
    var parent = "accounts/" + args.accountId + "/containers/" + args.containerId;
    var workspaces = TagManager.Accounts.Containers.Workspaces.list(parent);

    if (!workspaces.workspace || workspaces.workspace.length === 0) return "No workspaces found.";
    var wsId = workspaces.workspace[0].workspaceId; // Use first available workspace

    var tagPath = parent + "/workspaces/" + wsId;
    var tags = TagManager.Accounts.Containers.Workspaces.Tags.list(tagPath);

    if (!tags.tag) return "No tags found in workspace " + wsId;

    return tags.tag.map(function(t) {
      return "Tag: " + t.name + " (" + t.type + ") | Firing Triggers: " + (t.firingTriggerId || []).length;
    }).join("\n");
  } catch (e) {
    return "GTM Error: " + e.message;
  }
}

function runGtmSpecialist(context, imageData, sessionId) {
  if (typeof executeTeamWorkflow !== 'undefined') {
    return executeTeamWorkflow(
      "Tag Manager Specialist",
      "DEV_BUILDER",
      "DEV_VALIDATOR",
      context.goal,
      imageData,
      sessionId
    );
  }
  return "Error: Workflow Engine missing.";
}

initGtmPlugin();