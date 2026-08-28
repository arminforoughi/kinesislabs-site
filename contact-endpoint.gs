/**
 * Kinesis Labs contact endpoint — Google Apps Script.
 *
 * Receives a request from contact.html, emails it to the team, sends the person
 * a designed HTML confirmation, and can append a row to a spreadsheet.
 *
 * Deploy (once):
 *   1. script.google.com → New project. Paste this file over the contents.
 *   2. Set TEAM below to the addresses that should receive requests.
 *   3. (Optional) Make a Google Sheet, copy the id out of its URL, set SHEET_ID.
 *   4. Deploy → New deployment → gear → Web app.
 *        Execute as: Me.        Who has access: Anyone.
 *   5. Authorise when prompted (it needs to send mail as you).
 *   6. Copy the /exec URL into FORM_ENDPOINT at the top of assets/contact.js.
 *
 * Updating this file later: paste the new version, then
 * Deploy → Manage deployments → pencil → Version: New version → Deploy.
 * The /exec URL stays the same, so the site needs no change.
 */

var TEAM = ['alina@kinesislabs.tech'];   // who receives the requests
var SHEET_ID = '';                       // optional: log every request to this sheet
var FROM_NAME = 'Kinesis Labs';
var SITE = 'https://kinesislabs.tech';
var LOGO_URL = SITE + '/assets/logo-email.png';

/* Mail is sent by the Google account that deploys this, so by default the
   confirmation arrives from that account's gmail address. To send it as
   alina@kinesislabs.tech instead: in Gmail, Settings -> Accounts -> "Send mail
   as" -> add alina@kinesislabs.tech and verify it, then set FROM_ALIAS below.
   Leave it blank until the alias is verified or sending will fail. */
var FROM_ALIAS = '';

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    if (d._gotcha) return json({ ok: true });                       // bot
    if (!d.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) {
      return json({ ok: false, error: 'bad email' });
    }

    var when = d.preferred_time || '';
    var plain = [
      'Name:            ' + (d.name || ''),
      'Title:           ' + (d.title || ''),
      'Lab or company:  ' + (d.organization || ''),
      'Email:           ' + d.email,
      'Type of lab:     ' + (d.lab_type || ''),
      'Specimens/day:   ' + (d.samples_per_day || 'not given'),
      'Requested time:  ' + (when || 'none selected'),
      '',
      d.message || '(no message)'
    ].join('\n');

    /* to us: plain text, fastest to read and reply to */
    send_({
      to: TEAM.join(','),
      subject: 'Kinesis Labs — ' + (d.organization || d.name || 'new request') +
               (when ? ' — time requested' : ''),
      body: plain,
      replyTo: d.email
    });

    /* to them: the designed confirmation */
    var opts = {
      to: d.email,
      subject: when ? 'We have your request — Kinesis Labs' : 'We have your note — Kinesis Labs',
      body: confirmPlain_(d, when),
      htmlBody: confirmHtml_(d, when),
      replyTo: TEAM[0]
    };
    try {
      opts.inlineImages = { logo: UrlFetchApp.fetch(LOGO_URL).getBlob().setName('logo') };
    } catch (imgErr) {
      opts.htmlBody = opts.htmlBody.replace(/<img[^>]*cid:logo[^>]*>/, '');
    }
    send_(opts);

    if (SHEET_ID) {
      SpreadsheetApp.openById(SHEET_ID).getSheets()[0].appendRow([
        new Date(), d.name, d.title, d.organization, d.email,
        d.lab_type, d.samples_per_day, when, d.message
      ]);
    }
    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

/* ------------------------------------------------------------------ mail */

function send_(opts) {
  opts.name = opts.name || FROM_NAME;
  if (FROM_ALIAS) opts.from = FROM_ALIAS;
  GmailApp.sendEmail(opts.to, opts.subject, opts.body, opts);
}

function esc_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function confirmPlain_(d, when) {
  var out = ['Thanks for getting in touch.', ''];
  out.push(when
    ? 'You asked for ' + when + '. That time is not held yet — one of us will reply\nshortly to confirm it or offer the nearest alternative.'
    : 'One of us reads every one of these. You will hear back from a person, not an\nautoresponder, within a day or two.');
  out.push('', 'What you sent us:', '',
    'Name: ' + (d.name || ''),
    'Title: ' + (d.title || ''),
    'Lab or company: ' + (d.organization || ''),
    'Email: ' + d.email,
    'Type of lab: ' + (d.lab_type || ''),
    'Specimens per day: ' + (d.samples_per_day || 'not given'));
  if (d.message) out.push('', d.message);
  out.push('', 'Reply to this email if anything above is wrong.', '',
    '— Kinesis Labs · ' + SITE);
  return out.join('\n');
}

function confirmHtml_(d, when) {
  var rows = [
    ['Name', d.name], ['Title', d.title], ['Lab or company', d.organization],
    ['Email', d.email], ['Type of lab', d.lab_type],
    ['Specimens per day', d.samples_per_day || 'not given']
  ];
  if (d.message) rows.push(['Message', d.message]);

  var rowHtml = rows.map(function (r, i) {
    var last = i === rows.length - 1;
    var b = last ? '' : 'border-bottom:1px solid #EDF0EE;';
    return '<tr><td style="padding:11px 14px;' + b + 'font-size:13px;color:#69757B;width:44%;vertical-align:top;">' +
      esc_(r[0]) + '</td><td style="padding:11px 14px;' + b +
      'font-size:14px;color:#0A1216;font-weight:bold;">' + esc_(r[1]) + '</td></tr>';
  }).join('');

  var timeBlock = when
    ? '<tr><td style="padding:20px 28px 0;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F0FBF7;border:1px solid #A8E7D2;border-radius:10px;">' +
      '<tr><td style="padding:16px 18px;">' +
      '<div style="font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#0F9D82;font-weight:bold;">Time you asked for</div>' +
      '<div style="font-size:17px;font-weight:bold;color:#0A1216;padding-top:6px;">' + esc_(when) + '</div>' +
      '<div style="font-size:13px;color:#69757B;padding-top:6px;">Not held yet &mdash; we will confirm it or offer the nearest alternative.</div>' +
      '</td></tr></table></td></tr>'
    : '';

  var intro = when
    ? 'We have your request and the time you picked. One of us will reply shortly to confirm it.'
    : 'One of us reads every one of these. You will hear back from a person, not an autoresponder, within a day or two.';

  return '' +
'<!doctype html><html><body style="margin:0;padding:0;background:#EEF1EE;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EEF1EE;padding:28px 12px;">' +
'<tr><td align="center">' +
'<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#FFFFFF;border-radius:14px;overflow:hidden;font-family:Helvetica,Arial,sans-serif;">' +

'<tr><td style="background:#070C10;padding:22px 28px;">' +
'<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
'<td style="padding-right:12px;" valign="middle"><img src="cid:logo" width="34" height="34" alt="" style="display:block;border:0;border-radius:7px;"></td>' +
'<td valign="middle" style="font-family:Helvetica,Arial,sans-serif;font-size:19px;font-weight:bold;letter-spacing:-0.3px;color:#FFFFFF;">Kinesis&nbsp;<span style="color:#5FE3B4;">Labs</span></td>' +
'</tr></table></td></tr>' +

'<tr><td style="padding:34px 28px 6px;">' +
'<div style="font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#0F9D82;font-weight:bold;">Request received</div>' +
'<div style="font-size:25px;line-height:1.25;font-weight:bold;color:#0A1216;letter-spacing:-0.5px;padding-top:10px;">Thanks &mdash; we have your note.</div>' +
'</td></tr>' +

'<tr><td style="padding:14px 28px 0;font-size:15px;line-height:1.6;color:#3D484D;">' + intro + '</td></tr>' +
timeBlock +

'<tr><td style="padding:26px 28px 6px;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;color:#69757B;font-weight:bold;">What you sent us</td></tr>' +
'<tr><td style="padding:8px 28px 0;">' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E1E5E2;border-radius:10px;">' + rowHtml + '</table>' +
'</td></tr>' +

'<tr><td style="padding:26px 28px 30px;font-size:15px;line-height:1.6;color:#3D484D;">' +
'Reply to this email if anything above is wrong, or if you would rather send us a different time.</td></tr>' +

'<tr><td style="background:#F6F8F6;border-top:1px solid #E1E5E2;padding:20px 28px;font-size:13px;line-height:1.6;color:#69757B;">' +
'<b style="color:#0A1216;">Kinesis Labs</b><br>Specimen receiving, automated at the bench.<br>' +
'<a href="' + SITE + '" style="color:#0F9D82;text-decoration:none;">kinesislabs.tech</a>&nbsp;&middot;&nbsp;' +
'<a href="mailto:' + TEAM[0] + '" style="color:#0F9D82;text-decoration:none;">' + TEAM[0] + '</a>' +
'</td></tr>' +

'</table></td></tr></table></body></html>';
}

/* ------------------------------------------------------------------ misc */

function doGet() {
  return json({ ok: true, note: 'Kinesis Labs contact endpoint. POST JSON here.' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
