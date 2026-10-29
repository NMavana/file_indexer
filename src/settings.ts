import "./settings.css";

type Language = "fr" | "en";
const systemLanguage: Language = navigator.language.toLowerCase().startsWith("fr") ? "fr" : "en";
const language = (localStorage.getItem("language") as Language) || systemLanguage;
const fr = language === "fr";
const text = fr
  ? {
      title: "Paramètres", subtitle: "Préférences de File Indexer", general: "Général",
      language: "Langue de l’interface", french: "Français", english: "English",
      special: "Ignorer les caractères spéciaux dans la recherche", appearance: "Apparence",
      dark: "Thème sombre", view: "Affichage des résultats", grid: "Activer le mode grille",
      media: "Prévisualisation multimédia", pdf: "Aperçu PDF", audio: "Lecteur audio",
      video: "Lecteur vidéo", metadata: "Métadonnées Linux", permissions: "Afficher permissions et propriétaire",
      shortcuts: "Raccourcis clavier", shortcutSearch: "Focus recherche", shortcutChoose: "Choisir un dossier",
      favorites: "Favoris", favoriteFolders: "Afficher les dossiers favoris dans la barre latérale", permissionFormat: "Format des permissions", permissionText: "Texte (rwx)", permissionOctal: "Chiffres (755)", uiScale: "Échelle de l’interface",
      palette: "Palette de couleurs", paletteDefault: "Indigo (par défaut)", paletteOcean: "Océan", paletteEmerald: "Émeraude", paletteRose: "Rose",
      resultLimit: "Nombre maximum de résultats", resultLimitWarning: "Une valeur plus élevée peut augmenter l’utilisation de la mémoire.",
      saved: "Les préférences sont enregistrées automatiquement.", on: "Activé", off: "Désactivé",
    }
  : {
      title: "Settings", subtitle: "File Indexer preferences", general: "General",
      language: "Interface language", french: "Français", english: "English",
      special: "Ignore special characters in search", appearance: "Appearance",
      dark: "Dark theme", view: "Result display", grid: "Enable grid mode",
      media: "Media preview", pdf: "PDF preview", audio: "Audio player",
      video: "Video player", metadata: "Linux metadata", permissions: "Show permissions and owner",
      shortcuts: "Keyboard shortcuts", shortcutSearch: "Focus search", shortcutChoose: "Choose folder",
      favorites: "Favorites", favoriteFolders: "Show favorite folders in sidebar", permissionFormat: "Permission format", permissionText: "Text (rwx)", permissionOctal: "Numeric (755)", uiScale: "Interface scale",
      palette: "Color palette", paletteDefault: "Indigo (default)", paletteOcean: "Ocean", paletteEmerald: "Emerald", paletteRose: "Rose",
      resultLimit: "Maximum results", resultLimitWarning: "A higher value may increase memory usage.",
      saved: "Preferences are saved automatically.", on: "Enabled", off: "Disabled",
    };

const settings = {
  "ignore-special": localStorage.getItem("ignore-special") === "true",
  theme: localStorage.getItem("theme") === "dark",
  "grid-view": localStorage.getItem("grid-view") === "true",
  "preview-pdf": localStorage.getItem("preview-pdf") !== "false",
  "preview-audio": localStorage.getItem("preview-audio") !== "false",
  "preview-video": localStorage.getItem("preview-video") !== "false",
  "show-linux-metadata": localStorage.getItem("show-linux-metadata") !== "false",
  favorites: localStorage.getItem("show-favorites") !== "false",
};
document.body.classList.toggle("dark-theme", settings.theme);
document.body.classList.add(`palette-${localStorage.getItem("palette") || "default"}`);
const defaults = {
  "ignore-special": false,
  theme: false,
  "grid-view": false,
  palette: "default",
  "preview-pdf": true,
  "preview-audio": true,
  "preview-video": true,
  "show-linux-metadata": true,
  favorites: true,
  "search-limit": "200",
  "permission-format": "octal",
  "ui-scale": "1",
  "shortcut-search": "/",
  "shortcut-choose": "Ctrl+O",
};

const root = document.querySelector<HTMLDivElement>("#settings")!;
root.innerHTML = `
  <div class="settings-window">
    <header class="settings-header"><div class="settings-brand"><span class="settings-icon">FI</span><strong>${text.title} - File Indexer</strong><span class="environment">Environnement local</span></div></header>
    <div class="settings-body">
      <aside class="settings-nav"><p class="nav-label">CATÉGORIES</p><button class="nav-item active" data-target="section-general">☷　${text.general}</button><button class="nav-item" data-target="section-appearance">◈　${text.appearance}</button><button class="nav-item" data-target="section-media">▣　${text.media}</button><button class="nav-item" data-target="section-shortcuts">⌨　${text.shortcuts}</button><button class="nav-item" data-target="section-favorites">☆　${text.favorites}</button></aside>
      <main class="settings-content"><p class="eyebrow">FILE INDEXER</p><h1>${text.title}</h1><p class="subtitle">${text.subtitle}</p>
        <section id="section-general" class="settings-card"><h2>⚙　${text.general}</h2><div class="setting-row"><div><strong>${text.language}</strong><small>${text.french} / ${text.english}</small></div><select id="language"><option value="fr">${text.french}</option><option value="en">${text.english}</option></select></div><label class="setting-row check-row"><span><strong>${text.special}</strong></span><input id="ignore-special" type="checkbox" /></label><div class="setting-row"><span><strong>${text.resultLimit}</strong><small>${text.resultLimitWarning}</small></span><input id="search-limit" class="number-input" type="number" min="200" max="2000" step="50" value="200" /></div></section>
        <section id="section-appearance" class="settings-card"><h2>◐　${text.appearance}</h2><label class="setting-row check-row"><span><strong>${text.dark}</strong></span><input id="theme" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.grid}</strong></span><input id="grid-view" type="checkbox" /></label><div class="setting-row"><span><strong>${text.palette}</strong><small>${text.paletteDefault}</small></span><select id="palette"><option value="default">${text.paletteDefault}</option><option value="ocean">${text.paletteOcean}</option><option value="emerald">${text.paletteEmerald}</option><option value="rose">${text.paletteRose}</option></select></div></section>
        <section id="section-media" class="settings-card"><h2>▣　${text.media}</h2><label class="setting-row check-row"><span><strong>${text.pdf}</strong><small>PDF.js / navigateur système</small></span><input id="preview-pdf" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.audio}</strong><small>MP3, WAV, OGG, FLAC</small></span><input id="preview-audio" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.video}</strong><small>MP4, WebM, OGV</small></span><input id="preview-video" type="checkbox" /></label></section>
        <section id="section-metadata" class="settings-card settings-section"><h2>⌁　${text.metadata}</h2><label class="setting-row check-row"><span><strong>${text.permissions}</strong><small>Lecture sans chargement du contenu du fichier</small></span><input id="show-linux-metadata" type="checkbox" /></label><div class="setting-row"><span><strong>${text.permissionFormat}</strong></span><select id="permission-format"><option value="text">${text.permissionText}</option><option value="octal">${text.permissionOctal}</option></select></div></section>
        <section class="settings-card settings-section"><h2>◌　${text.uiScale}</h2><div class="setting-row range-row"><span><strong>${text.uiScale}</strong><small><output id="ui-scale-value">50%</output></small></span><input id="ui-scale" type="range" min="0" max="100" step="1" value="50" /></div></section>
        <section id="section-shortcuts" class="settings-card"><h2>⌨　${text.shortcuts}</h2><div class="shortcut-row"><span>${text.shortcutSearch}</span><input id="shortcut-search" class="shortcut-input" value="/" maxlength="1" /></div><div class="shortcut-row"><span>${text.shortcutChoose}</span><input id="shortcut-choose" class="shortcut-input" value="Ctrl+O" /></div></section>
        <section id="section-favorites" class="settings-card"><h2>☆　${text.favorites}</h2><label class="setting-row check-row"><span><strong>${text.favoriteFolders}</strong></span><input id="favorites" type="checkbox" /></label></section>
        <p class="saved">${text.saved}</p><footer class="settings-actions"><button id="reset-settings" type="button">↻ Réinitialiser par défaut</button><button id="apply-settings" class="primary-settings-action" type="button">✓ Appliquer les paramètres</button></footer>
      </main>
    </div>
  </div>`;

const languageSelector = document.querySelector<HTMLSelectElement>("#language")!;
languageSelector.value = language;
languageSelector.addEventListener("change", () => { localStorage.setItem("language", languageSelector.value); window.location.reload(); });
for (const key of Object.keys(settings)) {
  const input = document.querySelector<HTMLInputElement>(`#${key === "favorites" ? "favorites" : key}`)!;
  input.checked = settings[key as keyof typeof settings];
  input.addEventListener("change", () => {
    const storageKey = key === "favorites" ? "show-favorites" : key;
    localStorage.setItem(storageKey, String(input.checked));
    if (key === "theme") document.body.classList.toggle("dark-theme", input.checked);
  });
}
const shortcutSearch = document.querySelector<HTMLInputElement>("#shortcut-search")!;
shortcutSearch.value = localStorage.getItem("shortcut-search") || "/";
shortcutSearch.addEventListener("change", () => localStorage.setItem("shortcut-search", shortcutSearch.value || "/"));
const shortcutChoose = document.querySelector<HTMLInputElement>("#shortcut-choose")!;
shortcutChoose.value = localStorage.getItem("shortcut-choose") || "Ctrl+O";
shortcutChoose.addEventListener("change", () => localStorage.setItem("shortcut-choose", shortcutChoose.value || "Ctrl+O"));
const permissionFormat = document.querySelector<HTMLSelectElement>("#permission-format")!;
permissionFormat.value = localStorage.getItem("permission-format") || "octal";
permissionFormat.addEventListener("change", () => localStorage.setItem("permission-format", permissionFormat.value));
const resultLimitInput = document.querySelector<HTMLInputElement>("#search-limit")!;
resultLimitInput.value = String(Math.min(2000, Math.max(200, Number(localStorage.getItem("search-limit") || "200"))));
resultLimitInput.addEventListener("change", () => {
  const value = Math.min(2000, Math.max(200, Number(resultLimitInput.value) || 200));
  resultLimitInput.value = String(value);
  localStorage.setItem("search-limit", String(value));
  if (value > 200) window.alert(fr ? "Attention : une limite plus élevée peut augmenter l’utilisation de la mémoire." : "Warning: a higher result limit may increase memory usage.");
});
const paletteSelector = document.querySelector<HTMLSelectElement>("#palette")!;
paletteSelector.value = localStorage.getItem("palette") || "default";
paletteSelector.addEventListener("change", () => {
  localStorage.setItem("palette", paletteSelector.value);
  document.body.classList.remove("palette-default", "palette-ocean", "palette-emerald", "palette-rose");
  document.body.classList.add(`palette-${paletteSelector.value}`);
});
const scaleSelector = document.querySelector<HTMLInputElement>("#ui-scale")!;
const scaleValue = document.querySelector<HTMLOutputElement>("#ui-scale-value")!;
const storedScale = Number(localStorage.getItem("ui-scale") || "1");
scaleSelector.value = String(Math.round(Math.min(100, Math.max(0, (storedScale - 0.8) / 0.6 * 100))));
const updateScale = () => {
  const sliderValue = Number(scaleSelector.value);
  scaleValue.value = `${sliderValue}%`;
  localStorage.setItem("ui-scale", String((0.8 + sliderValue / 100 * 0.6).toFixed(2)));
};
updateScale();
scaleSelector.addEventListener("input", updateScale);
document.querySelector<HTMLButtonElement>("#reset-settings")?.addEventListener("click", () => {
  if (!window.confirm(fr ? "Réinitialiser tous les paramètres par défaut ?" : "Reset all settings to defaults?")) return;
  for (const [key, value] of Object.entries(defaults)) localStorage.setItem(key === "favorites" ? "show-favorites" : key, String(value));
  window.location.reload();
});
document.querySelector<HTMLButtonElement>("#apply-settings")?.addEventListener("click", () => window.location.reload());
document.querySelectorAll<HTMLButtonElement>(".nav-item").forEach((button, index) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.getElementById(button.dataset.target || "")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});
