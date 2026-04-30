# 08 — TestFlight Owner Action Runbook

Status: owner/system actions required
Last updated: 2026-04-30
Scope: first external TestFlight package from `/Users/beyond/SOS-App`

## Current repo baseline

Already done:
- Web/backend controlled tester readiness is green.
- Native iOS Capacitor scaffold exists.
- Native iOS shell hides web Stripe checkout.
- `/privacy` and `/support` routes exist and return HTTP 200 on app/www domains.
- iOS plist is portrait-only.
- Temporary SOS-derived app icon is in the iOS asset catalog.

Key commits:
- `51851bd` — `Add iOS Capacitor scaffold`
- `fbdb867` — `Gate Stripe checkout in native iOS shell`
- `3d37d2e` — `Update App Store readiness after iOS scaffold`
- `36e5136` — `Add App Store privacy and support routes`
- `ec8416c` — `Polish iOS scaffold defaults`

## Hard blocker 1: full Xcode is not installed/selected

Current evidence:

```text
xcode-select -p
/Library/Developer/CommandLineTools

DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -version
xcrun: error: missing DEVELOPER_DIR path: /Applications/Xcode.app/Contents/Developer
```

Required owner/system action:
1. Install Xcode from the Mac App Store or Apple Developer downloads.
2. Open Xcode once and accept any license/component prompts.
3. Select it:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcodebuild -version
```

After that, run:

```bash
cd /Users/beyond/SOS-App
xcodebuild -list -project ios/App/App.xcodeproj
```

## Hard blocker 2: Apple Developer bundle/signing setup

Current repo bundle id:

```text
app.getsos.sos
```

Owner action:
- Confirm this bundle ID is final or choose a replacement.
- Register the bundle ID in Apple Developer.
- Assign the signing team in `ios/App/App.xcodeproj`.
- Confirm whether the first build is iPhone-only or universal.

## Hard blocker 3: native monetization

Current state:
- Web Stripe checkout remains live on web.
- Native iOS shell hides Stripe checkout.
- StoreKit/IAP is not implemented.

Owner/product action:
- Decide whether first TestFlight is invite-code/tester-only with paid purchases unavailable.
- If paid native launch is required, define App Store products before implementation:
  - Charter annual
  - Member annual
  - Member monthly, if keeping monthly
  - first-100 Charter strategy or launch-offer replacement

## Hard blocker 4: final App Store assets and reviewer package

Needed after Xcode/shell validation:
- Real screenshots from the actual iOS container.
- Final app icon and splash assets.
- Final support URL: `https://getsos.app/support`
- Final privacy URL: `https://getsos.app/privacy`
- Legal/product approval of privacy nutrition labels.
- Reviewer contact.
- Reviewer/tester account or invite-code flow.

Do not fabricate reviewer credentials.

## Hard blocker 5: public/commercial launch license

Swiss Ephemeris commercial license remains parked.

Packaging work can continue, but do not mark full public/commercial launch green until license posture is resolved.

## Next technical command after owner action

Once full Xcode is installed/selected:

```bash
cd /Users/beyond/SOS-App
npm run lint
npm run build
npx cap copy ios
xcodebuild -list -project ios/App/App.xcodeproj
```

If signing is configured, next archive command should be chosen from Xcode's generated scheme list rather than guessed.
