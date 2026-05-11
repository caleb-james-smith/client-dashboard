# Freelance Client Dashboard

A self-contained website dashboard for managing freelance clients, tracking follow-ups, and writing customized outreach emails.

## Getting started

1. Open `index.html` in any modern browser (Chrome, Safari, Firefox, Edge).
2. Click **Import CSV** and select `sample-clients.csv` to load demo data — or import your own.
3. Your data is saved automatically to your browser's local storage (no server needed).

## CSV format

The importer recognizes these column headers (case-insensitive, flexible naming):

| Header           | Required | Notes                                              |
| ---------------- | -------- | -------------------------------------------------- |
| Name             | yes      | Full name of the client contact                    |
| Company          | no       | Business name                                      |
| Email            | yes      | Used in the outreach email tool                    |
| Phone            | no       |                                                    |
| Website          | no       | Used as `{{website}}` in templates                 |
| Status           | no       | `Lead`, `Prospect`, `Active`, `Past`, or `Cold`    |
| Last Contact     | no       | ISO date (e.g. `2026-05-01`)                       |
| Flagged          | no       | `Yes`/`No` — manual follow-up flag                 |
| Notes            | no       | Free text                                          |

Headers like "Client Name", "Email Address", "Last Contacted", "Follow Up" are all auto-mapped.

## Follow-up flagging

A client is flagged for follow-up when **any** of the following is true:

- You manually checked the "flag for follow-up" toggle, or
- Days since last contact >= the threshold you set (top right; default 14 days), or
- The client has never been contacted.

`Past` clients are excluded from auto-flagging.

Change the threshold any time using the input in the header — it updates instantly.

## Outreach email tool

Click **Email** on any client row to open the composer. It includes six templates:

- Cold outreach (intro)
- Follow-up after no response
- Check-in with past/active client
- Project proposal / next-step
- Thank you / referral ask
- Re-engage a cold lead

The composer auto-picks a sensible default template based on the client's status. Available variables in templates:

`{{name}}`, `{{firstName}}`, `{{company}}`, `{{email}}`, `{{website}}`, `{{myName}}`, `{{lastContact}}`, `{{currentDate}}`

Two send options:

- **Copy to clipboard** — paste into Gmail, Outlook, etc.
- **Open in mail client** — launches your default mail app with the message pre-filled. Using this also updates the client's "Last Contact" date to today.

## Export

The **Export CSV** button downloads your full client list, so you always have an offline backup.

## Multi-select &amp; bulk delete

- **Select all visible**: click the checkbox in the table header. It selects every row currently shown by your filters (if you have a status filter or search active, only those rows are selected).
- **Select an individual row**: click its row checkbox. Click again to deselect. Cmd/Ctrl-click on a checkbox works the same as a plain click — it toggles just that row.
- **Select a range**: click one checkbox, then **Shift+click** another. Every row between the two is set to match the state of the second click (selected if you just turned it on, deselected if you just turned it off).
- **Delete selected**: a bar appears above the table showing the count. Click **Delete selected** and confirm. Use **Clear selection** to deselect without deleting.

Selections survive sort changes and filter changes, so you can build a multi-status batch (e.g. select some Cold clients, change filter to Past, select more, then delete them all together).

## Light / dark mode

Click the ☀ / ☾ button in the top right to toggle. Your choice is saved in your browser. If you haven't picked one, the dashboard follows your operating system's color preference and updates live if you change it.

## Files

- `index.html` — page structure
- `styles.css` — styling
- `app.js` — all logic (import/export, filtering, email templates, persistence)
- `sample-clients.csv` — small example data (8 clients)
- `sample-clients-100.csv` — larger sample for stress-testing search, filters, and sorting (100 clients)

No build step, no dependencies. Just open the HTML file.
