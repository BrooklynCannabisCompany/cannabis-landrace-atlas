# Submission proxy (Cloudflare Worker)

Lets visitors submit additions/corrections **without a GitHub account**. The static
site POSTs the form to this Worker; the Worker verifies a Cloudflare Turnstile token
(spam gate) and files a pre-filled, labeled GitHub issue on the project's behalf.

This deploys separately from the GitHub Pages site. Secrets live in Cloudflare, never
in the repo.

## One-time setup

1. **Cloudflare account** — sign up at https://dash.cloudflare.com with the
   `BrooklynCannabis@protonmail.com` email (email + password; no OAuth needed).

2. **GitHub token** that can create issues on the repo. Simplest for a public repo:
   a classic token (https://github.com/settings/tokens) with the **`public_repo`**
   scope, created while signed in as `BrooklynCannabisCompany`. (Or a fine-grained
   token scoped to this repo with **Issues: Read and write**.)

3. **Turnstile widget** — in the Cloudflare dashboard → Turnstile → add a widget for
   the site domain `brooklyncannabiscompany.github.io`. Note the **site key** (public,
   goes in the front end) and the **secret key** (goes in the Worker).

## Deploy

```bash
cd worker
npx wrangler login          # opens the browser; log into the BCC Cloudflare account
npx wrangler secret put GITHUB_TOKEN        # paste the GitHub token
npx wrangler secret put TURNSTILE_SECRET    # paste the Turnstile secret key
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL (e.g. `https://cla-submit.<subdomain>.workers.dev`).
Give that URL and the Turnstile **site key** to the front end to finish wiring the forms.
