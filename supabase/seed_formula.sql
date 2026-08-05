-- ═══════════════════════════════════════════════════════════════
-- SEED "formula" — nilai bobot & tier Talent Point System
-- Jalankan di: Supabase Dashboard -> SQL Editor -> New query -> Run
-- Aman dijalankan berulang kali (hapus dulu isi lama, lalu insert ulang).
-- ═══════════════════════════════════════════════════════════════

delete from public.formula;

insert into public.formula (komponen, label, deskripsi, bobot, tier_nilai, poin_dasar, keterangan_tier, urutan) values
-- 1) PENDIDIKAN — bobot 5%
('pendidikan','1. Pendidikan Terakhir','Jenjang pendidikan formal terakhir.',5,'S3 / Doktor',100,'Tertinggi',1),
('pendidikan','1. Pendidikan Terakhir','Jenjang pendidikan formal terakhir.',5,'S2 / Master',80,'',2),
('pendidikan','1. Pendidikan Terakhir','Jenjang pendidikan formal terakhir.',5,'S1 / Sarjana',60,'',3),
('pendidikan','1. Pendidikan Terakhir','Jenjang pendidikan formal terakhir.',5,'D3 / Diploma',40,'',4),
('pendidikan','1. Pendidikan Terakhir','Jenjang pendidikan formal terakhir.',5,'D1-D2 / SMA',20,'',5),

-- 2) SANKSI — bobot 10%
('sanksi','2. Sanksi Disiplin','Hanya 2 nilai: Tidak Ada Sanksi = poin penuh (10), Ada Sanksi = 0 poin.',10,'Tidak Ada Sanksi',100,'Rekam jejak bersih — mendapat poin penuh',6),
('sanksi','2. Sanksi Disiplin','Hanya 2 nilai: Tidak Ada Sanksi = poin penuh (10), Ada Sanksi = 0 poin.',10,'Ada Sanksi',0,'Apapun jenis sanksinya — 0 poin',7),

-- 3) 9-BOX — bobot 20%
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'HIGH POTENTIAL',100,'Kandidat terbaik, siap promosi',8),
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'PROMOTABLE',80,'Siap untuk jabatan lebih tinggi',9),
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'SLEEPING TIGER',60,'Potensi tinggi, kinerja perlu ditingkatkan',10),
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'SOLID CONTRIBUTOR',40,'Kinerja stabil, potensi moderat',11),
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'UNFIT',20,'Perlu intervensi khusus',12),
('ninebox','3. 9-Box (Potensi & Kinerja)','Hasil pemetaan 9-Box. Bobot tertinggi karena mencerminkan potensi pengembangan.',20,'Tidak Ada',0,'Belum dilakukan pemetaan',13),

-- 4) CLI — bobot 12%
('cli','4. CLI (Skor Kompetensi)','Skor 0-100 dikalikan bobot%. Semakin tinggi skor CLI, semakin besar poin.',12,'> 85',100,'Sangat Kompeten',14),
('cli','4. CLI (Skor Kompetensi)','Skor 0-100 dikalikan bobot%. Semakin tinggi skor CLI, semakin besar poin.',12,'70-85',80,'Kompeten',15),
('cli','4. CLI (Skor Kompetensi)','Skor 0-100 dikalikan bobot%. Semakin tinggi skor CLI, semakin besar poin.',12,'< 70',60,'Perlu Pengembangan',16),
('cli','4. CLI (Skor Kompetensi)','Skor 0-100 dikalikan bobot%. Semakin tinggi skor CLI, semakin besar poin.',12,'Tidak Ada',0,'Tidak ada data CLI',17),

-- 5) KPI — bobot 12%
('kpi','5. KPI (Kinerja)','Skor 0-100 dikalikan bobot%. Mencerminkan pencapaian target kerja.',12,'> 85',100,'Melebihi Target',18),
('kpi','5. KPI (Kinerja)','Skor 0-100 dikalikan bobot%. Mencerminkan pencapaian target kerja.',12,'70-85',80,'Sesuai Target',19),
('kpi','5. KPI (Kinerja)','Skor 0-100 dikalikan bobot%. Mencerminkan pencapaian target kerja.',12,'< 70',60,'Di Bawah Target',20),
('kpi','5. KPI (Kinerja)','Skor 0-100 dikalikan bobot%. Mencerminkan pencapaian target kerja.',12,'Tidak Ada',0,'Tidak ada data KPI',21),

-- 6) PERFORMANCE RATING — bobot 9%
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'Outstanding',100,'Jauh di atas ekspektasi',22),
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'Above',80,'Di atas ekspektasi',23),
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'On Target',60,'Sesuai ekspektasi',24),
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'Below',40,'Di bawah ekspektasi',25),
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'Poor',20,'Jauh di bawah ekspektasi',26),
('perf','6. Performance Rating','Penilaian kinerja formal dari atasan/HR.',9,'Tidak Ada',0,'Tidak ada data performance',27),

-- 7) ASESMEN TERAKHIR — bobot 12%
('asesmen','7. Asesmen Terakhir','Hasil asesmen kompetensi formal oleh lembaga independen.',12,'Q / DS (Disarankan)',100,'Memenuhi standar kompetensi — disarankan',28),
('asesmen','7. Asesmen Terakhir','Hasil asesmen kompetensi formal oleh lembaga independen.',12,'DSP (Disarankan Dengan Pengembangan)',80,'Disarankan dengan catatan perlu pengembangan',29),
('asesmen','7. Asesmen Terakhir','Hasil asesmen kompetensi formal oleh lembaga independen.',12,'NQ / TD (Tidak Disarankan)',65,'Belum memenuhi standar, perlu pengembangan',30),
('asesmen','7. Asesmen Terakhir','Hasil asesmen kompetensi formal oleh lembaga independen.',12,'Tidak Ada',0,'Belum pernah asesmen',31),

-- 8) JOB ROTATION — bobot 5%
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'>= 5 kali',100,'Sangat berpengalaman lintas unit',32),
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'4 kali',80,'',33),
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'3 kali',60,'',34),
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'2 kali',40,'',35),
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'1 kali',20,'',36),
('rotasi','8. Job Rotation','Jumlah perpindahan/rotasi jabatan. Mencerminkan pengalaman lintas fungsi.',5,'0 kali',0,'Belum pernah rotasi',37),

-- 9) DEVELOPMENT — bobot 5%
('dev','9. Development','Keikutsertaan program pengembangan. Poin berdasarkan program tertinggi yang diikuti, cap = bobot.',5,'Action Learning Program',100,'Tertinggi — program ALP/action learning',38),
('dev','9. Development','Keikutsertaan program pengembangan. Poin berdasarkan program tertinggi yang diikuti, cap = bobot.',5,'PLDP',80,'Program leadership & development',39),
('dev','9. Development','Keikutsertaan program pengembangan. Poin berdasarkan program tertinggi yang diikuti, cap = bobot.',5,'Sertifikasi',60,'Sertifikasi kompetensi',40),
('dev','9. Development','Keikutsertaan program pengembangan. Poin berdasarkan program tertinggi yang diikuti, cap = bobot.',5,'Workshop',40,'Workshop / pelatihan',41),
('dev','9. Development','Keikutsertaan program pengembangan. Poin berdasarkan program tertinggi yang diikuti, cap = bobot.',5,'Webinar / Self Learning',20,'Webinar atau belajar mandiri',42),

-- 10) PROJECT INVOLVEMENT — bobot 5%
('project','10. Project Involvement','Keterlibatan proyek strategis tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Internasional',100,'Proyek level internasional',43),
('project','10. Project Involvement','Keterlibatan proyek strategis tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Nasional',80,'Proyek level nasional',44),
('project','10. Project Involvement','Keterlibatan proyek strategis tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'BUMN/Danantara',60,'Proyek di lingkungan BUMN/Danantara',45),
('project','10. Project Involvement','Keterlibatan proyek strategis tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'PTPN Group',40,'Proyek di lingkungan PTPN Group',46),
('project','10. Project Involvement','Keterlibatan proyek strategis tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Perusahaan',20,'Proyek internal perusahaan',47),

-- 11) AWARDING — bobot 5%
('awarding','11. Awarding (Penghargaan)','Penghargaan yang diraih tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Internasional',100,'Penghargaan level internasional',48),
('awarding','11. Awarding (Penghargaan)','Penghargaan yang diraih tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Nasional',80,'Penghargaan level nasional',49),
('awarding','11. Awarding (Penghargaan)','Penghargaan yang diraih tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'BUMN/Danantara',60,'Penghargaan di lingkungan BUMN/Danantara',50),
('awarding','11. Awarding (Penghargaan)','Penghargaan yang diraih tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'PTPN Group',40,'Penghargaan di lingkungan PTPN Group',51),
('awarding','11. Awarding (Penghargaan)','Penghargaan yang diraih tahun berjalan. Akumulasi maks 5x. Poin per tingkatan terbaik yang dimiliki, cap = bobot.',5,'Perusahaan',20,'Penghargaan internal perusahaan',52);

-- Cek total bobot (harus = 100): jumlahkan bobot SATU baris per komponen saja
-- (bobot diulang di tiap baris tier, jadi harus di-DISTINCT per komponen dulu).
select sum(bobot) as total_bobot from (
  select distinct komponen, bobot from public.formula
) x;
