/**
 * Kinesis Labs contact endpoint — Google Apps Script.
 *
 * Receives a request from contact.html, emails it to the team, sends the person
 * a confirmation, and appends a row to a spreadsheet. Free, no third party.
 *
 * Deploy (about five minutes, once):
 *   1. script.google.com → New project. Paste this file over the contents.
 *   2. Set TEAM below to the addresses that should receive requests.
 *   3. (Optional) Make a Google Sheet, copy the id out of its URL, set SHEET_ID.
 *   4. Deploy → New deployment → type "Web app".
 *        Execute as: Me.        Who has access: Anyone.
 *   5. Authorise when prompted (it needs to send mail as you).
 *   6. Copy the /exec URL and paste it into FORM_ENDPOINT at the top of
 *      assets/contact.js, then redeploy the site.
 *
 * Re-deploying after an edit: Deploy → Manage deployments → pencil → New version.
 * The /exec URL stays the same.
 */

var TEAM = ['alina@kinesislabs.tech'];   // who receives the requests
var SHEET_ID = '';                       // optional: log every request to this sheet
var FROM_NAME = 'Kinesis Labs';

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
    var lines = [
      'Name:            ' + (d.name || ''),
      'Title:           ' + (d.title || ''),
      'Lab or company:  ' + (d.organization || ''),
      'Email:           ' + d.email,
      'Type of lab:     ' + (d.lab_type || ''),
      'Specimens/day:   ' + (d.samples_per_day || ''),
      'Requested time:  ' + (when || 'none selected'),
      '',
      d.message || '(no message)'
    ].join('\n');

    send_({
      to: TEAM.join(','),
      subject: 'Kinesis Labs — ' + (d.organization || d.name || 'new request') +
               (when ? ' — time requested' : ''),
      body: lines,
      replyTo: d.email,
      name: FROM_NAME
    });

    var confirm = when
      ? ['Thanks for getting in touch.',
         '',
         'You asked for: ' + when,
         '',
         'That time is not held yet — one of us will reply shortly to confirm it or',
         'offer the nearest alternative.',
         '',
         'What you sent us:'].join('\n')
      : ['Thanks for getting in touch.',
         '',
         'We read every one of these ourselves and will reply within a day or two.',
         '',
         'What you sent us:'].join('\n');

    send_({
      to: d.email,
      subject: 'We got your note — Kinesis Labs',
      body: confirm + '\n\n' + lines + '\n\n— Kinesis Labs\nkinesislabs.tech',
      name: FROM_NAME,
      replyTo: TEAM[0]
    });

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

/* one place that knows about the alias */
function send_(opts) {
  opts.name = opts.name || FROM_NAME;
  if (FROM_ALIAS) opts.from = FROM_ALIAS;
  GmailApp.sendEmail(opts.to, opts.subject, opts.body, opts);
}

function doGet() {
  return json({ ok: true, note: 'Kinesis Labs contact endpoint. POST JSON here.' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
