# Deployment Instructions for SOS Waitlist Page

## Overview
The SOS waitlist page is a Next.js app deployed on Vercel. It's live tonight, minimal config, zero database or API routes needed.

## Live Preview
- **GitHub Repo:** https://github.com/BeyondbyAnaliesa/sos-app
- **Code:** Committed and ready to deploy

## Deploy to Vercel (Two Options)

### Option 1: Automatic (Recommended) — Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Select the `sos-app` repository
4. Click "Import Project"
5. Vercel auto-detects Next.js — no additional config needed
6. Click "Deploy"
7. Wait ~2–3 minutes for build and deployment
8. Your site will be live at a Vercel URL (e.g., `sos-app.vercel.app`)

### Option 2: CLI Deploy

If you have Vercel CLI installed:

```bash
cd /path/to/sos-app
vercel --prod
```

This deploys to your production domain immediately.

## Custom Domain Setup

Once deployed:

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Domains**
3. Add your custom domain (e.g., `getsos.app`)
4. Follow the DNS configuration instructions
5. Point your domain registrar's DNS to Vercel nameservers or add a CNAME record

## Verify the Page

After deployment:
- Visit your Vercel URL or custom domain
- Check:
  - ✅ SOS wordmark in copper (#C9A27A)
  - ✅ Headline: "The map exists."
  - ✅ Subhead: "Be first to hold it."
  - ✅ Email input with copper border
  - ✅ Button: "I'm in." (copper background)
  - ✅ Form submit redirects to https://getsos.beehiiv.com
  - ✅ Subtle background breathing animation
  - ✅ Mobile responsive

## Environment Variables

None required. The page is completely static with no backend.

## Future Enhancements (If Needed)

- Add Beehiiv API integration for direct email subscription (replace simple redirect)
- Add analytics tracking (Vercel Analytics or Google Analytics)
- Add form validation feedback
- Add rate limiting for form submissions

## Rollback / Updates

To push new changes:

```bash
git push origin main
```

Vercel automatically deploys on every push to `main`.

## Support

- **Vercel Docs:** https://vercel.com/docs
- **Next.js Docs:** https://nextjs.org/docs
- **GitHub Repo:** https://github.com/BeyondbyAnaliesa/sos-app
