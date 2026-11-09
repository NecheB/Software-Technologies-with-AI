import { shell, message } from "../components/shell.js";
import { requireClient } from "../services/client.js";
import { session, checked } from "../services/session.js";
import { escapeHtml as e, safeUrl } from "../utils/html.js";
import { downloadFile } from "../services/files.js";
import { ratingText } from "../services/business-media.js";
shell("Local business");
const target = document.querySelector("#detail"),
  id = new URLSearchParams(location.search).get("id");
try {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("Choose a business from the directory.");
  const db = requireClient();
  const b = await checked(
    db.from("directory_entries").select("*").eq("id", id).maybeSingle(),
  );
  if (!b) throw new Error("This business is not currently published.");
  document.title = `${b.name} - Borough`;
  const address = [b.address, b.city, b.postcode].filter(Boolean).join(", ");
  const website = safeUrl(b.website);
  const phone = b.phone.replace(/[^+0-9]/g, "");
  target.innerHTML = `<section class="business-titlebar"><div><span class="business-type">${e(b.category_name)}</span><h1>${e(b.name)}</h1><p>${e(b.tagline)}</p><div class="business-facts"><span><i class="bi bi-geo-alt"></i> ${e(b.city)}</span><span><i class="bi bi-star-fill"></i> ${ratingText(b.average_rating, b.review_count)}</span><span>${"&#163;".repeat(b.price_level)}</span></div></div><a class="btn btn-dark" href="#visit">Plan your visit <i class="bi bi-arrow-down-right"></i></a></section><section id="gallery" class="business-gallery" aria-label="Business photos"><div class="business-gallery-placeholder"><i class="bi bi-shop-window"></i><div><strong>${e(b.name)}</strong><span>Part of your neighbourhood.</span></div><small>No photographs added yet</small></div></section><nav class="business-section-nav" aria-label="Business sections"><a href="#about">About</a><a href="#offers">Local offers</a><a href="#reviews">Reviews</a><a href="#downloads">Photos &amp; documents</a></nav><div class="business-detail-layout"><div><section id="about" class="business-section"><p class="eyebrow">GET TO KNOW US</p><h2>A little about ${e(b.name)}.</h2><p class="detail-copy business-description">${e(b.description)}</p>${b.amenities.length ? `<h3>What you will find here</h3><div class="amenity-list">${b.amenities.map((a) => `<span><i class="bi bi-check2"></i>${e(a)}</span>`).join("")}</div>` : ""}</section><section id="offers" class="business-section"><div class="business-section-heading"><h2>Something special.</h2><span>Local offers</span></div><div id="offers-list"><p class="text-muted">Loading offers...</p></div></section><section id="reviews" class="business-section"><div class="business-section-heading"><h2>From the neighbourhood.</h2><span>${ratingText(b.average_rating, b.review_count)}</span></div><div id="review-list"></div><div class="forum-pagination"><button id="reviews-prev" class="btn btn-sm btn-outline-dark" disabled>Previous</button><span id="review-page">Page 1</span><button id="reviews-next" class="btn btn-sm btn-outline-dark" disabled>Next</button></div><details class="review-composer"><summary><i class="bi bi-pencil-square"></i> Share your experience</summary><form id="review-form"><p>Sign in to leave one review for this business. Reviews are checked before publication.</p><label class="form-label" for="rating">Your rating</label><select id="rating" name="rating" class="form-select">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}">${n} stars</option>`).join("")}</select><label class="form-label" for="body">Your review</label><textarea class="form-control" name="body" id="body" rows="4" minlength="10" maxlength="3000" required></textarea><button class="btn btn-dark mt-3">Submit review</button><p id="review-status" role="status"></p></form></details></section><section id="downloads" class="business-section"><h2>Take a closer look.</h2><p>Photos, menus, catalogues and other useful details.</p><div id="file-list"></div><p id="file-status" role="status"></p></section></div><aside id="visit" class="visit-panel"><span class="eyebrow">COME SAY HELLO</span><h2>Plan your visit.</h2><div class="visit-item"><i class="bi bi-geo-alt"></i><div><small>Find us</small><p>${e(address)}</p><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}" target="_blank" rel="noopener noreferrer">Get directions <i class="bi bi-arrow-up-right"></i></a></div></div><div class="visit-item"><i class="bi bi-clock"></i><div><small>Opening hours</small><p class="detail-copy">${e(b.opening_hours || "Contact the business for opening times.")}</p></div></div>${phone ? `<a class="visit-contact" href="tel:${phone}"><i class="bi bi-telephone"></i>${e(b.phone)}</a>` : ""}${b.email ? `<a class="visit-contact" href="mailto:${e(encodeURIComponent(b.email))}"><i class="bi bi-envelope"></i>${e(b.email)}</a>` : ""}${website ? `<a class="btn btn-dark w-100 mt-3" href="${e(website)}" target="_blank" rel="noopener noreferrer">Visit website <i class="bi bi-arrow-up-right"></i></a>` : ""}<div class="visit-footnote"><i class="bi bi-heart"></i> A little local support goes a long way.</div></aside></div>`;
  let reviewPage = 0;
  async function reviews() {
    try {
      const { data, error, count } = await db
        .from("reviews")
        .select("rating,body,created_at", { count: "exact" })
        .eq("business_id", id)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .order("id")
        .range(reviewPage * 10, reviewPage * 10 + 9);
      if (error) throw error;
      document.querySelector("#review-list").innerHTML =
        data
          .map(
            (r) =>
              `<article class="public-review"><div><span aria-label="${r.rating} out of 5 stars">${'<i class="bi bi-star-fill"></i>'.repeat(r.rating)}${'<i class="bi bi-star"></i>'.repeat(5 - r.rating)}</span><time>${e(new Date(r.created_at).toLocaleDateString())}</time></div><p>${e(r.body)}</p></article>`,
          )
          .join("") ||
        '<div class="subtle-empty"><i class="bi bi-chat-heart"></i><p>No reviews yet. Your experience could help a neighbour.</p></div>';
      document.querySelector("#reviews-prev").disabled = reviewPage === 0;
      document.querySelector("#reviews-next").disabled =
        (reviewPage + 1) * 10 >= count;
      document.querySelector("#review-page").textContent =
        `Page ${reviewPage + 1}`;
    } catch (error) {
      message(document.querySelector("#review-list"), error.message, true);
    }
  }
  document.querySelector("#reviews-prev").onclick = () => {
    reviewPage--;
    reviews();
  };
  document.querySelector("#reviews-next").onclick = () => {
    reviewPage++;
    reviews();
  };
  document.querySelector("#review-form").onsubmit = async (event) => {
    event.preventDefault();
    const form = event.target,
      button = form.querySelector("button");
    button.disabled = true;
    try {
      const { user } = await session();
      const saved = await checked(
        db
          .from("reviews")
          .insert({
            business_id: id,
            author_id: user.id,
            rating: Number(form.elements.rating.value),
            body: form.elements.body.value,
          })
          .select("status")
          .single(),
      );
      form.reset();
      message(
        document.querySelector("#review-status"),
        saved.status === "approved"
          ? "Your review is published."
          : "Review submitted for approval.",
      );
      await reviews();
    } catch (error) {
      message(document.querySelector("#review-status"), error.message, true);
    } finally {
      button.disabled = false;
    }
  };
  async function media() {
    try {
      const files = await checked(
        db
          .from("business_files")
          .select("name,path,mime_type")
          .eq("business_id", id)
          .order("created_at"),
      );
      const pictures = files.filter((f) => f.mime_type.startsWith("image/"));
      if (pictures.length) {
        const { data, error } = await db.storage
          .from("business-files")
          .createSignedUrls(
            pictures.map((f) => f.path),
            900,
          );
        if (error) throw error;
        const photos = pictures
          .map((f, i) => ({ ...f, url: data[i]?.signedUrl }))
          .filter((f) => f.url);
        if (photos.length) {
          const gallery = document.querySelector("#gallery");
          gallery.innerHTML =
            '<div class="gallery-stage"><img id="gallery-main" alt=""></div><div class="gallery-thumbnails" aria-label="Choose a photograph"></div>';
          const main = document.querySelector("#gallery-main");
          main.src = photos[0].url;
          main.alt = photos[0].name;
          for (const [i, photo] of photos.entries()) {
            const button = document.createElement("button");
            button.className = "gallery-thumb";
            button.type = "button";
            button.setAttribute(
              "aria-label",
              `View photo ${i + 1}: ${photo.name}`,
            );
            button.setAttribute("aria-pressed", String(i === 0));
            const img = document.createElement("img");
            img.src = photo.url;
            img.alt = "";
            img.loading = "lazy";
            button.append(img);
            button.onclick = () => {
              main.src = photo.url;
              main.alt = photo.name;
              gallery
                .querySelectorAll("button")
                .forEach((b) =>
                  b.setAttribute("aria-pressed", String(b === button)),
                );
            };
            gallery.querySelector(".gallery-thumbnails").append(button);
          }
        }
      }
      const list = document.querySelector("#file-list");
      list.replaceChildren();
      for (const f of files) {
        const button = document.createElement("button");
        button.className = "download-tile";
        const icon = document.createElement("i");
        icon.className = f.mime_type.startsWith("image/")
          ? "bi bi-image"
          : "bi bi-file-earmark-pdf";
        const label = document.createElement("span");
        label.textContent = f.name;
        const download = document.createElement("i");
        download.className = "bi bi-download";
        button.append(icon, label, download);
        button.onclick = async () => {
          try {
            await downloadFile(db, f.path);
          } catch (error) {
            message(
              document.querySelector("#file-status"),
              error.message,
              true,
            );
          }
        };
        list.append(button);
      }
      if (!files.length)
        list.innerHTML = '<p class="text-muted">No files shared yet.</p>';
    } catch (error) {
      message(
        document.querySelector("#file-status"),
        "Photos or documents are temporarily unavailable. " + error.message,
        true,
      );
    }
  }
  async function offers() {
    try {
      const ads = await checked(
        db
          .from("advertisements")
          .select("title,body,ends_at")
          .eq("business_id", id)
          .eq("status", "approved")
          .lte("starts_at", new Date().toISOString())
          .gt("ends_at", new Date().toISOString()),
      );
      document.querySelector("#offers-list").innerHTML =
        ads
          .map(
            (a) =>
              `<article class="public-offer"><span class="offer-tag"><i class="bi bi-ticket-perforated"></i> LOCAL OFFER</span><h3>${e(a.title)}</h3><p>${e(a.body)}</p><small>Available until ${e(new Date(a.ends_at).toLocaleDateString())}</small></article>`,
          )
          .join("") ||
        '<p class="text-muted">No current offers. Check back for something new.</p>';
    } catch (error) {
      message(document.querySelector("#offers-list"), error.message, true);
    }
  }
  await Promise.all([reviews(), media(), offers()]);
} catch (error) {
  target.innerHTML =
    '<div class="directory-empty"><i class="bi bi-shop"></i><h2>This door is not open yet.</h2><p></p><a class="btn btn-dark" href="/directory.html">Back to the directory</a></div>';
  target.querySelector("p").textContent = error.message;
}
