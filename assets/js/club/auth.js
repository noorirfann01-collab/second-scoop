/* =====================================================================
   SECOND SCOOP CLUB — auth + profile (wraps Supabase Auth)
   Passwords, verification, reset tokens and sessions are handled by
   Supabase (bcrypt, JWT). We never see or store a password.
   ===================================================================== */
window.SSClub = window.SSClub || {};
(function () {
  function sb() { return window.SSClub && SSClub.sb; }
  function need() { if (!sb()) throw new Error("The Club isn't connected yet."); return sb(); }
  const origin = () => location.origin;

  async function signUp(f) {
    const { data, error } = await need().auth.signUp({
      email: String(f.email || "").trim(),
      password: f.password,
      options: {
        emailRedirectTo: origin() + "/account.html",
        data: {
          full_name: (f.full_name || "").trim(),
          phone: (f.phone || "").trim(),
          birthday: f.birthday || "",
          marketing_consent: !!f.marketing_consent,
        },
      },
    });
    if (error) throw error;
    return data;
  }
  async function signIn(email, password) {
    const { data, error } = await need().auth.signInWithPassword({ email: String(email || "").trim(), password });
    if (error) throw error;
    return data;
  }
  async function signOut() { if (sb()) await sb().auth.signOut(); }
  async function resetRequest(email) {
    const { error } = await need().auth.resetPasswordForEmail(String(email || "").trim(), { redirectTo: origin() + "/account.html?reset=1" });
    if (error) throw error; return true;
  }
  async function updatePassword(pw) { const { error } = await need().auth.updateUser({ password: pw }); if (error) throw error; return true; }
  async function getSession() { if (!sb()) return null; const { data } = await sb().auth.getSession(); return data.session; }
  async function getUser() { if (!sb()) return null; const { data } = await sb().auth.getUser(); return data.user; }
  function onAuth(cb) { if (sb()) return sb().auth.onAuthStateChange((_e, s) => cb(s)); }

  async function getProfile() {
    const u = await getUser(); if (!u) return null;
    const { data } = await sb().from("profiles").select("*").eq("id", u.id).single();
    return data ? Object.assign({ email: u.email }, data) : null;
  }
  async function updateProfile(patch) {
    const u = await getUser(); if (!u) throw new Error("Not signed in.");
    const { data, error } = await sb().from("profiles").update(patch).eq("id", u.id).select().single();
    if (error) throw error; return data;
  }

  SSClub.auth = { signUp, signIn, signOut, resetRequest, updatePassword, getSession, getUser, onAuth, getProfile, updateProfile };
})();
