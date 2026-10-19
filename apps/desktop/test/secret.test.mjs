// The device token in safeStorage (domain/saves SAVE-143), and the product
// name that makes the userData folder Auto-Cloud names (SAVE-145).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { secretFile } from "../src/secret.mjs";

const fakeSafeStorage = (available) => ({
  isEncryptionAvailable: () => available,
  encryptString: (s) => Buffer.from([...Buffer.from(s)].map((b) => b ^ 0x5a)),
  decryptString: (b) => Buffer.from([...b].map((x) => x ^ 0x5a)).toString(),
});

test("the token is kept encrypted and read back", () => {
  const file = join(mkdtempSync(join(tmpdir(), "ph-secret-")), "device-token.bin");
  const s = secretFile(file, fakeSafeStorage(true));
  assert.equal(s.get(), undefined);
  assert.equal(s.set('{"deviceToken":"abc"}'), true);
  assert.ok(!readFileSync(file).toString().includes("abc"), "not in plain text");
  assert.equal(s.get(), '{"deviceToken":"abc"}');
  assert.equal(s.set(undefined), true);
  assert.equal(s.get(), undefined);
});

test("where safeStorage cannot encrypt, nothing is written and the game keeps web storage", () => {
  const file = join(mkdtempSync(join(tmpdir(), "ph-secret-")), "device-token.bin");
  const s = secretFile(file, fakeSafeStorage(false));
  assert.equal(s.usable(), false);
  assert.equal(s.set("token"), false);
  assert.equal(s.get(), undefined);
});

test("the app's product name is the folder Auto-Cloud syncs", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const saves = JSON.parse(readFileSync(new URL("../../../packages/rules/data/domain/saves.json", import.meta.url), "utf8"));
  const steam = saves.cloud.store_backups.steam;
  assert.equal(pkg.productName, steam.product_name);
  assert.equal(steam.partner_site.subdirectory, `${pkg.productName}/saves`);
});
