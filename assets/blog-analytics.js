(function () {
    const supabaseUrl = window.SUPABASE_URL;
    const supabaseKey = window.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("YOUR_") || supabaseKey.startsWith("YOUR_")) {
        console.warn("Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/supabase-config.js");
        return;
    }

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

    async function incrementView(articleId) {
        if (!articleId) return;
        const sessionKey = `viewed:${articleId}`;
        if (sessionStorage.getItem(sessionKey)) return;
        sessionStorage.setItem(sessionKey, "1");

        try {
            await supabase.rpc("increment_article_view", { article_id_input: articleId });
        } catch (error) {
            console.warn("Failed to increment view", error);
        }
    }

    window.trackArticleView = incrementView;
})();
