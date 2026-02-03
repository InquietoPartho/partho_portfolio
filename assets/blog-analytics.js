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

        try {
            const { error } = await supabase.rpc("increment_article_view_monthly", { article_id_input: articleId });
            if (!error) {
                sessionStorage.setItem(sessionKey, "1");
                return;
            }
            const { error: fallbackError } = await supabase.rpc("increment_article_view", { article_id_input: articleId });
            if (!fallbackError) {
                sessionStorage.setItem(sessionKey, "1");
                return;
            }
            console.warn("Failed to increment view", fallbackError || error);
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

    async function incrementLove(articleId) {
        if (!articleId) return { success: false };
        const sessionKey = `loved:${articleId}`;
        if (localStorage.getItem(sessionKey)) {
            return { success: false, alreadyLoved: true };
        }

        try {
            const { error } = await supabase.rpc("increment_article_love", { article_id_input: articleId });
            if (!error) {
                localStorage.setItem(sessionKey, "1");
                return { success: true };
            }
            console.warn("Failed to increment love", error);
        } catch (error) {
            console.warn("Failed to increment love", error);
        }
        return { success: false };
    }

    async function fetchTotalLoves() {
        const { data, error } = await supabase
            .from("article_reactions")
            .select("article_id, loves");

        if (error) {
            console.warn("Failed to fetch total loves", error);
            return {};
        }

        return (data || []).reduce((map, row) => {
            map[row.article_id] = row.loves;
            return map;
        }, {});
    }

    async function fetchCommentCounts() {
        const { data, error } = await supabase
            .from("article_comments")
            .select("article_id");

        if (error) {
            console.warn("Failed to fetch comment counts", error);
            return {};
        }

        return (data || []).reduce((map, row) => {
            map[row.article_id] = (map[row.article_id] || 0) + 1;
            return map;
        }, {});
    }

    async function fetchComments(articleId) {
        if (!articleId) return [];
        const { data, error } = await supabase
            .from("article_comments")
            .select("id, name, comment, created_at")
            .eq("article_id", articleId)
            .order("created_at", { ascending: false });

        if (error) {
            console.warn("Failed to fetch comments", error);
            return [];
        }
        return data || [];
    }

    async function submitComment(articleId, name, comment) {
        if (!articleId || !name || !comment) return { success: false };
        const payload = {
            article_id: articleId,
            name: name.trim(),
            comment: comment.trim()
        };
        const { error } = await supabase.from("article_comments").insert(payload);
        if (error) {
            console.warn("Failed to submit comment", error);
            return { success: false };
        }
        return { success: true };
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
    window.incrementArticleLove = incrementLove;
    window.fetchTotalLoves = fetchTotalLoves;
    window.fetchCommentCounts = fetchCommentCounts;
    window.fetchComments = fetchComments;
    window.submitComment = submitComment;
})();
