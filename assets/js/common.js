window.API_BASE_URL = location.hostname === "localhost"
  ? "https://localhost:7201"
  : "https://lfs-d7fkdxegfsfmfzfb.uksouth-01.azurewebsites.net";

(function () {
  const api = axios.create({ baseURL: window.API_BASE_URL });

  api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  api.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        window.location.href = "/login.html";
      }
      return Promise.reject(err);
    }
  );

  async function login(email, password) {
    const res = await api.post("/api/auth/login", { email, password });
    const token = res.data.token ?? res.data.Token;
    if (!token) throw new Error("No token returned");
    localStorage.setItem("token", token);
    const user = res.data.user ?? res.data.User;
    const roles = res.data.roles ?? res.data.Roles ?? [];
    localStorage.setItem("user", JSON.stringify({
      id: user.id ?? user.Id,
      email: user.email ?? user.Email,
      fullName: user.fullName ?? user.FullName ?? "",
      roles
    }));
  }

  async function me(force = false) {
    if (!force) {
      const cached = localStorage.getItem("user");
      if (cached) return JSON.parse(cached);
    }
    const res = await api.get("/api/auth/me");
    const roles = res.data.roles ?? res.data.Roles ?? [];
    const user = {
      id: res.data.id ?? res.data.Id,
      email: res.data.email ?? res.data.Email,
      fullName: res.data.fullName ?? res.data.FullName ?? "",
      roles
    };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }

  async function requireAuth(requiredRoles) {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login.html";
      throw new Error("Not authenticated");
    }
    const user = await me();
    if (requiredRoles && !requiredRoles.some(r => user.roles.includes(r))) {
      window.location.href = "/dashboard.html";
      throw new Error("Forbidden");
    }
    return user;
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login.html";
  }

  window.api = api;
  window.auth = { login, me, requireAuth, logout };
})();