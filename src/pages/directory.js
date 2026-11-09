import { coverImages, ratingText } from "../services/business-media.js";
import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
import { escapeHtml } from "../utils/html.js";
shell("Explore places");
const form = document.querySelector("#search");
const results = document.querySelector("#results");
const status = document.querySelector("#status");
let page = 0;
let request = 0;
async function search() {
  const current = ++request;
  message(status, "Finding local places...");
  document.querySelector("#previous").disabled = true;
  document.querySelector("#next").disabled = true;
  results.innerHTML =
    '<div class="directory-loading"><i class="bi bi-compass"></i><p>Finding your next favourite...</p></div>';
  try {
    const db = requireClient();
    const data = new FormData(form);
    let query = db
      .from("directory_entries")
      .select("*", { count: "exact" })
      .eq("status", "approved");
    const term = data.get("q").trim();
    if (term)
      query = query.textSearch("search_vector", term, {
        type: "websearch",
        config: "english",
      });
    if (data.get("category")) {
      const children = await db
        .from("categories")
        .select("id")
        .eq("parent_id", data.get("category"));
      if (children.error) throw children.error;
      query = query.in("category_id", [
        data.get("category"),
        ...children.data.map((c) => c.id),
      ]);
    }
    if (data.get("city").trim())
      query = query.ilike("city", data.get("city").trim());
    if (data.get("price"))
      query = query.eq("price_level", Number(data.get("price")));
    if (data.get("rating"))
      query = query.gte("average_rating", Number(data.get("rating")));
    query = query
      .order(
        { name: "name", rating: "average_rating", newest: "created_at" }[
          data.get("sort")
        ] || "created_at",
        { ascending: data.get("sort") === "name" },
      )
      .order("id")
      .range(page * 12, page * 12 + 11);
    const { data: rows, error, count } = await query;
    if (current !== request) return;
    if (error) throw error;
    results.innerHTML =
      rows
        .map(
          (row) =>
            `<article class="business-card"><a class="business-cover cover-${Number(row.price_level)}" href="/business.html?id=${encodeURIComponent(row.id)}" aria-label="View ${escapeHtml(row.name)}"><div class="cover-placeholder"><i class="bi bi-shop-window" aria-hidden="true"></i><span>${escapeHtml(row.name)}</span><small>Discover this local business</small></div><span class="business-category">${escapeHtml(row.category_name || "Local business")}</span><span class="cover-arrow"><i class="bi bi-arrow-up-right"></i></span></a><div class="business-card-copy"><div class="business-card-meta"><span><i class="bi bi-geo-alt"></i> ${escapeHtml(row.city)}</span><span>${"&#163;".repeat(row.price_level)}</span></div><h3><a href="/business.html?id=${encodeURIComponent(row.id)}">${escapeHtml(row.name)}</a></h3><p>${escapeHtml(row.tagline || row.description.slice(0, 120))}</p><div class="business-card-bottom"><span><i class="bi bi-star-fill"></i> ${ratingText(row.average_rating, row.review_count)}</span><a href="/business.html?id=${encodeURIComponent(row.id)}">Explore <i class="bi bi-arrow-right"></i></a></div></div></article>`,
        )
        .join("") ||
      '<div class="directory-empty"><i class="bi bi-search"></i><h3>No places found just yet.</h3><p>Try another town, a broader category or clear the filters.</p></div>';
    document.querySelector("#page-number").textContent = `Page ${page + 1}`;
    coverImages(db, rows)
      .then((covers) => {
        if (current !== request) return;
        for (const [id, url] of covers) {
          const card = results.querySelector(
            `a.business-cover[href="/business.html?id=${id}"]`,
          );
          if (!card) continue;
          const img = document.createElement("img");
          img.alt =
            rows.find((r) => r.id === id)?.name || "Business photograph";
          img.loading = "lazy";
          img.onload = () => card.classList.add("has-photo");
          img.onerror = () => img.remove();
          img.src = url;
          card.prepend(img);
        }
      })
      .catch(() => {});
    message(
      status,
      count
        ? `${count} places · Page ${page + 1}`
        : "No places found. Try a different search.",
    );
    document.querySelector("#previous").disabled = page === 0;
    document.querySelector("#next").disabled = (page + 1) * 12 >= count;
  } catch (error) {
    if (current === request) message(status, error.message, true);
  }
}
const params = new URLSearchParams(location.search);
for (const name of ["q", "city", "price", "rating", "sort"])
  if (params.has(name)) form.elements[name].value = params.get(name);
form.addEventListener("submit", (event) => {
  event.preventDefault();
  page = 0;
  history.replaceState(null, "", `?${new URLSearchParams(new FormData(form))}`);
  search();
});
document.querySelector("#previous").onclick = () => {
  page = Math.max(0, page - 1);
  search();
};
document.querySelector("#next").onclick = () => {
  page++;
  search();
};
try {
  const { data, error } = await requireClient()
    .from("categories")
    .select("id,name")
    .order("name");
  if (error) throw error;
  for (const item of data)
    form.elements.category.add(new Option(item.name, item.id));
  if (params.has("category"))
    form.elements.category.value = params.get("category");
} catch (error) {
  message(status, error.message, true);
}
search();

document.querySelector("#clear").onclick = () => {
  form.reset();
  page = 0;
  history.replaceState(null, "", location.pathname);
  search();
};
document.querySelector("#sort").onchange = () => form.requestSubmit();
for (const name of ["category", "price", "rating"])
  form.elements[name].onchange = () => form.requestSubmit();
