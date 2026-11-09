import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moderationAccess,
  filterQueue,
  pendingCounts,
} from "../src/services/moderation.js";
test("moderation entry respects individual permissions", async () => {
  const db = {
    rpc: async (_, args) => ({
      data: args.required === "listings.manage",
      error: null,
    }),
  };
  assert.deepEqual(
    (await moderationAccess(db)).map((t) => t.table),
    ["businesses"],
  );
  db.rpc = async () => ({ data: false, error: null });
  assert.deepEqual(await moderationAccess(db), []);
});
test("combined queue search is case insensitive and chronological", () => {
  const rows = [
    {
      title: "Coffee question",
      created_at: "2026-11-09",
      type: { label: "Topics" },
    },
    {
      name: "RoyalCraft",
      city: "London",
      created_at: "2026-11-08",
      type: { label: "Businesses" },
    },
  ];
  assert.equal(filterQueue(rows, "LONDON")[0].name, "RoyalCraft");
  assert.equal(filterQueue(rows, "", "oldest")[0].name, "RoyalCraft");
  assert.equal(filterQueue(rows, "", "newest")[0].title, "Coffee question");
  assert.equal(filterQueue(rows, "absent").length, 0);
});
test("notification counts propagate errors rather than pretending zero", async () => {
  const db = {
    from: () => ({
      select: () => ({
        eq: async () => ({ count: null, error: new Error("Unavailable") }),
      }),
    }),
  };
  await assert.rejects(pendingCounts(db, [{ table: "topics" }]), /Unavailable/);
});
