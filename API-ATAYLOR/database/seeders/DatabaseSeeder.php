<?php

namespace Database\Seeders;

use App\Models\DesignApproval;
use App\Models\DesignTicket;
use App\Models\DesignVersion;
use App\Models\MarketingCloser;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Product;
use App\Models\QcRecord;
use App\Models\SpkDocument;
use App\Models\Tenant;
use App\Models\User;
use App\Models\WipHistory;
use App\Support\TenantContext;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Data demo yang bisa di-reset: `php artisan migrate:fresh --seed`.
 * Semua nama & nomor adalah fiktif (Checklist: jangan pakai data pelanggan riil).
 */
class DatabaseSeeder extends Seeder
{
    private array $users = [];

    public function run(TenantContext $context): void
    {
        $context->bypass(function () use ($context) {
            $tenant = Tenant::create([
                'slug' => 'a-taylor-kendari',
                'code' => 'AT',
                'name' => 'A-Taylor Konveksi Kendari',
                'logo_url' => '/logo-a-taylor.png',
                'wa_number' => '0812-4567-8901',
                'automation_mode' => 'high_on',
                'subscription_status' => 'active',
            ]);
            $context->set($tenant->id);
            $this->seedATaylor($tenant);

            // Tenant kedua untuk membuktikan isolasi data (BR-26)
            $other = Tenant::create([
                'slug' => 'konveksi-contoh-b',
                'code' => 'KB',
                'name' => 'Konveksi Contoh B (Tenant Uji Isolasi)',
                'subscription_status' => 'trial',
            ]);
            $context->set($other->id);
            $this->seedOtherTenant($other);

            User::create([
                'tenant_id' => null,
                'name' => 'Super Admin Platform',
                'email' => 'superadmin@ataylor.demo',
                'password' => config('app.seed_user_password'),
                'role' => 'super_admin',
            ]);

            $context->set(null);
        });
    }

    private function seedATaylor(Tenant $tenant): void
    {
        foreach ([
            ['admin', 'Budi Santoso', 'admin@ataylor.demo'],
            ['owner', 'H. Ahmad Fauzi', 'owner@ataylor.demo'],
            ['manager', 'Doni Pratama', 'manager@ataylor.demo'],
            ['designer', 'Rian Desain', 'designer@ataylor.demo'],
        ] as [$role, $name, $email]) {
            $this->users[$role] = User::create([
                'tenant_id' => $tenant->id,
                'name' => $name,
                'email' => $email,
                'password' => config('app.seed_user_password'),
                'role' => $role,
            ]);
        }

        $closers = collect([
            ['Rahmat Sales Sentral', '0811-2233-4455'],
            ['Siti Marketing Toko', '0822-9988-7766'],
            ['Dimas Representative', '0853-1122-3344'],
        ])->map(fn ($c) => MarketingCloser::create(['name' => $c[0], 'phone' => $c[1]]))->values();

        $p = collect([
            'jersey' => ['Jersey Printing Sublim Premium', 'Jersey', 125000, 12, 7, 150, 24],
            'pdl' => ['Kemeja PDL / Lapangan Ripstop', 'Kemeja / PDL', 185000, 24, 14, 80, 48],
            'polo' => ['Polo Shirt Lacoste Pique Bordir', 'Polo', 95000, 15, 10, 120, 24],
            'jaket' => ['Jaket Bomber / Hoodie Fleece', 'Jaket / Hoodie', 220000, 12, 12, 60, 36],
            'kaos' => ['Kaos Oblong Cotton Combed 30s', 'Kaos Oblong', 65000, 24, 5, 200, 12],
        ])->map(fn ($x) => Product::create([
            'name' => $x[0], 'category' => $x[1], 'base_price' => $x[2], 'moq' => $x[3],
            'std_duration_days' => $x[4], 'daily_capacity' => $x[5], 'design_sla_hours' => $x[6],
            'dp_min_percent' => 50, 'free_revision_limit' => 3,
        ]));

        $now = CarbonImmutable::now();

        // 1. Sedang produksi (Proses Jahit), SPK sudah didispatch Manager
        $this->order('ORD-2026-001', $now->subDays(12), [
            'customer_name' => 'Dinas Pemuda & Olahraga', 'customer_wa' => '0812-0000-1122', 'channel' => 'offline',
            'marketing_closer_id' => $closers[0]->id, 'due_date' => $now->addDays(7)->toDateString(),
            'notes' => 'Seragam kontingen, bahan Dryfit Milano.',
        ], [[$p['jersey'], 'Navy Blue / Emas', 'L', 60]], versions: 1, payments: [[4000000, 'transfer', 11]],
            spk: true, stages: ['antrean', 'proses_jahit'], dispatch: true);

        // 2. Menunggu pembayaran: slot lock 24 jam aktif + bukti transfer pending untuk demo Kasir
        $this->order('ORD-2026-002', $now->subDays(2), [
            'customer_name' => 'Komunitas Futsal Bahteramas', 'customer_wa' => '0852-0000-5566', 'channel' => 'online',
            'due_date' => $now->addDays(10)->toDateString(), 'notes' => 'Desain v2 di-ACC via WhatsApp.',
        ], [[$p['jersey'], 'Kuning / Hijau', 'M', 20]], versions: 2, pendingPayment: [1250000, 'transfer'],
            lockedHoursAgo: 4);

        // 3. Produksi di QC Pabrik
        $this->order('ORD-2026-003', $now->subDays(14), [
            'customer_name' => 'PT Tambang Konawe', 'customer_wa' => '0813-0000-9900', 'channel' => 'offline',
            'marketing_closer_id' => $closers[1]->id, 'due_date' => $now->addDays(5)->toDateString(),
            'notes' => 'PDL + bordir komputer logo dada & punggung.',
        ], [[$p['pdl'], 'Khaki Tua', 'XL', 100]], versions: 3, payments: [[10000000, 'transfer', 13]],
            spk: true, stages: ['antrean', 'proses_jahit', 'proses_bordir_sablon', 'qc_pabrik'], dispatch: true);

        // 4. Memenuhi gate SPK (DP valid + slot permanen) — untuk demo "Terbitkan SPK"
        $this->order('ORD-2026-004', $now->subDays(3), [
            'customer_name' => 'Alumni SMAN Kendari 2014', 'customer_wa' => '0821-0000-6677', 'channel' => 'online',
            'due_date' => $now->addDays(18)->toDateString(), 'notes' => 'Siap penerbitan SPK Final.',
        ], [[$p['polo'], 'Hitam Solid', 'L', 50]], versions: 1, payments: [[2500000, 'transfer', 1]]);

        // 5. Pesanan baru (brief lengkap, belum ada desain) — gate SPK harus menolak
        $this->order('ORD-2026-005', $now->subDay(), [
            'customer_name' => 'Panitia Jalan Sehat RT 05', 'customer_wa' => '0857-0000-3344', 'channel' => 'offline',
            'marketing_closer_id' => $closers[2]->id, 'due_date' => $now->addDays(21)->toDateString(),
            'notes' => 'Sablon logo depan, nomor belakang.',
        ], [
            [$p['kaos'], 'Putih', 'M', 40], [$p['kaos'], 'Putih', 'L', 50], [$p['kaos'], 'Putih', 'XL', 10],
            [$p['kaos'], 'Putih', 'L', 15, 'panjang'], [$p['kaos'], 'Putih', 'XL', 5, 'panjang'],
        ]);

        // 6. Terlambat: tenggat lewat, masih di Antrean
        $this->order('ORD-2026-006', $now->subDays(20), [
            'customer_name' => 'Koperasi Nelayan Lapulu', 'customer_wa' => '0812-0000-7788', 'channel' => 'offline',
            'marketing_closer_id' => $closers[0]->id, 'due_date' => $now->subDays(2)->toDateString(),
            'notes' => 'Jaket tim, bordir nama.',
        ], [[$p['jaket'], 'Hitam / Abu', 'L', 30]], versions: 1, payments: [[3300000, 'cash', 18]],
            spk: true, stages: ['antrean']);

        // 7. Selesai & lunas
        $this->order('ORD-2026-007', $now->subDays(25), [
            'customer_name' => 'SD Negeri 3 Kendari', 'customer_wa' => '0813-0000-2211', 'channel' => 'online',
            'due_date' => $now->subDays(6)->toDateString(), 'notes' => 'Seragam olahraga siswa.',
        ], [[$p['kaos'], 'Biru Muda', 'S', 150]], versions: 2, payments: [[4875000, 'transfer', 24], [4875000, 'cash', 7]],
            spk: true, stages: Order::WIP_STAGES, dispatch: true, finalStatus: 'selesai');

        // 8. Menunggu pelunasan (tiba di gudang, QC selesai)
        $this->order('ORD-2026-008', $now->subDays(16), [
            'customer_name' => 'Remaja Masjid Al-Ikhlas', 'customer_wa' => '0852-0000-4433', 'channel' => 'offline',
            'marketing_closer_id' => $closers[1]->id, 'due_date' => $now->addDay()->toDateString(),
            'notes' => 'Kemeja koko bordir.',
        ], [[$p['polo'], 'Putih Tulang', 'M', 40]], versions: 1, payments: [[1900000, 'transfer', 15]],
            spk: true, stages: Order::WIP_STAGES, dispatch: true, finalStatus: 'menunggu_pelunasan');
    }

    private function order(
        string $code,
        CarbonImmutable $createdAt,
        array $attrs,
        array $items,
        int $versions = 0,
        array $payments = [],
        ?array $pendingPayment = null,
        bool $spk = false,
        array $stages = [],
        bool $dispatch = false,
        ?string $finalStatus = null,
        ?int $lockedHoursAgo = null,
    ): void {
        $admin = $this->users['admin'];
        $total = collect($items)->sum(fn ($i) => $i[0]->base_price * $i[3]);
        $dp = (int) ceil($total * 50 / 100);
        $paid = collect($payments)->sum(fn ($x) => $x[0]);

        $order = Order::create($attrs + [
            'order_code' => $code,
            'status' => 'brief_lengkap',
            'total_amount' => $total,
            'dp_required' => $dp,
            'paid_amount' => $paid,
            'remaining_balance' => $total - $paid,
            'slot_lock_status' => 'none',
            'created_by' => $admin->id,
            'created_at' => $createdAt,
            'updated_at' => $createdAt,
        ]);

        foreach ($items as $item) {
            [$product, $color, $size, $qty] = $item;
            $order->items()->create([
                'product_id' => $product->id,
                'sku_code' => strtoupper(substr($product->category, 0, 3)).'-'.strtoupper(substr(preg_replace('/\W/', '', $color), 0, 6)),
                'color' => $color, 'size' => $size, 'qty' => $qty, 'sleeve_type' => $item[4] ?? 'pendek',
                'unit_price' => $product->base_price, 'subtotal' => $product->base_price * $qty,
            ]);
        }

        $ticket = DesignTicket::create([
            'order_id' => $order->id,
            'designer_id' => $versions > 0 ? $this->users['designer']->id : null,
            'status' => $versions > 0 ? 'selesai' : 'baru',
            'sla_due_at' => $createdAt->addHours(24),
            'revision_count' => max(0, $versions - 1),
            'last_feedback' => $versions > 1 ? 'Warna nomor punggung diganti putih bergaris emas.' : null,
        ]);

        $lastVersion = null;
        for ($v = 1; $v <= $versions; $v++) {
            $lastVersion = DesignVersion::create([
                'design_ticket_id' => $ticket->id,
                'version_no' => $v,
                'uploaded_by' => $this->users['designer']->id,
                'sent_at' => $createdAt->addHours(6 * $v),
            ]);
        }

        if ($lastVersion) {
            DesignApproval::create([
                'design_version_id' => $lastVersion->id,
                'order_id' => $order->id,
                'channel' => 'wa_button',
                'approved_by_wa' => $order->customer_wa,
                'approved_at' => $createdAt->addHours(6 * $versions + 2),
            ]);
        }

        foreach ($payments as [$amount, $method, $daysAgo]) {
            Payment::create([
                'order_id' => $order->id, 'method' => $method, 'amount' => $amount, 'status' => 'valid',
                'recorded_by' => $admin->id, 'verified_by' => $admin->id,
                'verified_at' => CarbonImmutable::now()->subDays($daysAgo),
                'notes' => $method === 'cash' ? 'Tunai di kasir toko.' : 'Mutasi rekening cocok (cek manual).',
            ]);
        }

        if ($pendingPayment) {
            Payment::create([
                'order_id' => $order->id, 'method' => $pendingPayment[1], 'amount' => $pendingPayment[0],
                'status' => 'pending', 'recorded_by' => $admin->id,
                'notes' => 'Bukti transfer dikirim pelanggan via WA, belum dicek mutasi.',
            ]);
        }

        $status = 'brief_lengkap';
        $lock = ['slot_lock_status' => 'none', 'slot_lock_expires_at' => null];
        if ($lastVersion) {
            if ($paid >= $dp) {
                $status = 'pembayaran_valid';
                $lock = ['slot_lock_status' => 'permanent', 'slot_lock_expires_at' => null];
            } else {
                $status = 'menunggu_pembayaran';
                $lock = ['slot_lock_status' => 'temp_24h', 'slot_lock_expires_at' => CarbonImmutable::now()->addHours(24 - ($lockedHoursAgo ?? 0))];
            }
        }

        $wipStage = null;
        if ($spk) {
            $spkDoc = SpkDocument::create([
                'order_id' => $order->id,
                'spk_number' => 'SPK-AT-'.$createdAt->year.'-'.str_pad((string) (SpkDocument::count() + 1), 4, '0', STR_PAD_LEFT),
                'issued_by' => $admin->id,
                'issued_at' => $createdAt->addDays(2),
            ]);
            if ($dispatch) {
                $spkDoc->update([
                    'vendor_name' => 'Mitra Jahit Sultra Mandiri',
                    'material_sent_date' => $createdAt->addDays(2)->toDateString(),
                    'spk_receiver' => 'Pak Hendra',
                    'vendor_due_date' => $createdAt->addDays(9)->toDateString(),
                    'dispatched_by' => $this->users['manager']->id,
                    'dispatched_at' => $createdAt->addDays(2)->addHours(3),
                ]);
            }

            $prev = null;
            foreach ($stages as $i => $stage) {
                WipHistory::create([
                    'order_id' => $order->id, 'from_stage' => $prev, 'to_stage' => $stage, 'actor_id' => $admin->id,
                    'created_at' => $createdAt->addDays(2 + $i), 'updated_at' => $createdAt->addDays(2 + $i),
                ]);
                $prev = $stage;
            }
            $wipStage = $prev;
            $status = $finalStatus ?? ($wipStage === 'antrean' ? 'spk_terbit' : 'produksi');

            if ($wipStage === 'tiba_di_gudang') {
                QcRecord::create([
                    'order_id' => $order->id, 'photo_url' => '/mock-assets/qc-placeholder.png',
                    'checked_by' => $admin->id, 'checked_at' => $createdAt->addDays(2 + count($stages)),
                ]);
            }
        }

        $order->update(['status' => $status, 'wip_stage' => $wipStage, 'revision_count' => max(0, $versions - 1)] + $lock);
    }

    private function seedOtherTenant(Tenant $tenant): void
    {
        $admin = User::create([
            'tenant_id' => $tenant->id, 'name' => 'Admin Tenant B', 'email' => 'admin@tenantb.demo',
            'password' => config('app.seed_user_password'), 'role' => 'admin',
        ]);
        $product = Product::create([
            'name' => 'Kaos Tenant B', 'category' => 'Kaos Oblong', 'base_price' => 50000, 'moq' => 12,
            'std_duration_days' => 5, 'daily_capacity' => 100, 'design_sla_hours' => 24,
        ]);
        $order = Order::create([
            'order_code' => 'ORD-2026-001', 'customer_name' => 'Pelanggan Rahasia Tenant B', 'customer_wa' => '0800-0000-0000',
            'channel' => 'online', 'status' => 'brief_lengkap', 'total_amount' => 600000, 'dp_required' => 300000,
            'remaining_balance' => 600000, 'due_date' => now()->addDays(10)->toDateString(), 'created_by' => $admin->id,
        ]);
        $order->items()->create([
            'product_id' => $product->id, 'color' => 'Hitam', 'size' => 'L', 'qty' => 12,
            'unit_price' => 50000, 'subtotal' => 600000,
        ]);
    }
}
