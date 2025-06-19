function doPost(e) {
  var email = e.parameter.email;
  var sheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID').getSheetByName('Emails');
  sheet.appendRow([new Date(), email]);
  return ContentService.createTextOutput('Success').setMimeType(ContentService.MimeType.TEXT);
}
