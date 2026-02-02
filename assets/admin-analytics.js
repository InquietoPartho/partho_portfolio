(function () {
    const supabaseUrl = window.SUPABASE_URL;
    const supabaseKey = window.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey || supabaseUrl.startsWith("YOUR_") || supabaseKey.startsWith("YOUR_")) {
        alert("Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY in assets/supabase-config.js");
        return;
    }

    const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);
    window.supabaseClient = supabase;

    const loginCard = document.getElementById("login-card");
    const analyticsCard = document.getElementById("analytics-card");
    const loginError = document.getElementById("login-error");
    const viewsTable = document.getElementById("views-table");

    const articles = (window.blogArticles || []).reduce((map, article) => {
        map[article.id] = article.listTitle;
        return map;
    }, {});

    async function signIn() {
        loginError.classList.add("hidden");
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            loginError.textContent = error.message;
            loginError.classList.remove("hidden");
            return;
        }
        await loadViews();
        loginCard.classList.add("hidden");
        analyticsCard.classList.remove("hidden");
        if (window.initAdminEditor) {
            window.initAdminEditor();
        }
    }

    async function loadViews() {
        const monthKey = new Date().toISOString().slice(0, 7);
        const { data, error } = await supabase
            .from("article_views")
            .select("article_id, views")
            .order("views", { ascending: false });

        if (error) {
            loginError.textContent = error.message;
            loginError.classList.remove("hidden");
            return;
        }

        const { data: monthlyData, error: monthlyError } = await supabase
            .from("article_views_monthly")
            .select("article_id, views")
            .eq("month", monthKey);

        if (monthlyError) {
            loginError.textContent = monthlyError.message;
            loginError.classList.remove("hidden");
            return;
        }

        const monthlyMap = (monthlyData || []).reduce((map, row) => {
            map[row.article_id] = row.views;
            return map;
        }, {});

        viewsTable.innerHTML = (data || []).map(row => {
            const title = articles[row.article_id] || row.article_id;
            const monthlyViews = monthlyMap[row.article_id] ?? 0;
            return `<tr><td>${title}</td><td>${row.views}</td><td>${monthlyViews}</td></tr>`;
        }).join("");
    }

    async function signOut() {
        await supabase.auth.signOut();
        analyticsCard.classList.add("hidden");
        loginCard.classList.remove("hidden");
    }

    document.getElementById("login-btn").addEventListener("click", signIn);
    document.getElementById("refresh-btn").addEventListener("click", loadViews);
    document.getElementById("logout-btn").addEventListener("click", signOut);

    supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
            loadViews();
            loginCard.classList.add("hidden");
            analyticsCard.classList.remove("hidden");
            if (window.initAdminEditor) {
                window.initAdminEditor();
            }
        }
    });
})();
