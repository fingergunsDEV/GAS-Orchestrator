/**
 * SocialOAuth.gs
 * Handles OAuth2 flows for Facebook (Meta) and LinkedIn.
 */

var SocialOAuth = (function() {
  var FB_CLIENT_ID = getSecret("FACEBOOK_CLIENT_ID");
  var FB_CLIENT_SECRET = getSecret("FACEBOOK_CLIENT_SECRET");
  var LI_CLIENT_ID = getSecret("LINKEDIN_CLIENT_ID");
  var LI_CLIENT_SECRET = getSecret("LINKEDIN_CLIENT_SECRET");
  
  var REDIRECT_URI = ScriptApp.getService().getUrl();

  return {
    /**
     * Returns the Facebook Auth URL.
     */
    getFacebookAuthUrl: function() {
      if (!FB_CLIENT_ID) return "Error: FACEBOOK_CLIENT_ID not set.";
      var scope = "pages_show_list,pages_read_engagement,pages_manage_posts,pages_messaging,ads_read";
      return "https://www.facebook.com/v19.0/dialog/oauth?client_id=" + FB_CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) + "&scope=" + scope + "&state=facebook";
    },

    /**
     * Returns the LinkedIn Auth URL.
     */
    getLinkedinAuthUrl: function() {
      if (!LI_CLIENT_ID) return "Error: LINKEDIN_CLIENT_ID not set.";
      var scope = "w_member_social r_liteprofile r_emailaddress w_organization_social r_organization_social";
      return "https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=" + LI_CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) + "&scope=" + encodeURIComponent(scope) + "&state=linkedin";
    },

    /**
     * Exchange code for token.
     */
    handleCallback: function(platform, code) {
      if (platform === "facebook") {
        return this.exchangeFacebookCode(code);
      } else if (platform === "linkedin") {
        return this.exchangeLinkedinCode(code);
      }
      return "Error: Unknown platform.";
    },

    exchangeFacebookCode: function(code) {
      var url = "https://graph.facebook.com/v19.0/oauth/access_token?client_id=" + FB_CLIENT_ID + "&redirect_uri=" + encodeURIComponent(REDIRECT_URI) + "&client_secret=" + FB_CLIENT_SECRET + "&code=" + code;
      try {
        var response = UrlFetchApp.fetch(url);
        var json = JSON.parse(response.getContentText());
        setVaultKey("FACEBOOK_ACCESS_TOKEN", json.access_token);
        return "Facebook token saved successfully.";
      } catch (e) { return "Error: " + e.message; }
    },

    exchangeLinkedinCode: function(code) {
      var url = "https://www.linkedin.com/oauth/v2/accessToken";
      var payload = {
        grant_type: "authorization_code",
        code: code,
        redirect_uri: REDIRECT_URI,
        client_id: LI_CLIENT_ID,
        client_secret: LI_CLIENT_SECRET
      };
      try {
        var response = UrlFetchApp.fetch(url, { method: "post", payload: payload });
        var json = JSON.parse(response.getContentText());
        setVaultKey("LINKEDIN_ACCESS_TOKEN", json.access_token);
        return "LinkedIn token saved successfully.";
      } catch (e) { return "Error: " + e.message; }
    }
  };
})();

/**
 * Endpoint for OAuth2 callbacks.
 * This should be integrated into the doGet(e) in Orchestrator.gs or index.gs.
 */
function handleSocialCallback(e) {
  var code = e.parameter.code;
  var state = e.parameter.state; // e.g., "facebook" or "linkedin"
  if (code && state) {
    var result = SocialOAuth.handleCallback(state, code);
    return HtmlService.createHtmlOutput("<h1>OAuth Callback</h1><p>" + result + "</p>");
  }
  return HtmlService.createHtmlOutput("<h1>OAuth Error</h1><p>Missing code or state.</p>");
}
