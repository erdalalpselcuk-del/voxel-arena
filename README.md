# Voxel Arena

Blok dünyasında çok oyunculu FPS (Three.js + Node.js WebSocket). Poxel.io'nun modlarından ve Half-Life'ın silah/sağlık/zırh düzeninden esinlenildi.

## Çalıştırma

```bash
npm install
npm start          # http://localhost:3000
```

Az oyuncu varsa sunucu botlarla doldurur: `MIN_PLAYERS=6 npm start` (0 yazarsan bot olmaz). Port için `PORT`, ilk mod için `MODE=kc|ffa|rocket|tdm|ctf|zom`.
Arkadaşların aynı ağda `http://<senin-IP'n>:3000` ile bağlanır. İnternete açmak için WebSocket destekleyen bir sunucu (VPS) gerekir.

## Modlar (her turda sırayla değişir)

- **Kill Confirmed**: öldürdüğünün künyesini topla, 15 künyeye ilk ulaşan kazanır. Kendi künyeni alırsan iptal edersin.
- **Herkes Tek**: 20 öldürmeye ilk ulaşan kazanır.
- **Roket Arenası**: herkesin elinde RPG var, 15 öldürme.
- **Takım Savaşı**: Mavi ve Kırmızı takım, dost ateşi yok, 30 takım öldürmesine ilk ulaşan kazanır.
- **Bayrak Kapmaca**: Her takımın üssünde bir bayrak var. Düşman bayrağını kapıp kendi bayrağın yerindeyken üssüne götür, 3 sayıya ilk ulaşan kazanır. Taşıyıcı ölünce bayrak düşer, 15 sn içinde kendi takımından biri dokunursa üsse döner. Botlar da oynar.
- **Zombi Dalgası** (işbirlikçi): Herkes insan takımında. 6 dalga boyunca zombi, koşucu ve dev zombilere karşı hayatta kal. Zombiler haritada yol bulur (akış alanı). Dalga sürerken ölen, sonraki dalgada canlanır; herkes ölürse zombiler kazanır. Oyuncu sayısı arttıkça zombi sayısı artar.

## Odalar ve eşleştirme (sunucu)

Her oda kendi oyununa sahiptir. Sunucular > Çevrimiçi sunucu ile bağlanınca:
- **HIZLI OYUN**: seçili moda uygun en dolu açık odaya girer, yoksa yeni oda açar (az oyuncu varsa botlarla dolar).
- **ODA KUR**: mod (ya da karışık), bot sayısı, özel/açık seç. Özel odaya 4 harfli kodla girilir.
- **Kodla katıl** ve **açık odalar listesi** (`/api/rooms`). Boş odalar kapanır.
Çevrimiçi oyunda menü oyunu durdurmaz; menü açıkken 6 sn kalkanın olur (20 sn bekleme).

## Silah güçlendirme

Cephanelik'te sahip olduğun her silahı PX ile 5 seviyeye kadar geliştir (nadirlik arttıkça pahalı). Seviye başına hasar +%6, şarjör +%8, doldurma süresi -%5, sapma -%6 (yakın dövüşte yalnızca hasar). Hasar sunucuda, diğerleri istemcide uygulanır.

## Haritalar

Yeşil Vadi (tepeler, ağaçlar, ortada harabe kule), Çatılar (basamaklı binalar, sokaklar), Labirent (dar koridorlar, ortada arena). Her tur yeni seed ile yeniden üretilir.

## Silahlar ve eşyalar

28 silah: levye, bıçak, balta, katana; Glock, Magnum, Desert Eagle, Lazer Tabanca; AK-47, M4A1, SCAR-H, Altın AK, Plazma Tüfeği, MP5, P90, Vektör, Thompson, pompalı, çift namlu, AA-12, AWP, Barrett, Dragunov, arbalet, yay, RPG, bomba atar, minigun. Her silahın çekme, şarjör değiştirme, ateş ve nişan (ADS) animasyonu var (`public/weapons.js`). Yerden sağlık, zırh (hasarın %60'ını emer), el bombası ve silah toplanır. RPG'yi ayağına ateşlersen roketle zıplarsın.

Kozmetikler: 18 karakter skini, 23 şapka, 14 sırt eşyası, 17 silah kaplaması, 12 renk. 19 eşya yalnızca sezon pasından kazanılır.

Nadirlik (Pixel Gun tarzı): Sıradan, Nadir (mavi şerit), Epik (mor şerit + parlayan uç), Efsanevi (altın şerit, parlayan uç, halo). Mağazada ve oyunda silah modelinde görünür.

## Ödüller, kasalar, sezon pası, eşleştirme

- Tur sonunda sonuç ekranı: katılım, galibiyet, sıra ve kafa vuruşu ödülleri (PX, elmas, XP), sezon pası XP'si ve kasa düşme şansı.
- Kasalar (Bronz/Gümüş/Altın): mağazada PX veya elmasla alınır, rulet animasyonuyla açılır. Aynı eşya çıkarsa PX/elmas geri verir.
- Sezon pası: 50 kademe, ücretsiz ve premium (100 elmas) hat, 45 günlük sezonlar, günlük/haftalık pas görevleri, elmasla kademe atlama. 10. kademeden itibaren paketler, 50. kademede 4 efsanevi ödül.
- OYNA'ya basınca eşleştirme: oyuncu bulma, rastgele harita/mod seçimi, takımlar ve geri sayım. Hepsi tarayıcı sürümünde simülasyondur.

## Çevrimiçi / localhost

Tarayıcı sürümünde Sunucular > Çevrimiçi sunucu: kendi bilgisayarında `npm start` çalıştır, adres `ws://localhost:3000`. Başkasının sunucusu için `ws://IP:3000`. Sayfa https ise internetteki sunucular `wss://` ister (localhost hariç).

## Ana menü

Ortada dönen karakterin, solda menü, sağda panel var: Mağaza (renk, karakter, şapka, sırt, silah kaplaması, silah, gizemli kasa), Dolap, Cephanelik (silah seçimi ve istatistik), Görevler ve günlük bonus, Sıralama, Kulüp, Sunucular, Sohbet, Ayarlar. PX ve elmas oyunda kazanılır. Sıralama, kulüp, sunucu listesi ve sohbet ÖRNEK veridir. Oyunda Esc: Devam Et, ayarlar, Ana Menüye Dön.

## Yapı

- `server.js`: HTTP + WebSocket, 16 oyuncuya kadar
- `public/game.js`: oyun mantığı (hasar, mermiler, patlama, botlar, tavuklar, eşyalar, turlar). Sunucu ve tarayıcıdaki yerel mod aynı dosyayı kullanır
- `public/map.js`: harita üretimi, silah tablosu
- `public/client.js` + `public/index.html`: istemci (çizim, HUD, ses)
- `public/weapons.js`: silah modelleri ve animasyonlar; `public/profile.js`: profil/mağaza verisi; `public/lobby.js`: ana menü arayüzü
- `public/localserver.js`: sunucusuz tek kişilik mod (`window.LOCAL_BUILD = true` ile)

## Bilinen sınırlar

Silah seviyeleri istemciden bildirilir (sunucu 0-5 aralığına kırpar, doğrulayamaz). Hareket istemcide hesaplanır, sunucu hız sınırı uygular ama duvar içinden geçmeyi denetlemez. Hesap ve parti sistemi yok; mağaza, kulüp ve sohbet örnek/yerel. PX ve seviye yalnızca tarayıcıda saklanır. Mobil dokunmatik kontroller yok.

## Menü kalkanı (çevrimiçi)
Çevrimiçi sunucuda oyun asla durmaz; Esc ile menüyü açınca diğer oyuncular oynamaya devam eder.
Menü açıkken 6 sn "menü kalkanı" korur (20 sn bekleme süresi), sonra hedef olabilirsin.
Yerel/bot modunda menü oyunu gerçekten duraklatır.

## Silah modelleri
Tüm silah modellerine otomatik "kaynak" geçişi uygulanır: havada kalan parçalar (ör. AK arpacığı) gövdeye bağlanır.

## Maç seçimi

Ana menüde alttaki MOD ve HARİTA kartlarına basınca CS tarzı "Maç Seç" ekranı açılır: solda mod kartları (simge, açıklama, etiketler), sağda gerçek harita üretiminden çizilen yukarıdan görünüm küçük resimleri. Çevrimiçi sunucuda harita sunucudan gelir, yalnızca mod seçilir.

## Koleksiyonlar (Valorant tarzı kaplamalar)
12 koleksiyon (`public/colls.js`): Neon Şafak, Orman Ruhu, Şeker Dükkanı, Kızıl Oni, Buz Kraliçesi, Lav Çekirdeği, Elektrik, Nöbetçi, Altın Çağ, Glitch, Galaktik, Ejder Dişi. Her koleksiyon **tüm silahlara uyumlu** çalışır: renk ve parlamanın yanında silahın kendi ölçülerine göre şekil de değiştirir (ray, boynuz, diken, kanat, kristal, halka, taç, parçalı bloklar). Mağaza > Koleksiyon'dan alınır, Dolap'tan takılır, kasalardan çıkar; Galaktik ve Ejder Dişi sezon pasından kazanılır. Yeni bıçaklar: Karambit, Kelebek Bıçağı, Pala, Plazma Kılıcı.

## Gerçek çevrimiçi altyapı (lobi sunucusu)
`/lobby` WebSocket'i (`lobby.js`, `store.js`) oyun odalarından ayrıdır. Gerçek sohbet (genel + kulüp), "Çevrimiçi" listesi, sıralama, kulüpler (kur/katıl/ayrıl/üyeler) ve bulut kayıt sağlar. Veriler `DATA_DIR/db.json` dosyasında kalıcıdır. Hesap, tarayıcıda üretilen gizli anahtarla tanınır (Ayarlar > Hesap; başka cihaza içe aktarılabilir). Bağlantı yoksa oyun yerel kayıtla çalışır ve bağlanınca eşitlenir. Üst çubuktaki etiket durumu gösterir.

**Sınır:** PX, XP ve istatistikler istemciden gelir, sunucu doğrulamaz (hile koruması yok).

Sürekli açık kalma için bkz. **DEPLOY.md** (Fly.io, VPS + systemd + Caddy, Render, Cloudflare Tunnel; Dockerfile ve `/healthz` dahil).
