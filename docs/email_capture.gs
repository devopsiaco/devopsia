function addCorsHeaders(output) {
  output.setHeader('Access-Control-Allow-Origin', '*');
  output.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  output.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  return output;
}

function emptyResponse() {
  var output = ContentService.createTextOutput('');
  output.setMimeType(ContentService.MimeType.JSON);
  addCorsHeaders(output);
  return output;
}
function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    // fallback for URL encoded form data
    data.email = e.parameter.email;
  }
  var email = (data.email || '').trim();

  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  addCorsHeaders(output);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    output.setContent(JSON.stringify({ result: 'error', message: 'Invalid email' }));
    return output;
  }

  var sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getSheetByName('Emails');
  var emails = sheet.getRange(1, 2, sheet.getLastRow()).getValues().flat();
  if (emails.indexOf(email) !== -1) {
    output.setContent(JSON.stringify({ result: 'duplicate' }));
    return output;
  }

  sheet.appendRow([new Date(), email]);
  output.setContent(JSON.stringify({ result: 'success' }));
  return output;
}

function doGet(e) {
  return emptyResponse();
}
