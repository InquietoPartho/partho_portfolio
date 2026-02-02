(function () {
    const state = {
        quillBn: null,
        quillEn: null,
        activeTab: "views",
    };

    const $ = (id) => document.getElementById(id);

    function showTab(tab) {
        const views = $("tab-views");
        const editor = $("tab-editor");
        const buttons = document.querySelectorAll(".tab-btn");

        if (!views || !editor) return;

        views.classList.toggle("hidden", tab !== "views");
        editor.classList.toggle("hidden", tab !== "editor");

        buttons.forEach((btn) => {
            btn.classList.toggle("active", btn.dataset.tab === tab);
        });
        state.activeTab = tab;
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
                    ["link", "blockquote"],
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
                    ["link", "blockquote"],
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

    function buildArticlePayload() {
        const id = getValue("article-id");
        const status = getValue("article-status") || "published";
        const listMeta = getValue("list-meta");
        const listTitle = getValue("list-title");
        const listSummary = getValue("list-summary");
        const listTitleClass = getValue("list-title-class");
        const listSummaryClass = getValue("list-summary-class");
        const headerTitle = getValue("header-title");
        const headerTitleClass = getValue("header-title-class");
        const headerMeta = getValue("header-meta");
        const translationTitle = getValue("translation-title");
        const translationTitleClass = getValue("translation-title-class");
        const translationMeta = getValue("translation-meta");
        const lottieJson = getValue("lottie-json");

        if (!id || !listTitle || !headerTitle) {
            return { error: "Slug, list title, and header title are required." };
        }

        let lottie = null;
        if (lottieJson) {
            try {
                lottie = JSON.parse(lottieJson);
            } catch (err) {
                return { error: "Lottie JSON must be valid JSON." };
            }
        }

        const bnHtml = state.quillBn ? state.quillBn.root.innerHTML : "";
        const enHtml = state.quillEn ? state.quillEn.root.innerHTML : "";
        const contentHtml = `<div class="article-content bangla-font">${bnHtml}</div>`;
        const translationHtml = enHtml ? `<div class="article-content">${enHtml}</div>` : "";

        return {
            data: {
                id,
                status,
                list_meta: listMeta,
                list_title: listTitle,
                list_title_class: listTitleClass,
                list_summary: listSummary,
                list_summary_class: listSummaryClass,
                header_title: headerTitle,
                header_meta: headerMeta,
                header_title_class: headerTitleClass,
                translation_title: translationTitle,
                translation_title_class: translationTitleClass,
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

    function insertImage() {
        const url = getValue("image-url");
        if (!url || !state.quillBn) return;
        const range = state.quillBn.getSelection(true);
        state.quillBn.insertEmbed(range ? range.index : 0, "image", url, "user");
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
        const imgBtn = $("insert-image-btn");
        if (imgBtn) imgBtn.addEventListener("click", insertImage);
        const lottieBtn = $("insert-lottie-btn");
        if (lottieBtn) lottieBtn.addEventListener("click", insertLottie);
    }

    function initAll() {
        initTabs();
        initEditors();
        wireButtons();
    }

    window.initAdminEditor = initAll;

    document.addEventListener("DOMContentLoaded", () => {
        initAll();
    });
})();
