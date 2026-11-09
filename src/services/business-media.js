export async function coverImages(db, businesses) {
  const covers = await Promise.all(
    businesses.map(async (b) => {
      const { data, error } = await db
        .from("business_files")
        .select("path")
        .eq("business_id", b.id)
        .in("mime_type", ["image/jpeg", "image/png", "image/webp"])
        .order("created_at")
        .limit(1);
      return !error && data?.[0] ? { id: b.id, path: data[0].path } : null;
    }),
  );
  const available = covers.filter(Boolean);
  if (!available.length) return new Map();
  const { data, error } = await db.storage
    .from("business-files")
    .createSignedUrls(
      available.map((f) => f.path),
      900,
    );
  if (error) return new Map();
  return new Map(
    available
      .map((f, i) => [f.id, data?.[i]?.signedUrl])
      .filter(([, url]) => url),
  );
}
export function ratingText(rating, count) {
  return Number(count) > 0
    ? `${Number(rating).toFixed(1)} (${Number(count)} reviews)`
    : "No reviews yet";
}
