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
    const resetStatus = document.getElementById("reset-status");
    const themeToggle = document.getElementById("admin-theme-toggle");

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
    }

    async function loadViews() {
        const monthKey = new Date().toISOString().slice(0, 7);
        const { data: articlesData, error: articlesError } = await supabase
            .from("articles")
            .select("id, list_title")
            .order("created_at", { ascending: false });

        if (articlesError) {
            loginError.textContent = articlesError.message;
            loginError.classList.remove("hidden");
            return;
        }

        const articleIds = (articlesData || []).map((row) => row.id);

        const localArticles = window.blogArticles || [];
        const combinedArticles = [...(articlesData || [])];
        localArticles.forEach((local) => {
            if (!combinedArticles.find((row) => row.id === local.id)) {
                combinedArticles.push({
                    id: local.id,
                    list_title: local.listTitle || local.id,
                });
            }
        });

        const { data, error } = await supabase
            .from("article_views")
            .select("article_id, views");

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

        const viewsMap = (data || []).reduce((map, row) => {
            map[row.article_id] = row.views;
            return map;
        }, {});

        viewsTable.innerHTML = (combinedArticles || []).map(row => {
            const title = row.list_title || articles[row.id] || row.id;
            const totalViews = viewsMap[row.id] ?? 0;
            const monthlyViews = monthlyMap[row.id] ?? 0;
            return `<tr><td>${title}</td><td>${totalViews}</td><td>${monthlyViews}</td></tr>`;
        }).join("");
    }

    async function signOut() {
        await supabase.auth.signOut();
        analyticsCard.classList.add("hidden");
        loginCard.classList.remove("hidden");
    }

    function applyTheme(theme) {
        const root = document.documentElement;
        if (theme === "dark") {
            root.setAttribute("data-theme", "dark");
        } else {
            root.removeAttribute("data-theme");
        }
        if (themeToggle) {
            themeToggle.classList.toggle("is-dark", theme === "dark");
            themeToggle.setAttribute("aria-checked", theme === "dark" ? "true" : "false");
        }
    }

    function toggleTheme() {
        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const next = isDark ? "light" : "dark";
        localStorage.setItem("admin-theme", next);
        applyTheme(next);
    }

    async function resetPassword() {
        if (!resetStatus) return;
        resetStatus.textContent = "";
        const email = document.getElementById("email").value;
        if (!email) {
            resetStatus.textContent = "Enter your email first.";
            return;
        }
        const redirectTo = `${window.location.origin}${window.location.pathname}`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (error) {
            resetStatus.textContent = error.message;
            return;
        }
        resetStatus.textContent = "Reset link sent. Check your email.";
    }

    document.getElementById("login-btn").addEventListener("click", signIn);
    document.getElementById("refresh-btn").addEventListener("click", loadViews);
    document.getElementById("logout-btn").addEventListener("click", signOut);
    const resetBtn = document.getElementById("reset-password-btn");
    if (resetBtn) resetBtn.addEventListener("click", resetPassword);
    if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

    const savedTheme = localStorage.getItem("admin-theme") || "light";
    applyTheme(savedTheme);

    supabase.auth.getSession().then(({ data }) => {
        if (data.session) {
            loadViews();
            loginCard.classList.add("hidden");
            analyticsCard.classList.remove("hidden");
        }
    });
})();
