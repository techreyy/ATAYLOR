<?php

use Illuminate\Support\Facades\Schedule;

// BR-07: lepas Slot Lock 24 jam yang kedaluwarsa. Jalankan `php artisan schedule:work` di server.
Schedule::command('orders:expire-slot-locks')->everyMinute()->withoutOverlapping();
