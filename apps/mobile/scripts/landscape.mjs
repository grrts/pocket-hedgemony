// Locks the native apps to landscape. Capacitor has no setting for this, so
// after `cap add android` / `cap add ios` the generated projects are patched
// here; it runs on every `pnpm sync` and leaves files it already patched alone.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const manifest = "android/app/src/main/AndroidManifest.xml";
if (existsSync(manifest)) {
  const xml = readFileSync(manifest, "utf8");
  if (!xml.includes("android:screenOrientation")) {
    writeFileSync(manifest, xml.replace(/<activity\b/, '<activity android:screenOrientation="sensorLandscape"'));
    console.log(`landscape: patched ${manifest}`);
  }
}

const plist = "ios/App/App/Info.plist";
if (existsSync(plist)) {
  const xml = readFileSync(plist, "utf8");
  const landscape = "<array>\n\t\t<string>UIInterfaceOrientationLandscapeLeft</string>\n\t\t<string>UIInterfaceOrientationLandscapeRight</string>\n\t</array>";
  const out = xml.replace(/(<key>UISupportedInterfaceOrientations(?:~ipad)?<\/key>\s*)<array>[\s\S]*?<\/array>/g, `$1${landscape}`);
  if (out !== xml) {
    writeFileSync(plist, out);
    console.log(`landscape: patched ${plist}`);
  }
}
