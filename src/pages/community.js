import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
import { session, checked } from "../services/session.js";
import { escapeHtml as e } from "../utils/html.js";
shell("Community forum");
let page = 0,
  revision = 0;
const status = document.querySelector("#status");
async function load() {
  const current = ++revision;
  message(status, "Loading discussions...");
  document.querySelector("#previous").disabled = true;
  document.querySelector("#next").disabled = true;
  try {
    const db = requireClient();
    let query = db
      .from("topics")
      .select("id,title,status,created_at,posts(count)", { count: "exact" });
    const term = document.querySelector("#query").value.trim();
    if (term) query = query.ilike("title", `%${term}%`);
    if (document.querySelector("#scope").value === "mine") {
      const { user } = await session();
      query = query.eq("author_id", user.id);
    }
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (current !== revision) return;
    if (error) throw error;
    document.querySelector("#topics").innerHTML =
      data
        .map(
          (t) =>
            `<article class="forum-row"><div class="forum-topic"><span class="topic-symbol" aria-hidden="true">#</span><div><h3><a href="/topic.html?id=${t.id}">${e(t.title)}</a></h3><span class="status-pill status-${t.status}">${t.status === "approved" ? "Open discussion" : t.status}</span></div></div><div class="reply-count"><strong>${t.posts?.[0]?.count || 0}</strong><small>replies</small></div><time datetime="${t.created_at}">${e(new Date(t.created_at).toLocaleDateString())}</time></article>`,
        )
        .join("") ||
      '<div class="queue-empty"><h2>No discussions found.</h2><p>Start the first conversation or try another search.</p></div>';
    document.querySelector("#topic-count").textContent = `${count} discussions`;
    document.querySelector("#page-number").textContent = `Page ${page + 1}`;
    document.querySelector("#previous").disabled = page === 0;
    document.querySelector("#next").disabled = (page + 1) * 20 >= count;
    message(status, "");
  } catch (error) {
    if (current === revision) message(status, error.message, true);
  }
}
document.querySelector("#forum-search").onsubmit = (event) => {
  event.preventDefault();
  page = 0;
  load();
};
document.querySelector("#scope").onchange = () => {
  page = 0;
  load();
};
document.querySelector("#previous").onclick = () => {
  page--;
  load();
};
document.querySelector("#next").onclick = () => {
  page++;
  load();
};
document.querySelector("#compose").onsubmit = async (event) => {
  event.preventDefault();
  const form = event.target,
    button = form.querySelector("button"),
    notice = document.querySelector("#compose-status");
  button.disabled = true;
  try {
    const { db, user } = await session();
    const saved = await checked(
      db
        .from("topics")
        .insert({
          ...Object.fromEntries(new FormData(form)),
          author_id: user.id,
        })
        .select("status")
        .single(),
    );
    form.reset();
    message(
      notice,
      saved.status === "approved"
        ? "Published successfully."
        : "Your discussion was submitted for review. You can track it under My discussions.",
    );
    window.dispatchEvent(new Event("borough:moderated"));
    page = 0;
    await load();
  } catch (error) {
    message(notice, error.message, true);
  } finally {
    button.disabled = false;
  }
};
load();
