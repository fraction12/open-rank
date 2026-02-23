#!/usr/bin/env node
/**
 * Seed 20 Agentic Engineering challenges into the OpenRank database.
 * Run from project root: node scripts/seed-agentic-engineering-challenges.mjs
 */
import { createHash, randomUUID } from 'crypto';
import { readFileSync } from 'fs';

function loadEnv() {
  const raw = readFileSync('.env.local', 'utf8');
  return Object.fromEntries(
    raw.split('\n')
      .filter(l => l.includes('='))
      .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
  );
}

const env = loadEnv();
const SUPABASE_URL = env.SUPABASE_URL;
const ANSWER_SALT = env.ANSWER_SALT;
// Support both key name conventions
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || env.SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANSWER_SALT || !SERVICE_KEY) {
  console.error('Missing required env vars. Check .env.local');
  process.exit(1);
}

function saltedHash(answer, puzzleId) {
  return createHash('sha256').update(`${answer}:${puzzleId}:${ANSWER_SALT}`).digest('hex');
}

async function supaFetch(path, opts = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, data: text ? JSON.parse(text) : null };
}

// ─────────────────────────────────────────────────────────────────────────────
// Challenge definitions (20 total)
// ─────────────────────────────────────────────────────────────────────────────

const challenges = [
  // 1 — 2026-02-03
  {
    title: "The Button That Wouldn't Click",
    difficulty: 'medium',
    release_date: '2026-02-03',
    description: `You're a PM who just shipped a landing page with a big "Get Started" CTA button. Marketing is screaming — the button looks fine but nobody can click it. You open DevTools, the button is there, it has an \`onclick\` handler, but clicks do nothing.

Your designer added a decorative overlay animation last night. The button is definitely visible. No JavaScript errors in console. The hover effect even works (CSS \`:hover\` doesn't require click-through). But actual clicks? Dead.

Look at the CSS and HTML. Something is sitting on top of that button, intercepting every click like a transparent bouncer.

*Sometimes the prettiest things are the most dangerous.*

**What CSS declaration needs to be added to \`.hero-overlay\` to fix the button?**`,
    input_data: `\`\`\`css
/* hero-section.css */
.hero {
  position: relative;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(99,102,241,0.1), rgba(168,85,247,0.05));
  z-index: 10;
  animation: shimmer 3s ease-in-out infinite;
}

.cta-button {
  padding: 16px 48px;
  font-size: 1.25rem;
  background: #6366f1;
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  z-index: 1;
  transition: transform 0.2s;
}

.cta-button:hover {
  transform: scale(1.05);
}

@keyframes shimmer {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}
\`\`\`

\`\`\`html
<section class="hero">
  <div class="hero-overlay"></div>
  <button class="cta-button" onclick="startOnboarding()">Get Started</button>
</section>
\`\`\``,
    answer: 'pointer-events: none',
    answer_explanation: "The `.hero-overlay` has `z-index: 10` while the button has `z-index: 1`. The overlay sits on top and intercepts all clicks. Adding `pointer-events: none` to `.hero-overlay` lets clicks pass through to the button beneath.",
  },

  // 2 — 2026-02-04
  {
    title: 'CORS From Hell — The Preflight Mystery',
    difficulty: 'medium',
    release_date: '2026-02-04',
    description: `You're building a React dashboard that calls your company's internal API. GET requests work perfectly. But the moment you try to POST a new record, the browser throws a CORS error. The backend dev swears they added CORS headers in Express middleware.

You check the Network tab and see a failed OPTIONS request with a 405 status. The backend is an Express server behind nginx. GET requests work because they use simple headers and never trigger preflight. Your POST sends \`Content-Type: application/json\`, which triggers a CORS preflight OPTIONS request.

Look at the nginx config. Something is blocking OPTIONS before it ever reaches Express.

*The proxy giveth, and the proxy taketh away.*

**What HTTP method is nginx blocking that causes the preflight to fail?**`,
    input_data: `\`\`\`nginx
# /etc/nginx/sites-enabled/api.conf
server {
    listen 443 ssl;
    server_name api.internal.acme.co;

    ssl_certificate /etc/ssl/certs/acme.pem;
    ssl_certificate_key /etc/ssl/private/acme.key;

    location /api/ {
        limit_except GET POST PUT DELETE {
            deny all;
        }
        proxy_pass http://127.0.0.1:3001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
\`\`\`

\`\`\`
// Browser console:
Access to XMLHttpRequest at 'https://api.internal.acme.co/api/records'
from origin 'https://dashboard.acme.co' has been blocked by CORS policy:
Response to preflight request doesn't pass access control check:
It does not have HTTP ok status.

// Network tab:
OPTIONS https://api.internal.acme.co/api/records  405 Method Not Allowed
\`\`\``,
    answer: 'OPTIONS',
    answer_explanation: "The `limit_except` directive only allows GET, POST, PUT, DELETE. The browser's CORS preflight uses the OPTIONS method, which nginx denies with 405 before it ever reaches Express.",
  },

  // 3 — 2026-02-05
  {
    title: 'Z-Index War: The Modal That Hides',
    difficulty: 'medium',
    release_date: '2026-02-05',
    description: `You added a confirmation modal to your app. It works great in isolation, but when triggered from the sidebar, it renders *behind* the sidebar. You've set \`z-index: 9999\` on the modal. Still hidden. You bump it to \`z-index: 999999\`. Nothing.

This isn't a z-index number problem — it's a stacking context problem. The modal is inside a container that creates its own stacking context. No matter how high the modal's z-index goes, it can never escape its parent's stacking context rank.

**What CSS property and value on \`.app-container\` is creating the stacking context that traps the modal?**

*The real enemy is always the parent.*`,
    input_data: `\`\`\`html
<div class="app-layout">
  <aside class="sidebar">
    <button onclick="openModal()">Delete Project</button>
  </aside>
  <div class="app-container">
    <main class="content"><!-- page --></main>
    <div class="modal-overlay" id="confirmModal">
      <div class="modal-box">Really delete?</div>
    </div>
  </div>
</div>
\`\`\`

\`\`\`css
.app-layout {
  display: flex;
  height: 100vh;
}

.app-container {
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
}

.sidebar {
  position: fixed;
  left: 0;
  top: 0;
  width: 260px;
  height: 100vh;
  background: #1e1b4b;
  z-index: 100;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
\`\`\``,
    answer: 'z-index: 1',
    answer_explanation: "`z-index: 1` on `.app-container` (combined with `position: relative`) creates a stacking context. The modal inside can never visually exceed stacking order 1 relative to the sidebar at z-index 100, regardless of how high the modal's own z-index is set.",
  },

  // 4 — 2026-02-06
  {
    title: 'The CSS Grid That Breaks On Safari',
    difficulty: 'medium',
    release_date: '2026-02-06',
    description: `Your product grid looks perfect on Chrome. On Safari (including all iPhones), the grid item images collapse to zero height. Your PM tests on their iPhone and declares the site "completely broken."

The issue is a known Safari bug with CSS Grid and \`aspect-ratio\`. Safari versions before 16.4 don't properly compute height from \`aspect-ratio\` inside grid items. There's a one-line CSS fix.

**What CSS declaration must be added to \`.product-card img\` to fix the height collapse in Safari?**

*Apple: Think Different. Render Different.*`,
    input_data: `\`\`\`css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.product-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.product-card img {
  width: 100%;
  aspect-ratio: 4/3;
  object-fit: cover;
}
\`\`\`

\`\`\`
# Safari DevTools (iPhone 14 Pro, Safari 16.1):
# .product-card img computed:
#   width: 280px
#   height: 0px   <-- BUG

# Chrome DevTools:
# .product-card img computed:
#   width: 280px
#   height: 210px  ✓

# WebKit bug: https://bugs.webkit.org/show_bug.cgi?id=244146
# Fix: add height: auto alongside aspect-ratio
\`\`\``,
    answer: 'height: auto',
    answer_explanation: "Adding `height: auto` to elements with `aspect-ratio` triggers Safari's layout engine to correctly compute the height. Chrome doesn't need it but it's harmless.",
  },

  // 5 — 2026-02-07
  {
    title: "JWT Expired But The Clock Is Fine",
    difficulty: 'hard',
    release_date: '2026-02-07',
    description: `Your app's auth breaks for ~30% of users. They log in, get a JWT, and within seconds get 401 Unauthorized. The JWT has a 1-hour expiry. Your backend validates \`exp\` against server time. The backend runs on 3 Kubernetes pods.

After pulling the JWT from a failing request and cross-referencing server logs, you realize the issuing pod's system clock is dramatically wrong. Tokens it issues have timestamps that are off by a consistent amount.

**What is the clock skew in seconds between pod-2's system clock and real UTC?**

*When your servers can't agree on what time it is, nobody's having a good time.*`,
    input_data: `\`\`\`json
// Decoded JWT payload (from failing request):
{
  "sub": "user_8Kx92mP",
  "email": "priya@acme.co",
  "role": "editor",
  "iat": 1740355200,
  "exp": 1740358800,
  "iss": "auth-service-pod-2"
}
\`\`\`

\`\`\`
# Log from auth-service-pod-2 (issued the token):
[2025-02-24T02:40:00Z] Issuing token for user_8Kx92mP
[2025-02-24T02:40:00Z] System time (unix): 1740355200
[2025-02-24T02:40:00Z] Token iat=1740355200, exp=1740358800

# The log file timestamp is written by the container orchestrator (correct UTC).
# The "System time (unix)" is from the pod's own Date.now().
# 
# Real UTC for 2025-02-24T02:40:00Z = 1740364800
# Pod-2 thinks it's:                   1740355200
# Difference: 1740364800 - 1740355200 = 9600 seconds

# Log from auth-service-pod-0 (rejecting the token):
[2025-02-24T03:08:12Z] Validating token for user_8Kx92mP
[2025-02-24T03:08:12Z] System time (unix): 1740364092
[2025-02-24T03:08:12Z] Token exp: 1740358800 — EXPIRED (now > exp)
[2025-02-24T03:08:12Z] 401 Unauthorized
\`\`\``,
    answer: '9600',
    answer_explanation: "The orchestrator log timestamp `2025-02-24T02:40:00Z` converts to Unix 1740364800, but pod-2 reports its own system time as 1740355200. The skew is 1740364800 - 1740355200 = 9600 seconds (pod-2 is 160 minutes behind).",
  },

  // 6 — 2026-02-08
  {
    title: "The WHERE Clause That Ate Production",
    difficulty: 'medium',
    release_date: '2026-02-08',
    description: `A PM ran a quick SQL update to fix a typo in one company's name. Instead of updating 1 row, it updated all 4,847 rows in the \`organizations\` table. The PM swears they had a WHERE clause.

Look at the raw terminal output. The WHERE clause was there — it just wasn't part of the UPDATE statement.

*The semicolon: tiniest character, biggest consequences.*

**How many rows were unintentionally updated?**`,
    input_data: `\`\`\`
# Raw psql terminal session (screenshot transcript):
acme-db=> UPDATE organizations SET name = 'Acme Corporation'
acme-db-> ;
UPDATE 4847
acme-db=> WHERE id = 3847;
ERROR:  syntax error at or near "WHERE"
LINE 1: WHERE id = 3847;
        ^

# The PM typed the UPDATE on one line, hit Enter (psql showed the 
# continuation prompt "->"), then typed ";" on the next line.
# This executed the UPDATE without the WHERE clause.
# Then they typed the WHERE clause as a separate statement, which errored.

# Post-incident check:
acme-db=> SELECT count(*) FROM organizations;
 count 
-------
  4847
(1 row)

acme-db=> SELECT count(*) FROM organizations WHERE name = 'Acme Corporation';
 count 
-------
  4847
(1 row)
\`\`\``,
    answer: '4847',
    answer_explanation: "The semicolon on a separate line terminated the UPDATE without the WHERE clause, updating all 4847 rows. The WHERE clause was then parsed as a separate (invalid) SQL statement.",
  },

  // 7 — 2026-02-09
  {
    title: "GitHub Actions: The Secret That Isn't",
    difficulty: 'medium',
    release_date: '2026-02-09',
    description: `Your CI deploy step suddenly fails. The error says AWS credentials are empty. You check GitHub Secrets — they're there. The workflow file hasn't changed. Nobody touched the secrets.

But someone renamed the default branch from \`main\` to \`production\`. The secrets are stored in a GitHub Environment with branch protection rules. The environment only allows the \`main\` branch pattern, which no longer exists.

**What is the branch name pattern configured on the \`aws-prod\` environment that needs to be updated?**

*The secrets are right there. GitHub just won't give them to you.*`,
    input_data: `\`\`\`yaml
# .github/workflows/deploy.yml
name: Deploy to Production
on:
  push:
    branches: [production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: aws-prod
    steps:
      - uses: actions/checkout@v4
      - name: Configure AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1
      - name: Deploy
        run: aws s3 sync ./dist s3://app-prod-bucket
\`\`\`

\`\`\`
# Actions log:
Error: Input required and not supplied: aws-access-key-id

# Environment settings (admin view):
Environment: aws-prod
  Deployment branches: Selected branches
  Branch name pattern: main
  Environment secrets:
    AWS_ACCESS_KEY_ID: ****
    AWS_SECRET_ACCESS_KEY: ****

# The workflow now runs on the "production" branch, but the
# environment only allows "main". GitHub silently withholds
# secrets rather than failing with a clear error.
\`\`\``,
    answer: 'main',
    answer_explanation: 'The environment `aws-prod` has branch protection set to `main`, but the branch was renamed to `production`. GitHub silently withholds environment secrets when the branch doesn\'t match the pattern.',
  },

  // 8 — 2026-02-10
  {
    title: "The Rebase That Ate Three Commits",
    difficulty: 'hard',
    release_date: '2026-02-10',
    description: `You ran an interactive rebase to clean up your feature branch before merging. After the rebase and force-push, three commits are missing — including the critical Stripe payment integration. \`git log\` confirms they're gone from the branch history.

The reflog tells the full story. Compare what existed before the rebase with what was picked.

**What are the exact commit messages of the 3 dropped commits, listed alphabetically and separated by semicolons?**

*git reflog: the black box recorder of your worst decisions.*`,
    input_data: `\`\`\`
$ git reflog
a1b2c3d (HEAD -> feature/checkout) HEAD@{0}: rebase (finish)
a1b2c3d HEAD@{1}: rebase (pick): Update cart UI components
f4e5d6c HEAD@{2}: rebase (pick): Fix quantity validation
b7a8c9d HEAD@{3}: rebase (pick): Add shipping calculator
0e1f2a3 HEAD@{4}: rebase (start): checkout main
8c4d5e6 HEAD@{5}: commit: Add error boundary to checkout
d2c3b4a HEAD@{6}: commit: Add shipping calculator
3f7a2b1 HEAD@{7}: commit: Update cart UI components
9d8e7f6 HEAD@{8}: commit: Add Stripe payment integration
c0b1a2d HEAD@{9}: commit: Fix quantity validation
e3f4a5b HEAD@{10}: commit: Initial checkout page scaffold
4a5b6c7 HEAD@{11}: checkout: moving from main to feature/checkout

# Pre-rebase commits (HEAD@{5}..HEAD@{10}): 6 commits
#   - Add error boundary to checkout
#   - Add shipping calculator
#   - Update cart UI components
#   - Add Stripe payment integration
#   - Fix quantity validation
#   - Initial checkout page scaffold

# Rebase picked (HEAD@{1}..HEAD@{3}): 3 commits
#   - Update cart UI components
#   - Fix quantity validation
#   - Add shipping calculator

# Dropped: the other 3
\`\`\``,
    answer: 'Add error boundary to checkout;Add Stripe payment integration;Initial checkout page scaffold',
    answer_explanation: 'The 6 pre-rebase commits minus the 3 picked commits leaves 3 dropped: "Add error boundary to checkout", "Add Stripe payment integration", and "Initial checkout page scaffold" (listed alphabetically).',
  },

  // 9 — 2026-02-11
  {
    title: "The 200 OK That's Actually An Error",
    difficulty: 'medium',
    release_date: '2026-02-11',
    description: `Your frontend POSTs to \`/api/subscribe\` and gets 200 OK. The UI shows "Subscribed! 🎉" But users never receive emails. Turns out the backend always returns 200 — even when the email provider rejects the request. The error is hidden inside the response body, which the frontend never checks.

**What is the value of \`provider_response.status\` that indicates the subscription actually failed?**

*Trust but verify. Especially HTTP 200s.*`,
    input_data: `\`\`\`javascript
// Backend: src/routes/subscribe.js
app.post('/api/subscribe', async (req, res) => {
  try {
    const { email } = req.body;
    const result = await emailService.addSubscriber(email);
    res.status(200).json({
      success: true,
      message: 'Subscription processed',
      provider_response: result
    });
  } catch (err) {
    // Even errors return 200 😱
    res.status(200).json({
      success: true,
      message: 'Subscription processed',
      provider_response: { status: 'queued' }
    });
  }
});
\`\`\`

\`\`\`json
// Response from a failing subscription:
{
  "success": true,
  "message": "Subscription processed",
  "provider_response": {
    "id": null,
    "status": "rejected",
    "reason": "invalid_domain",
    "email": "user@typomail.con"
  }
}
\`\`\`

\`\`\`javascript
// Frontend — only checks top-level "success":
.then(data => {
  if (data.success) showToast('Subscribed! 🎉');
});
\`\`\``,
    answer: 'rejected',
    answer_explanation: 'The `provider_response.status` value is `"rejected"`, indicating the email provider refused the subscription. But the frontend only checks `data.success` which is hardcoded to `true`.',
  },

  // 10 — 2026-02-12
  {
    title: "N+1 Query From a Single Endpoint",
    difficulty: 'hard',
    release_date: '2026-02-12',
    description: `Your \`/api/teams\` endpoint takes 12 seconds to load. There are only 45 teams. Your Prisma ORM generates efficient \`IN\` queries for the \`include\` relations — that part is fine. But a post-processing loop adds one extra query per team to fetch the manager name.

**How many total SQL queries does this endpoint execute?**

*The ORM was innocent. The loop was guilty.*`,
    input_data: `\`\`\`typescript
app.get('/api/teams', async (req, res) => {
  const teams = await prisma.team.findMany({
    include: {
      members: true,
      projects: {
        include: { tasks: true }
      }
    }
  });

  const result = await Promise.all(
    teams.map(async (team) => {
      const manager = await prisma.user.findUnique({
        where: { id: team.managerId }
      });
      return { ...team, managerName: manager?.name ?? 'Unassigned' };
    })
  );

  res.json(result);
});
\`\`\`

\`\`\`
# Prisma query log (abbreviated):
prisma:query SELECT "Team".* FROM "Team"                                    -- 1 query
prisma:query SELECT "Member".* FROM "Member" WHERE "teamId" IN (...)       -- 1 query (all 45 teams)
prisma:query SELECT "Project".* FROM "Project" WHERE "teamId" IN (...)     -- 1 query
prisma:query SELECT "Task".* FROM "Task" WHERE "projectId" IN (...)        -- 1 query
prisma:query SELECT "User".* FROM "User" WHERE "id" = $1                   -- repeated 45x
prisma:query SELECT "User".* FROM "User" WHERE "id" = $1
... (45 total findUnique calls)

# Database: 45 teams, 312 members, 89 projects, 1456 tasks
\`\`\``,
    answer: '49',
    answer_explanation: 'Prisma `findMany` with `include` generates 4 queries using efficient `IN` clauses (1 teams + 1 members + 1 projects + 1 tasks). The `Promise.all` loop adds 45 individual `findUnique` queries. Total: 4 + 45 = 49.',
  },

  // 11 — 2026-02-13
  {
    title: "The Phantom 301 Redirect Loop",
    difficulty: 'hard',
    release_date: '2026-02-13',
    description: `Your team migrated from HTTP to HTTPS. The site now redirect-loops infinitely — Chrome shows \`ERR_TOO_MANY_REDIRECTS\`. You're behind Cloudflare with SSL set to "Flexible." Your nginx config redirects HTTP to HTTPS. Cloudflare (in Flexible mode) connects to your origin over HTTP. Origin nginx sees HTTP, redirects to HTTPS. Cloudflare fetches that over HTTP again. Infinite loop.

Your DevOps engineer is on vacation. You need to figure out what Cloudflare SSL mode fixes this without changing nginx.

**What should the Cloudflare SSL/TLS encryption mode be changed to?**

*When everyone insists on HTTPS, nobody gets anything.*`,
    input_data: `\`\`\`nginx
server {
    listen 80;
    server_name app.startup.io;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name app.startup.io;
    ssl_certificate /etc/ssl/certs/app.pem;
    ssl_certificate_key /etc/ssl/private/app.key;
    root /var/www/app;
    index index.html;
}
\`\`\`

\`\`\`
# Cloudflare Dashboard:
SSL/TLS encryption mode: Flexible
# Flexible = Cloudflare→origin connection uses HTTP (port 80)

# Request flow:
Browser → HTTPS → Cloudflare → HTTP:80 → nginx → 301 HTTPS → Cloudflare → HTTP:80 → nginx → 301 ...

# curl from origin server:
$ curl -I http://localhost
HTTP/1.1 301 Moved Permanently
Location: https://app.startup.io/

$ curl -I https://localhost -k
HTTP/1.1 200 OK
\`\`\``,
    answer: 'Full',
    answer_explanation: 'Changing Cloudflare SSL mode to "Full" makes Cloudflare connect to the origin over HTTPS (port 443), which nginx serves directly with 200. "Flexible" connects via HTTP, triggering nginx\'s 301 redirect loop.',
  },

  // 12 — 2026-02-14
  {
    title: "The Migration That Locks The Table",
    difficulty: 'hard',
    release_date: '2026-02-14',
    description: `Your Rails migration adds a column with a default value to a table with 12 million rows. Postgres 11+ handles this instantly — no table rewrite needed. And indeed, the \`ALTER TABLE ADD COLUMN\` completes in 12ms. But the migration still holds a table lock for 4+ minutes, killing production.

Something else in the migration is the problem. Find the slow operation.

**What is the exact Rails migration method call that causes the 4-minute lock?**

*The column was instant. The index was not.*`,
    input_data: `\`\`\`ruby
class AddStatusToOrders < ActiveRecord::Migration[7.1]
  def change
    add_column :orders, :status, :string, default: 'pending', null: false
    add_index :orders, :status
  end
end
\`\`\`

\`\`\`
# PostgreSQL log:
LOG: ALTER TABLE "orders" ADD "status" varchar DEFAULT 'pending' NOT NULL
     duration: 12.345 ms   <-- instant ✓
LOG: CREATE INDEX "index_orders_on_status" ON "orders" ("status")
     duration: 245891.432 ms   <-- 4+ MINUTES, holds AccessExclusive lock
\`\`\``,
    answer: 'add_index :orders, :status',
    answer_explanation: 'The `add_index` creates a standard B-tree index on 12M rows, acquiring a table-level lock for the entire duration. The fix is `add_index :orders, :status, algorithm: :concurrently` with `disable_ddl_transaction!`.',
  },

  // 13 — 2026-02-15
  {
    title: "OAuth Redirect URI — The Trailing Slash",
    difficulty: 'hard',
    release_date: '2026-02-15',
    description: `Google OAuth login broke after deploying to staging. Error: \`redirect_uri_mismatch\`. You've added the staging URL to Google Cloud Console. You've triple-checked the domain, the path, the protocol. Everything matches... almost.

**What is the exact character difference between the registered URI and the one the app sends?**

*In OAuth, close enough is never close enough.*`,
    input_data: `\`\`\`
# Google OAuth error:
Error 400: redirect_uri_mismatch
Request redirect URI: https://staging.acme.co/auth/google/callback
does not match authorized URIs.

# Google Cloud Console — Authorized redirect URIs:
1. https://staging.acme.co/auth/google/callback/
2. https://app.acme.co/auth/google/callback
3. http://localhost:3000/auth/google/callback

# Application .env.staging:
GOOGLE_REDIRECT_URI=https://staging.acme.co/auth/google/callback

# The registered staging URI has a trailing slash.
# The app sends it without the trailing slash.
# Google requires EXACT character-for-character match.
\`\`\``,
    answer: 'trailing slash',
    answer_explanation: 'The Google Console has the staging URI registered with a trailing `/` (`/callback/`) but the app sends it without (`/callback`). Google OAuth requires exact match — a single trailing slash causes the mismatch.',
  },

  // 14 — 2026-02-16
  {
    title: "The SQL Join That Inflates Totals",
    difficulty: 'medium',
    release_date: '2026-02-16',
    description: `Your customer report query returns correct row counts after GROUP BY, but the \`SUM(o.amount)\` values are wildly inflated. A customer who spent $500 shows $2,000. The issue: you're joining \`orders\` and \`customer_tags\` on the same parent, creating a cartesian product that multiplies each order by the number of tags.

**By what factor is the SUM inflated for a customer with exactly 4 tags?**

*Two many-to-one joins walk into a query. The numbers get drunk.*`,
    input_data: `\`\`\`sql
SELECT 
  c.id, c.name,
  SUM(o.amount) as total_spent,
  COUNT(DISTINCT t.tag_name) as tag_count
FROM customers c
JOIN orders o ON o.customer_id = c.id
JOIN customer_tags t ON t.customer_id = c.id
GROUP BY c.id, c.name;
\`\`\`

\`\`\`
-- Example: Customer #42
-- orders: 5 rows (amounts: $100, $100, $100, $100, $100 = $500 actual)
-- customer_tags: 4 rows (vip, enterprise, beta, churned)
-- 
-- After both JOINs: 5 × 4 = 20 rows for customer #42
-- SUM(amount) = 20 × $100 = $2,000 (should be $500)
-- The sum is inflated by the number of tags
\`\`\``,
    answer: '4',
    answer_explanation: 'Each order row is duplicated once per tag in the join result. With 4 tags, every order amount is summed 4 times, inflating the total by a factor of 4.',
  },

  // 15 — 2026-02-17
  {
    title: "The Docker Build That Works On My Mac",
    difficulty: 'hard',
    release_date: '2026-02-17',
    description: `Your Dockerfile builds perfectly on your M2 Mac. GitHub Actions (ubuntu, x86_64) fails during \`npm ci\` with a native module compilation error. The error looks like an architecture mismatch, but it's actually simpler: \`node:20-alpine\` doesn't include the build tools (\`python3\`, \`make\`, \`g++\`) that \`node-gyp\` needs to compile \`sharp\`.

**What is the exact npm error code in the CI failure log?**

*"Works on my machine" is not a deployment strategy.*`,
    input_data: `\`\`\`dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "dist/server.js"]
\`\`\`

\`\`\`
# GitHub Actions log:
Step 4/8 : RUN npm ci
npm warn deprecated @humanwhocodes/config-array@0.11.14
npm error code ELIFECYCLE
npm error errno 1
npm error sharp@0.33.2 install: \`node-gyp rebuild\`
npm error Exit status 1
npm error Failed at the sharp@0.33.2 install script.

gyp ERR! build error
gyp ERR! stack Error: \`make\` failed with exit code: 2
gyp ERR! not ok
\`\`\``,
    answer: 'ELIFECYCLE',
    answer_explanation: 'The npm error code is `ELIFECYCLE`, indicating a lifecycle script (`install`) failed. The root cause is Alpine Linux missing build dependencies (`make`, `g++`, `python3`) needed by `node-gyp` to compile `sharp`.',
  },

  // 16 — 2026-02-18
  {
    title: "The API Key That Works In Postman",
    difficulty: 'insane',
    release_date: '2026-02-18',
    description: `Your API key works in Postman. Curl works too. Your React app gets 403 Forbidden. Same key, same endpoint. The Network tab shows... wait, it shows an OPTIONS request, not your actual GET.

Your API is behind AWS API Gateway. The gateway doesn't have an OPTIONS handler configured. AWS API Gateway returns its default error for any unmatched route/method — and the error message is deliberately misleading.

**What is the exact error message in the JSON response body from AWS API Gateway?**

*The error message is the lie. The status code is the truth. And neither tells you it's a CORS problem.*`,
    input_data: `\`\`\`
# Browser Network tab:
OPTIONS https://api.acme.co/v1/products  403 Forbidden

# Response body:
{"message":"Missing Authentication Token"}

# Response headers:
x-amzn-errortype: MissingAuthenticationTokenException

# Your fetch code:
const res = await fetch('https://api.acme.co/v1/products', {
  headers: {
    'Authorization': \`Bearer \${apiKey}\`,
    'Content-Type': 'application/json'
  }
});

# Postman (works fine — no preflight):
GET https://api.acme.co/v1/products
Authorization: Bearer sk_live_abc123
→ 200 OK ✓

# AWS API Gateway returns "Missing Authentication Token" for ANY
# request to an unconfigured route or method — including OPTIONS.
# It's not actually about authentication. It's CORS misconfiguration.
\`\`\``,
    answer: 'Missing Authentication Token',
    answer_explanation: 'AWS API Gateway returns `{"message":"Missing Authentication Token"}` as its default error for any unmatched route/method, including OPTIONS. This misleading message makes you chase auth issues when the real problem is no OPTIONS handler for CORS preflight.',
  },

  // 17 — 2026-02-19
  {
    title: "Webpack Bundle: The 4MB Surprise",
    difficulty: 'insane',
    release_date: '2026-02-19',
    description: `Your production bundle is 4.2MB. Budget is 500KB. The bundle analyzer reveals that 67% of it is \`aws-sdk\` — all 2.8MB. Nobody on your team uses AWS SDK in the frontend. Or do they?

One utility file imports the entire AWS SDK v2 just to call \`AWS.util.uuid.v4()\`. This file is imported by 23 other modules. One import, 2.8MB of payload.

**What is the full import/require statement in \`src/utils/id-generator.js\` that's causing the bloat?**

*One line of code. 2.8 megabytes of regret.*`,
    input_data: `\`\`\`
# webpack-bundle-analyzer output:
aws-sdk/          2,847 KB  (67.8%)
react-dom/          412 KB  (9.8%)
@mui/material/      389 KB  (9.3%)
lodash/             287 KB  (6.8%)
other               265 KB  (6.3%)
Total:            4,200 KB

# Finding the import:
$ grep -r "aws-sdk" src/
src/utils/id-generator.js:const AWS = require('aws-sdk');

# src/utils/id-generator.js:
const AWS = require('aws-sdk');

function generateRequestId() {
  return AWS.util.uuid.v4();
}

module.exports = { generateRequestId };

# Used in 23 files:
$ grep -r "id-generator" src/ | wc -l
23
\`\`\``,
    answer: "const AWS = require('aws-sdk');",
    answer_explanation: "This single `require('aws-sdk')` imports the entire AWS SDK v2 (2.8MB) just to use its UUID utility. Replacing it with `const { v4 } = require('uuid')` (31KB) would save 2.8MB.",
  },

  // 18 — 2026-02-20
  {
    title: "The Cascading Delete That Wasn't",
    difficulty: 'insane',
    release_date: '2026-02-20',
    description: `You delete a user. No error. But their orders, reviews, and sessions are still in the database — completely orphaned. The Rails migration clearly specifies \`on_delete: :cascade\`. The migration is marked as run in \`schema_migrations\`. But the actual database constraint has no CASCADE behavior.

Something went wrong between the migration definition and the DDL that was actually applied.

**What is the default ON DELETE behavior in PostgreSQL when no ON DELETE clause is specified on a foreign key?**

*The migration lied. The database told the truth.*`,
    input_data: `\`\`\`ruby
# db/migrate/20240815_create_orders.rb
class CreateOrders < ActiveRecord::Migration[7.0]
  def change
    create_table :orders do |t|
      t.references :user, null: false, foreign_key: { on_delete: :cascade }
      t.decimal :amount, precision: 10, scale: 2
      t.timestamps
    end
  end
end
\`\`\`

\`\`\`sql
-- Actual DDL in database (from pg_dump):
ALTER TABLE ONLY orders
    ADD CONSTRAINT fk_rails_f868b47f6a 
    FOREIGN KEY (user_id) REFERENCES users(id);
-- Note: NO "ON DELETE CASCADE"

-- Attempting to delete:
DELETE FROM users WHERE id = 42;
ERROR: update or delete on table "users" violates foreign key constraint 
"fk_rails_f868b47f6a" on table "orders"
DETAIL: Key (id)=(42) is still referenced from table "orders".
\`\`\`

\`\`\`ruby
# db/schema.rb (auto-generated):
add_foreign_key "orders", "users"
# Also missing on_delete: :cascade
\`\`\``,
    answer: 'NO ACTION',
    answer_explanation: "PostgreSQL's default ON DELETE behavior when unspecified is `NO ACTION`, which raises an error if referenced rows still exist. The migration's `on_delete: :cascade` option didn't apply to the actual DDL (a known edge case in some Rails versions with `t.references`).",
  },

  // 19 — 2026-02-21
  {
    title: "The ENV That Disappears At Build Time",
    difficulty: 'insane',
    release_date: '2026-02-21',
    description: `Your Next.js app uses \`NEXT_PUBLIC_API_URL\` in the browser. Works in dev. In production on Vercel, it's \`undefined\`. You've set it in Vercel's dashboard. \`vercel env ls\` confirms it exists. But the deployed JavaScript has it baked in as \`undefined\`.

Here's the trap: \`NEXT_PUBLIC_*\` variables are inlined at **build time**, not read at runtime. If the var wasn't available when \`next build\` ran, it's \`undefined\` forever in that deployment. You set the variable for "Production" environment only — but your deployment is to the "Preview" environment (it's a branch deploy).

**What Vercel environment scope is the variable missing from?**

*It's not missing. It's just not invited to this environment.*`,
    input_data: `\`\`\`
# Vercel Dashboard — Environment Variables:
NEXT_PUBLIC_API_URL = https://api.acme.co
  Environments: ✅ Production  ❌ Preview  ❌ Development

# vercel env ls:
NEXT_PUBLIC_API_URL (Production)
DATABASE_URL (Production, Preview)
STRIPE_SECRET_KEY (Production, Preview)

# Deployment:
Branch: feature/new-dashboard → Preview environment
Build: next build → NEXT_PUBLIC_API_URL not available → baked as undefined

# Browser console on preview deployment:
console.log(process.env.NEXT_PUBLIC_API_URL)
// undefined
\`\`\``,
    answer: 'Preview',
    answer_explanation: 'The variable is only scoped to "Production" in Vercel. Branch deployments use the "Preview" environment, which doesn\'t have it. Since Next.js inlines `NEXT_PUBLIC_*` at build time, the preview build permanently bakes in `undefined`.',
  },

  // 20 — 2026-03-01
  {
    title: "The Race Condition In The Payment Flow",
    difficulty: 'insane',
    release_date: '2026-03-01',
    description: `~2% of customers are being charged twice. Your payment flow: frontend POSTs to \`/api/charge\`, backend creates a Stripe PaymentIntent, returns client secret, frontend confirms. The "Pay Now" button disables during loading — but re-enables on completion, and a retry wrapper can fire duplicate requests if the first one is slow.

The backend creates a new PaymentIntent on every request with no idempotency protection. Stripe has a specific mechanism for this.

**What is the exact HTTP header name that Stripe uses for idempotent requests?**

*Move fast and charge things twice.*`,
    input_data: `\`\`\`javascript
// Frontend: double-charge vector
function CheckoutButton({ orderId, amount }) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetchWithRetry('/api/charge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, amount })
      });
      const { clientSecret } = await res.json();
      await stripe.confirmCardPayment(clientSecret);
    } catch (err) { showError('Payment failed'); }
    setLoading(false); // re-enables button!
  };

  return <button onClick={handlePay} disabled={loading}>Pay Now</button>;
}

// fetchWithRetry: retries on timeout, but original request may still be in-flight
async function fetchWithRetry(url, opts, retries = 3, timeout = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeout);
      const res = await fetch(url, { ...opts, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch { if (i === retries - 1) throw new Error('Failed'); }
  }
}
\`\`\`

\`\`\`javascript
// Backend: no idempotency protection
app.post('/api/charge', async (req, res) => {
  const { orderId, amount } = req.body;
  const paymentIntent = await stripe.paymentIntents.create({
    amount, currency: 'usd',
    metadata: { orderId }
    // Should use: idempotencyKey: orderId
  });
  res.json({ clientSecret: paymentIntent.client_secret });
});
\`\`\`

\`\`\`
# From Stripe docs:
# "Provide an additional Idempotency-Key: <key> header to the request."
\`\`\``,
    answer: 'Idempotency-Key',
    answer_explanation: 'Stripe uses the `Idempotency-Key` HTTP header to deduplicate requests. Passing the orderId as the idempotency key ensures duplicate requests return the same PaymentIntent instead of creating new ones.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Seed
// ─────────────────────────────────────────────────────────────────────────────

console.log(`\n🧩 Seeding ${challenges.length} agentic engineering challenges...\n`);

let inserted = 0;
let skipped = 0;
let errors = 0;

for (const challenge of challenges) {
  const { answer, answer_explanation: _explanation, ...rest } = challenge;
  const id = randomUUID();
  const answerHash = saltedHash(answer.trim(), id);

  const payload = {
    id,
    ...rest,
    category: 'agentic_engineering',
    answer_hash: answerHash,
  };

  process.stdout.write(`  [${challenge.release_date}] ${challenge.title.slice(0, 50).padEnd(50)} → `);

  // Note: release_date must be unique across all puzzles/challenges.
  // AI puzzles use Jan 1–Feb 2, Feb 22–28; challenges use Feb 3–21, Mar 1+
  const { ok, status, data } = await supaFetch('/puzzles?on_conflict=release_date', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(payload),
  });

  if (ok) {
    if (Array.isArray(data) && data.length > 0) {
      console.log('✅ inserted');
      inserted++;
    } else {
      console.log('⏭️  skipped (duplicate release_date)');
      skipped++;
    }
  } else {
    console.log(`❌ HTTP ${status}: ${JSON.stringify(data)}`);
    errors++;
  }
}

console.log(`\n────────────────────────────────────────────`);
console.log(`✅ Inserted: ${inserted}`);
console.log(`⏭️  Skipped:  ${skipped}`);
console.log(`❌ Errors:   ${errors}`);
console.log(`────────────────────────────────────────────\n`);

if (errors > 0) process.exit(1);
