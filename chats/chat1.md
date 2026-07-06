# Kilorin: Arcade Fintech

_Started 2026-07-06 12:11 UTC_

---

## User

Kilorin adında, Türkçe, mobile-first bir PWA web uygulamasının yüksek kaliteli UI tasarımını / interaktif prototipini yap.

KONSEPT: Kapalı arkadaş grupları için multiplayer kilo verme oyunu. Oyuncular günlük kalorilerini loglar, hedefin altında kalınca "Kilorin" (KLR) adlı oyun parası kazanır ve bu parayla dönemsel yatırım fırsatları, kumarhane ve dükkân üzerinden bir ekonomi oyunu oynar. Ciddi bir diyet uygulaması DEĞİL; "arcade fintech" hissi: eğlenceli, rekabetçi, hafif kumarbaz arkadaş grubu enerjisi.

GÖRSEL DİL: Canlı ve oyunsu ama premium; koyu zemin + neon/altın vurgular olabilir (sen daha iyisini önerebilirsin). Coin animasyonları, timer'lar, kartlar önemli. Para birimi her yerde "KLR" ve coin ikonu ile gösterilir. Tipografi rakam odaklı ve okunaklı olsun (bakiyeler, sayaçlar çok yerde var).

TASARLANACAK EKRANLAR:

1. ONBOARDING (3-4 adım): Davet kodu girişi → profil (boy, yaş, cinsiyet, mevcut kilo, hedef kilo) → hesaplanan günlük hedef kalori sonucu ekranı ("Günlük hedefin: 1.850 kcal") → "admin onayı bekleniyor" durumu. Sağlıksız hedef girilirse gösterilen uyarı/düzeltme durumu da tasarla.

2. ANA EKRAN / GÜNLÜK LOG: Üstte bakiye (KLR), streak alevi ve çarpanı (örn. 🔥12 gün, x1.24), günlük kalori progress bar'ı (yenen / hedef). Altında 4 öğün kartı: Kahvaltı, Öğle, Akşam, Snack — her kartta kalori girişi + opsiyonel foto ekleme. Gün sonu ödül anı: slot makinesi tarzı coin animasyonu, ödül breakdown'u "Temel: 220 KLR + Streak bonusu: +26 KLR (%12)". Streak kırılma ve Streak Kalkanı'nın otomatik devreye girme durumları da tasarla.

3. TARTI GÜNÜ EKRANI: Haftada 2 gün aktifleşir. Beklenen kilo vs girilen kilo karşılaştırması, baskül fotoğrafı yükleme, başarı durumunda +300 KLR ödül animasyonu. Tolerans göstergesi (beklenen +0,4 kg'a kadar yeşil).

4. PİYASA (FIRSATLAR): 2-5 fırsat kartı; her kartta tip ikonu (faiz, BTC, altcoin, hisse, döviz, fon, gayrimenkul, araba, saat, kumarhane), koşullar (süre, oran, kaldıraç, stok/lot), kalan stok ve "vitrin yenilenmesine kalan süre". Bazı kartlar bilerek kötü koşullu (tuzak) — görsel olarak diğerlerinden ayırt EDİLMESİN, oyuncu okuyup anlamalı. Satın alma onay modalı.

5. PORTFÖY: Sahip olunan varlıklar listesi — vadeli mevduat (kalan süre timer'ı), kripto/hisse pozisyonları (canlı fiyat, anlık kâr/zarar yeşil/kırmızı, "Sat" butonu), gayrimenkul ("ilana koy" akışı, satış 24 saat sürer), araba/saat prestij kartları. Üstte toplam net servet.

6. KUMARHANE: Ayrı, karanlık-neon bir atmosfer. Miktar + süre seçimi (1/2/3/6 saat), "masaya otur" onayı, aktif oturum timer ekranı, sonuç açıklama anı (0x-10x arası çarpan, dramatik reveal animasyonu).

7. DÜKKÂN: Kozmetikler (ucuz→prestij), AI Avatar (750 KLR, foto yükle), Cheat Day (1.000 KLR), Tatlı Bombası (500 KLR, hedef oyuncu seçme akışı), Streak Kalkanı (400 KLR). Tatlı Bombası'nın kurban tarafı: "X sana Tatlı Bombası attı! 24 saat içinde fotolu tatlı logla" bildirimi ve geri sayımı.

8. LİDERLİK TABLOSU: Net servet sıralaması; her satırda avatar, streak, net servet, şüpheli rozeti 🤨 varsa gösterilir. İki kupa önizlemesi: Kilorin Şampiyonu ve Dönüşüm Şampiyonu.

9. PROFİL: Avatar (AI veya dandik), sergilenen prestij varlıklar (araba/saat/gayrimenkul), kilo ilerleme grafiği, foto zaman tüneli (sadece gruba görünür), rozetler.

10. ADMİN PANELİ: Üye onayları, tartı fotoğrafı itiraz/red, sezon ayarları (uzunluk 8-24 hafta, tartı günleri).

Şüpheli rozeti durumunu (kazançlarda -%10 penaltı banner'ı) ilgili ekranlarda göster. Tüm metinler Türkçe, samimi ve esprili bir ton ("Kasa her zaman kazanır 😏" gibi mikro-copy'ler serbest).

## Assistant

_[tool: questions_v2]_

## User

Questions answered:
- palette: Explore a few options
- scope: Tüm ekranlar yan yana statik mockup canvas
- nav: Alt tab bar + Kumarhane gizli/ayrı giriş
- frame: Evet, gerçek telefon çerçevesinde
- variations: Ana ekran için 2-3 görsel varyasyon
- animation_level: 8
- typography: Decide for me
- mascot: Basit altın coin (K harfli)
- start_screen: Direkt ana ekran (onboarding ayrı erişilebilir)

## Assistant

_[tool: read_skill_prompt]_

_[tool: copy_starter_component]_

Building turn 1: three home-screen directions in different palettes, in real iPhone frames.

_[tool: dc_write]_

_[tool: ready_for_verification]_

Turn 1 hazır: ana ekranın 3 farklı yönü, gerçek iPhone çerçevesinde —

- **1a Toksik Neon** — yeşil vurgu, kart ağırlıklı, arcade enerjisi
- **1b Gece Kulübü** — magenta neon, dev bakiye hero, kumarhane DNA'sı
- **1c Terminal** — elektrik mavisi, yoğun fintech dashboard + ticker

Altın/KLR coin üçünde de sabit. Birini seç (ya da karıştır: "1b'nin hero'su + 1a'nın yeşili" gibi), sonra 10 ekranın tamamını o dilde kurayım.

## User

Found issues — fixing…

## Assistant

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

İki streak rozeti düzeltildi (1b hero pill'i artık tek satır, 1c kutusu düzgün iki satır). Yön seçimini bekliyorum.

## User

1a'yı beğendim, sadece 1b'nin 12.480 yazan dev KLR kısmını çok beğendim, 1a çerçevesi özellikle üst kısımlarda olmazsa çok daha iyi olacak gibi, alternatif renkerde görelim

## Assistant

Turn 2: 1a + 1b'nin dev hero bakiyesi, üst kısım çerçevesiz — 3 renk alternatifi ekliyorum.

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Turn 2 en üstte: 1a gövdesi + 1b'nin dev çerçevesiz hero bakiyesi, üç renkte —

- **2a** Neon yeşil (1a'nın rengi)
- **2b** Turkuaz — daha serin, premium
- **2c** Lila — altınla en zengin kontrast

Birini seç, 10 ekranın tamamını o dilde kurayım.

## User

Bir de light mode'larını görelim

## Assistant

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Turn 3 en üstte: aynı tasarımın light mode'ları — **3a** yeşil, **3b** turkuaz, **3c** lila. Vurgu renkleri aydınlık zeminde okunabilirlik için koyulaştırıldı; altın coin sabit. Not: kumarhane ekranını her durumda karanlık-neon tutmayı öneririm — hangi yönle devam edelim?

## User

3c ile tüm ekranları yap, dark ve light mode setting olsun

## Assistant

Şimdi 3c lilasıyla tüm uygulamayı kuruyorum — tema ayarı (light/dark) Tweaks'ten değişecek, kumarhane her temada karanlık kalacak. Birkaç adımda ekleyeceğim.

_[tool: dc_js_str_replace]_

_[tool: dc_set_props]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: dc_html_str_replace]_

_[tool: ready_for_verification]_

Turn 4 hazır: **21 ekran**, hepsi 3c lila dilinde, iPhone çerçevesinde —

- **Onboarding:** 4a kod · 4b profil · 4c hedef · 4d sağlıksız uyarı · 4e admin onayı
- **Günlük döngü:** 4f ana ekran · 4g ödül anı (coin yağmuru) · 4h streak kırıldı · 4i kalkan devrede · 4j tartı günü
- **Ekonomi:** 4k piyasa (3. kart tuzak, görsel olarak ayırt edilmez) · 4l satın alma modalı · 4m portföy + 🤨 penaltı banner'ı
- **Kumarhane:** 4n masa kurulumu · 4o aktif timer · 4p x3,2 reveal — her temada karanlık
- **Diğer:** 4q dükkân · 4r tatlı bombası kurbanı · 4s liderlik (iki kupa) · 4t profil · 4u admin

Sağdaki **Tweaks → theme: dark** ile tüm set geceye döner. Herhangi bir ekranı id'siyle söyle, derinleştireyim.

