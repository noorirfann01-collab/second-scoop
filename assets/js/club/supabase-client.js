/* =====================================================================
   SECOND SCOOP CLUB — Supabase client bootstrap
   Loads after the supabase-js CDN script + config/club.js.
   Exposes window.SSClub.{ config, enabled(), ready(), sb }.
   ===================================================================== */
window.SSClub = window.SSClub || {};
(function () {
  const cfg = window.SS_CLUB || {};
  SSClub.config = cfg;
  SSClub.enabled = function () { return !!cfg.enabled; };
  SSClub.ready = function () {
    return !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && window.supabase.createClient);
  };
  SSClub.sb = SSClub.ready()
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;
})();
