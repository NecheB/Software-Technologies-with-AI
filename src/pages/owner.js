import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { escapeHtml } from "../utils/html.js";
shell("My businesses");
const target = document.querySelector("#list");
try {
  const { db, user } = await session();
  const rows = await checked(
    db
      .from("businesses")
      .select("id,name,status,moderation_note")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false }),
  );
  target.innerHTML = rows.length
    ? rows
        .map(
          (b) =>
            `<article class="card mb-3"><h2>${escapeHtml(b.name)}</h2><p>${escapeHtml(b.status)} · ${escapeHtml(b.moderation_note)}</p><a href="/editor.html?id=${b.id}">Edit listing and files ↗</a></article>`,
        )
        .join("")
    : "No listings yet. Add your first business.";
} catch (error) {
  message(target, error.message, true);
}
