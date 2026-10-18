<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Kontrak data inti (AI_GUA.md §5). Nominal uang disimpan sebagai bigint Rupiah (tanpa desimal).
     */
    public function up(): void
    {
        $tenantScoped = function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('tenant_id')->index()->constrained('tenants');
        };

        // §5.1 Platform & identitas
        Schema::create('marketing_closers', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->string('name');
            $table->string('phone')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // §5.2 Katalog & inventory
        Schema::create('products', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->string('name');
            $table->string('category');
            $table->bigInteger('base_price');
            $table->unsignedInteger('moq')->default(1);
            $table->unsignedInteger('std_duration_days');
            $table->unsignedInteger('daily_capacity');
            $table->unsignedInteger('design_sla_hours')->default(24);
            $table->unsignedTinyInteger('dp_min_percent')->default(50);
            $table->unsignedTinyInteger('free_revision_limit')->default(3);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('product_variants', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('product_id')->constrained('products');
            $table->string('sku_code');
            $table->string('color');
            $table->string('size', 16);
            $table->boolean('is_ready_stock')->default(false);
            $table->timestamps();
            $table->unique(['tenant_id', 'sku_code']);
        });

        Schema::create('inventory_balances', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('variant_id')->unique()->constrained('product_variants');
            $table->integer('qty_available')->default(0);
            $table->integer('qty_reserved')->default(0);
            $table->integer('min_stock')->default(0);
            $table->timestamps();
        });

        Schema::create('stock_ledger', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('variant_id')->constrained('product_variants');
            $table->integer('delta_qty');
            $table->enum('reason', ['adjustment', 'reservation', 'release', 'sale', 'opname']);
            $table->text('reason_note')->nullable();
            $table->foreignUuid('actor_id')->nullable()->constrained('users');
            $table->timestamps();
        });

        // §5.3 Order & pembayaran
        Schema::create('orders', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->string('order_code');
            $table->string('customer_name');
            $table->string('customer_wa');
            $table->enum('channel', ['online', 'offline']);
            $table->foreignUuid('marketing_closer_id')->nullable()->constrained('marketing_closers');
            $table->enum('status', [
                'brief_lengkap', 'desain_dikerjakan', 'menunggu_acc', 'revisi', 'acc_disetujui',
                'menunggu_pembayaran', 'pembayaran_valid', 'spk_terbit', 'produksi',
                'menunggu_pelunasan', 'selesai', 'dibatalkan', 'kedaluwarsa', 'ditahan',
            ])->default('brief_lengkap');
            $table->enum('wip_stage', ['antrean', 'proses_jahit', 'proses_bordir_sablon', 'qc_pabrik', 'tiba_di_gudang'])->nullable();
            $table->bigInteger('total_amount');
            $table->bigInteger('dp_required');
            $table->bigInteger('paid_amount')->default(0);
            $table->bigInteger('remaining_balance');
            $table->date('due_date');
            $table->enum('slot_lock_status', ['none', 'temp_24h', 'permanent', 'expired'])->default('none');
            $table->timestamp('slot_lock_expires_at')->nullable();
            $table->unsignedInteger('revision_count')->default(0);
            $table->text('notes')->nullable();
            $table->foreignUuid('created_by')->nullable()->constrained('users');
            $table->timestamps();
            $table->unique(['tenant_id', 'order_code']);
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('order_items', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignUuid('product_id')->constrained('products');
            $table->foreignUuid('variant_id')->nullable()->constrained('product_variants');
            $table->string('sku_code')->nullable();
            $table->string('color');
            $table->string('size', 16);
            $table->unsignedInteger('qty');
            $table->bigInteger('unit_price');
            $table->bigInteger('subtotal');
            $table->timestamps();
        });

        Schema::create('inventory_reservations', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('variant_id')->constrained('product_variants');
            $table->foreignUuid('order_id')->constrained('orders');
            $table->unsignedInteger('qty');
            $table->enum('status', ['active', 'consumed', 'released'])->default('active');
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->constrained('orders');
            $table->enum('method', ['cash', 'transfer']);
            $table->bigInteger('amount');
            $table->string('proof_url')->nullable();
            $table->enum('status', ['pending', 'valid', 'rejected'])->default('pending');
            $table->foreignUuid('recorded_by')->nullable()->constrained('users');
            $table->foreignUuid('verified_by')->nullable()->constrained('users');
            $table->timestamp('verified_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // §5.4 Desain & produksi
        Schema::create('design_tickets', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->unique()->constrained('orders');
            $table->foreignUuid('designer_id')->nullable()->constrained('users');
            $table->enum('status', ['baru', 'dikerjakan', 'menunggu_acc', 'revisi', 'selesai'])->default('baru');
            $table->timestamp('sla_due_at')->nullable();
            $table->unsignedInteger('revision_count')->default(0);
            $table->text('last_feedback')->nullable();
            $table->timestamps();
        });

        Schema::create('design_versions', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('design_ticket_id')->constrained('design_tickets');
            $table->unsignedInteger('version_no');
            $table->string('mockup_url')->nullable();
            $table->foreignUuid('uploaded_by')->nullable()->constrained('users');
            $table->timestamp('sent_at')->nullable();
            $table->boolean('is_paid_revision')->default(false);
            $table->timestamps();
            $table->unique(['design_ticket_id', 'version_no']);
        });

        Schema::create('design_approvals', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            // unique => tombol ACC hanya sekali pakai per versi (BR-06)
            $table->foreignUuid('design_version_id')->unique()->constrained('design_versions');
            $table->foreignUuid('order_id')->constrained('orders');
            $table->enum('channel', ['wa_button', 'manual_admin']);
            $table->string('approved_by_wa')->nullable();
            $table->foreignUuid('recorded_by')->nullable()->constrained('users');
            $table->timestamp('approved_at');
            $table->string('evidence_url')->nullable();
            $table->timestamps();
        });

        Schema::create('wip_histories', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->constrained('orders');
            $table->string('from_stage')->nullable();
            $table->string('to_stage');
            $table->foreignUuid('actor_id')->nullable()->constrained('users');
            $table->text('reason_note')->nullable();
            $table->timestamps();
        });

        Schema::create('spk_documents', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->unique()->constrained('orders');
            $table->string('spk_number');
            $table->foreignUuid('issued_by')->constrained('users');
            $table->timestamp('issued_at');
            $table->string('vendor_name')->nullable();
            $table->date('material_sent_date')->nullable();
            $table->string('spk_receiver')->nullable();
            $table->date('vendor_due_date')->nullable();
            $table->foreignUuid('dispatched_by')->nullable()->constrained('users');
            $table->timestamp('dispatched_at')->nullable();
            $table->timestamps();
            $table->unique(['tenant_id', 'spk_number']);
        });

        Schema::create('qc_records', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('order_id')->constrained('orders');
            $table->string('photo_url');
            $table->foreignUuid('checked_by')->nullable()->constrained('users');
            $table->timestamp('checked_at');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // §5.5 Operasional (append-only)
        Schema::create('audit_logs', function (Blueprint $table) use ($tenantScoped) {
            $tenantScoped($table);
            $table->foreignUuid('actor_id')->nullable()->constrained('users');
            $table->string('action');
            $table->string('entity_type');
            $table->uuid('entity_id')->nullable();
            $table->jsonb('old_values')->nullable();
            $table->jsonb('new_values')->nullable();
            $table->uuid('correlation_id')->nullable();
            $table->timestamps();
            $table->index(['tenant_id', 'created_at']);
        });
    }

    public function down(): void
    {
        foreach ([
            'audit_logs', 'qc_records', 'spk_documents', 'wip_histories', 'design_approvals',
            'design_versions', 'design_tickets', 'payments', 'inventory_reservations', 'order_items',
            'orders', 'stock_ledger', 'inventory_balances', 'product_variants', 'products', 'marketing_closers',
        ] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
