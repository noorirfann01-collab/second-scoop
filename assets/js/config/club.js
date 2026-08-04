/* =====================================================================
   THE SECOND SCOOP CLUB — front-end config
   ---------------------------------------------------------------------
   • supabaseUrl + supabaseAnonKey are PUBLIC and safe here (the anon key
     only allows what Row-Level Security permits). The secret service-role
     key NEVER goes in the website — it lives in Netlify env variables.
   • enabled:false hides the whole Club from the public until you launch.
   ===================================================================== */
window.SS_CLUB = {
  enabled: false,                 // ← flip to true to launch (or toggle in admin)
  supabaseUrl: "",                // e.g. https://abcdxyz.supabase.co
  supabaseAnonKey: "",            // the "anon public" key from Supabase → Settings → API
  name: "The Second Scoop Club",
  tagline: "Because one was never enough.",
  currencyEarnPer: 100,           // display only; the real rate lives in the DB (earning_rules)
};
