import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
import { session, checked } from "../services/session.js";
import { escapeHtml } from "../utils/html.js";
shell("Community");
const status = document.querySelector("#status");
async function load() {
  try {
    const rows = await checked(
      requireClient()
        .from("topics")
        .select("id,title,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    );
    document.querySelector("#topics").innerHTML =
      rows
        .map(
          (t) =>
            `<article class="card mb-3"><h2><a href="/topic.html?id=${t.id}">${escapeHtml(t.title)}</a></h2><p>${escapeHtml(t.status)}</p></article>`,
        )
        .join("") || "<p>No conversations yet.</p>";
  } catch (error) {
    message(status, error.message, true);
  }
}
document.querySelector("form").onsubmit = async (e) => {
  e.preventDefault();
  try {
    const { db, user } = await session();
    await checked(
      db
        .from("topics")
        .insert({
          ...Object.fromEntries(new FormData(e.target)),
          author_id: user.id,
        }),
    );
    e.target.reset();
    message(status, "Topic submitted for review.");
    await load();
  } catch (error) {
    message(status, error.message, true);
  }
};
load();
