import { checked } from "./session.js";
export async function uploadFile(db, user, business, file) {
  const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
  if (!allowed.includes(file.type) || !file.size || file.size > 10485760)
    throw new Error("Choose a JPG, PNG, WebP or PDF up to 10 MB.");
  const path = `${user.id}/${business}/${crypto.randomUUID()}`;
  await checked(
    db.storage
      .from("business-files")
      .upload(path, file, { contentType: file.type }),
  );
  try {
    await checked(
      db
        .from("business_files")
        .insert({
          business_id: business,
          uploaded_by: user.id,
          path,
          name: file.name,
          mime_type: file.type,
          size_bytes: file.size,
        }),
    );
  } catch (error) {
    await db.storage.from("business-files").remove([path]);
    throw error;
  }
}
export async function downloadFile(db, path) {
  const data = await checked(
    db.storage
      .from("business-files")
      .createSignedUrl(path, 60, { download: true }),
  );
  location.assign(data.signedUrl);
}
