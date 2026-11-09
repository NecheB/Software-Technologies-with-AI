import { shell, message } from "../components/shell.js";
import { session, checked } from "../services/session.js";
import { fields, values } from "../components/forms.js";
import { escapeHtml } from "../utils/html.js";
import { uploadFile, downloadFile } from "../services/files.js";
shell("Business editor");
const form = document.querySelector("#editor"),
  status = document.querySelector("#status");
let id = new URLSearchParams(location.search).get("id");
try {
  const { db, user } = await session();
  const b = id
    ? await checked(db.from("businesses").select("*").eq("id", id).single())
    : { price_level: 2 };
  const categories = await checked(
    db.from("categories").select("id,name").order("name"),
  );
  form.innerHTML =
    fields(
      [
        ["name", "Business name"],
        ["tagline", "Short introduction", "text", false],
        ["description", "Description (at least 30 characters)", "textarea"],
        ["email", "Contact email", "email"],
        ["phone", "Phone", "tel", false],
        ["website", "Website", "url", false],
        ["address", "Street address"],
        ["city", "Town or city"],
        ["postcode", "Postcode", "text", false],
        ["opening_hours", "Opening hours", "textarea", false],
        ["amenities", "Amenities (comma separated)", "text", false],
      ],
      { ...b, amenities: b.amenities?.join(", ") },
    ) +
    `<label for="category_id" class="form-label">Category</label><select class="form-select" name="category_id" id="category_id" required>${categories.map((c) => `<option value="${c.id}" ${c.id === b.category_id ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}</select><label for="price_level" class="form-label">Price level (1-4)</label><input class="form-control" type="number" min="1" max="4" name="price_level" id="price_level" value="${b.price_level}"><button class="btn btn-dark mt-4">Save business</button>`;
  const groups = [
    [
      "Business essentials",
      "The name and story people will discover.",
      ["name", "tagline", "description", "category_id"],
    ],
    [
      "Contact and location",
      "Make it easy for your neighbours to find you.",
      ["email", "phone", "website", "address", "city", "postcode"],
    ],
    [
      "Plan a visit",
      "Useful details before someone walks through the door.",
      ["opening_hours", "amenities", "price_level"],
    ],
  ];
  const submit = form.querySelector("button");
  for (const [title, description, names] of groups) {
    const section = document.createElement("section");
    section.className = "editor-section surface";
    const heading = document.createElement("div");
    heading.className = "surface-heading";
    heading.innerHTML = `<div><h2>${title}</h2><p>${description}</p></div>`;
    section.append(heading);
    const grid = document.createElement("div");
    grid.className = "field-grid";
    for (const name of names) {
      const input = form.elements[name];
      if (!input) continue;
      const label = form.querySelector(`label[for="${name}"]`);
      const field = document.createElement("div");
      field.className = ["description", "opening_hours"].includes(name)
        ? "field-wide"
        : "";
      if (label) field.append(label);
      field.append(input);
      grid.append(field);
    }
    section.append(grid);
    form.append(section);
  }
  form.append(submit);
  submit.classList.add("editor-save");
  form.onsubmit = async (e) => {
    e.preventDefault();
    const button = form.querySelector("button");
    button.disabled = true;
    try {
      const data = values(form);
      data.price_level = Number(data.price_level);
      data.amenities = data.amenities
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (data.description.length < 30)
        throw new Error(
          "Please describe your business in at least 30 characters.",
        );
      if (id)
        await checked(
          db.from("businesses").update(data).eq("id", id).select("id").single(),
        );
      else {
        id = (
          await checked(
            db
              .from("businesses")
              .insert({ ...data, owner_id: user.id })
              .select("id")
              .single(),
          )
        ).id;
        history.replaceState(null, "", `?id=${id}`);
      }
      const saved = await checked(
        db.from("businesses").select("status").eq("id", id).single(),
      );
      message(
        status,
        saved.status === "approved"
          ? "Saved and published."
          : "Saved and submitted for review.",
      );
      await loadFiles();
    } catch (error) {
      message(status, error.message, true);
    } finally {
      button.disabled = false;
    }
  };
  async function loadFiles() {
    document.querySelector("#file-section").hidden = !id;
    if (!id) return;
    const rows = await checked(
      db.from("business_files").select("*").eq("business_id", id),
    );
    const list = document.querySelector("#files");
    list.replaceChildren();
    for (const file of rows) {
      const row = document.createElement("p");
      const download = document.createElement("button");
      download.className = "btn btn-outline-dark";
      download.textContent = `Download ${file.name}`;
      download.onclick = async () => {
        try {
          await downloadFile(db, file.path);
        } catch (e) {
          message(status, e.message, true);
        }
      };
      const remove = document.createElement("button");
      remove.className = "btn btn-link";
      remove.textContent = "Remove";
      remove.onclick = async () => {
        if (!confirm(`Remove ${file.name}?`)) return;
        try {
          await checked(db.storage.from("business-files").remove([file.path]));
          await checked(db.from("business_files").delete().eq("id", file.id));
          await loadFiles();
        } catch (e) {
          message(status, e.message, true);
        }
      };
      row.append(download, remove);
      list.append(row);
    }
  }
  document.querySelector("#upload").onsubmit = async (e) => {
    e.preventDefault();
    const button = e.target.querySelector("button");
    button.disabled = true;
    try {
      const file = e.target.elements.file.files[0];
      if (!file) throw new Error("Choose a file.");
      await uploadFile(db, user, id, file);
      await loadFiles();
      e.target.reset();
      message(status, "File uploaded.");
    } catch (error) {
      message(status, error.message, true);
    } finally {
      button.disabled = false;
    }
  };
  document.querySelector("#delete").hidden = !id;
  document.querySelector("#delete").onclick = async () => {
    if (!confirm("Delete this business and its related content?")) return;
    try {
      const files = await checked(
        db.from("business_files").select("path").eq("business_id", id),
      );
      if (files.length)
        await checked(
          db.storage.from("business-files").remove(files.map((f) => f.path)),
        );
      await checked(
        db.from("businesses").delete().eq("id", id).select("id").single(),
      );
      location.assign("/owner.html");
    } catch (error) {
      message(status, error.message, true);
    }
  };
  await loadFiles();
} catch (error) {
  message(status, error.message, true);
}
