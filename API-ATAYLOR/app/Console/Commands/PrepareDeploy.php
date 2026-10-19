<?php

namespace App\Console\Commands;

use App\Models\Tenant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class PrepareDeploy extends Command
{
    protected $signature = 'app:prepare-deploy';

    protected $description = 'Dijalankan saat server online menyala: isi data contoh bila database masih kosong & cek role RLS';

    public function handle(): int
    {
        if (DB::getDriverName() === 'pgsql') {
            $role = DB::selectOne('select rolsuper, rolbypassrls from pg_roles where rolname = current_user');
            if ($role && ($role->rolsuper || $role->rolbypassrls)) {
                // Superuser/BYPASSRLS melewati Row-Level Security; isolasi tinggal mengandalkan filter aplikasi.
                $this->warn('PERINGATAN: role database ini superuser/BYPASSRLS — RLS tidak berlaku. Pakai role non-superuser.');
            } else {
                $this->info('Role database non-superuser: RLS aktif.');
            }
        }

        if (Tenant::query()->exists()) {
            $this->info('Database sudah berisi data; seeder dilewati.');

            return self::SUCCESS;
        }

        $this->info('Database kosong: mengisi data contoh...');

        return $this->call('db:seed', ['--force' => true]);
    }
}
