/**
 * LO'RIZ recruitment form backend for Google Apps Script.
 *
 * Setup:
 * 1. Add this file to the Apps Script project connected to your Google Sheet.
 * 2. Update the values in CONFIG when needed.
 * 3. Run setupSheet() once to create and style the Applications sheet.
 * 4. Deploy as a Web app: Execute as Me, access Anyone.
 * 5. Add the deployed /exec URL to script.js.
 */

const CONFIG = {
  // Leave blank when this Apps Script project is attached to the destination Sheet.
  SPREADSHEET_ID: '',
  SHEET_NAME: 'Applications',

  // Optional Drive folder for uploaded CV files.
  DRIVE_FOLDER_ID: '',

  // Optional Telegram notification settings.
  TELEGRAM_BOT_TOKEN: '8774114299:AAGDDE0usil4RQ8p-fyNwyzubZBsbvJaJ6s',
  TELEGRAM_CHAT_ID: '8827811694'
};

const COLORS = {
  purple: '#452064',
  lightPurple: '#F3EEF9',
  border: '#E5DFEA',
  text: '#241C2F',
  muted: '#726B79',
  white: '#FFFFFF'
};

const HEADERS = [
  'Timestamp',
  'Name',
  'Age',
  'Phone / WhatsApp',
  'Location',
  'Education',
  'Experience',
  'Skincare Knowledge',
  'Communication',
  'Daily Availability',
  'Remote Work',
  'Device & Internet',
  'Math Answer',
  'Communication Rating',
  'Color Answer',
  'Customer Meaning',
  'Pressure Handling',
  'Unclear Task',
  'Customer Disagreement',
  'Repetitive Work',
  'Team Disagreement',
  'Mistake Response',
  'Work Priority',
  'Learning Interest',
  'Customer Service',
  'Skill Improve',
  'Assessment',
  'Why Join LO\'RIZ',
  'Anything Else',
  'CV Name',
  'CV MIME Type',
  'CV Drive URL'
];

/** Adds a convenient menu when the spreadsheet opens. */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('LO\'RIZ Applications')
    .addItem('Create / refresh sheet design', 'setupSheet')
    .addItem('Remove active filter', 'removeFilter')
    .addToUi();
}

/** Creates the sheet, headers, filter, widths and visual styling. */
function setupSheet() {
  const sheet = getSheet_();
  ensureHeaders_(sheet);
  styleSheet_(sheet);
  SpreadsheetApp.getActive().toast('Applications sheet is ready.', 'LO\'RIZ', 5);
}

/** Receives JSON data sent by the website. */
function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents || '{}');
    const sheet = getSheet_();
    ensureHeaders_(sheet);

    const cvUrl = saveCv_(payload);
    const row = [
      new Date(),
      payload.name || '',
      payload.age || '',
      payload.phone || '',
      payload.location || '',
      payload.education || '',
      payload.experience || '',
      payload.skincareKnowledge || '',
      payload.communication || '',
      payload.dailyAvailability || '',
      payload.remoteWork || '',
      payload.deviceInternet || '',
      payload.mathAnswer || '',
      payload.communicationRating || '',
      payload.colorAnswer || '',
      payload.customerMeaning || '',
      payload.pressureHandling || '',
      payload.unclearTask || '',
      payload.customerDisagreement || '',
      payload.repetitiveWork || '',
      payload.teamDisagreement || '',
      payload.mistakeResponse || '',
      payload.workPriority || '',
      payload.learningInterest || '',
      payload.customerService || '',
      payload.skillImprove || '',
      payload.assessment || '',
      payload.whyLoriz || '',
      payload.anythingElse || '',
      payload.cvName || '',
      payload.cvMimeType || '',
      cvUrl
    ];

    const nextRow = Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
    formatDataRow_(sheet, nextRow);
    sendTelegramNotification_(payload, cvUrl);

    return jsonResponse_({ success: true });
  } catch (error) {
    console.error(error);
    return jsonResponse_({ success: false, error: error.message });
  }
}

function getSheet_() {
  const spreadsheet = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Set SPREADSHEET_ID in CONFIG.');
  }

  return spreadsheet.getSheetByName(CONFIG.SHEET_NAME)
    || spreadsheet.insertSheet(CONFIG.SHEET_NAME);
}

function ensureHeaders_(sheet) {
  if (sheet.getMaxColumns() < HEADERS.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      HEADERS.length - sheet.getMaxColumns()
    );
  }

  const current = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const needsHeaders = HEADERS.some((header, index) => current[index] !== header);
  if (needsHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
}

function styleSheet_(sheet) {
  const lastColumn = HEADERS.length;
  const lastRow = Math.max(sheet.getLastRow(), 1);

  // Keep the title row visible while scrolling through applications.
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);

  // Header design.
  const header = sheet.getRange(1, 1, 1, lastColumn);
  header
    .setBackground(COLORS.purple)
    .setFontColor(COLORS.white)
    .setFontFamily('Manrope')
    .setFontSize(10)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle')
    .setWrap(true);
  sheet.setRowHeight(1, 42);

  // Body design and readable long-answer cells.
  if (lastRow > 1) {
    const body = sheet.getRange(2, 1, lastRow - 1, lastColumn);
    body
      .setFontFamily('Manrope')
      .setFontSize(10)
      .setFontColor(COLORS.text)
      .setVerticalAlignment('top')
      .setWrap(true)
      .setBorder(true, true, true, true, true, true, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);

    sheet.getRange(2, 1, lastRow - 1, 1)
      .setNumberFormat('dd mmm yyyy, hh:mm');

    // Alternating row colors make applications easier to scan.
    const banding = sheet.getBandings();
    banding.forEach((band) => band.remove());
    sheet.getRange(1, 1, lastRow, lastColumn).applyRowBanding(
      SpreadsheetApp.BandingTheme.LIGHT_GREY,
      false,
      false
    );

    // Re-apply the purple header after banding.
    header.setBackground(COLORS.purple).setFontColor(COLORS.white);
  }

  setColumnWidths_(sheet);
  sheet.setRowHeights(2, Math.max(lastRow - 1, 1), 54);

  // Add or refresh the filter for quick sorting/searching.
  const existingFilter = sheet.getFilter();
  if (existingFilter) existingFilter.remove();
  sheet.getRange(1, 1, Math.max(lastRow, 2), lastColumn).createFilter();

  // Make the sheet tab match the brand.
  sheet.setTabColor(COLORS.purple);
}

function setColumnWidths_(sheet) {
  sheet.setColumnWidths(1, HEADERS.length, 135);
  sheet.setColumnWidth(1, 160); // Timestamp
  sheet.setColumnWidth(2, 170); // Name
  sheet.setColumnWidth(3, 65);  // Age
  sheet.setColumnWidth(4, 155); // Phone
  sheet.setColumnWidth(5, 140); // Location
  sheet.setColumnWidth(6, 180); // Education
  sheet.setColumnWidth(13, 130); // Math answer
  sheet.setColumnWidth(14, 145); // Rating
  sheet.setColumnWidth(16, 230); // Customer meaning
  sheet.setColumnWidths(17, 8, 260); // Long text answers
  sheet.setColumnWidth(25, 240); // Customer service
  sheet.setColumnWidth(26, 240); // Skill improve
  sheet.setColumnWidth(27, 300); // Assessment
  sheet.setColumnWidth(28, 240); // Why join
  sheet.setColumnWidth(29, 220); // Anything else
  sheet.setColumnWidth(32, 260); // CV URL
}

function formatDataRow_(sheet, rowNumber) {
  sheet.getRange(rowNumber, 1, 1, HEADERS.length)
    .setFontFamily('Manrope')
    .setFontSize(10)
    .setFontColor(COLORS.text)
    .setVerticalAlignment('top')
    .setWrap(true)
    .setBorder(true, true, true, true, true, true, COLORS.border, SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange(rowNumber, 1).setNumberFormat('dd mmm yyyy, hh:mm');
  sheet.setRowHeight(rowNumber, 54);
}

function removeFilter() {
  const sheet = getSheet_();
  const filter = sheet.getFilter();
  if (filter) filter.remove();
}

function saveCv_(payload) {
  if (!payload.cvBase64 || !payload.cvName) return '';
  if (!CONFIG.DRIVE_FOLDER_ID) return 'Drive folder not configured';

  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const bytes = Utilities.base64Decode(payload.cvBase64);
  const blob = Utilities.newBlob(
    bytes,
    payload.cvMimeType || MimeType.PDF,
    payload.cvName
  );
  return folder.createFile(blob).getUrl();
}

function sendTelegramNotification_(payload, cvUrl) {
  if (!CONFIG.TELEGRAM_BOT_TOKEN || !CONFIG.TELEGRAM_CHAT_ID) return;

  const message = [
    'New LO\'RIZ application received',
    '',
    'Name: ' + (payload.name || '-'),
    'Phone: ' + (payload.phone || '-'),
    'Location: ' + (payload.location || '-'),
    'Experience: ' + (payload.experience || '-'),
    'Skincare knowledge: ' + (payload.skincareKnowledge || '-'),
    'CV: ' + (cvUrl || payload.cvName || 'Not attached')
  ].join('\n');

  const url = 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: message
    }),
    muteHttpExceptions: true
  });
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
