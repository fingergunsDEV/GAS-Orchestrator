/**
 * CREDENTIALS.gs
 * Secure management of API keys and environment variables.
 */

/**
 * Saves a key-value pair to Script Properties.
 */
function setVaultKey(name, value) {
  if (!name || !value) return { success: false, message: "Name and Value are required." };
  PropertiesService.getScriptProperties().setProperty(name, value.trim());
  return { success: true, message: "Key '" + name + "' saved successfully." };
}

/**
 * Retrieves all keys (but masks the values for security).
 */
function getVaultKeys() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var keys = [];
  for (var key in props) {
    var val = props[key];
    var masked = val.length > 8 ? val.substring(0, 4) + "...." + val.substring(val.length - 4) : "****";
    keys.push({ name: key, value: masked });
  }
  return keys;
}

/**
 * Deletes a key from the vault.
 */
function deleteVaultKey(name) {
  PropertiesService.getScriptProperties().deleteProperty(name);
  return { success: true, message: "Key '" + name + "' deleted." };
}

/**
 * Helper to get a key for internal script use.
 */
function getSecret(name) {
  return PropertiesService.getScriptProperties().getProperty(name);
}
