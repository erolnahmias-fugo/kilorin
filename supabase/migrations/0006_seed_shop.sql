insert into public.shop_items (key, name, description, emoji, price, category, sort) values
  ('dandik_sapka', 'Dandik Şapka', 'Avatarına takılır. O kadar.', '🧢', 50, 'cosmetic', 10),
  ('neon_cerceve', 'Neon Çerçeve', 'Liderlikte parlarsın.', '🖼', 300, 'cosmetic', 20),
  ('altin_isim', 'Altın İsim', 'İsmin listede altın renginde akar.', '✨', 1200, 'cosmetic', 30),
  ('elmas_rozet', 'Elmas Rozet', 'Sadece zenginler anlar.', '💎', 5000, 'cosmetic', 40),
  ('ai_avatar', 'AI Avatar', 'Foto yükle, efsaneye dönüş.', '🤖', 750, 'utility', 50),
  ('cheat_day', 'Cheat Day', '1 gün kalori affı. Vicdan hariç.', '🍔', 1000, 'utility', 60),
  ('dessert_bomb', 'Tatlı Bombası', 'Hedef seç → 24 saatte fotolu tatlı loglamak zorunda.', '💣', 500, 'utility', 70),
  ('streak_shield', 'Streak Kalkanı', '1 kaçamağı affeder. Otomatik devreye girer.', '🛡', 400, 'utility', 80)
on conflict (key) do update set
  name = excluded.name, description = excluded.description, emoji = excluded.emoji,
  price = excluded.price, category = excluded.category, sort = excluded.sort;
