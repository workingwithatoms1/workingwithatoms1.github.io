/**
 * Google Apps Script backend for the annotation/sidenote system.
 *
 * DEPLOYMENT:
 * 1. Go to https://script.google.com and create a new project
 * 2. Paste this code into Code.gs
 * 3. Create a Google Sheet and copy its ID into SHEET_ID below
 * 4. In the Apps Script editor, go to Deploy > New deployment
 * 5. Select "Web app", set access to "Anyone", and deploy
 * 6. Copy the deployment URL and paste it into APPS_SCRIPT_URL in annotations.js
 *
 * SHEET COLUMNS:
 * A: Timestamp | B: Page URL | C: Article slug | D: Selected text
 * E: Comment type | F: Comment | G: Name | H: Email
 * I: Status (unreviewed/approved/integrated/rejected)
 * J: Votes | K: Comment ID
 */

var SHEET_ID = '1SGP2R8d57u3psP8BnGvbcok0TNzrfX0Gqf1hWERslMw';

function generateId() {
  return Utilities.getUuid().substring(0, 8);
}

function doPost(e) {
  try {
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    var data = e.parameter;
    var action = data.action || 'comment';

    if (action === 'vote') {
      // Find the row with this comment ID and increment/decrement votes
      var commentId = data.commentId;
      var direction = data.direction === 'down' ? -1 : 1;
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][10] === commentId) { // Column K = index 10
          var currentVotes = parseInt(rows[i][9]) || 0; // Column J = index 9
          sheet.getRange(i + 1, 10).setValue(currentVotes + direction);
          return ContentService
            .createTextOutput(JSON.stringify({ status: "ok", votes: currentVotes + direction }))
            .setMimeType(ContentService.MimeType.JSON);
        }
      }
      return ContentService
        .createTextOutput(JSON.stringify({ status: "error", message: "Comment not found" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Default: new comment
    var commentId = generateId();
    sheet.appendRow([
      new Date(),
      data.pageUrl || "",
      data.articleSlug || "",
      data.selectedText || "",
      data.commentType || "general",
      data.comment || "",
      data.name || "",
      data.email || "",
      "unreviewed",
      0,
      commentId
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", commentId: commentId }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var slug = (e && e.parameter && e.parameter.slug) || '';
    var sheet = SpreadsheetApp.openById(SHEET_ID).getActiveSheet();
    var rows = sheet.getDataRange().getValues();
    var comments = [];

    for (var i = 1; i < rows.length; i++) {
      var status = rows[i][8]; // Column I
      if (status !== 'approved') continue;

      // Filter by slug if provided
      var rowSlug = rows[i][2]; // Column C
      if (slug && rowSlug !== slug) continue;

      comments.push({
        id: rows[i][10] || '',       // Column K
        selectedText: rows[i][3],     // Column D
        comment: rows[i][5],          // Column F
        name: rows[i][6] || 'Anonymous', // Column G
        votes: parseInt(rows[i][9]) || 0, // Column J
        timestamp: rows[i][0].toISOString ? rows[i][0].toISOString() : rows[i][0],
      });
    }

    // Sort by votes descending
    comments.sort(function(a, b) { return b.votes - a.votes; });

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", comments: comments }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
