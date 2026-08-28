/* ---------------------------------------------------------------------------
   Contact page: qualification form + a time picker.

   Two constants to fill in when you have them:
     CALENDLY_URL  - Alina's scheduling link, e.g. https://calendly.com/alina-kinesislabs/20min
                     Set it and Calendly's real calendar replaces the built-in
                     picker below, with live availability.
     FORM_ENDPOINT - a Formspree/Basin/Tally URL, e.g. https://formspree.io/f/abcdwxyz
                     Set it and the form posts there. Left blank, the form
                     composes the same submission in the visitor's mail client.

   The built-in picker offers weekday slots in Pacific business hours and sends
   the chosen time along with the form. It is a *request*: nothing is reserved
   on anyone's calendar until Alina replies. The copy says so.
--------------------------------------------------------------------------- */
var CALENDLY_URL  = "";
var FORM_ENDPOINT = "";
var CONTACT_EMAIL = "alina@kinesislabs.tech";

var WORK_TZ    = "America/Los_Angeles";
var DAY_START  = 9;      // 9:00 Pacific
var DAY_END    = 16.5;   // last slot 16:30 Pacific
var SLOT_MIN   = 30;
var LEAD_HOURS = 12;     // no slots sooner than this
var HORIZON    = 45;     // days ahead

(function () {
  "use strict";

  /* ---------------- Calendly, if configured ---------------- */
  if (CALENDLY_URL) {
    var native = document.getElementById("cal-native");
    var embed = document.getElementById("calendly-embed");
    if (native && embed) {
      native.hidden = true;
      embed.hidden = false;
      embed.className = "calendly-inline-widget";
      embed.setAttribute("data-url", CALENDLY_URL);
      var css = document.createElement("link");
      css.rel = "stylesheet";
      css.href = "https://assets.calendly.com/assets/external/widget.css";
      document.head.appendChild(css);
      var s = document.createElement("script");
      s.src = "https://assets.calendly.com/assets/external/widget.js";
      s.async = true;
      document.head.appendChild(s);
    }
  }

  /* ---------------- timezone helpers ---------------- */
  function tzOffsetMinutes(date, tz) {
    var dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, year: "numeric", month: "2-digit",
      day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
    var p = {};
    dtf.formatToParts(date).forEach(function (x) { if (x.type !== "literal") p[x.type] = x.value; });
    var asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, (+p.hour) % 24, +p.minute, +p.second);
    return (asUTC - date.getTime()) / 60000;
  }

  /* the instant at which the wall clock in WORK_TZ reads y-m-d hh:mm (DST-safe) */
  function workInstant(y, m, d, hh, mm) {
    var t = Date.UTC(y, m, d, hh, mm);
    for (var i = 0; i < 2; i++) t = Date.UTC(y, m, d, hh, mm) - tzOffsetMinutes(new Date(t), WORK_TZ) * 60000;
    return new Date(t);
  }

  var localTZ = "your local time";
  try { localTZ = Intl.DateTimeFormat().resolvedOptions().timeZone || localTZ; } catch (e) {}

  function slotsForDay(y, m, d) {
    var out = [];
    var floor = Date.now() + LEAD_HOURS * 3600 * 1000;
    for (var h = DAY_START * 60; h <= DAY_END * 60; h += SLOT_MIN) {
      var inst = workInstant(y, m, d, Math.floor(h / 60), h % 60);
      if (inst.getTime() > floor) out.push(inst);
    }
    return out;
  }

  /* a day is offerable if it is a weekday in WORK_TZ and still has slots */
  function dayHasSlots(y, m, d) {
    var probe = workInstant(y, m, d, 12, 0);
    var wd = new Intl.DateTimeFormat("en-US", { timeZone: WORK_TZ, weekday: "short" }).format(probe);
    if (wd === "Sat" || wd === "Sun") return false;
    var maxDay = new Date(Date.now() + HORIZON * 86400000);
    if (probe > maxDay) return false;
    return slotsForDay(y, m, d).length > 0;
  }

  /* ---------------- calendar ---------------- */
  var grid = document.getElementById("cal-grid");
  if (!grid) return;
  var monthLabel = document.getElementById("cal-month");
  var slotGrid = document.getElementById("slot-grid");
  var slotsH = document.getElementById("slots-h");
  var slotsTz = document.getElementById("slots-tz");
  var picked = document.getElementById("picked");
  var timeField = document.getElementById("c-time");
  var prevBtn = document.getElementById("cal-prev");
  var nextBtn = document.getElementById("cal-next");

  var today = new Date();
  var view = { y: today.getFullYear(), m: today.getMonth() };
  var selDay = null, selSlot = null;

  function fmtMonth(y, m) {
    return new Date(Date.UTC(y, m, 1)).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });
  }
  function fmtTime(d) { return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }); }
  function fmtDayLong(d) { return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" }); }

  function renderMonth() {
    monthLabel.textContent = fmtMonth(view.y, view.m);
    grid.innerHTML = "";
    var first = new Date(Date.UTC(view.y, view.m, 1));
    var lead = (first.getUTCDay() + 6) % 7;               // Monday-first
    var days = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate();
    for (var i = 0; i < lead; i++) grid.appendChild(document.createElement("span"));
    for (var d = 1; d <= days; d++) {
      var cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cal-day";
      cell.textContent = d;
      var isToday = view.y === today.getFullYear() && view.m === today.getMonth() && d === today.getDate();
      if (isToday) cell.classList.add("is-today");
      if (dayHasSlots(view.y, view.m, d)) {
        cell.classList.add("has-slots");
        cell.dataset.d = d;
        if (selDay && selDay.y === view.y && selDay.m === view.m && selDay.d === d) cell.classList.add("is-sel");
      } else {
        cell.disabled = true;
        cell.setAttribute("aria-disabled", "true");
      }
      grid.appendChild(cell);
    }
    var atStart = view.y === today.getFullYear() && view.m === today.getMonth();
    prevBtn.disabled = atStart;
    var horizon = new Date(Date.now() + HORIZON * 86400000);
    nextBtn.disabled = new Date(view.y, view.m + 1, 1) > horizon;
  }

  function renderSlots() {
    slotGrid.innerHTML = "";
    if (!selDay) {
      slotsH.textContent = "Select a day";
      slotsTz.textContent = "";
      return;
    }
    var list = slotsForDay(selDay.y, selDay.m, selDay.d);
    slotsH.textContent = fmtDayLong(list.length ? list[0] : workInstant(selDay.y, selDay.m, selDay.d, 12, 0));
    slotsTz.textContent = "Times shown in " + localTZ;
    if (!list.length) {
      slotGrid.innerHTML = '<p class="slot-empty">No times left on this day.</p>';
      return;
    }
    list.forEach(function (inst) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "slot";
      b.textContent = fmtTime(inst);
      b.dataset.iso = inst.toISOString();
      if (selSlot && selSlot.getTime() === inst.getTime()) b.classList.add("is-sel");
      b.addEventListener("click", function () {
        selSlot = inst;
        renderSlots();
        showPicked();
      });
      slotGrid.appendChild(b);
    });
  }

  function showPicked() {
    if (!selSlot) { picked.hidden = true; timeField.value = ""; return; }
    var work = selSlot.toLocaleString("en-US", { timeZone: WORK_TZ, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    picked.hidden = false;
    picked.innerHTML = "<b>" + fmtDayLong(selSlot) + " at " + fmtTime(selSlot) + "</b>" +
      '<span class="note">' + work + " Pacific &middot; sent with your message. Nothing is booked until Alina confirms by email.</span>";
    timeField.value = selSlot.toISOString() + " (" + fmtDayLong(selSlot) + " " + fmtTime(selSlot) + " " + localTZ + ")";
  }

  grid.addEventListener("click", function (e) {
    var cell = e.target.closest(".cal-day.has-slots");
    if (!cell) return;
    selDay = { y: view.y, m: view.m, d: +cell.dataset.d };
    selSlot = null;
    timeField.value = "";
    picked.hidden = true;
    renderMonth();
    renderSlots();
  });
  prevBtn.addEventListener("click", function () { view.m--; if (view.m < 0) { view.m = 11; view.y--; } renderMonth(); });
  nextBtn.addEventListener("click", function () { view.m++; if (view.m > 11) { view.m = 0; view.y++; } renderMonth(); });

  renderMonth();
  renderSlots();

  /* ---------------- form ---------------- */
  var form = document.getElementById("contact-form");
  if (!form) return;
  var status = document.getElementById("c-status");
  var submit = document.getElementById("c-submit");
  var FIELDS = [
    ["c-name", "e-name", "Name"], ["c-title", "e-title", "Title"], ["c-org", "e-org", "Lab or company"],
    ["c-email", "e-email", "Work email"], ["c-type", "e-type", "Type of lab"], ["c-vol", "e-vol", "Specimens per day"]
  ];

  function setErr(id, eid, msg) {
    var el = document.getElementById(id), err = document.getElementById(eid);
    err.textContent = msg || "";
    if (msg) el.setAttribute("aria-invalid", "true"); else el.removeAttribute("aria-invalid");
    return !msg;
  }

  function validate() {
    var ok = true, first = null;
    FIELDS.forEach(function (f) {
      var el = document.getElementById(f[0]), v = el.value.trim(), msg = "";
      if (!v) msg = f[2] + " is required.";
      else if (f[0] === "c-email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = "That email address does not look right.";
      if (!setErr(f[0], f[1], msg)) { ok = false; if (!first) first = el; }
    });
    if (first) first.focus();
    return ok;
  }

  function values() {
    var v = {};
    ["name", "title", "organization", "email", "lab_type", "samples_per_day", "message", "preferred_time"]
      .forEach(function (k) { var el = form.elements[k]; v[k] = el ? el.value.trim() : ""; });
    return v;
  }

  function mailtoURL(v) {
    var body = [
      "Name: " + v.name, "Title: " + v.title, "Lab or company: " + v.organization,
      "Email: " + v.email, "Type of lab: " + v.lab_type,
      "Specimens received per day: " + v.samples_per_day,
      "Preferred time: " + (v.preferred_time || "none selected"), "", v.message
    ].join("\n");
    return "mailto:" + CONTACT_EMAIL +
      "?subject=" + encodeURIComponent("Kinesis Labs - " + v.organization) +
      "&body=" + encodeURIComponent(body);
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.elements["_gotcha"] && form.elements["_gotcha"].value) return;
    if (!validate()) {
      status.dataset.state = "err";
      status.textContent = "Please fix the fields marked above.";
      return;
    }
    var v = values();
    if (!FORM_ENDPOINT) {
      window.location.href = mailtoURL(v);
      status.dataset.state = "";
      status.innerHTML = 'Opening your mail client. If nothing happens, email <a href="mailto:' +
        CONTACT_EMAIL + '">' + CONTACT_EMAIL + "</a> directly.";
      return;
    }
    submit.disabled = true;
    status.dataset.state = "";
    status.textContent = "Sending…";
    fetch(FORM_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(v)
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      form.reset();
      selSlot = null; showPicked(); renderSlots();
      status.dataset.state = "ok";
      status.textContent = v.preferred_time
        ? "Thank you. Alina will confirm that time by email."
        : "Thank you. Alina will reply within a day or two.";
    }).catch(function () {
      status.dataset.state = "err";
      status.innerHTML = 'That did not send. Please email <a href="mailto:' + CONTACT_EMAIL + '">' +
        CONTACT_EMAIL + "</a> instead.";
    }).finally(function () { submit.disabled = false; });
  });
})();
