// Medical Records backend. Paste into script.google.com, then Deploy > Web app.
// Execute as: Me. Who has access: Anyone. It creates its own Drive folder + Google Sheet on first use.
const PIN = 'jaja';

function env() {
  const p = PropertiesService.getScriptProperties();
  let fid = p.getProperty('F'), sid = p.getProperty('S');
  if (!fid) { fid = DriveApp.createFolder('Medical Records - Files').getId(); p.setProperty('F', fid); }
  if (!sid) {
    const ss = SpreadsheetApp.create('Medical Records - Data');
    const sh = ss.getSheets()[0].setName('Records');
    sh.appendRow(['id', 'sec', 'title', 'date', 'note', 'type', 'name', 'fileId', 'thumb']);
    sh.getRange('A:G').setNumberFormat('@');
    ss.insertSheet('Card').appendRow(['card json']);
    sid = ss.getId(); p.setProperty('S', sid);
  }
  return { f: DriveApp.getFolderById(fid), ss: SpreadsheetApp.openById(sid) };
}
const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
function rowOf(sh, id) {
  const n = sh.getLastRow(); if (n < 2) return -1;
  const i = sh.getRange(1, 1, n, 1).getValues().flat().indexOf(id);
  return i < 0 ? -1 : i + 1;
}
const ds = v => v instanceof Date ? Utilities.formatDate(v, 'UTC', 'yyyy-MM-dd') : String(v || '');

function doPost(e) {
  let q; try { q = JSON.parse(e.postData.contents); } catch (x) { return out({ error: 'bad request' }); }
  if (q.pin !== PIN) return out({ error: 'wrong PIN' });
  try {
    const E = env(), sh = E.ss.getSheetByName('Records'), cs = E.ss.getSheetByName('Card');
    if (q.a === 'list') {
      const n = sh.getLastRow();
      const v = n < 2 ? [] : sh.getRange(2, 1, n - 1, 9).getValues();
      const c = cs.getRange(2, 1).getValue();
      return out({ recs: v.map(r => ({ id: String(r[0]), sec: r[1], title: r[2], date: ds(r[3]), note: r[4], type: r[5], name: r[6], fid: r[7], thumb: r[8] })), card: c ? JSON.parse(c) : null });
    }
    if (q.a === 'add') {
      const f = E.f.createFile(Utilities.newBlob(Utilities.base64Decode(q.data), q.type, q.name));
      sh.appendRow([q.id, q.sec, q.title, q.date, q.note, q.type, q.name, f.getId(), q.thumb || '']);
      return out({ ok: 1, fid: f.getId() });
    }
    if (q.a === 'file') return out({ data: Utilities.base64Encode(DriveApp.getFileById(q.fid).getBlob().getBytes()) });
    if (q.a === 'upd') {
      const i = rowOf(sh, q.id); if (i < 0) return out({ error: 'not found' });
      sh.getRange(i, 2, 1, 4).setValues([[q.sec, q.title, q.date, q.note]]); return out({ ok: 1 });
    }
    if (q.a === 'del') {
      const i = rowOf(sh, q.id);
      if (i > 0) { try { DriveApp.getFileById(sh.getRange(i, 8).getValue()).setTrashed(true); } catch (x) {} sh.deleteRow(i); }
      return out({ ok: 1 });
    }
    if (q.a === 'card') { cs.getRange(2, 1).setValue(JSON.stringify(q.card)); return out({ ok: 1 }); }
    return out({ error: 'unknown action' });
  } catch (x) { return out({ error: String(x) }); }
}
