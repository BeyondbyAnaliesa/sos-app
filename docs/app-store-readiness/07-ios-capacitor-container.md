# 07 — iOS Capacitor Container

Status: first native scaffold committed; Xcode/archive validation blocked locally
Last updated: 2026-04-30
Scope: `/Users/beyond/SOS-App`

## Current state

A first native iOS submission container now exists via Capacitor.

Evidence:
- `capacitor.config.ts`
- `capacitor-shell/index.html`
- `ios/App/App.xcodeproj/project.pbxproj`
- `ios/App/App/Info.plist`
- `ios/App/App/AppDelegate.swift`
- `ios/App/App/Base.lproj/Main.storyboard`
- `ios/App/App/Base.lproj/LaunchScreen.storyboard`
- `ios/App/App/Assets.xcassets/`

Commits:
- `51851bd` — `Add iOS Capacitor scaffold`
- `fbdb867` — `Gate Stripe checkout in native iOS shell`

## Runtime strategy

The native shell loads the production app URL:

```ts
server: {
  url: 'https://app.getsos.app',
  cleartext: false,
}
```

The shell appends this user-agent marker:

```ts
appendUserAgent: 'SOSNativeIOS'
```

The web app uses that marker to hide web Stripe checkout in the native iOS shell until App Store-native purchase handling exists.

## Verified locally

Passed:
- `npx cap copy ios`
- `python3 -m json.tool ios/App/App/capacitor.config.json`
- `plutil -lint ios/App/App/Info.plist`
- `npm run lint`
- `npm run build`

Blocked locally:
- `xcodebuild -list -project ios/App/App.xcodeproj`

Reason:
- active developer directory is Command Line Tools, not full Xcode.

Observed error:

```text
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```

## Remaining before TestFlight archive

- Install/select full Xcode.
- Open `ios/App/App.xcodeproj` and set signing team.
- Confirm/register bundle ID `app.getsos.sos` in Apple Developer.
- Decide iPhone-only vs universal/iPad support.
- Replace temporary SOS-derived AppIcon render and default splash with final SOS App Store assets.
- Decide remote-wrapper review posture before external TestFlight/App Store submission.
- Implement StoreKit/IAP or keep native paid purchase paths unavailable for tester-only builds.

## Current verdict

The old blocker “no native iOS container exists” is closed.

The current blocker is now Xcode/signing/archive validation plus native monetization strategy.
