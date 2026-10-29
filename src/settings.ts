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
      favorites: "Favoris", favoriteFolders: "Afficher les dossiers favoris dans la barre latérale",
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
      favorites: "Favorites", favoriteFolders: "Show favorite folders in sidebar",
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

const root = document.querySelector<HTMLDivElement>("#settings")!;
root.innerHTML = `
  <div class="settings-window">
    <header class="settings-header"><div class="settings-brand"><span class="settings-icon">FI</span><strong>${text.title} - File Indexer</strong><span class="environment">Environnement local</span></div><span class="window-controls">—　□　×</span></header>
    <div class="settings-body">
      <aside class="settings-nav"><p class="nav-label">CATÉGORIES</p><button class="nav-item active">☷　${text.general}</button><button class="nav-item">◈　${text.appearance}</button><button class="nav-item">▣　${text.media}</button><button class="nav-item">⌨　${text.shortcuts}</button><button class="nav-item">☆　${text.favorites}</button></aside>
      <main class="settings-content"><p class="eyebrow">FILE INDEXER</p><h1>${text.title}</h1><p class="subtitle">${text.subtitle}</p>
        <section class="settings-card"><h2>⚙　${text.general}</h2><div class="setting-row"><div><strong>${text.language}</strong><small>${text.french} / ${text.english}</small></div><select id="language"><option value="fr">${text.french}</option><option value="en">${text.english}</option></select></div><label class="setting-row check-row"><span><strong>${text.special}</strong></span><input id="ignore-special" type="checkbox" /></label></section>
        <section class="settings-card"><h2>◐　${text.appearance}</h2><label class="setting-row check-row"><span><strong>${text.dark}</strong></span><input id="theme" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.grid}</strong></span><input id="grid-view" type="checkbox" /></label></section>
        <section class="settings-card"><h2>▣　${text.media}</h2><label class="setting-row check-row"><span><strong>${text.pdf}</strong><small>PDF.js / navigateur système</small></span><input id="preview-pdf" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.audio}</strong><small>MP3, WAV, OGG, FLAC</small></span><input id="preview-audio" type="checkbox" /></label><label class="setting-row check-row"><span><strong>${text.video}</strong><small>MP4, WebM, OGV</small></span><input id="preview-video" type="checkbox" /></label></section>
        <section class="settings-card"><h2>⌁　${text.metadata}</h2><label class="setting-row check-row"><span><strong>${text.permissions}</strong><small>Lecture sans chargement du contenu du fichier</small></span><input id="show-linux-metadata" type="checkbox" /></label></section>
        <section class="settings-card"><h2>⌨　${text.shortcuts}</h2><div class="shortcut-row"><span>${text.shortcutSearch}</span><input id="shortcut-search" class="shortcut-input" value="/" maxlength="1" /></div><div class="shortcut-row"><span>${text.shortcutChoose}</span><input id="shortcut-choose" class="shortcut-input" value="Ctrl+O" /></div></section>
        <section class="settings-card"><h2>☆　${text.favorites}</h2><label class="setting-row check-row"><span><strong>${text.favoriteFolders}</strong></span><input id="favorites" type="checkbox" /></label></section>
        <p class="saved">${text.saved}</p>
      </main>
    </div>
  </div>`;

const languageSelector = document.querySelector<HTMLSelectElement>("#language")!;
languageSelector.value = language;
languageSelector.addEventListener("change", () => { localStorage.setItem("language", languageSelector.value); window.location.reload(); });
for (const key of Object.keys(settings)) {
  const input = document.querySelector<HTMLInputElement>(`#${key === "favorites" ? "favorites" : key}`)!;
  input.checked = settings[key as keyof typeof settings];
  input.addEventListener("change", () => localStorage.setItem(key === "favorites" ? "show-favorites" : key, String(input.checked)));
}
const shortcutSearch = document.querySelector<HTMLInputElement>("#shortcut-search")!;
shortcutSearch.value = localStorage.getItem("shortcut-search") || "/";
shortcutSearch.addEventListener("change", () => localStorage.setItem("shortcut-search", shortcutSearch.value || "/"));
const shortcutChoose = document.querySelector<HTMLInputElement>("#shortcut-choose")!;
shortcutChoose.value = localStorage.getItem("shortcut-choose") || "Ctrl+O";
shortcutChoose.addEventListener("change", () => localStorage.setItem("shortcut-choose", shortcutChoose.value || "Ctrl+O"));
