/**
 * 배관막힘 통합 Google Apps Script
 * ─────────────────────────────────────────────
 * 시트 1: 배관막힘(상담접수) → 접수일시 / 사이트주소 / 이름 / 연락처 / 내용 / 주소 / 비고
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
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1순위: URL 쿼리 파라미터 (no-cors fetch 시 body 유실 방지용)
    // 2순위: JSON body (기존 방식 fallback)
    let data = {};
    if (e && e.parameter && e.parameter.name) {
      data = e.parameter;
    } else {
      const raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
      try { data = JSON.parse(raw); } catch (_) { data = {}; }
    }

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
    // 새 시트 생성
    sheet = ss.insertSheet(INQUIRY_SHEET);
    const header = ['접수일시', '사이트주소', '이름', '연락처', '내용', '주소', '비고'];
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
    sheet.setColumnWidth(6, 160);
    sheet.setColumnWidth(7, 150);
  } else {
    // 기존 시트에 '주소' 컬럼이 없으면 5번째 열(내용) 다음에 자동 삽입
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (!headers.includes('주소')) {
      // 내용(5번 열) 다음에 삽입
      const insertAfter = headers.indexOf('내용') + 1; // 1-based 이미 반영됨
      const colPos = insertAfter > 0 ? insertAfter + 1 : 6;
      sheet.insertColumnAfter(colPos - 1);
      sheet.getRange(1, colPos).setValue('주소');
      sheet.getRange(1, colPos)
        .setFontWeight('bold')
        .setBackground('#1565C0')
        .setFontColor('#ffffff');
      sheet.setColumnWidth(colPos, 160);
    }
  }

  // KST 기준 접수일시 (UTC+9)
  const now      = new Date();
  const kst      = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const datetime = kst.toISOString().replace('T', ' ').slice(0, 19);

  const siteUrl = data.site_url || data.page_url || '';
  const name    = data.name     || '';
  const phone   = data.phone    || '';
  const inquiry = data.inquiry  || data.category || data.service || data.content || '';
  const address = data.address  || [data.sido, data.sigungu].filter(Boolean).join(' ') || '';
  const note    = data.note     || '';

  sheet.appendRow([datetime, siteUrl, name, phone, inquiry, address, note]);
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

// ── 불필요한 시트 삭제 (필요 시 수동 실행) ──────────────────────────────────
function cleanupSheets() {
  const ss   = SpreadsheetApp.getActiveSpreadsheet();
  const keep = [INQUIRY_SHEET, VISIT_SHEET];
  keep.forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
  ss.getSheets().forEach(sheet => {
    if (!keep.includes(sheet.getName())) ss.deleteSheet(sheet);
  });
}
