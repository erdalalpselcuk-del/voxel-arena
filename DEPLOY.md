# Voxel Arena: Sürekli Açık Sunucu Kurulumu

Sohbet, sıralama, kulüpler ve çok oyunculu odalar **tek bir Node.js sunucusunda** çalışır. Bilgisayarın kapanınca ya da barındırma uyuyunca bunlar da durur. "Gerçek ve sürekli" olması için sunucunun 7/24 çalışan bir yerde durması gerekir.

## Ne gerçek, ne değil?

| Özellik | Durum |
|---|---|
| Genel sohbet, kulüp sohbeti, "Çevrimiçi" listesi | Gerçek, sunucu üzerinden |
| Sıralama | Gerçek (tüm kayıtlı oyuncular) |
| Kulüpler (kur, katıl, ayrıl, üyeler) | Gerçek, kalıcı |
| Hesap / bulut kayıt | Gizli anahtarla (Ayarlar > Hesap). Anahtarı kopyalayıp başka cihazda içe aktarabilirsin |
| Oyun odaları (hızlı oyun, kodla katıl) | Gerçek |
| PX, elmas, XP, öldürme sayıları | İstemci bildirir, sunucu doğrulamaz. **Hile koruması yok**: bir oyuncu kendi puanını şişirebilir |
| Arkadaş listesi ve davet | Henüz yok ("Çevrimiçi" sekmesi herkesi gösterir) |

Anahtarı kaybeden hesabını kurtaramaz (e-posta/şifre yoktur). Anahtarı kimseyle paylaşma.

## Seçenek 1: Fly.io (önerilen, kolay)

1. `flyctl` kur ve `fly auth login` yap.
2. Proje klasöründe: `fly launch --no-deploy --copy-config` (ad sorarsa benzersiz bir ad ver, `fly.toml` içindeki `app` ile aynı olsun).
3. Kalıcı disk: `fly volumes create voxel_data --size 1 --region fra`
4. `fly deploy`
5. Adres: `https://<uygulama-adı>.fly.dev`. Oyun ve lobi aynı adresten açılır, `wss://` otomatik.

`fly.toml` makineyi hiç durdurmaz (`auto_stop_machines = "off"`, `min_machines_running = 1`). Küçük bir makine ayda birkaç dolar tutar. Diski (volume) silme, tüm hesaplar orada.

## Seçenek 2: Kendi VPS'in (Hetzner, DigitalOcean, vb.)

```bash
# Ubuntu/Debian
sudo apt install -y nodejs npm caddy
sudo useradd -r -m voxel
sudo mkdir -p /opt/voxel-arena /var/lib/voxel-arena
# proje dosyalarını /opt/voxel-arena içine kopyala, sonra:
cd /opt/voxel-arena && sudo npm install --omit=dev
sudo chown -R voxel /opt/voxel-arena /var/lib/voxel-arena
sudo cp deploy/voxel-arena.service /etc/systemd/system/
sudo systemctl enable --now voxel-arena
# alan adını sunucunun IP'sine yönlendir, deploy/Caddyfile içindeki adı değiştir:
sudo cp deploy/Caddyfile /etc/caddy/Caddyfile && sudo systemctl reload caddy
```

Caddy HTTPS sertifikasını kendisi alır ve WebSocket'i geçirir. `Restart=always` sayesinde çökerse kendiliğinden kalkar, sunucu açılınca da başlar.

## Seçenek 3: Render.com

`render.yaml` ile "New > Blueprint". **Ücretsiz plan 15 dakika işlem olmayınca uyur ve kalıcı diski yoktur**, yani kulüpler ve hesaplar silinir. Sürekli açık için ücretli (starter) plan ve disk gerekir; dosyadaki ayar buna göre.

## Seçenek 4: Kendi bilgisayarın (ücretsiz, ama bilgisayar açık olmalı)

```bash
npm install && npm start
# başka bir pencerede, dışarıya açmak için:
cloudflared tunnel --url http://localhost:3000
```

Verilen `https://....trycloudflare.com` adresini arkadaşlarınla paylaş. Bilgisayar kapanınca oyun da kapanır; adres her seferinde değişir (sabit adres için Cloudflare hesabında adlandırılmış tünel gerekir).

## Ortam değişkenleri

| Değişken | Varsayılan | Anlamı |
|---|---|---|
| `PORT` | 3000 | Dinlenen port |
| `HOST` | 0.0.0.0 | Dinlenen adres (Caddy arkasında 127.0.0.1) |
| `DATA_DIR` | `./data` | Hesaplar ve kulüplerin tutulduğu klasör (`db.json`). Konteynerde kalıcı diske bağla |
| `MIN_PLAYERS` | 4 | Herkese açık odalarda bot dolgusu (0 = bot yok) |
| `MAX_ROOMS` | 40 | En çok oda |
| `MAX_PER_IP` | 8 | Bir IP'den en çok oyun bağlantısı |
| `MODE` | (karışık) | İlk odanın modu |

## Önemli notlar

- **https sayfası `wss://` ister.** Sayfayı sunucudan açarsan (adres çubuğundaki adres) hepsi otomatik olur. Başka bir yerde barındırılan sayfadan `ws://` sunucuya bağlanılamaz.
- **Yedek:** `DATA_DIR/db.json` tek dosyadır, düzenli kopyala. Sunucu kapanırken (SIGTERM) son hali yazar.
- **Sağlık kontrolü:** `/healthz` ayakta olup olmadığını, oda ve oyuncu sayısını verir. UptimeRobot gibi bir servisle izleyebilirsin.
- **Tek sunucu:** Tüm oyuncular tek süreçte durur. 16 kişilik odalarla yüzlerce eşzamanlı oyuncuya yeter. Çok daha büyük için lobi ve oyun sunucuları ayrılmalı.
- **Hile koruması yok:** Ekonomi istemci tarafında. Ciddi bir herkese açık yayın için ödüllerin sunucuda hesaplanması gerekir.
