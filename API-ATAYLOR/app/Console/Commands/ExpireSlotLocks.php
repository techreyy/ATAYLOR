<?php

namespace App\Console\Commands;

use App\Services\OrderService;
use App\Support\TenantContext;
use Illuminate\Console\Command;

class ExpireSlotLocks extends Command
{
    protected $signature = 'orders:expire-slot-locks';

    protected $description = 'Lepas Slot Lock sementara yang melewati 24 jam tanpa pembayaran valid (BR-07)';

    public function handle(TenantContext $context, OrderService $orders): int
    {
        $count = $context->bypass(fn () => $orders->expireSlotLocks());
        $this->info("{$count} slot lock dilepas.");

        return self::SUCCESS;
    }
}
