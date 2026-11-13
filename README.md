# Motion Studio

Kanal kur → script ver → tek tıkla motion video. Her video kanalın kütüphanesine düşer.
Yapay zeka çağrıları bilgisayarındaki `claude` (Claude Code aboneliğin) veya `gemini` (Antigravity ile aynı Google hesabı) komutu üzerinden gider; API anahtarı gerekmez.

## Başlatma

- **macOS:** `Baslat.command` dosyasına çift tıkla. Açılan Terminal penceresi sunucudur; açık kaldıkça uygulama çalışır.
- **Terminal:** `cd` ile bu klasöre gir, `./start.sh` (Windows: `start.bat`).
- Adres: http://127.0.0.1:5178 (Chrome veya Edge önerilir).
- "Bağlanmayı reddetti" hatası sunucunun kapalı olduğunu gösterir; yeniden başlat.

Gerekenler: Node 18+, Python 3. İlk açılışta `edge-tts` (sesler) ve `yt-dlp` (klip stüdyosu) otomatik kurulur. Klip stüdyosu için `ffmpeg` de gerekir.

## Kanallar

Önce kanal oluşturulur: ad, konsept, dil, format. İstersen yapay zeka konsepte göre stil, tema, müzik ve ilk konu fikirlerini önerir. Kanalın görsel stili, teması, sesi, müziği ve altyazı ayarı "Kanal ayarları" sekmesinde durur ve o kanalda üretilen her videoya uygulanır. Konsept, senaryoyu yazan yapay zekaya her seferinde verilir.

Dosyalar `output/<kanal>/<video>/` altına yazılır: `video.mp4`, `thumbnail.png`, `altyazi.srt`, `youtube.txt`, `plan.json`.

## Skill'ler ve konseptler

Galeride 54 kart var: awesome-claude-video-skills listesinden 27 GitHub skill'i, 15 hazır konsept ve 12 çizgi film konsepti (Haber Bülteni, Top 5 Liste, Soru–Cevap, Korku Hikayesi, Motivasyon, Bilim Laboratuvarı, Çocuk Masalı, Finans Brifingi, Tarih Belgeseli, Ürün Tanıtımı, Sohbet/Podcast, Synthwave, Minimal Koyu, Maç Analizi, Mizah). Her kartın kendi görünümü, teması ve anlatım talimatı vardır; kategoriye göre süzülebilir.

Her kart aşağıdaki temel görsel stillerden birinin üzerine kendi arka plan efektini, yazı tarzını ve yerleşimini koyar. Stil; yerleşimi, sahneye giriş animasyonlarını, arka plan efektini, ekran yazısını ve geçişleri değiştirir:

| Stil | Görünüm |
|---|---|
| Klasik Stickman | İkonlar ve altı çizili anahtar kelime |
| Beyaz Tahta / Kara Tahta | Her şey kalemle çizilerek belirir, el yazısı başlık |
| Kinetik Yazı | Anlatımın kelimeleri dev puntolarla ekrana vurur, renk blokları |
| Kağıt Kolaj | Kağıt kartlar, bant, fosforlu vurgu, noktalı baskı |
| Shorts Enerjisi | Dev yazılar, dönen ışınlar, sert kesmeler |
| Sinematik Hikaye | Sinema şeridi, ortada karakter, yazısız |
| İnfografik | Numaralı etiket, kart paneli, hareketli geometrik arka plan |
| Çizgi Roman | Panel çerçevesi, konuşma balonu |
| 8-bit Oyun | Pikselli görüntü, can ve seviye göstergesi |

Aynı stildeki farklı skill'ler senaryonun temposunu ve yönetmenlik talimatını değiştirir. Ayrıca her videonun kendi "tohumu" vardır: karakterin hangi tarafta durduğu, sahneye nasıl girdiği, ikonların dizilişi ve geçişler videodan videoya değişir.

"Skill'i kur" reponun SKILL.md dosyasını indirir, senaryo isteğine ekler ve `~/.claude/skills` altına bağlar. Dış repoların kendi render araçları çalıştırılmaz; videoyu her zaman bu uygulamanın motoru çizer.

## Video üretme

Üç giriş yolu var: hazır script (`---` ile ayırarak birden çok video), konu verip script'i yapay zekaya yazdırmak, konuyu da yapay zekaya buldurmak. Adet 1–10, süre dakika cinsinden.

## Klip oluştur

Ana sayfa. YouTube bağlantısı yapıştır ya da video dosyası sürükle/yükle; gerisi otomatik ilerler:

1. Video bu bilgisayara indirilir (`yt-dlp`) ve varsa altyazısı okunur.
2. Altyazı yoksa ve bilgisayarda Whisper kuruluysa konuşma yazıya dökülür (`pip install openai-whisper`, Apple Silicon için `pip install mlx-whisper`).
3. Bilgisayarındaki yapay zeka (Claude Code / Gemini CLI) transkripte bakıp en iyi anları seçer; her klibe 0–100 viral skoru (hook, etkileşim, değer, paylaşım), başlık ve hook cümlesi verir.
4. Klipler kesilir, 9:16 / 1:1 / orijinal kadrajlanır, altyazı ve hook başlığı gömülür (`ffmpeg`).

- **Altyazı şablonları:** Varsayılan (kelime vurgulu), Minimal, Neon, Podcast; font ve vurgu rengi seçilir.
- **Editör:** her klipte "Düzenle" ile başlangıç/bitiş, kadraj kaydırma, hook, şablon ve altyazı satırları değiştirilip klip yeniden üretilir.
- Transkript yoksa klipler eşit bölünür ve altyazısız olur; altyazıyı editörde elle yazabilirsin.
- Yüz algılamalı otomatik kadraj, B-roll ve sosyal medyaya doğrudan yayın yoktur.
- Yalnızca kendi videolarını ya da kullanım iznin olan içerikleri kullan.

## Çizgi film karakterleri

"Çizgi Film" kategorisindeki konseptlerde karakterler giyimlidir (32 kostüm: asker, general, kral, kraliçe, bilim insanı, doktor, korsan, şövalye, kovboy, astronot…), sahneler dolu renkli manzaralardır (13 mekân), üst köşelere ülke bayrakları asılabilir (24 bayrak) ve yere hayvan/nesne konabilir. Senaryoyu yazan yapay zeka her sahne için kadroyu, bayrakları ve mekânı seçer; aynı karakter tüm sahnelerde aynı kostümle kalır.

## Notlar

- Sunucu yalnızca `127.0.0.1` adresini dinler; CLI girişlerin bilgisayarında kalır. Uygulamayı internete açma.
- Klip sayfasının tasarımı açık kaynaklı SupoClip'ten esinlenmiştir; kodu kullanılmamıştır (bkz. NOTICE.md).
- Kanal silmek yalnızca listeden kaldırır; video dosyaları `output/` altında kalır.


## Film stüdyosu (yatay, 10+ dakika, görsel anlatımlı)

Yan menüde **Film stüdyosu**. Tür seç (Disiplin, Psikoloji, Korku, Tarih, Bilim, Para, Masal, Anime, Noir, Teknoloji…), konu ya da hazır script yaz, süreyi 1–30 dk ayarla.

1. Bilgisayarındaki yapay zeka filmi bölümlere böler, her sahne için anlatım + görsel istemi yazar (script hazırsa anlatım aynen korunur).
2. Görsel kaynağı seçilir: **Ücretsiz Flux (Pollinations, anahtarsız — varsayılan)**, **Gemini görsel** (Ayarlar'daki ücretsiz Gemini API key), **Yapay zeka çizimi** (Claude/Gemini aboneliğin SVG çizer) ya da kredili [Muapi.ai](https://muapi.ai). Muapi: görseller üretilir (Open-Higgsfield-AI'nin kullandığı API; MIT). **Bulut servistir, kredi ile çalışır; yerel model değildir.** Anahtar: Ayarlar → Muapi anahtarı (yalnızca `config.local.json`'da kalır).
3. Ses (edge-tts vb.), altyazı, müzik ve Ken Burns kamera hareketleri tarayıcıda eklenir; 16:9 MP4 + kapak (büyük yazılı) + açıklama kanalına kaydedilir.
4. "Tutarlı karakter": önce karakter referansı üretilir, sahneler ona göre düzenlenir.

Maliyet kabaca: dakika başına ~8 görsel (10 dk ≈ 80 görsel + kapak). En ucuz model Flux Schnell.

### Hareketli çizgi film modu (tamamen token)
Film stüdyosunda varsayılan biçim. Görsel kaynağı gerekmez: bilgisayarındaki yapay zeka (Claude Code / Antigravity) bölüm bölüm sahneleri yönetir (kimin hangi kostümle, hangi hareketle, nereden gireceği), motor karakterleri tam vücut animasyonla oynatır. "Arka planları yapay zeka çizsin" açılırsa her sahne için ayrıca SVG manzara çizilir (daha çok token, daha özgün mekân). 10+ dakika yatay videolar için uygundur.

## 3D görünüm

Film stüdyosunda "3D görünüm" kutusu (toon format): karakterler ışık-gölge hacmi, parlak kenar ve yere yumuşak gölge alır. Gerçek 3D model değil, 2D motor üstünde hacim efekti.

## Kadro ve sabit sesler (Film stüdyosu, toon format)

Film stüdyosunda **🎭 Kadro ve sesler** bölümü: anlatıcı sesi + en fazla 4 karakter (isim, kostüm, ses, ton). Boş bırakırsan yapay zeka karakterleri adlandırır, her birine cinsiyetine göre **birbirinden farklı sabit bir ses** atanır. Her sahnenin bir konuşmacısı vardır (anlatıcı ya da bir karakter); konuşan karakter ekranda kendi kostümüyle görünür, sol altta isim plakası çıkar ve hep kendi sesiyle seslendirilir. Görsel stil 2D kalır.
