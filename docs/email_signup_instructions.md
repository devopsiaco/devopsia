# Email Signup Integration

This repository uses a simple Google Apps Script to collect emails submitted via the CTA form on the main page.

## Setup
1. Create a new Google Sheet and note its ID from the URL.
2. Open [Google Apps Script](https://script.google.com/) and create a new project.
3. Copy the contents of `email_capture.gs` into the script editor.
4. Replace `YOUR_SPREADSHEET_ID` with the ID of your sheet.
5. Deploy the script as a web app and copy the generated URL.
6. In `docs/index.html`, replace `YOUR_SCRIPT_ID` in the form `action` attribute with the deployed web app URL ID.

Submissions will append the email address and a timestamp to the `Emails` sheet.

## Testing

This repository includes a `package.json` with a placeholder `npm test` script. At the moment there are **no real tests**; the script simply prints a message and exits successfully.
