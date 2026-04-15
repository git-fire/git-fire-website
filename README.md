# git-fire-website

Marketing site for the [git-fire](https://github.com/git-fire/git-fire) org: **git-fire**, **git-rain**, **git-testkit**, and **git-harness**.

Canonical URL for SEO and Open Graph: **https://git-fire.com**. Related domains **git-fire.sh** and **git-fire.dev** should redirect to the same path on `.com` (configure at your DNS / CDN provider, for example Cloudflare Bulk Redirects).

## Local development

Requires Node **22.12+**.

```bash
npm ci
npm run dev
```

Production build (output in `dist/`):

```bash
npm run build
```

Preview with Wrangler (static assets on Workers-style dev server):

```bash
npm run preview
```

Deploy (after `wrangler login` and matching project name):

```bash
npm run deploy
```

## Changing the canonical origin

Update `site` in `astro.config.mjs` if the public HTTPS origin ever changes — sitemap and `og:url` depend on it.

## Install snippets

Install commands on the site are kept aligned with the **git-fire** and **git-rain** READMEs. When release instructions change upstream, update `src/scripts/install-pickers.ts` and verify with `npm run build`.
