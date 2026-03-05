/**
 * CREDENTIALS.gs
 * Secure management of API keys and environment variables via StateManager's SecureVault.
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
