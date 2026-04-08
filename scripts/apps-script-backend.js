/**
 * Google Apps Script backend for the annotation system.
 *
 * DEPLOYMENT:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this code into Code.gs
 * 3. Create a Google Sheet and open it (the script will use the active sheet)
 * 4. In the Apps Script editor, go to Deploy > New deployment
 * 5. Select "Web app", set access to "Anyone", and deploy
 * 6. Copy the deployment URL and paste it into APPS_SCRIPT_URL in annotations.js
 *
 * SHEET COLUMNS:
 * A: Timestamp | B: Page URL | C: Article slug | D: Selected text
 * E: Comment type | F: Comment | G: Name | H: Email | I: Status
 */

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById('1SGP2R8d57u3psP8BnGvbcok0TNzrfX0Gqf1hWERslMw').getActiveSheet();
    var data = e.parameter;

    sheet.appendRow([
      new Date(),
      data.pageUrl || "",
      data.articleSlug || "",
      data.selectedText || "",
      data.commentType || "general",
      data.comment || "",
      data.name || "",
      data.email || "",
      "unreviewed"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: "ok" }))
    .setMimeType(ContentService.MimeType.JSON);
}
