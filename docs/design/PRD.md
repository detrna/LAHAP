# PRD: Platform Langganan Katering untuk UMKM (LAHAP)

> **Dokumen Spesifikasi Persyaratan Produk (PRD) — Panduan Rekayasa & Aturan Bisnis untuk Agentic Coding**  
> **Tim:** Dzamili  
> **Sub-tema:** Accelerating Digital Transformation for Business and SMEs  
> **Cakupan Rilis MVP:** 1 Usaha Katering Demo (Arsitektur siap Multi-tenant melalui entitas tunggal `business`)  
> **Target Demo Final:** 10 November 2026  

---

## 1. Ringkasan Eksekutif & Identitas Produk

**LAHAP** adalah platform web terpadu untuk UMKM katering skala kecil/rumahan guna mengelola layanan langganan makanan harian, mingguan, dan bulanan secara digital dan self-service. 

Platform ini mentransformasi proses katering konvensional yang sebelumnya manual (pesan lewat chat WhatsApp, rekonsiliasi pembayaran manual, penentuan porsi masak berdasarkan tebakan, penugasan kurir manual, dan tidak terpantaunya churn) menjadi alur digital end-to-end:
1. **Self-Service Customer Ordering:** Pelanggan memilih paket, periode, hari layanan, waktu makan, metode penerimaan (Diantar/Pick Up), dan membayar secara langsung via Payment Gateway (Midtrans) atau tunai (khusus pembelian langsung/Offline).
2. **Simplified Operational To-Do Lists:** Dapur dan kurir bekerja secara efisien menggunakan tampilan to-do list sederhana berbasis mobile. Dapur menandai status persiapan makanan dan menangani alergen; kurir melihat titik antar dan menandai pengantaran selesai.
3. **Automasi Berbasis Aturan (Rule-Based Automations):**
   - **Prediksi Produksi Harian (ToCook):** Menghitung porsi masak dan takaran bahan baku harian secara on-request dari pesanan aktif berstatus `Success`.
   - **Deteksi Kebutuhan Stok Bahan Baku:** Menghitung sisa bahan dan kekurangan belanja otomatis.
   - **Deteksi Churn Pelanggan:** Menandai pelanggan yang sudah tidak aktif berlangganan (> 14 hari) untuk follow-up semi-manual via tautan WhatsApp (`wa.me`).

### Model Bisnis (B2B2C)
* **Lapis 1 (B2B / SaaS):** Platform disewakan atau disediakan bagi pemilik usaha katering (Admin/Owner).
* **Lapis 2 (B2C / Subscription):** Pemilik katering menggunakan platform ini untuk menjual paket makanan berlangganan kepada pelanggan akhir (konsumen).

### Prinsip Produk & Rekayasa
* **Simpel tapi Jelas:** Ditujukan bagi UMKM dan staf operasional yang kemungkinan tidak melek teknologi tinggi; hindari tabel data mentah ala enterprise software kaku.
* **Backend sebagai Single Source of Truth:** Seluruh kalkulasi harga, potongan diskon, ongkir, batas waktu, dan validasi transisi status wajib dihitung dan divalidasi di backend.
* **Multi-Tenant Ready:** Demo kompetisi dijalankan untuk 1 usaha katering. Profil usaha dan pengaturan global (koordinat dapur, tarif ongkir default, jarak maksimum, batas waktu pembayaran, nomor WhatsApp) disimpan pada entitas tunggal `business` (satu baris). Penambahan kolom `business_id` pada tabel lain (pelingkupan tenant) ditunda dan direncanakan sebagai migrasi aditif setelah MVP.

---

## 2. Masalah yang Diselesaikan (Problem Statements)

1. **Ketiadaan Pencatatan Pemesanan Terstruktur:** Menyebabkan kesalahan pemenuhan pesanan dan hilangnya riwayat pesanan pelanggan.
2. **Ketiadaan Fitur Self-Service Langganan:** Pelanggan harus konfirmasi berulang kali via chat manual untuk memesan, memilih hari, atau melewati (skip) pengiriman.
3. **Pencatatan Stok & Produksi Terfragmentasi:** Kurangnya sinkronisasi antara pesanan masuk dengan takaran belanja bahan baku dan kapasitas masak, memicu pemborosan makanan (*food waste*) atau kekurangan porsi.
4. **Pencatatan Alergi yang Rawan Kelalaian:** Preferensi pantangan/alergi pelanggan sering terlewat jika hanya dicatat manual di buku/chat, membahayakan keselamatan pelanggan.
5. **Evaluasi Menu Berbasis Tebakan:** Pemilik usaha mengganti menu secara spekulatif tanpa data preferensi riil.
6. **Bottleneck Distribusi & Kurir:** Penugasan kurir dan pemantauan pengantaran terpusat pada pemilik usaha, tanpa status transparan ke pelanggan.
7. **Kehilangan Pelanggan Tanpa Deteksi (Silent Churn):** Pemilik usaha tidak mengetahui pelanggan lama yang berhenti memesan, kehilangan potensi pendapatan berulang (*recurring revenue*).

---

## 3. Peran Pengguna & Persona (Target Actors)

| Peran (Role) | Kategori | Lingkungan Akses | Deskripsi & Tanggung Jawab Utama |
| :--- | :--- | :--- | :--- |
| **Pelanggan** | B2C | Browser HP / Mobile Web | Konsumen (mahasiswa, pekerja kantor, keluarga). Memilih pemesanan Online/Offline, memilih paket, jadwal, alamat/pin lokasi, membayar via payment gateway, melacak status slot live, skip slot, dan mengatur profil alergi. |
| **Admin / Pemilik Usaha** | B2B | Desktop / Tablet Browser | Pemilik usaha katering (owner). Mengelola paket, jadwal menu, master bahan & stok, verifikasi pembayaran tunai, penugasan kurir, pemantauan ToCook, deteksi churn, promosi, dan broadcast notifikasi. |
| **Staf Dapur** | Internal Staff | Mobile Browser | Tim memasak. Melihat to-do harian porsi & komponen menu, melihat tab Kategori Khusus (alergi/catatan), mengalokasikan Menu Alternatif manual, menekan "Makanan Siap", dan memperbarui sisa stok fisik. |
| **Staf Kurir** | Internal Staff | Mobile Browser | Petugas pengantar. Melihat daftar slot antar yang ditugaskan untuk hari & waktu makan terkait, melihat titik koordinat/alamat, mencatat kendala jalan (obstacle note), dan menandai pengantaran "Selesai". |

> [!NOTE]
> Seluruh peran login melalui satu halaman login terpadu (`/login`) dengan kredensial Nomor HP / Email + Password. Sistem mengidentifikasi `role` dan melakukan auto-redirect ke portal masing-masing.

---

## 4. Glosarium Konsep & Entitas Domain

Istilah-istilah berikut wajib digunakan secara konsisten pada kode backend, basis data, API response, dan antarmuka UI:

> [!IMPORTANT]
> **Pemetaan istilah PRD ke entitas teknis:** **Pesanan** (pesanan langganan pelanggan, beserta statusnya `Pending`/`Success`/`Expire`/`Dibatalkan`) = entitas `Subscription` (tabel `subscription`). **Slot** = entitas `Order` (tabel `order`). **Jadwal Menu** = entitas `Schedule` (`MenuSchedule` pada UML). Jadi kata "pesanan" pada aturan bisnis (mis. BR-13, BR-21, BR-22) merujuk ke `subscription`, bukan tabel `order`.

* **Paket (Subscription Plan):** Produk langganan yang dikonfigurasi admin (nama, deskripsi, durasi yang ditawarkan, jam/waktu pengantaran menu (`delivery_time`) yang merepresentasikan waktu menu akan diantarkan kepada pelanggan, harga flat per porsi, foto cover (`photo_url`), masa berlaku `start_at`–`end_at`, serta parameter ongkir khusus paket). Contoh awal: Paket Hemat (Rp15.000) dan Paket Reguler (Rp20.000).
* **Periode Pesanan (Interval):** Durasi paket yang dipilih pelanggan: **Harian** (`daily`), **Mingguan** (`weekly`), atau **Bulanan** (`monthly`).
* **Hari Layanan (Service Day):** Hari kalender Senin–Minggu yang memiliki menu terpublikasi pada paket terkait.
* **Waktu Makan & Waktu Pengantaran (Meal Time / `delivery_time`):** Properti pada paket yang merepresentasikan jam atau rentang waktu spesifik kapan menu makanan akan diantarkan kepada pelanggan (misalnya slot Pagi: 07:00, Siang: 12:00, Malam: 18:30). Admin dapat menambah, mengubah jam, atau menghapus jadwal.
* **Slot:** Unit terkecil dari langganan, merupakan kombinasi **$	ext{Tanggal} + 	ext{Waktu Makan}$** dalam satu pesanan.  
  $$\mathbf{1	ext{ Slot}} = \mathbf{1	ext{ Porsi}} = \mathbf{1	ext{ Pengiriman}}$$
  Setiap slot memiliki status siklus hidup mandiri dan dapat di-skip oleh pelanggan.
* **Menu Utama & Menu Alternatif:** Setiap slot menyajikan **1 menu utama (tetap)**. Admin dapat menyiapkan **opsional 1 menu alternatif** khusus bagi pelanggan yang alerginya bentrok. Setiap menu memuat `name`, `description`, `tags[]`, dan foto hidangan (`photo_url`). Pelanggan tidak memilih menu sendiri saat memesan.
* **Bahan Baku (Ingredient):** Komoditas stok dapur dengan atribut `name`, `unit`, `stock`, `minimum_threshold`, dan foto kemasan/wadah (`photo_url`) untuk kalibrasi visual AI.
* **Tingkatan Loyalitas (Tier):** Level reward loyalitas (`name`, `required_subscription_days`, `duration_days`, `discount_percent`, dan lencana visual `photo_url`) berdasarkan akumulasi hari langganan sukses pelanggan.
* **Draft vs. Publikasi (Menu Publication):** Menu katering disusun admin sebagai status *Draft* (privat). Setelah tervalidasi, admin menekan *Publish* agar tampil di beranda pelanggan.
* **Pemesanan Online vs. Offline:**
  * **Online:** Dipesan mandiri via web; pembayaran non-tunai melalui Midtrans.
  * **Offline:** Pelanggan datang langsung ke tempat katering; pembayaran via Midtrans atau Tunai langsung ke kasir.
  * Keduanya sama-sama dapat memilih metode pengantaran Diantar maupun Ambil Sendiri.
* **Metode Penerimaan:**
  * **Diantar (Kurir):** Makanan dikirim kurir ke titik koordinat pin peta pelanggan; dikenakan ongkir per slot berdasarkan jarak Haversine.
  * **Ambil Sendiri (Pick Up):** Pelanggan mengambil makanan di lokasi dapur usaha; ongkir Rp0.
* **Cut-Off Pemesanan / Pembatalan:** Batas waktu terakhir pelanggan dapat memesan atau membatalkan pesanan: **pukul 23:59:59 pada hari sebelum hari layanan pertama pesanan dimulai**.
* **Skip (Dilewati):** Hak pelanggan untuk melewatkan slot tertentu sebelum makanan ditandai siap oleh dapur. **Tidak ada pengembalian dana (tanpa refund)** dan tidak mengembalikan ongkir.
* **Tag Alergen:** Penanda alergi pada bahan baku. Menu secara otomatis mewarisi tag alergen dari gabungan (*union*) bahan-bahan penyusunnya.
* **Pesanan Aktif:** Pesanan berstatus `Success` yang rentang periode tanggal layanannya sedang berlangsung atau belum berakhir.
* **Pelanggan Churn:** Pelanggan yang pernah memiliki riwayat pesanan `Success`, saat ini tidak memiliki pesanan aktif, dan periode pesanan terakhirnya telah berakhir $> 14$ hari yang lalu.

---

## 5. Aturan Bisnis Inti (Business Rules BR-01 s.d. BR-28)

Setiap logika domain, validasi kontroler, middleware, dan query database wajib mematuhi aturan berikut:

### Paket & Harga
* **BR-01 (Pengelolaan Paket):** Paket dibuat dan dikelola penuh oleh admin; jumlah paket tidak dibatasi. Harga flat per porsi ditetapkan oleh admin.
* **BR-02 (Flat Pricing):** Harga bersifat flat per paket. Seluruh variasi menu dalam satu paket berharga sama, dan harga tidak berubah meskipun menu utama diganti atau menu alternatif diberikan.
* **BR-03 (Atribut Paket & Masa Berlaku):** Properti paket mencakup: `name`, `description`, `duration` (pilihan durasi yang diizinkan), `delivery_time` (jam/waktu spesifik menu akan diantarkan ke pelanggan), `price` (harga flat/porsi), `photo_url`, `start_at`, `end_at`, serta opsi parameter ongkir khusus paket. Paket yang telah melewati `end_at` otomatis nonaktif dan ditolak untuk pesanan baru.

### Periode, Jadwal & Menu
* **BR-04 (Periode & Ketersediaan Layanan):** Pelanggan dapat memesan periode Harian, Mingguan, atau Bulanan. Hari layanan adalah Senin–Minggu, namun slot yang dapat dipilih hanyalah hari yang telah memiliki menu berstatus publikasi (*published*).
* **BR-05 (Jadwal & Waktu Pengantaran Menu / `delivery_time`):** Waktu pengantaran mengikuti properti `delivery_time` pada paket yang merepresentasikan jam atau jendela waktu menu akan tiba/diantarkan ke pelanggan (default: Pagi 07:00, Siang 12:00, Malam 18:30). Admin berhak menambah jam baru, menghapus jam, atau mengubah jam pengantaran. Jadwal yang sedang terikat pada pesanan aktif dilarang dihapus.
* **BR-06 (Mekanisme Pemilihan Slot):**
  * **Harian:** Pelanggan memilih kombinasi hari dan waktu makan secara spesifik, dan hanya membayar slot yang dipilih.
  * **Mingguan / Bulanan:** Pelanggan mencentang waktu makan yang berlaku berulang pada seluruh hari layanan dalam minggu/bulan yang dipilih.
  * *Constraint:* Tidak ada input jumlah porsi acak (1 slot = 1 porsi) dan tidak ada tanggal mulai kustom di luar siklus yang menunya telah dipublikasikan.
* **BR-07 (Struktur Menu per Slot & Presentasi Visual):** Setiap slot hanya memiliki **1 menu utama** dan opsional **1 menu alternatif**. Setiap menu dilengkapi dengan foto hidangan (`photo_url`), deskripsi, dan komposisi bahan baku untuk transparansi pelanggan. Pelanggan tidak memilih hidangan secara bebas di muka.
* **BR-08 (Publikasi Menu & Pengingat Otomatis):** Menu disusun dalam status draft. Publikasi bersifat fleksibel (tidak terikat siklus mingguan kaku). Sistem mengirimkan notifikasi internal ke admin jika jadwal minggu layanan berikutnya belum terisi menu.
* **BR-09 (Batas Waktu Cut-Off):** Batas akhir pemesanan baru dan pembatalan pesanan adalah sedetik sebelum periode dimulai (23:59:59 H-1 sebelum hari layanan pertama).
* **BR-10 (Highlight Jadwal Pelanggan):** Antarmuka kalender jadwal menandai secara visual (*highlight*) periode langganan aktif milik pelanggan yang sedang login.
* **BR-11 (Aturan Skip Slot):** Pelanggan dapat melakukan skip slot kapan saja sebelum status makanan diubah menjadi siap masak/antar (`Diantar` atau `Siap Diambil`). Skip tidak mengurangi tagihan, tidak mengembalikan ongkir, dan slot tetap dihitung sebagai pemasukan usaha.

### Alur Pemesanan & Pengantaran (Ongkir)
* **BR-12 (Alur Checkout):** Urutan pemesanan wajib linier:  
  $$	ext{Beranda} 
ightarrow 	ext{Pesan} 
ightarrow 	ext{Pilih Online/Offline} 
ightarrow 	ext{Pilih Paket, Periode, Hari, Jam} 
ightarrow 	ext{Data Pemesan \& Catatan} 
ightarrow 	ext{Metode Diantar/Ambil Sendiri} 
ightarrow 	ext{Ringkasan} 
ightarrow 	ext{Pembayaran}$$
* **BR-13 (Konsistensi Metode Penerimaan):** Metode Diantar atau Ambil Sendiri berlaku untuk seluruh pesanan (tidak bisa dicampur per hari). Jika pelanggan ingin berganti metode, pelanggan harus membatalkan pesanan sebelum cut-off lalu membuat pesanan baru.
* **BR-14 (3 Parameter Tarif Ongkir):** Perhitungan ongkir menggunakan 3 parameter admin:
  1. **Radius Gratis (`radius_gratis`):** dalam km (contoh default: 1 km).
  2. **Jarak Maksimum Layanan (`jarak_maksimum`):** dalam km (contoh: 10 km).
  3. **Harga per KM (`harga_per_km`):** tarif setelah radius gratis (contoh default: Rp5.000/km).  
  *Catatan:* Berlaku tarif default global usaha, namun admin dapat menimpanya (*override*) pada tingkat paket.
* **BR-15 (Rumus Jarak & Ongkir Haversine):**
  * Jarak dihitung lurus berdasarkan koordinat WGS 84 antara lokasi dapur katering dan pin alamat pelanggan menggunakan rumus Haversine, **dibulatkan ke atas ($\lceil	ext{jarak}
ceil$)**, tanpa API komersial berbayar:  
    $$	ext{ongkir\_per\_slot} = egin{cases} 0, & 	ext{jika } 	ext{jarak} \le 	ext{radius\_gratis} \ (\lceil	ext{jarak}
ceil - 	ext{radius\_gratis}) 	imes 	ext{harga\_per\_km}, & 	ext{jika } 	ext{jarak} > 	ext{radius\_gratis} \end{cases}$$
  * Jika jarak melebihi `jarak_maksimum`, opsi **Diantar otomatis disembunyikan**, dan pesanan hanya dapat dilanjutkan dengan metode **Ambil Sendiri** (atau pemesanan Offline). Pesanan tidak ditolak.
* **BR-16 (Ongkir per Slot & Isolasi Diskon):** Ongkir dihitung per slot pengantaran ($	ext{ongkir\_per\_slot} 	imes 	ext{jumlah slot yang diantar}$). Ongkir dicatat terisolasi dari harga makanan dan **tidak boleh dikenakan diskon tier maupun kode promo**. Perubahan tarif ongkir hanya berlaku untuk pesanan baru.

### Harga, Diskon & Promosi
* **BR-17 (Kalkulasi Total Pembayaran):**  
  $$\mathbf{Total} = (	ext{Jumlah Slot} 	imes 	ext{Harga Paket}) - 	ext{Diskon Tier} - 	ext{Diskon Promo} + (	ext{Jumlah Slot Diantar} 	imes 	ext{Ongkir per Slot})$$  
  Frontend hanya menampilkan rincian perhitungan; Backend adalah sumber kebenaran mutlak total akhir.
* **BR-18 (Aturan Diskon Bertingkat & Stacking):** Diskon hanya terdiri dari dua jenis:
  1. **Diskon Tier:** Otomatis berdasarkan lama akumulasi hari langganan yang sudah dibayar. Setiap tingkatan loyalitas (`Tier`) memiliki lencana/ikon visual (`photo_url`) serta persentase diskon yang otomatis memotong subtotal makanan.
  2. **Kode Promo:** Potongan persen atau nominal dengan kuota, batas waktu, dan minimal belanja.
  * **Urutan Pemotongan:** Diskon tier dipotong terlebih dahulu dari subtotal makanan. Selanjutnya, kode promo dipotong dari harga makanan yang sudah turun tersebut.
  * **Opsi Stacking (`allow_stack_with_tier`):** Pengaturan penggabungan diskon **melekat pada entitas `PromoCode` (bukan pada Paket)**, aktif secara default (`true`). Jika dimatikan (`false`), sistem secara otomatis hanya menerapkan satu potongan terbesar di antara keduanya.

### Pembayaran & Status Siklus Hidup
* **BR-19 (Gateway Pembayaran & Kasir):** Integrasi pembayaran menggunakan Midtrans Sandbox untuk demo. Pesanan Online otomatis terkonfirmasi melalui webhook Midtrans. Pesanan tunai Offline berstatus `Pending` dan wajib diverifikasi manual oleh admin setelah kasir menerima fisik uang.
* **BR-20 (Timeout Pembayaran):** Status pembayaran seragam: `Pending`, `Success`, `Expire`. Pesanan `Pending` yang tidak diselesaikan dalam batas waktu (default: 15 menit, dapat diatur admin) otomatis dibatalkan menjadi `Expire` melalui worker terjadwal.
* **BR-21 (Status Pesanan Tersimpan vs. Label Turunan):**
  * **Status Database Tersimpan:** `Pending`, `Success`, `Expire`, `Dibatalkan` (oleh pelanggan sebelum cut-off).
  * **Label Tampilan Turunan (Derived Labels):** `Akan Datang`, `Aktif`, dan `Selesai`. Label ini dikalkulasi secara dinamis dari tanggal periode pesanan `Success`, bukan disimpan sebagai kolom status di database.
* **BR-22 (Integritas Operasional Pesanan Success):** Hanya pesanan berstatus `Success` yang dimasukkan ke dalam perhitungan ToCook dapur, daftar to-do kurir, laporan keuangan, dan evaluasi churn. Slot yang di-skip tidak dimasukkan ke dalam produksi porsi dan kurir.
* **BR-23 (Transisi Status Slot Pengantaran):** Status slot wajib bergerak maju satu arah (out-of-order changes ditolak):
  * **Jalur Diantar:** `Terjadwal` $
ightarrow$ `Disiapkan` $
ightarrow$ `Diantar` $
ightarrow$ `Selesai`
  * **Jalur Ambil Sendiri:** `Terjadwal` $
ightarrow$ `Disiapkan` $
ightarrow$ `Siap Diambil` $
ightarrow$ `Selesai`
  * Slot yang dilewati berubah menjadi `Dilewati`.
  * Kendala di perjalanan (ban bocor, hujan) **tidak menjadi status baru**, melainkan dicatat sebagai *Catatan Kendala* (obstacle note) ber-timestamp dan memicu notifikasi real-time.

### Alergi, Catatan & Komunikasi
* **BR-24 (Manajemen Alergi & Bahan Baku):** Penandaan alergi dikelola di tingkat bahan baku (`Ingredient`). Setiap bahan baku memuat nama, satuan, stok fisik, ambang batas minimum, dan foto referensi kemasan/wadah (`photo_url`) untuk kalibrasi visual dapur & AI. Menu mewarisi tag alergen dari bahan-bahannya. Profil pelanggan mencatat alergi yang dipilih. Jika menu bentrok saat checkout, sistem menampilkan peringatan (namun tidak memblokir pesanan). Dapur mengeksekusi penggantian Menu Alternatif secara manual; sistem tidak mengganti menu secara otomatis.
* **BR-25 (Fungsi Kolom Catatan Pesanan):** Kolom catatan pada form pesanan hanya diperuntukkan bagi permintaan selera non-alergi (mis. "tanpa sambal", "sayur dipisah"), bukan untuk deklarasi alergi baru.
* **BR-26 (Aturan Perubahan Menu Terpublikasi):** Jika slot menu sudah memiliki pesanan `Success`: admin wajib mengisi alasan penggantian menu, sistem otomatis mengirimkan notifikasi level paket kepada pelanggan terkait, tag alergen dihitung ulang, dan slot tersebut dilarang dihapus. Harga flat tidak berubah.
* **BR-27 (Sistem Notifikasi Terpadu 3 Level):** Sistem komunikasi menggunakan notifikasi in-app 3 level:
  1. **Level Paket:** Terkirim ke semua pelanggan dengan pesanan `Success` pada paket tertentu (mis. perubahan menu).
  2. **Level Aplikasi:** Terkirim ke seluruh pengguna aplikasi (pengumuman operasional/libur).
  3. **Level Pelanggan:** Terkirim spesifik ke 1 pelanggan (penggantian menu alternatif, catatan kendala kurir).  
  *Catatan:* Tidak ada tab pengumuman terpisah. Real-time update disalurkan via Server-Sent Events (SSE).
* **BR-28 (Kriteria Churn & Win-Back):** Pelanggan diklasifikasikan sebagai Churn jika: pernah memesan, tidak memiliki pesanan `Aktif`, dan pesanan terakhirnya telah berakhir $> 14$ hari lalu. Admin melakukan follow-up semi-manual via link WhatsApp (`wa.me`) dengan template pesan yang telah terisi otomatis (termasuk kode promo win-back).

---

## 6. Sinkronisasi Antar Peran & Mesin Status (State Machine)

### A. Matriks Siklus Hidup Pembayaran & Pesanan
| Status Database | Arti Operasional | Aktor Pengubah | Dampak Sistem |
| :--- | :--- | :--- | :--- |
| **`Pending`** | Menunggu pembayaran | Sistem (saat tekan Pesan) | Belum masuk ToCook, belum masuk kurir, belum dihitung pemasukan. |
| **`Success`** | Lunas | Webhook Midtrans / Admin (Tunai) | Masuk daftar produksi ToCook & kurir sesuai tanggal; dihitung pemasukan. |
| **`Expire`** | Melewati batas timeout bayar | Worker terjadwal sistem | Slot hangus, diabaikan dari seluruh kalkulasi. |
| **`Dibatalkan`** | Dibatalkan sebelum cut-off | Pelanggan (`UC-43`) | Keluar dari produksi & kurir. Jika sudah lunas, ditandai `needs_refund = true` untuk refund manual admin di luar aplikasi. |

### B. Matriks Transisi Status Slot Pengantaran
| Status Slot | Jalur Berlaku | Aktor Pengubah | Waktu / Kondisi Pemicu |
| :--- | :--- | :--- | :--- |
| **`Terjadwal`** | Semua | Sistem | Status awal saat pesanan lunas sebelum hari layanan tiba. |
| **`Disiapkan`** | Semua | Sistem Otomatis | Memasuki jam operasional pada hari layanan terkait. |
| **`Diantar`** | Diantar (Kurir) | Staf Dapur (atau Admin koreksi) | Dapur menekan tombol **"Makanan Siap"**. |
| **`Siap Diambil`** | Ambil Sendiri | Staf Dapur (atau Admin koreksi) | Dapur menekan tombol **"Makanan Siap"**. |
| **`Selesai`** | Diantar / Ambil | Kurir (Diantar) / Admin (Ambil) | Kurir menyerahkan makanan / Pelanggan mengambil makanan di outlet. |
| **`Dilewati`** | Semua | Pelanggan | Pelanggan menekan tombol **"Skip"** sebelum status makanan siap. |

### C. Matriks Hak Aksi per Peran (Action Rights Matrix)
| Aksi / Data Domain | Pelanggan | Admin / Owner | Staf Dapur | Staf Kurir |
| :--- | :---: | :---: | :---: | :---: |
| **Pesan & Batalkan (pre-cutoff)** | Eksekusi | Pantau | Tidak Tampil | Tidak Tampil |
| **Skip Slot (pre-ready)** | Eksekusi | Pantau | Hilang dari to-do | Hilang dari to-do |
| **Verifikasi Kasir Tunai** | Tidak Tampil | Eksekusi | Tidak Tampil | Tidak Tampil |
| **Tandai Makanan Siap** | Pantau live | Koreksi | Eksekusi | Muncul di to-do |
| **Tandai Selesai (Diantar)** | Pantau live | Koreksi | Pantau | Eksekusi |
| **Tandai Selesai (Ambil Sendiri)** | Pantau live | Eksekusi | Pantau | Tidak Tampil |
| **Tulis Catatan Kendala Antar** | Pantau notif | Eksekusi | Pantau | Eksekusi |
| **Kasih Menu Alternatif (Alergi)** | Terima notif | Pantau | Eksekusi manual | Pantau menu final |
| **Update Fisik Stok Bahan** | Tidak Tampil | Eksekusi penuh | Input pemakaian/sisa | Tidak Tampil |

---

## 7. Logika Teknis Otomatisasi & Formula Matematika

Untuk keperluan rekayasa algoritma backend, seluruh fitur otomatisasi wajib mengimplementasikan formula deterministik berikut:

### 1. Estimasi Produksi Harian / ToCook (Epic 12)
Dihitung on-request saat halaman ToCook dibuka oleh dapur atau admin:
$$	ext{TotalPorsi}(P, M, D, W) = \mathbf{COUNT}\Big(	ext{slot} \mid 	ext{paket}=P \land 	ext{menu}=M \land 	ext{tanggal}=D \land 	ext{waktu}=W \land 	ext{status\_pesanan}=	ext{'Success'} \land 	ext{status\_slot} 
e 	ext{'Dilewati'}\Big)$$

$$	ext{KebutuhanBahan}(B, D, W) = \sum_{M} \Big(	ext{TotalPorsi}(M, D, W) 	imes 	ext{TakaranBahan}(B, M)\Big)$$

*Catatan:* Porsi menu utama dan menu alternatif dihitung terpisah. Pesanan yang memiliki catatan selera atau bentrok alergi dialokasikan ke tabel **Kategori Khusus**.

### 2. Deteksi Kekurangan Stok Bahan Baku (Epic 9)
$$	ext{KebutuhanBahanMingguan}(B) = \sum \Big(	ext{Porsi Terjadwal Success} 	imes 	ext{TakaranBahan}(B)\Big)$$
$$	ext{PerluDibeli}(B) = \max\Big(0, 	ext{KebutuhanBahanMingguan}(B) - 	ext{StokSaatIni}(B)\Big)$$
$$	ext{PerkiraanSisaMingguDepan}(B) = 	ext{StokSaatIni}(B) - 	ext{KebutuhanMenuMingguBerikutnya}(B)$$

### 3. Deteksi Risiko Churn Pelanggan (Epic 21)
Aturan deterministik berbasis waktu (rule-based, bukan model machine learning):
```python
if customer.has_successful_order_history() and not customer.has_active_orders():
    days_since_end = (current_date - customer.latest_order.period_end_date).days
    if days_since_end > 14:
        mark_as_churned(customer)
```

### 4. Perhitungan Jarak Haversine & Ongkir (Epic 4, 14)
$$\Delta\phi = rac{(	ext{lat}_2 - 	ext{lat}_1) \pi}{180}, \quad \Delta\lambda = rac{(	ext{lng}_2 - 	ext{lng}_1) \pi}{180}$$
$$a = \sin^2\left(rac{\Delta\phi}{2}
ight) + \cos\left(rac{	ext{lat}_1 \pi}{180}
ight) \cos\left(rac{	ext{lat}_2 \pi}{180}
ight) \sin^2\left(rac{\Delta\lambda}{2}
ight)$$
$$d = 2 	imes 6371 	imes 	ext{atan2}\left(\sqrt{a}, \sqrt{1-a}
ight)$$
$$	ext{JarakKM} = \lceil d 
ceil$$

### 5. Pencocokan Tag Alergen Otomatis
$$	ext{TagAlergenMenu}(M) = igcup_{b \in 	ext{Bahan}(M)} 	ext{Alergen}(b)$$
$$	ext{IsBentrok}(C, M) = \Big(	ext{ProfilAlergi}(C) \cap 	ext{TagAlergenMenu}(M)\Big) 
e \emptyset$$

---

## 8. Batasan Sistem & Ruang Lingkup MVP (System Boundaries)

Untuk menjaga ketepatan waktu pengiriman MVP pada 10 November 2026, batasan teknis berikut wajib dipatuhi:

1. **Bukan Sistem Multi-Menu Bebas:** Pelanggan tidak memilih menu per hari ala restoran a-la-carte. Satu slot hanya menyajikan 1 menu utama tetap (dan 1 menu alternatif jika bentrok alergi).
2. **Tanpa Dashboard Penuh untuk Staf:** Staf dapur dan kurir hanya mengakses tampilan to-do list sederhana berbasis mobile web.
3. **Tanpa API Peta Komersial Berbayar:** Penentuan koordinat alamat dan jarak menggunakan OpenStreetMap/Leaflet dan rumus garis lurus Haversine (tidak memperhitungkan rute kemacetan Google Maps API).
4. **WhatsApp Semi-Manual (`wa.me`):** Pengiriman promo dan follow-up churn menggunakan tautan pesan ter-encode `https://wa.me/62xxx?text=...` yang dibuka di WhatsApp web/app admin (tanpa WhatsApp Business API berbayar).
5. **Refund Manual di Luar Aplikasi:** Tidak ada integrasi transfer refund otomatis dari gateway. Pesanan batal yang telah lunas hanya ditandai `needs_refund`, dan eksekusi pengembalian dana dilakukan manual oleh admin.
6. **Notifikasi In-App via SSE:** Tidak ada SMS gateway atau push notification native OS. Seluruh pembaruan real-time menggunakan Server-Sent Events (SSE) di dalam web browser.

---

## 9. Panduan Implementasi untuk Agentic Coding

Ketika membuat kode backend (Express/Nest/Laravel) atau frontend (React/Next/Vue):
1. **Validasi Skema Berlapis:** Validasi DTO/Request di controller wajib memastikan aturan cut-off (H-1 23:59:59) dan batasan skip sebelum memproses mutasi basis data.
2. **Kekebalan Mutasi Harga:** Perubahan master harga paket atau tarif ongkir di tabel pengaturan tidak boleh mengubah nilai transaksi historis pada pesanan yang sudah dibuat.
3. **Isolasi Logika Diskon:** Pastikan kalkulasi backend memeriksa boolean `allow_stack_with_tier` milik `PromoCode`. Jika `false`, pilih $\max(	ext{potongan\_tier}, 	ext{potongan\_promo})$.
4. **Audit Trail Status:** Setiap mutasi status slot wajib mencatat timestamp dan `user_id` aktor yang mengubah ke dalam log histori slot.
