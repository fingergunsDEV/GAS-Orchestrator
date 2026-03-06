/**
 * DriveUtils.gs
 * Core utilities for Google Drive operations used across all departments.
 */

/**
 * Helper to safely get a file by ID with improved error handling and Advanced Service fallback.
 * Defined globally to prevent ReferenceErrors in multi-file projects.
 */
function safeGetFileById(fileId) {
  if (!fileId) throw new Error("Missing File ID.");
  
  // Clean the ID: sometimes agents include quotes or brackets
  fileId = fileId.toString().replace(/['"\[\]]/g, "").trim();

  try {
    // Stage 1: Standard DriveApp
    return DriveApp.getFileById(fileId);
  } catch (e) {
    // Stage 2: Multi-Stage Fallback
    // Cryptic "Unexpected error" or "Access denied" usually means we should try the Advanced Service
    console.warn("DriveApp lookup failed for ID (" + fileId + "): " + e.message + ". Attempting Advanced Service fallback...");
    
    try {
      if (typeof Drive !== 'undefined' && Drive.Files) {
        var fileMeta = Drive.Files.get(fileId);
        if (fileMeta) {
          // If Advanced Service found it, the binding might be restored or we can use DriveApp now
          return DriveApp.getFileById(fileId); 
        }
      }
    } catch (advErr) {
      console.error("Advanced Drive lookup failed: " + advErr.message);
    }
    
    // Improved Error Diagnostics
    var msg = e.message;
    if (msg.indexOf("not found") !== -1 || msg.indexOf("Unexpected error") !== -1) {
      throw new Error("Drive Error: File not found or invalid ID format (ID: " + fileId + "). Ensure you are passing a valid File ID, not a filename.");
    }
    if (msg.indexOf("permission") !== -1 || msg.indexOf("Access denied") !== -1) {
      throw new Error("Drive Error: Permission denied for ID: " + fileId + ". Ensure the file is shared with you.");
    }
    
    throw new Error("Drive Error: " + msg + " (ID: " + fileId + ")");
  }
}

/**
 * Ensures a dedicated folder exists for a contact.
 */
function getOrCreateContactFolder(contactName) {
  var folderName = "CONTACT_" + contactName.replace(/ /g, "_").toUpperCase();
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  
  // Create in root or a dedicated 'Leads' parent folder if it exists
  var root = DriveApp.getRootFolder();
  var leadsFolder;
  var leadsFolders = DriveApp.getFoldersByName("AGENCY_LEADS");
  if (leadsFolders.hasNext()) {
    leadsFolder = leadsFolders.next();
  } else {
    leadsFolder = root.createFolder("AGENCY_LEADS");
  }
  
  return leadsFolder.createFolder(folderName);
}

/**
 * Saves a Google Doc as a PDF in the specified folder.
 */
function saveDocAsPdf(docId, folder) {
  var doc = DocumentApp.openById(docId);
  var pdfBlob = doc.getAs('application/pdf');
  var pdfFile = folder.createFile(pdfBlob);
  return pdfFile.getUrl();
}
