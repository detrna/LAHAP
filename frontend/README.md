# GTNIC

Gtnic adalah proyek aplikasi untuk membantu mendigitalisasi informasi barang
dari struk belanja. Tujuannya adalah mengubah daftar barang pada gambar struk
menjadi data terstruktur—nama barang, jumlah, dan satuan—sehingga informasi
belanja lebih mudah dikelola.

## Gambaran proyek

Backend proyek menggunakan Node.js, TypeScript, dan Express. Komponen ekstraksi
struk terhubung ke model Qwen melalui DashScope, memvalidasi hasil ekstraksi,
dan menangani gambar JPEG, PNG, serta WebP. Konfigurasi aplikasi juga mencakup
PostgreSQL, Prisma, dan JWT.

Folder ini disiapkan untuk aplikasi frontend GTNIC. Implementasi antarmuka
frontend belum tersedia; backend saat ini menyediakan pemeriksaan kesehatan
melalui `GET /health`, sementara alur API untuk ekstraksi struk belum
diimplementasikan.