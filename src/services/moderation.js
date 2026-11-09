import { checked } from "../utils/query.js";
export const contentTypes = [
  { table: "businesses", label: "Businesses", permission: "listings.manage" },
  { table: "reviews", label: "Reviews", permission: "content.manage" },
  { table: "topics", label: "Topics", permission: "content.manage" },
  { table: "posts", label: "Replies", permission: "content.manage" },
  {
    table: "advertisements",
    label: "Advertisements",
    permission: "content.manage",
  },
];
export async function moderationAccess(db) {
  const [listings, content] = await Promise.all(
    ["listings.manage", "content.manage"].map((required) =>
      checked(db.rpc("has_permission", { required })),
    ),
  );
  return contentTypes.filter((type) =>
    type.permission === "listings.manage" ? listings : content,
  );
}
export async function pendingCounts(db, types) {
  return Promise.all(
    types.map(async (type) => {
      const { count, error } = await db
        .from(type.table)
        .select("id", { count: "exact", head: true })
        .eq("status", "pending");
      if (error) throw error;
      return { ...type, count: count || 0 };
    }),
  );
}
export function filterQueue(rows, search, order = "oldest") {
  const term = search.trim().toLowerCase();
  return rows
    .filter((r) =>
      [r.name, r.title, r.body, r.description, r.city, r.type.label].some((v) =>
        String(v || "")
          .toLowerCase()
          .includes(term),
      ),
    )
    .sort((a, b) =>
      order === "newest"
        ? Date.parse(b.created_at) - Date.parse(a.created_at)
        : Date.parse(a.created_at) - Date.parse(b.created_at),
    );
}
