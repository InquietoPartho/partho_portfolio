(function () {
    const state = {
        quillBn: null,
        quillEn: null,
        activeTab: "views",
        editorMode: "new",
    };

    const $ = (id) => document.getElementById(id);

    function showTab(tab) {
        const views = $("tab-views");
        const editor = $("tab-editor");
        const update = $("tab-update");
        const buttons = document.querySelectorAll(".tab-btn");

        if (!views || !editor) return;

        views.classList.toggle("hidden", tab !== "views");
        editor.classList.toggle("hidden", tab !== "editor");
        if (update) update.classList.toggle("hidden", tab !== "update");

        buttons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tab);
        });
        state.activeTab = tab;

        if (tab === "update") {
            attachEditorPanel("editor-update-container");
            setEditorMode("update");
            loadUpdateArticles();
        }

        if (tab === "editor") {
            attachEditorPanel("editor-new-container");
            setEditorMode("new");
        }

    }

    function initTabs() {
        const buttons = document.querySelectorAll(".tab-btn");
        if (!buttons.length) return;
        buttons.forEach((btn) => {
            btn.addEventListener("click", () => showTab(btn.dataset.tab));
        });
    }

    function initEditors() {
        if (!window.Quill) return;
        const bn = $("editor-bn");
        const en = $("editor-en");
        if (!bn || !en) return;
        if (state.quillBn && state.quillEn) return;

        state.quillBn = new Quill(bn, {
            theme: "snow",
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "blockquote", "code-block"],
                    ["clean"],
                ],
            },
        });

        state.quillEn = new Quill(en, {
            theme: "snow",
            modules: {
                toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ list: "ordered" }, { list: "bullet" }],
                    ["link", "blockquote", "code-block"],
                    ["clean"],
                ],
            },
        });
    }

    function getValue(id) {
        const el = $(id);
        return el ? el.value.trim() : "";
    }

    function setError(message) {
        const box = $("editor-error");
        if (!box) return;
        box.textContent = message;
        box.classList.toggle("hidden", !message);
    }

    function setUpdateStatus(message) {
        const box = $("update-status");
        if (!box) return;
        box.textContent = message || "";
    }

    function mapLocalArticleToRow(article) {
        if (!article) return null;
        return {
            id: article.id,
            status: "published",
            list_meta: article.listMeta || "",
            list_title: article.listTitle || "",
            list_title_class: article.listTitleClass || "",
            list_summary: article.listSummary || "",
            list_summary_class: article.listSummaryClass || "",
            header_title: article.headerTitle || "",
            header_meta: article.headerMeta || "",
            header_title_class: article.headerTitleClass || "",
            translation_title: article.translationTitle || "",
            translation_title_class: article.translationTitleClass || "",
            translation_meta: article.translationMeta || "",
            content_html: article.contentHtml || "",
            translation_html: article.translationHtml || "",
            lottie: article.lottie || [],
            updated_at: new Date().toISOString(),
        };
    }

    function attachEditorPanel(containerId) {
        const panel = $("editor-panel");
        const container = $(containerId);
        if (!panel || !container) return;
        if (panel.parentElement !== container) {
            container.appendChild(panel);
        }
    }

    function updateLanguageUI() {
        const language = getValue("article-language") || "bangla";
        const bnWrap = $("editor-bn-wrap");
        const enWrap = $("editor-en-wrap");
        const listTitle = $("list-title");
        const listSummary = $("list-summary");
        const headerTitle = $("header-title");
        const metaBadge = $("meta-badge");
        const metaBadgeEn = $("meta-badge-en");
        const translationTitle = $("translation-title");

        if (language === "english") {
            if (bnWrap) bnWrap.style.display = "none";
            if (enWrap) enWrap.style.display = "block";
            if (listTitle) listTitle.placeholder = "Atomic Habits...";
            if (listSummary) listSummary.placeholder = "Short summary...";
            if (headerTitle) headerTitle.placeholder = "Atomic Habits...";
            if (metaBadge) metaBadge.placeholder = "English Article";
            if (metaBadgeEn) metaBadgeEn.value = "";
            if (translationTitle) translationTitle.value = "";
        } else {
            if (bnWrap) bnWrap.style.display = "block";
            if (enWrap) enWrap.style.display = "block";
            if (listTitle) listTitle.placeholder = "অ্যাটমিক হ্যাবিটস: ...";
            if (listSummary) listSummary.placeholder = "সংক্ষিপ্ত সারাংশ...";
            if (headerTitle) headerTitle.placeholder = "অ্যাটমিক হ্যাবিটস...";
            if (metaBadge) metaBadge.placeholder = "Bangla Article";
        }
    }

    function setEditorMode(mode) {
        state.editorMode = mode;
        const saveBtn = $("save-article-btn");
        if (!saveBtn) return;
        saveBtn.textContent = mode === "update" ? "Update Article" : "Publish Article";
    }


    function buildArticlePayload() {
        const language = getValue("article-language") || "bangla";
        const id = getValue("article-id");
        const status = getValue("article-status") || "published";
        const metaDate = getValue("meta-date");
        const metaRead = getValue("meta-read");
        const metaBadge = getValue("meta-badge");
        const metaBadgeEn = getValue("meta-badge-en");
        const listTitle = getValue("list-title");
        const listSummary = getValue("list-summary");
        const headerTitle = getValue("header-title");
        const translationTitle = getValue("translation-title");
        const lottieJson = getValue("lottie-json");

        if (!id || !listTitle || !headerTitle) {
            return { error: "Slug, list title, and header title are required." };
        }

        let lottie = [];
        if (lottieJson) {
            try {
                const parsed = JSON.parse(lottieJson);
                lottie = Array.isArray(parsed) ? parsed : [];
            } catch (err) {
                return { error: "Lottie JSON must be valid JSON." };
            }
        }

        const bnHtml = state.quillBn ? state.quillBn.root.innerHTML : "";
        const enHtml = state.quillEn ? state.quillEn.root.innerHTML : "";

        if (language === "bangla" && !bnHtml.trim()) {
            return { error: "Bangla content is required for Bangla articles." };
        }
        if (language === "english" && !enHtml.trim()) {
            return { error: "English content is required for English articles." };
        }

        const contentHtml = language === "english"
            ? `<div class="article-content">${enHtml}</div>`
            : `<div class="article-content bangla-font">${bnHtml}</div>`;
        const translationHtml = language === "bangla" && enHtml.trim()
            ? `<div class="article-content">${enHtml}</div>`
            : "";

        const listMeta = [metaDate, metaBadge, metaRead].filter(Boolean).join(" • ");
        const headerMeta = ["By P.K.R. Partho", metaDate, metaRead].filter(Boolean).join(" • ") +
            (metaBadge ? ` • <span class="badge badge-conf">${metaBadge}</span>` : "");
        const translationMeta = ["By P.K.R. Partho", metaDate, metaRead].filter(Boolean).join(" • ") +
            (metaBadgeEn ? ` • <span class="badge badge-conf">${metaBadgeEn}</span>` : "");

        return {
            data: {
                id,
                status,
                list_meta: listMeta,
                list_title: listTitle,
            list_title_class: language === "english" ? "" : "bangla-font",
                list_summary: listSummary,
            list_summary_class: language === "english" ? "" : "bangla-font",
                header_title: headerTitle,
                header_meta: headerMeta,
            header_title_class: language === "english" ? "" : "bangla-font",
                translation_title: translationTitle,
                translation_title_class: "",
                translation_meta: translationMeta,
                content_html: contentHtml,
                translation_html: translationHtml,
                lottie: lottie,
                updated_at: new Date().toISOString(),
            },
        };
    }

    async function saveArticle() {
        setError("");
        if (!window.supabaseClient) {
            setError("Supabase client not ready.");
            return;
        }

        const payload = buildArticlePayload();
        if (payload.error) {
            setError(payload.error);
            return;
        }

        const { data, error } = await window.supabaseClient
            .from("articles")
            .upsert(payload.data)
            .select("id")
            .single();

        if (error) {
            setError(error.message || "Failed to publish article.");
            return;
        }

        setError("Published successfully.");
        const slugInput = $("article-id");
        if (slugInput) slugInput.value = data.id || payload.data.id;
    }

    async function deleteCurrentArticle() {
        setError("");
        if (!window.supabaseClient) {
            setError("Supabase client not ready.");
            return;
        }
        const id = getValue("article-id");
        if (!id) {
            setError("Enter a slug to delete.");
            return;
        }
        if (!confirm("Delete this article?")) return;

        const { error } = await window.supabaseClient
            .from("articles")
            .delete()
            .eq("id", id);

        if (error) {
            setError(error.message || "Failed to delete article.");
            return;
        }
        setError("Article deleted.");
    }

    function extractInnerContent(html) {
        if (!html) return "";
        const wrapperMatch = html.match(/<div class="article-content[^>]*">([\s\S]*)<\/div>\s*$/);
        if (wrapperMatch) {
            return wrapperMatch[1];
        }
        return html;
    }

    function fillEditorFromRow(row) {
        if (!row) return;
        const metaParts = (row.list_meta || "").split(" • ");
        const date = metaParts[0] || "";
        const read = metaParts[metaParts.length - 1] || "";
        const isBangla = (row.content_html || "").includes("bangla-font");
        const language = isBangla ? "bangla" : "english";
        const languageSelect = $("article-language");
        if (languageSelect) languageSelect.value = language;
        $("article-id").value = row.id || "";
        $("article-status").value = row.status || "published";
        $("meta-date").value = date;
        $("meta-read").value = read;
        $("list-title").value = row.list_title || "";
        $("list-summary").value = row.list_summary || "";
        $("meta-badge").value = isBangla ? "Bangla Article" : "English Article";
        $("meta-badge-en").value = "English Translation";
        $("header-title").value = row.header_title || "";
        $("translation-title").value = row.translation_title || "";
        $("lottie-json").value = JSON.stringify(row.lottie || []);

        if (state.quillBn) {
            state.quillBn.root.innerHTML = isBangla ? extractInnerContent(row.content_html || "") : "";
        }
        if (state.quillEn) {
            state.quillEn.root.innerHTML = isBangla
                ? extractInnerContent(row.translation_html || "")
                : extractInnerContent(row.content_html || "");
        }

        updateLanguageUI();
    }

    async function loadUpdateArticles() {
        const select = $("update-article-select");
        if (!select) return;
        select.innerHTML = "";
        setUpdateStatus("");
        if (!window.supabaseClient) {
            setUpdateStatus("Supabase client not ready.");
            return;
        }

        const { data, error } = await window.supabaseClient
            .from("articles")
            .select("id, list_title")
            .order("created_at", { ascending: false });

        if (error) {
            setUpdateStatus(error.message || "Failed to load articles.");
            return;
        }

        if (!data || !data.length) {
            setUpdateStatus("No articles found.");
            return;
        }

        select.innerHTML = data
            .map(row => `<option value="${row.id}">${row.list_title || row.id}</option>`)
            .join("");
    }

    async function loadSelectedArticle() {
        setError("");
        const select = $("update-article-select");
        if (!select || !select.value) return;
        if (!window.supabaseClient) {
            setUpdateStatus("Supabase client not ready.");
            return;
        }
        const { data, error } = await window.supabaseClient
            .from("articles")
            .select("id, list_title, list_meta, status, header_title, translation_title, lottie, content_html, translation_html")
            .eq("id", select.value)
            .single();

        if (error) {
            setUpdateStatus(error.message || "Failed to load article.");
            return;
        }

        fillEditorFromRow(data);
        setUpdateStatus("Article loaded. Edit and click Update Article.");
    }

    async function deleteSelectedArticle() {
        setError("");
        const select = $("update-article-select");
        if (!select || !select.value) return;
        if (!window.supabaseClient) {
            setUpdateStatus("Supabase client not ready.");
            return;
        }
        if (!confirm("Delete this article?")) return;

        const { error } = await window.supabaseClient
            .from("articles")
            .delete()
            .eq("id", select.value);

        if (error) {
            setUpdateStatus(error.message || "Failed to delete article.");
            return;
        }

        setUpdateStatus("Article deleted.");
        loadUpdateArticles();
    }

    async function syncLocalArticles() {
        setUpdateStatus("");
        if (!window.supabaseClient) {
            setUpdateStatus("Supabase client not ready.");
            return;
        }
        const localArticles = window.blogArticles || [];
        if (!localArticles.length) {
            setUpdateStatus("No local articles found to sync.");
            return;
        }

        const rows = localArticles.map(mapLocalArticleToRow).filter(Boolean);
        const { error } = await window.supabaseClient
            .from("articles")
            .upsert(rows);

        if (error) {
            setUpdateStatus(error.message || "Failed to sync local articles.");
            return;
        }

        setUpdateStatus("Local articles synced to Supabase.");
        loadUpdateArticles();
    }

    function getInsertIndex() {
        const position = getValue("image-position") || "cursor";
        if (!state.quillBn) return 0;
        const length = state.quillBn.getLength();
        if (position === "top") return 0;
        if (position === "bottom") return Math.max(0, length - 1);
        if (position === "middle") return Math.max(0, Math.floor(length / 2));
        const range = state.quillBn.getSelection(true);
        return range ? range.index : 0;
    }

    function insertImageUrl(url) {
        if (!url || !state.quillBn) return;
        const index = getInsertIndex();
        state.quillBn.insertEmbed(index, "image", url, "user");
    }

    function insertImage() {
        const url = getValue("image-url");
        insertImageUrl(url);
    }

    function insertImageFromFile() {
        const input = $("image-file");
        if (!input || !input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            insertImageUrl(event.target.result);
        };
        reader.readAsDataURL(file);
    }

    function insertLottie() {
        const url = getValue("lottie-url");
        const containerId = getValue("lottie-container");
        if (!url || !containerId || !state.quillBn) return;

        const placeholder = `
            <div class="lottie-wrapper">
                <div id="${containerId}" style="width: 100%; height: 100%;"></div>
            </div>
        `;
        const range = state.quillBn.getSelection(true);
        state.quillBn.clipboard.dangerouslyPasteHTML(range ? range.index : 0, placeholder);

        const lottieField = $("lottie-json");
        if (lottieField) {
            let existing = [];
            if (lottieField.value.trim()) {
                try {
                    existing = JSON.parse(lottieField.value);
                    if (!Array.isArray(existing)) existing = [];
                } catch (err) {
                    existing = [];
                }
            }
            existing.push({ containerId, path: url });
            lottieField.value = JSON.stringify(existing);
        }
    }

    function wireButtons() {
        const saveBtn = $("save-article-btn");
        if (saveBtn) saveBtn.addEventListener("click", saveArticle);
        const deleteBtn = $("delete-article-btn");
        if (deleteBtn) deleteBtn.addEventListener("click", deleteCurrentArticle);
        const imgBtn = $("insert-image-btn");
        if (imgBtn) imgBtn.addEventListener("click", insertImage);
        const imgFileBtn = $("insert-image-file-btn");
        if (imgFileBtn) imgFileBtn.addEventListener("click", insertImageFromFile);
        const lottieBtn = $("insert-lottie-btn");
        if (lottieBtn) lottieBtn.addEventListener("click", insertLottie);
        const loadBtn = $("load-article-btn");
        if (loadBtn) loadBtn.addEventListener("click", loadSelectedArticle);
        const deleteSelectedBtn = $("delete-selected-btn");
        if (deleteSelectedBtn) deleteSelectedBtn.addEventListener("click", deleteSelectedArticle);
        const syncLocalBtn = $("sync-local-btn");
        if (syncLocalBtn) syncLocalBtn.addEventListener("click", syncLocalArticles);
        const syncLocalEditorBtn = $("sync-local-btn-editor");
        if (syncLocalEditorBtn) syncLocalEditorBtn.addEventListener("click", syncLocalArticles);
    }

    function setSectionEnabled(sectionId, enabled) {
        const section = $(sectionId);
        if (!section) return;
        section.style.display = enabled ? "grid" : "none";
        section.querySelectorAll("input, select, button").forEach((el) => {
            el.disabled = !enabled;
        });
    }

    function wireMediaToggles() {
        const toggleImages = $("toggle-images");
        const toggleLottie = $("toggle-lottie");
        if (toggleImages) {
            setSectionEnabled("images-section", toggleImages.checked);
            toggleImages.addEventListener("change", () => {
                setSectionEnabled("images-section", toggleImages.checked);
            });
        }
        if (toggleLottie) {
            setSectionEnabled("lottie-section", toggleLottie.checked);
            toggleLottie.addEventListener("change", () => {
                setSectionEnabled("lottie-section", toggleLottie.checked);
            });
        }
    }

    function initAll() {
        initTabs();
        initEditors();
        wireButtons();
        wireMediaToggles();
        const languageSelect = $("article-language");
        if (languageSelect) {
            languageSelect.addEventListener("change", updateLanguageUI);
        }
        updateLanguageUI();
    }

    window.initAdminEditor = initAll;

    document.addEventListener("DOMContentLoaded", () => {
        initAll();
    });
})();
