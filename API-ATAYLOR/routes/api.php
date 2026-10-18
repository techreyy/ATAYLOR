<?php

use App\Http\Controllers\Api\V1\AuditLogController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DesignController;
use App\Http\Controllers\Api\V1\ExecutiveController;
use App\Http\Controllers\Api\V1\FileController;
use App\Http\Controllers\Api\V1\KanbanController;
use App\Http\Controllers\Api\V1\MasterDataController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OrderController;
use App\Http\Controllers\Api\V1\PaymentController;
use App\Http\Controllers\Api\V1\ProductController;
use App\Http\Controllers\Api\V1\SpkController;
use Illuminate\Support\Facades\Route;

/*
| Hak akses mengikuti SRS §2.3:
| Admin: OMS, kasir, Kanban, penerbitan SPK. Manager: dispatch vendor (baca SPK).
| Designer: board desain. Owner: dashboard, audit log, dispatch vendor.
*/

Route::prefix('v1')->group(function () {
    Route::post('auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
    Route::post('auth/demo-login', [AuthController::class, 'demoLogin'])->middleware('throttle:30,1');

    // Berkas privat (bukti bayar, mockup, foto QC) — hanya via tautan bertanda tangan & kedaluwarsa
    Route::get('files/{path}', [FileController::class, 'show'])
        ->where('path', '.*')
        ->middleware(['signed', 'throttle:120,1'])
        ->name('files.show');

    Route::middleware(['auth:sanctum', 'tenant'])->group(function () {
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        Route::get('products', [MasterDataController::class, 'products']);
        Route::get('marketing-closers', [MasterDataController::class, 'closers']);
        Route::get('notifications', [NotificationController::class, 'index']);

        // Katalog AI Training (FR-AT-01, BR-19: ubah hanya Owner) & pola pesanan untuk konteks AI
        Route::post('products', [ProductController::class, 'store'])->middleware('role:owner');
        Route::patch('products/{product}', [ProductController::class, 'update'])->middleware('role:owner');
        Route::get('ai/order-insights', [ProductController::class, 'insights'])->middleware('role:admin,owner,manager');

        // OMS (Slice 1)
        Route::middleware('role:admin,owner,manager,designer')->group(function () {
            Route::get('orders', [OrderController::class, 'index']);
            Route::get('orders/{order}', [OrderController::class, 'show']);
        });
        Route::post('orders', [OrderController::class, 'store'])->middleware('role:admin');

        // Desain & ACC (pendukung alur demo; CRM Designer penuh masih MOCK)
        Route::post('orders/{order}/design-versions', [DesignController::class, 'storeVersion'])->middleware('role:admin,designer');
        Route::post('design-versions/{version}/approve', [DesignController::class, 'approve'])->middleware('role:admin');
        Route::post('design-versions/{version}/request-revision', [DesignController::class, 'requestRevision'])->middleware('role:admin');

        // Kasir (Slice 1)
        Route::middleware('role:admin')->group(function () {
            Route::get('payments', [PaymentController::class, 'index']);
            Route::post('orders/{order}/payments', [PaymentController::class, 'store']);
            Route::post('payments/{payment}/validate', [PaymentController::class, 'validatePayment']);
            Route::post('payments/{payment}/reject', [PaymentController::class, 'reject']);
        });

        // Kanban WIP (Slice 2)
        Route::get('kanban', [KanbanController::class, 'board'])->middleware('role:admin,owner,manager');
        Route::get('kanban/histories', [KanbanController::class, 'histories'])->middleware('role:admin,owner,manager');
        Route::post('orders/{order}/move-stage', [KanbanController::class, 'move'])->middleware('role:admin');

        // SPK & Dispatch (Slice 3)
        Route::middleware('role:admin,owner,manager')->group(function () {
            Route::get('spk', [SpkController::class, 'index']);
            Route::get('spk/{spk}', [SpkController::class, 'show']);
            Route::get('orders/{order}/spk-gate', [SpkController::class, 'gate']);
        });
        Route::post('orders/{order}/spk', [SpkController::class, 'store'])->middleware('role:admin');
        Route::patch('spk/{spk}/dispatch', [SpkController::class, 'dispatch'])->middleware('role:owner,manager');

        // Executive Dashboard (Slice 4)
        Route::middleware('role:owner')->group(function () {
            Route::get('executive/summary', [ExecutiveController::class, 'summary']);
            Route::get('executive/export.csv', [ExecutiveController::class, 'exportCsv']);
            Route::get('executive/export.xlsx', [ExecutiveController::class, 'exportXlsx']);
            Route::get('audit-logs', [AuditLogController::class, 'index']);
        });
    });
});
