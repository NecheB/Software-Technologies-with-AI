import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
import { session, checked } from "../services/session.js";
import { escapeHtml as e } from "../utils/html.js";
shell("Discussion");
const status = document.querySelector("#status"),
  id = new URLSearchParams(location.search).get("id");
let page = 0;
function postCard(post, original = false) {
  return `<article class="forum-post"><aside><div class="member-avatar" aria-hidden="true">${original ? "T" : "R"}</div><strong>${original ? "Topic starter" : "Community member"}</strong><span>${original ? "Original post" : "Reply"}</span></aside><div><div class="post-meta"><time datetime="${post.created_at}">${e(new Date(post.created_at).toLocaleString())}</time><span class="status-pill status-${post.status}">${post.status}</span></div><p class="detail-copy">${e(post.body)}</p></div></article>`;
}
async function replies() {
  try {
    const { data, error, count } = await requireClient()
      .from("posts")
      .select("*", { count: "exact" })
      .eq("topic_id", id)
      .order("created_at")
      .order("id")
      .range(page * 20, page * 20 + 19);
    if (error) throw error;
    document.querySelector("#posts").innerHTML =
      data.map((p) => postCard(p)).join("") ||
      '<div class="queue-empty"><p>No replies yet. Be the first to contribute.</p></div>';
    document.querySelector("#reply-total").textContent = `${count} replies`;
    document.querySelector("#previous").disabled = page === 0;
    document.querySelector("#next").disabled = (page + 1) * 20 >= count;
    document.querySelector("#page-number").textContent = `Page ${page + 1}`;
  } catch (error) {
    message(status, error.message, true);
  }
}
try {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Choose a discussion from the community forum.");
  const topic = await checked(
    requireClient().from("topics").select("*").eq("id", id).single(),
  );
  document.querySelector("#topic").innerHTML =
    `<h1 class="discussion-title">${e(topic.title)}</h1>` +
    postCard(topic, true);
  document.querySelector("#reply button").disabled =
    topic.status !== "approved";
  if (topic.status !== "approved")
    message(
      document.querySelector("#reply-status"),
      "Replies open when this discussion is approved.",
    );
  await replies();
} catch (error) {
  message(status, error.message, true);
}
document.querySelector("#previous").onclick = () => {
  page--;
  replies();
};
document.querySelector("#next").onclick = () => {
  page++;
  replies();
};
document.querySelector("#reply").onsubmit = async (event) => {
  event.preventDefault();
  const button = event.target.querySelector("button");
  button.disabled = true;
  try {
    const { db, user } = await session();
    const saved = await checked(
      db
        .from("posts")
        .insert({
          topic_id: id,
          author_id: user.id,
          body: event.target.elements.body.value,
        })
        .select("status")
        .single(),
    );
    event.target.reset();
    message(
      document.querySelector("#reply-status"),
      saved.status === "approved"
        ? "Published successfully."
        : "Reply submitted for review.",
    );
    window.dispatchEvent(new Event("borough:moderated"));
    await replies();
  } catch (error) {
    message(document.querySelector("#reply-status"), error.message, true);
  } finally {
    button.disabled = false;
  }
};
