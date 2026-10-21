// The save folder (domain/saves SAVE-144): files named as in the cloud,
// written through a .tmp file, listed by their header only.
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { isSavePath, saveFolder } from "../src/saves.mjs";

/** A minimal `.phsave`: magic, container version, header length, header JSON, then a body. */
function save(header, body = "chunks") {
  const json = Buffer.from(JSON.stringify(header));
  const prefix = Buffer.alloc(10);
  prefix.write("PHSV", 0, "latin1");
  prefix.writeUInt16LE(1, 4);
  prefix.writeUInt32LE(json.length, 6);
  return new Uint8Array(Buffer.concat([prefix, json, Buffer.from(body)]));
}

const folder = async () => saveFolder(await mkdtemp(join(tmpdir(), "ph-saves-")));

test("a save is written under its cloud name and read back", async () => {
  const f = await folder();
  const bytes = save({ saveId: "s1" });
  await f.commit("c1/1700000000000-s1.phsave", bytes, []);
  assert.deepEqual(await readdir(join(f.root, "c1")), ["1700000000000-s1.phsave"]);
  assert.deepEqual(await f.read("c1/1700000000000-s1.phsave"), bytes);
  assert.equal(await f.read("c1/1700000000001-none.phsave"), undefined);
});

test("listing reads only the header", async () => {
  const f = await folder();
  const bytes = save({ saveId: "s1", name: "Castile" }, "x".repeat(5000));
  await f.commit("c1/1-s1.phsave", bytes, []);
  const [entry, ...rest] = await f.list();
  assert.equal(rest.length, 0);
  assert.equal(entry.path, "c1/1-s1.phsave");
  assert.equal(JSON.parse(Buffer.from(entry.head.subarray(10)).toString()).name, "Castile");
  assert.ok(entry.head.length < bytes.length);
});

test("the saves a write replaces go only after the new file is in place", async () => {
  const f = await folder();
  await f.commit("c1/1-old.phsave", save({ saveId: "old" }), []);
  await f.commit("c1/2-new.phsave", save({ saveId: "new" }), ["c1/1-old.phsave"]);
  assert.deepEqual((await f.list()).map((e) => e.path), ["c1/2-new.phsave"]);
  assert.deepEqual(await readdir(join(f.root, "c1")), ["2-new.phsave"], "no .tmp file is left behind");
});

test("files that are not saves are left alone and not listed", async () => {
  const f = await folder();
  await mkdir(join(f.root, "c1"), { recursive: true });
  await writeFile(join(f.root, "c1", "3-cut.phsave"), "PHSV");
  await writeFile(join(f.root, "c1", "4-other.phsave"), "not a save at all");
  await writeFile(join(f.root, "c1", "5-s5.phsave.tmp"), save({}));
  await writeFile(join(f.root, "notes.txt"), "hello");
  assert.deepEqual(await f.list(), []);
  assert.equal(await readFile(join(f.root, "notes.txt"), "utf8"), "hello");
});

test("a missing folder lists nothing", async () => {
  const f = saveFolder(join(tmpdir(), `ph-none-${process.pid}-${Date.now()}`));
  assert.deepEqual(await f.list(), []);
});

test("only save names reach the disk", async () => {
  const f = await folder();
  for (const bad of ["../escape.phsave", "c1/../../x.phsave", "/etc/passwd", "c1/1-s1.txt", "c1/x/1-s1.phsave", "", 7]) {
    assert.equal(isSavePath(bad), false, String(bad));
    await assert.rejects(() => f.commit(bad, save({}), []));
    await assert.rejects(() => f.read(bad));
    await assert.rejects(() => f.remove(bad));
  }
  await assert.rejects(() => f.commit("c1/1-s1.phsave", save({}), ["../../x.phsave"]));
});

test("remove deletes one save and forgives a missing one", async () => {
  const f = await folder();
  await f.commit("c1/1-s1.phsave", save({}), []);
  await f.remove("c1/1-s1.phsave");
  await f.remove("c1/1-s1.phsave");
  assert.deepEqual(await f.list(), []);
});
