-- =====================================================================
-- THE SECOND SCOOP CLUB — starter data (editable later from admin)
-- Run AFTER 001_init.sql. Safe to re-run (upserts).
-- =====================================================================

-- ------- tiers (thresholds are lifetime Scoops in V1; all editable) -----
insert into public.tiers (id, name, threshold_type, threshold_value, sort, benefits) values
  ('first_scoop',  'First Scoop',  'scoops', 0,    1,
    '["Earn Scoops on every order","Birthday reward","Access to standard treats"]'::jsonb),
  ('second_scoop', 'Second Scoop', 'scoops', 1000, 2,
    '["Early access to limited drops","Members-only rewards","Selected double-Scoops days","Everything in First Scoop"]'::jsonb),
  ('never_enough', 'Never Enough', 'scoops', 3000, 3,
    '["First access to limited drops","Access to selected Vault products","Surprise gifts & upgrades","Exclusive rewards","Everything in previous tiers"]'::jsonb)
on conflict (id) do update
  set name = excluded.name, threshold_value = excluded.threshold_value,
      benefits = excluded.benefits, sort = excluded.sort;

-- ------- earning rules (the ONLY place loyalty values live) -------------
insert into public.earning_rules (key, value, enabled, description) values
  ('earn_per_100', 10,  true,  'Scoops earned per Rs.100 spent'),
  ('welcome',      100, true,  'Bonus for creating an account'),
  ('first_order',  100, true,  'Bonus on first completed order'),
  ('review',       100, true,  'Verified website review'),
  ('birthday',     150, true,  'Birthday bonus Scoops'),
  ('social',       50,  true,  'Manual social-media reward'),
  ('earn_on_delivery', 0, false, 'Also earn on delivery charge (0/off = product only)')
on conflict (key) do update set value = excluded.value, description = excluded.description;

-- ------- starter rewards (Scoops costs are placeholders — edit freely) --
insert into public.rewards (name, description, scoops_cost, sort, rules) values
  ('Free chocolate drizzle',   'A glossy chocolate drizzle on your next order.', 200,  1, '{"stackable":true}'),
  ('Free salted caramel drizzle','Salted caramel, poured on generously.',        200,  2, '{"stackable":true}'),
  ('Free Signature Crunch',    'Our signature crunch topping, on the house.',    300,  3, '{}'),
  ('Free cookie',              'One warm cookie added to your order.',           400,  4, '{"min_order":1000}'),
  ('Free delivery',            'We cover delivery on your next order.',          300,  5, '{"min_order":1500}'),
  ('Free Scoopie',             'A free OG Scoopie with your next order.',        700,  6, '{"min_order":2000}'),
  ('Members-only flavour',     'Unlock a flavour reserved for the Club.',        900,  7, '{"members_only":true}'),
  ('Vault access pass',        'Early access to a selected Vault product.',      1200, 8, '{"tier":"never_enough"}')
on conflict do nothing;
