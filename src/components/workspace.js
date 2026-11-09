const icons = {
  account: "person-circle",
  owner: "shop",
  community: "chat-square-text",
  advertising: "megaphone",
  reset: "shield-lock",
  moderation: "grid-1x2",
  users: "people",
  taxonomy: "tags",
  settings: "sliders",
  audit: "clock-history",
  editor: "pencil-square",
};
export function workspace() {
  const route = location.pathname.split("/").pop().replace(".html", "");
  if (!icons[route] || document.querySelector(".workspace-layout")) return;
  document.body.classList.add("workspace-page", `route-${route}`);
  const main = document.querySelector("#main");
  const layout = document.createElement("div");
  layout.className = "workspace-layout";
  const aside = document.createElement("aside");
  aside.className = "workspace-rail";
  const links = [
    ["account", "person-circle", "My profile"],
    ["owner", "shop", "My businesses"],
    ["community", "chat-square-text", "Community forum"],
    ["advertising", "megaphone", "Promotions"],
    ["reset", "shield-lock", "Account security"],
  ];
  aside.innerHTML =
    '<div class="rail-caption">YOUR WORKSPACE</div>' +
    links
      .map(
        ([path, icon, label]) =>
          `<a href="/${path}.html" ${route === path ? 'aria-current="page"' : ""}><i class="bi bi-${icon}" aria-hidden="true"></i>${label}</a>`,
      )
      .join("") +
    '<div class="rail-staff" hidden><div class="rail-caption">MANAGEMENT</div>' +
    [
      ["moderation", "grid-1x2", "Overview"],
      ["users", "people", "People"],
      ["taxonomy", "tags", "Categories"],
      ["settings", "sliders", "Settings"],
      ["audit", "clock-history", "Activity log"],
    ]
      .map(
        ([path, icon, label]) =>
          `<a href="/${path}.html" ${route === path ? 'aria-current="page"' : ""}><i class="bi bi-${icon}" aria-hidden="true"></i>${label}</a>`,
      )
      .join("") +
    '</div><div class="rail-help"><i class="bi bi-compass" aria-hidden="true"></i><strong>Made for your neighbourhood.</strong><p>Discover something good around the corner.</p><a href="/directory.html">Explore Borough</a></div>';
  main.before(layout);
  layout.append(aside, main);
  document.querySelector(".account-sidebar")?.remove();
}
