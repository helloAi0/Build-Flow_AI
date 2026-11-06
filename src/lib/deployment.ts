/**
 * Deployment target matrix for EXPORTED applications.
 *
 * The exported project is a Next.js 15 app. Anything that can run a Node
 * server (or an adapter for it) works; static-only/PHP shared hosting does
 * not. We never claim support that the architecture cannot honour.
 */

export type RuntimeNeeds = {
  /** Needs a Node/edge server process (SSR pages, public website, API routes). */
  server: boolean;
  /** Needs the Supabase Data API reachable from the browser. */
  database: boolean;
  /** Public customer-facing website is part of the export. */
  publicSite: boolean;
  nodeVersion: string;
};

export type Provider = {
  id: string;
  name: string;
  support: "supported" | "supported-with-adapter" | "unsupported";
  note: string;
  steps: string[];
};

export function providersFor(needs: RuntimeNeeds): Provider[] {
  const envNote = "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in the project's environment settings.";
  return [
    {
      id: "vercel",
      name: "Vercel",
      support: "supported",
      note: "First-class Next.js host. Build and SSR work with no changes.",
      steps: [
        "Push the exported repository to GitHub/GitLab.",
        "vercel.com → Add New Project → import the repository.",
        envNote,
        "Deploy. Vercel detects Next.js automatically (build: next build).",
      ],
    },
    {
      id: "netlify",
      name: "Netlify",
      support: "supported",
      note: "Uses the official Next.js runtime; netlify.toml is included in the export.",
      steps: [
        "Push the repository to GitHub.",
        "Netlify → Add new site → Import an existing project.",
        "Build command `next build`, publish directory `.next` (already in netlify.toml).",
        envNote,
      ],
    },
    {
      id: "cloudflare",
      name: "Cloudflare Workers / Pages",
      support: "supported-with-adapter",
      note: "Requires the @opennextjs/cloudflare adapter, which is pre-configured in the export.",
      steps: [
        "npm install (the adapter is already in devDependencies).",
        "npx opennextjs-cloudflare build",
        "npx wrangler deploy (wrangler.toml is included).",
        "Add the env vars as Worker variables/secrets.",
      ],
    },
    {
      id: "node",
      name: "Any Node host (Railway, Render, Fly.io, VPS, Docker)",
      support: "supported",
      note: `Standard Node ${needs.nodeVersion}+ server. A Dockerfile and docker-compose.yml are included.`,
      steps: [
        "npm ci && npm run build",
        "npm start (listens on PORT, default 3000)",
        "Or: docker compose up --build",
        envNote,
      ],
    },
    {
      id: "hostinger",
      name: "Hostinger",
      support: needs.server ? "supported-with-adapter" : "supported",
      note: needs.server
        ? "Only on Hostinger VPS / Node.js hosting plans. Shared web hosting cannot run the Next.js server this app needs."
        : "Works on Node.js hosting; a static export is also possible because this app has no server-rendered pages.",
      steps: [
        "Choose a VPS or Node.js-capable plan (not shared PHP hosting).",
        "Upload the repo (git clone) and run npm ci && npm run build.",
        "Run `npm start` behind the panel's Node app manager or PM2, proxied on port 80/443.",
        envNote,
      ],
    },
    {
      id: "godaddy",
      name: "GoDaddy",
      support: needs.server ? "unsupported" : "supported-with-adapter",
      note: needs.server
        ? "GoDaddy shared/cPanel hosting cannot run a Next.js Node server. Use a GoDaddy VPS, or host the app elsewhere and point your GoDaddy domain at it via DNS."
        : "Possible on cPanel Node.js selector or by uploading a static export; server features are not available.",
      steps: [
        "Keep the domain at GoDaddy and deploy the app on Vercel/Netlify/Cloudflare/VPS.",
        "In GoDaddy DNS, add the CNAME/A record given by the host.",
        "GoDaddy VPS users can instead follow the generic Node host instructions.",
      ],
    },
  ];
}

export function deploymentMarkdown(appName: string, needs: RuntimeNeeds): string {
  const providers = providersFor(needs);
  const label = (p: Provider) =>
    p.support === "supported" ? "Supported" : p.support === "supported-with-adapter" ? "Supported (adapter/plan required)" : "Not supported";

  return `# Deploying ${appName}

## Runtime requirements

| Requirement | Value |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Node.js | ${needs.nodeVersion} or newer |
| Server process | ${needs.server ? "Required (server-rendered pages / API routes)" : "Not required (client-rendered admin only)"} |
| Database | ${needs.database ? "Supabase (Postgres + Auth + row-level security)" : "None"} |
| Public website | ${needs.publicSite ? "Included (customer-facing pages)" : "Not included" } |
| Environment variables | See \`environment.example\` |

## Hosting compatibility

| Provider | Status | Notes |
| --- | --- | --- |
${providers.map((p) => `| ${p.name} | ${label(p)} | ${p.note} |`).join("\n")}

## Step by step

${providers
  .filter((p) => p.support !== "unsupported")
  .map((p) => `### ${p.name}\n\n${p.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`)
  .join("\n\n")}

${providers.some((p) => p.support === "unsupported")
  ? `### Not supported\n\n${providers
      .filter((p) => p.support === "unsupported")
      .map((p) => `- **${p.name}** — ${p.note}`)
      .join("\n")}\n`
  : ""}
## Database

1. Create a Supabase project (or use your own Postgres with the Supabase stack).
2. Run \`database/migrations/0001_init.sql\` — it creates every table, grants, and row-level security policies.
3. Optionally run \`database/seed.sql\` after setting the seed user id.
4. Copy the project URL and anon key into your host's environment variables.

## Domains

The app is domain-agnostic: it uses relative routes only. Point any custom domain at your
host and no code changes are needed.
`;
}
