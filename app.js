// =====================================================
// Freelance Client Dashboard - app.js
// =====================================================

const STORAGE_KEY = 'fcd_clients_v1';
const SETTINGS_KEY = 'fcd_settings_v1';

const EMAIL_TEMPLATES = {
  'cold-outreach': {
    label: 'Cold outreach (intro)',
    subject: 'Helping {{company}} with its website',
    body: `Hi {{firstName}},

I came across {{company}} and noticed a few things on {{website}} that I think could be improved to convert more visitors into customers.

I'm a freelance website developer who works with small businesses to build fast, modern sites that drive real results. I'd love to share a couple of specific ideas I had after looking at your site — no pitch, just a few observations you can use either way.

Would you be open to a 15-minute call next week?

Best,
{{myName}}`
  },
  'follow-up': {
    label: 'Follow-up after no response',
    subject: 'Following up — {{company}} website',
    body: `Hi {{firstName}},

Just floating this back to the top of your inbox in case my earlier note got buried. I'd still love to share a few ideas I had for {{company}}'s site.

Happy to keep it short — even 10 minutes would be enough to walk you through what I had in mind. If now isn't the right time, no problem at all; just let me know and I'll check back later.

Thanks,
{{myName}}`
  },
  'check-in': {
    label: 'Check-in with past/active client',
    subject: 'Checking in — anything I can help with?',
    body: `Hi {{firstName}},

It's been a little while since we last spoke (our last touchpoint was on {{lastContact}}). I wanted to check in and see how things are going at {{company}}.

If there's anything on your site you've been meaning to tweak, add, or rebuild — whether it's a landing page, a speed audit, or a new feature — I'd be happy to help. Even just a quick chat about what's on your roadmap would be useful.

Talk soon,
{{myName}}`
  },
  'proposal': {
    label: 'Project proposal / next-step',
    subject: 'Proposal for {{company}}',
    body: `Hi {{firstName}},

Thanks for the conversation — really enjoyed learning more about what you're working on at {{company}}.

Based on what you shared, here's how I'd suggest moving forward:

  1. Discovery & scoping ({{currentDate}}) — confirm goals, audience, and key pages
  2. Design & build — modern, responsive site optimized for performance and SEO
  3. Launch & handoff — analytics, training, and 30 days of post-launch support

I'll send over a full written proposal with timing and pricing this week. In the meantime, let me know if any of the above raises questions.

Best,
{{myName}}`
  },
  'thank-you': {
    label: 'Thank you / referral ask',
    subject: 'Thanks again — and a small favor',
    body: `Hi {{firstName}},

Just wanted to say thanks again for trusting me with {{company}}'s site. It was a pleasure to work with you.

If you happen to know anyone else who might benefit from some help with their website, I'd be hugely grateful for an intro. Word of mouth means the world for a freelance business like mine.

Either way, I hope things keep going well — and don't hesitate to reach out if anything comes up.

Thanks,
{{myName}}`
  },
  'reconnect-cold': {
    label: 'Re-engage a cold lead',
    subject: 'Quick update from my end',
    body: `Hi {{firstName}},

Hope you've been well. We chatted a while back about {{company}}'s site but the timing wasn't quite right.

A few things have changed on my end (new portfolio pieces, faster turnaround on small projects) and I thought of you. If website work is back on the radar at all, I'd love to reconnect.

No pressure — just thought I'd reach out.

{{myName}}`
  }
};

// -----------------------------------------------------
// State
// -----------------------------------------------------
let clients = [];
let settings = { thresholdDays: 14, senderName: '' };
let sortKey = 'name';
let sortDir = 1;
let editingId = null;
let currentEmailClientId = null;

// -----------------------------------------------------
// Storage
// -----------------------------------------------------
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    clients = raw ? JSON.parse(raw) : [];
  } catch (e) {
    clients = [];
  }
  try {
    const rawSettings = localStorage.getItem(SETTINGS_KEY);
    if (rawSettings) settings = { ...settings, ...JSON.parse(rawSettings) };
  } catch (e) {}
}

function saveClients() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// -----------------------------------------------------
// Utilities
// -----------------------------------------------------
function uid() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function parseDate(d) {
  if (!d) return null;
  const t = new Date(d);
  return isNaN(t.getTime()) ? null : t;
}

function daysSince(d) {
  const t = parseDate(d);
  if (!t) return null;
  const diff = (Date.now() - t.getTime()) / (1000 * 60 * 60 * 24);
  return Math.floor(diff);
}

function needsFollowUp(c) {
  if (c.flagged) return true;
  if (c.status === 'Past') return false;
  const days = daysSince(c.lastContact);
  if (days === null) return true; // never contacted
  return days >= settings.thresholdDays;
}

function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { t.hidden = true; }, 2400);
}

// -----------------------------------------------------
// Rendering
// -----------------------------------------------------
function renderStats() {
  document.getElementById('statTotal').textContent = clients.length;
  document.getElementById('statFollowup').textContent =
    clients.filter(needsFollowUp).length;
  document.getElementById('statActive').textContent =
    clients.filter(c => c.status === 'Active').length;
  document.getElementById('statLeads').textContent =
    clients.filter(c => c.status === 'Lead' || c.status === 'Prospect').length;
}

function getFilteredClients() {
  const search = document.getElementById('searchBox').value.trim().toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;
  const followupOnly = document.getElementById('followupOnly').checked;

  return clients
    .filter(c => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (followupOnly && !needsFollowUp(c)) return false;
      if (!search) return true;
      const hay = [c.name, c.company, c.email, c.notes].join(' ').toLowerCase();
      return hay.includes(search);
    })
    .sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'flag') {
        av = needsFollowUp(a) ? 1 : 0;
        bv = needsFollowUp(b) ? 1 : 0;
      }
      if (sortKey === 'lastContact') {
        av = parseDate(av)?.getTime() || 0;
        bv = parseDate(bv)?.getTime() || 0;
      }
      av = (av ?? '').toString().toLowerCase();
      bv = (bv ?? '').toString().toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
}

function renderTable() {
  const tbody = document.getElementById('clientTbody');
  const filtered = getFilteredClients();
  const emptyState = document.getElementById('emptyState');

  if (clients.length === 0) {
    tbody.innerHTML = '';
    emptyState.hidden = false;
    document.querySelector('.client-table').hidden = true;
    return;
  }
  emptyState.hidden = true;
  document.querySelector('.client-table').hidden = false;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:#6b7280;">No clients match your filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(c => {
    const flagged = needsFollowUp(c);
    const lastContactDisplay = c.lastContact
      ? `${c.lastContact} <span style="color:#9ca3af;">(${daysSince(c.lastContact)}d)</span>`
      : '<span style="color:#9ca3af;">Never</span>';
    return `
      <tr data-id="${c.id}">
        <td class="flag-cell ${flagged ? 'flag-active' : 'flag-inactive'}" title="${flagged ? 'Needs follow-up' : 'On track'}">
          ${flagged ? '⚑' : '○'}
        </td>
        <td><strong>${escapeHTML(c.name)}</strong></td>
        <td>${escapeHTML(c.company)}</td>
        <td>${c.email ? `<a href="mailto:${escapeHTML(c.email)}">${escapeHTML(c.email)}</a>` : ''}</td>
        <td>${escapeHTML(c.phone)}</td>
        <td><span class="status-pill status-${escapeHTML(c.status || 'Lead')}">${escapeHTML(c.status || 'Lead')}</span></td>
        <td>${lastContactDisplay}</td>
        <td>
          <button class="action-btn primary" data-action="email" data-id="${c.id}">Email</button>
          <button class="action-btn" data-action="edit" data-id="${c.id}">Edit</button>
        </td>
      </tr>`;
  }).join('');
}

function renderAll() {
  renderStats();
  renderTable();
}

// -----------------------------------------------------
// Client form
// -----------------------------------------------------
function openClientModal(client = null) {
  editingId = client ? client.id : null;
  document.getElementById('clientModalTitle').textContent =
    client ? 'Edit Client' : 'Add Client';
  document.getElementById('clientId').value = client?.id || '';
  document.getElementById('fName').value = client?.name || '';
  document.getElementById('fCompany').value = client?.company || '';
  document.getElementById('fEmail').value = client?.email || '';
  document.getElementById('fPhone').value = client?.phone || '';
  document.getElementById('fWebsite').value = client?.website || '';
  document.getElementById('fStatus').value = client?.status || 'Lead';
  document.getElementById('fLastContact').value = client?.lastContact || '';
  document.getElementById('fFlagged').checked = !!client?.flagged;
  document.getElementById('fNotes').value = client?.notes || '';
  document.getElementById('deleteClientBtn').hidden = !client;
  document.getElementById('clientModal').hidden = false;
}

function closeModal(id) {
  document.getElementById(id).hidden = true;
}

function saveClient() {
  const data = {
    id: editingId || uid(),
    name: document.getElementById('fName').value.trim(),
    company: document.getElementById('fCompany').value.trim(),
    email: document.getElementById('fEmail').value.trim(),
    phone: document.getElementById('fPhone').value.trim(),
    website: document.getElementById('fWebsite').value.trim(),
    status: document.getElementById('fStatus').value,
    lastContact: document.getElementById('fLastContact').value,
    flagged: document.getElementById('fFlagged').checked,
    notes: document.getElementById('fNotes').value.trim()
  };
  if (!data.name || !data.email) {
    showToast('Name and email are required');
    return;
  }
  if (editingId) {
    const idx = clients.findIndex(c => c.id === editingId);
    if (idx >= 0) clients[idx] = data;
  } else {
    clients.push(data);
  }
  saveClients();
  closeModal('clientModal');
  renderAll();
  showToast(editingId ? 'Client updated' : 'Client added');
}

function deleteCurrentClient() {
  if (!editingId) return;
  if (!confirm('Delete this client? This cannot be undone.')) return;
  clients = clients.filter(c => c.id !== editingId);
  saveClients();
  closeModal('clientModal');
  renderAll();
  showToast('Client deleted');
}

// -----------------------------------------------------
// CSV import / export
// -----------------------------------------------------
function parseCSV(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (ch === '\r') { /* skip */ }
      else cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

function normalizeKey(k) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, '');
}

const HEADER_MAP = {
  name: 'name', clientname: 'name', fullname: 'name',
  company: 'company', business: 'company', organization: 'company',
  email: 'email', emailaddress: 'email',
  phone: 'phone', phonenumber: 'phone', mobile: 'phone',
  website: 'website', url: 'website', site: 'website',
  status: 'status', stage: 'status',
  lastcontact: 'lastContact', lastcontacted: 'lastContact', lastcontactdate: 'lastContact',
  notes: 'notes', note: 'notes', comments: 'notes',
  flagged: 'flagged', flag: 'flagged', followup: 'flagged'
};

function importCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) {
    showToast('CSV looks empty');
    return;
  }
  const headers = rows[0].map(h => HEADER_MAP[normalizeKey(h)] || null);
  let added = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const obj = { id: uid(), status: 'Lead', flagged: false };
    headers.forEach((key, idx) => {
      if (!key) return;
      const v = (r[idx] ?? '').trim();
      if (key === 'flagged') {
        obj.flagged = /^(true|yes|y|1|x|flag)$/i.test(v);
      } else {
        obj[key] = v;
      }
    });
    if (!obj.name && !obj.email) continue;
    obj.name = obj.name || '(no name)';
    obj.email = obj.email || '';
    clients.push(obj);
    added++;
  }
  saveClients();
  renderAll();
  showToast(`Imported ${added} client${added === 1 ? '' : 's'}`);
}

function csvEscape(v) {
  const s = String(v ?? '');
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function exportCSV() {
  const headers = ['Name', 'Company', 'Email', 'Phone', 'Website', 'Status', 'Last Contact', 'Flagged', 'Notes'];
  const lines = [headers.join(',')];
  clients.forEach(c => {
    lines.push([
      c.name, c.company, c.email, c.phone, c.website,
      c.status, c.lastContact, c.flagged ? 'Yes' : '', c.notes
    ].map(csvEscape).join(','));
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clients-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('CSV exported');
}

// -----------------------------------------------------
// Email composer
// -----------------------------------------------------
function getFirstName(name) {
  return (name || '').split(/\s+/)[0] || '';
}

function fillTemplate(text, client) {
  const today = new Date().toISOString().slice(0, 10);
  return text
    .replaceAll('{{name}}', client.name || '')
    .replaceAll('{{firstName}}', getFirstName(client.name))
    .replaceAll('{{company}}', client.company || 'your company')
    .replaceAll('{{email}}', client.email || '')
    .replaceAll('{{website}}', client.website || 'your site')
    .replaceAll('{{myName}}', settings.senderName || '[Your name]')
    .replaceAll('{{lastContact}}', client.lastContact || 'our last conversation')
    .replaceAll('{{currentDate}}', today);
}

function openEmailModal(client) {
  currentEmailClientId = client.id;
  document.getElementById('emailRecipient').innerHTML =
    `<strong>To:</strong> ${escapeHTML(client.name)} &lt;${escapeHTML(client.email)}&gt; · ${escapeHTML(client.company || '—')}`;

  const select = document.getElementById('templateSelect');
  select.innerHTML = Object.entries(EMAIL_TEMPLATES)
    .map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('');

  // Smart default by status
  let defaultKey = 'cold-outreach';
  if (client.status === 'Active' || client.status === 'Past') defaultKey = 'check-in';
  else if (client.status === 'Cold') defaultKey = 'reconnect-cold';
  else if (client.lastContact && daysSince(client.lastContact) > 7 && client.status === 'Prospect') defaultKey = 'follow-up';
  select.value = defaultKey;

  document.getElementById('senderName').value = settings.senderName || '';
  applyTemplate(defaultKey, client);

  document.getElementById('emailModal').hidden = false;
}

function applyTemplate(key, client) {
  const t = EMAIL_TEMPLATES[key];
  if (!t) return;
  document.getElementById('emailSubject').value = fillTemplate(t.subject, client);
  document.getElementById('emailBody').value = fillTemplate(t.body, client);
}

function currentEmailClient() {
  return clients.find(c => c.id === currentEmailClientId);
}

// -----------------------------------------------------
// Event wiring
// -----------------------------------------------------
function init() {
  loadFromStorage();
  document.getElementById('thresholdDays').value = settings.thresholdDays;

  // Topbar buttons
  document.getElementById('importBtn').addEventListener('click', () => {
    document.getElementById('csvFile').click();
  });
  document.getElementById('csvFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => importCSV(ev.target.result);
    reader.readAsText(file);
    e.target.value = '';
  });
  document.getElementById('exportBtn').addEventListener('click', exportCSV);
  document.getElementById('addBtn').addEventListener('click', () => openClientModal());

  // Threshold
  document.getElementById('thresholdDays').addEventListener('change', e => {
    const v = parseInt(e.target.value, 10);
    if (v > 0) {
      settings.thresholdDays = v;
      saveSettings();
      renderAll();
    }
  });

  // Filters
  document.getElementById('searchBox').addEventListener('input', renderTable);
  document.getElementById('statusFilter').addEventListener('change', renderTable);
  document.getElementById('followupOnly').addEventListener('change', renderTable);

  // Table sorting
  document.querySelectorAll('.client-table th[data-sort]').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      if (sortKey === key) sortDir *= -1;
      else { sortKey = key; sortDir = 1; }
      renderTable();
    });
  });

  // Table row actions
  document.getElementById('clientTbody').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = btn.dataset.id;
    const client = clients.find(c => c.id === id);
    if (!client) return;
    if (btn.dataset.action === 'edit') openClientModal(client);
    if (btn.dataset.action === 'email') openEmailModal(client);
  });

  // Modal close buttons
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // Client form
  document.getElementById('saveClientBtn').addEventListener('click', saveClient);
  document.getElementById('deleteClientBtn').addEventListener('click', deleteCurrentClient);

  // Email composer
  document.getElementById('templateSelect').addEventListener('change', e => {
    const c = currentEmailClient();
    if (c) applyTemplate(e.target.value, c);
  });
  document.getElementById('senderName').addEventListener('input', e => {
    settings.senderName = e.target.value;
    saveSettings();
    const c = currentEmailClient();
    if (c) applyTemplate(document.getElementById('templateSelect').value, c);
  });
  document.getElementById('copyEmailBtn').addEventListener('click', async () => {
    const subj = document.getElementById('emailSubject').value;
    const body = document.getElementById('emailBody').value;
    const text = `Subject: ${subj}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      showToast('Email copied to clipboard');
    } catch {
      showToast('Could not copy — select text manually');
    }
  });
  document.getElementById('openMailtoBtn').addEventListener('click', () => {
    const c = currentEmailClient();
    if (!c) return;
    const subj = encodeURIComponent(document.getElementById('emailSubject').value);
    const body = encodeURIComponent(document.getElementById('emailBody').value);
    window.location.href = `mailto:${encodeURIComponent(c.email)}?subject=${subj}&body=${body}`;
    // Update last contact silently
    c.lastContact = new Date().toISOString().slice(0, 10);
    saveClients();
    setTimeout(renderAll, 300);
  });

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
