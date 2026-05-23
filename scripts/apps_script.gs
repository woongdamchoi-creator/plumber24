/**
 * 배관막힘 통합 Google Apps Script
 * ─────────────────────────────────────────────
 * 여러 홈페이지에서 한 스프레드시트로 수집
 *
 * 시트 1: 배관막힘(상담접수) → 접수일시 / 사이트주소 / 이름 / 연락처 / 내용 / 비고
 * 시트 2: 배관막힘(방문자)   → 일시 / 사이트주소 / 방문자수(누적)
 *
 * 배포: 확장 프로그램 → Apps Script → 새 배포 → 웹 앱
 *       실행 권한: 나, 액세스 권한: 모든 사용자
 * ─────────────────────────────────────────────
 */

const INQUIRY_SHEET = '배관막힘(상담접수)';
const VISIT_SHEET   = '배관막힘(방문자)';

function doPost(e) {
  try {
    const ss   = SpreadsheetApp.getActiveSpreadsheet();
    const raw  = (e && e.postData) ? e.postData.contents : '{}';
    const data = JSON.parse(raw);

    if (data.type === 'pageview') {
      recordVisit(ss, data);
    } else {
      recordInquiry(ss, data);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── 상담접수 기록 ────────────────────────────────────────────────────────────
function recordInquiry(ss, data) {
  let sheet = ss.getSheetByName(INQUIRY_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(INQUIRY_SHEET);
    const header = ['접수일시', '사이트주소', '이름', '연락처', '내용', '비고'];
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#1565C0')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 100);
    sheet.setColumnWidth(4, 130);
    sheet.setColumnWidth(5, 280);
    sheet.setColumnWidth(6, 150);
  }

  // KST 기준 접수일시 (UTC+9)
  const now      = new Date();
  const kst      = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const datetime = kst.toISOString().replace('T', ' ').slice(0, 19);

  const siteUrl = data.site_url || data.page_url || '';
  const name    = data.name    || '';
  const phone   = data.phone   || '';
  const inquiry = data.inquiry || data.category || data.service || data.content || '';
  const note    = data.note    || '';

  sheet.appendRow([datetime, siteUrl, name, phone, inquiry, note]);
}

// ── 방문자 카운트 기록 (날짜+사이트별 누적) ──────────────────────────────────
function recordVisit(ss, data) {
  let sheet = ss.getSheetByName(VISIT_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(VISIT_SHEET);
    const header = ['일시', '사이트주소', '방문자수(누적)'];
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#2E7D32')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 110);
    sheet.setColumnWidth(2, 220);
    sheet.setColumnWidth(3, 130);
  }

  const today   = data.date     || new Date().toISOString().slice(0, 10);
  const siteUrl = data.site_url || '';
  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const rows = sheet.getRange(2, 1, lastRow - 1, 2).getValues();
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][0] === today && rows[i][1] === siteUrl) {
        const cell = sheet.getRange(i + 2, 3);
        cell.setValue((cell.getValue() || 0) + 1);
        return;
      }
    }
  }

  sheet.appendRow([today, siteUrl, 1]);
}

// ── 불필요한 시트 삭제 (이번 한 번만 실행) ──────────────────────────────────
// Apps Script 편집기에서 이 함수 선택 후 ▶ 실행
function cleanupSheets() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const keep = [INQUIRY_SHEET, VISIT_SHEET];

  keep.forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });

  ss.getSheets().forEach(sheet => {
    if (!keep.includes(sheet.getName())) {
      ss.deleteSheet(sheet);
    }
  });
}
