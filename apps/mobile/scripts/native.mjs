// Settings the generated iOS and Android projects need that Capacitor has no
// config for. The projects are in git, so this only matters after they are
// made again with `cap add`; it runs on every `pnpm sync` and leaves what it
// already patched alone.
//
// - Landscape only (SET-017's phone layouts are landscape).
// - The `pockethegemony` link, so Steam's browser sheet comes back to the app
//   (`sign_in.app_return` in packages/rules/data/domain/saves.json, SAVE-151).
// - iOS: the Sign in with Apple entitlement (SAVE-149, SAVE-155).
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SCHEME = "pockethegemony";

function patch(path, change) {
  if (!existsSync(path)) return;
  const before = readFileSync(path, "utf8");
  const after = change(before);
  if (after !== before) {
    writeFileSync(path, after);
    console.log(`native: patched ${path}`);
  }
}

patch("android/app/src/main/AndroidManifest.xml", (xml) => {
  if (!xml.includes("android:screenOrientation")) {
    xml = xml.replace(/<activity\b/, '<activity android:screenOrientation="sensorLandscape"');
  }
  if (!xml.includes(`android:scheme="${SCHEME}"`)) {
    const link = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="${SCHEME}" />
            </intent-filter>
`;
    xml = xml.replace(/(<\/intent-filter>\n)(\s*<\/activity>)/, `$1${link}$2`);
  }
  return xml;
});

patch("ios/App/App/Info.plist", (xml) => {
  const landscape = "<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>";
  xml = xml.replace(/(<key>UISupportedInterfaceOrientations(?:~ipad)?<\/key>\s*)<array>[\s\S]*?<\/array>/g, `$1${landscape}`);
  // Every iPhone that runs iOS 15 is 64-bit; the template still asks for armv7.
  xml = xml.replace(/(<key>UIRequiredDeviceCapabilities<\/key>\s*<array>\s*)<string>armv7<\/string>/, "$1<string>arm64</string>");
  if (!xml.includes("<key>CFBundleURLTypes</key>")) {
    const types = `\t<key>CFBundleURLTypes</key>
\t<array>
\t\t<dict>
\t\t\t<key>CFBundleURLName</key>
\t\t\t<string>com.pockethegemony.app</string>
\t\t\t<key>CFBundleURLSchemes</key>
\t\t\t<array>
\t\t\t\t<string>${SCHEME}</string>
\t\t\t</array>
\t\t</dict>
\t</array>
`;
    xml = xml.replace(/(\t<key>CFBundleVersion<\/key>)/, `${types}$1`);
  }
  return xml;
});

const entitlements = "ios/App/App/App.entitlements";
if (existsSync("ios/App/App") && !existsSync(entitlements)) {
  writeFileSync(
    entitlements,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
\t<key>com.apple.developer.applesignin</key>
\t<array>
\t\t<string>Default</string>
\t</array>
</dict>
</plist>
`,
  );
  console.log(`native: wrote ${entitlements}`);
}
patch("ios/App/App.xcodeproj/project.pbxproj", (pbx) =>
  pbx.includes("CODE_SIGN_ENTITLEMENTS")
    ? pbx
    : pbx.replace(/(\t+)(CODE_SIGN_STYLE = Automatic;\n)/g, "$1CODE_SIGN_ENTITLEMENTS = App/App.entitlements;\n$1$2"),
);
