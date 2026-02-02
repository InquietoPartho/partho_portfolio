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
            const { error } = await supabase.rpc("increment_article_view_monthly", { article_id_input: articleId });
            if (error) {
                await supabase.rpc("increment_article_view", { article_id_input: articleId });
            }
        } catch (error) {
            console.warn("Failed to increment view", error);
        }
    }

    async function fetchTotalViews() {
        const { data, error } = await supabase
            .from("article_views")
            .select("article_id, views");

        if (error) {
            console.warn("Failed to fetch total views", error);
            return {};
        }

        return (data || []).reduce((map, row) => {
            map[row.article_id] = row.views;
            return map;
        }, {});
    }

    async function fetchPublishedArticles() {
        const { data, error } = await supabase
            .from("articles")
            .select("*")
            .eq("status", "published")
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Failed to fetch articles", error);
            return null;
        }
        return data || [];
    }

    window.trackArticleView = incrementView;
    window.fetchTotalViews = fetchTotalViews;
    window.fetchPublishedArticles = fetchPublishedArticles;
})();
