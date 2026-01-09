# Keyword App (v3)

3-page static web app:
- `index.html` : choose action + input
- `wait.html`  : calls n8n webhook, stores response in browser memory (10 min)
- `result.html`: shows tabs + tables + XLSX download

## Setup

1) Set your webhook URL:
- edit `assets/config.js`
- replace `WEBHOOK_URL`

2) Serve the folder (example: VS Code Live Server)
- open `index.html`

## Webhook payload (frontend -> n8n)

```json
{
  "action": "keyword_research",
  "input": "robotic"
}
```

or

```json
{
  "action": "site_keywords",
  "input": "dataforseo.com"
}
```

## Webhook response formats supported

Best (recommended):
```json
{
  "main": [ ... ],
  "related": [ ... ],
  "suggested": [ ... ]
}
```

Or for site:
```json
{
  "site": [ ... ]
}
```

Also supported:
- already flattened array of rows with `row_type`
- raw DataForSEO responses for:
  - `related_keywords`
  - `keyword_suggestions`
  - `keywords_for_site`

## Notes

XLSX export uses SheetJS from CDN. If you block CDNs, XLSX export won't work.
