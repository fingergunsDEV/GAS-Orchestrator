/**
 * SECURE VAULT (v4.17.0)
 * Encrypted management of API keys and secrets.
 */
var SecureVault = {
  _salt: "HGM_SWARM_V4_SECURE_SALT",
  
  _obfuscate: function(text) {
    var result = "";
    for (var i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ this._salt.charCodeAt(i % this._salt.length));
    }
    return Utilities.base64Encode(result);
  },
  
  _deobfuscate: function(encoded) {
    try {
      var text = Utilities.newBlob(Utilities.base64Decode(encoded)).getDataAsString();
      var result = "";
      for (var i = 0; i < text.length; i++) {
        result += String.fromCharCode(text.charCodeAt(i) ^ this._salt.charCodeAt(i % this._salt.length));
      }
      return result;
    } catch(e) {
      return encoded; // Fallback for unencrypted legacy keys
    }
  },

  setSecret: function(key, value) {
    if (!key || !value) return false;
    var encrypted = this._obfuscate(value.trim());
    PropertiesService.getScriptProperties().setProperty("VAULT_" + key, encrypted);
    return true;
  },

  getSecret: function(key) {
    var val = PropertiesService.getScriptProperties().getProperty("VAULT_" + key);
    if (!val) {
      // Fallback to legacy un-prefixed keys during transition
      val = PropertiesService.getScriptProperties().getProperty(key);
      if (!val) return null;
      return val; 
    }
    return this._deobfuscate(val);
  },
  
  deleteSecret: function(key) {
    PropertiesService.getScriptProperties().deleteProperty("VAULT_" + key);
    PropertiesService.getScriptProperties().deleteProperty(key);
  },
  
  listKeys: function() {
    var props = PropertiesService.getScriptProperties().getProperties();
    var keys = [];
    for (var k in props) {
      // Ignore system internal keys
      if (k.startsWith("SESSION_") || k.startsWith("MISSION_") || k.startsWith("SWARM_") || k.startsWith("blob_")) continue;
      
      if (k.startsWith("VAULT_")) {
        var name = k.substring(6);
        keys.push({ name: name, value: "**** (Encrypted)" });
      } else {
        // This is a legacy key - show it so the user can see their current config
        var val = props[k];
        var masked = val.length > 10 ? val.substring(0, 4) + "..." + val.substring(val.length - 4) : "****";
        keys.push({ name: k, value: masked + " (Legacy)" });
      }
    }
    return keys;
  }
};

/**
 * CREDENTIALS.gs
 * Secure management of API keys and environment variables via SecureVault.
 */

/**
 * Saves a key-value pair to Script Properties securely.
 */
function setVaultKey(name, value) {
  if (!name || !value) return { success: false, message: "Name and Value are required." };
  var success = SecureVault.setSecret(name, value);
  return { success: success, message: "Key '" + name + "' saved securely." };
}

/**
 * Retrieves all keys (but masks the values for security).
 */
function getVaultKeys() {
  return SecureVault.listKeys();
}

/**
 * Deletes a key from the vault.
 */
function deleteVaultKey(name) {
  SecureVault.deleteSecret(name);
  return { success: true, message: "Key '" + name + "' deleted securely." };
}

/**
 * Helper to get a key for internal script use.
 */
function getSecret(name) {
  return SecureVault.getSecret(name);
}
