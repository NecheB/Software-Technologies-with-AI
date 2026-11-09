import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { fields, values } from "../components/forms.js";
import { moderationAccess } from "../services/moderation.js";
import { escapeHtml as e } from "../utils/html.js";
shell("My account");
const status = document.querySelector("#status");
try {
  const { db, user } = await session();
  const [profile, role, types] = await Promise.all([
    checked(db.from("profiles").select("*").eq("id", user.id).single()),
    checked(
      db.from("user_roles").select("role").eq("user_id", user.id).single(),
    ),
    moderationAccess(db),
  ]);
  document.querySelector("#account-content").hidden = false;
  message(status, "");
  document.querySelector("#identity").textContent = user.email;
  document.querySelector("#role").textContent = role.role;
  document.querySelector("#account-staff").hidden = !types.length;
  function greeting(name) {
    document.querySelector("#welcome").textContent = name
      ? `Welcome back, ${name.split(" ")[0]}.`
      : "Welcome to your neighbourhood.";
    document.querySelector("#avatar").textContent = (name || user.email)
      .slice(0, 2)
      .toUpperCase();
  }
  greeting(profile.full_name);
  const form = document.querySelector("#profile-form");
  form.innerHTML =
    fields(
      [
        ["full_name", "Full name", "text", false],
        ["bio", "About you", "textarea", false],
        ["phone", "Phone", "tel", false],
        ["city", "Town or city", "text", false],
      ],
      profile,
    ) + '<button class="btn btn-dark mt-4">Save profile</button>';
  for (const [name, max] of [
    ["full_name", 100],
    ["bio", 2000],
    ["phone", 40],
    ["city", 100],
  ])
    form.elements[name].maxLength = max;
  form.onsubmit = async (event) => {
    event.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const data = values(form);
      await checked(
        db
          .from("profiles")
          .update(data)
          .eq("id", user.id)
          .select("id")
          .single(),
      );
      greeting(data.full_name);
      message(
        document.querySelector("#profile-status"),
        "Your profile has been saved.",
      );
    } catch (error) {
      message(document.querySelector("#profile-status"), error.message, true);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector("#logout").onclick = async () => {
    try {
      await checked(db.auth.signOut());
      location.assign("/");
    } catch (error) {
      message(status, error.message, true);
    }
  };
  const [businesses, topics, reviews] = await Promise.all([
    db
      .from("businesses")
      .select("id,name,status,moderation_note", { count: "exact" })
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("topics")
      .select("id,title,status,moderation_note", { count: "exact" })
      .eq("author_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    db
      .from("reviews")
      .select("id", { count: "exact", head: true })
      .eq("author_id", user.id),
  ]);
  for (const r of [businesses, topics, reviews]) if (r.error) throw r.error;
  document.querySelector("#account-stats").innerHTML = [
    ["Businesses", businesses.count, "/owner.html"],
    ["Discussions", topics.count, "/community.html"],
    ["Reviews", reviews.count, "/directory.html"],
  ]
    .map(
      ([label, count, url]) =>
        `<a class="summary-card" href="${url}"><span>${label}</span><strong>${count || 0}</strong><small>Explore and manage</small></a>`,
    )
    .join("");
  document.querySelector("#my-listings").innerHTML =
    businesses.data
      .map(
        (b) =>
          `<div class="account-item"><div><a href="/editor.html?id=${b.id}">${e(b.name)}</a><p>${e(b.moderation_note || "")}</p></div><span class="status-pill status-${b.status}">${b.status}</span></div>`,
      )
      .join("") ||
    '<p class="status">Your first listing starts here. Introduce your business to the neighbourhood.</p>';
  document.querySelector("#my-topics").innerHTML =
    topics.data
      .map(
        (t) =>
          `<div class="account-item"><div><a href="/topic.html?id=${t.id}">${e(t.title)}</a><p>${e(t.moderation_note || "")}</p></div><span class="status-pill status-${t.status}">${t.status}</span></div>`,
      )
      .join("") ||
    '<p class="status">No discussions yet. Ask a question or share something local.</p>';
} catch (error) {
  message(status, error.message, true);
}
