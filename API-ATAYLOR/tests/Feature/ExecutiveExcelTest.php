<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use PhpOffice\PhpSpreadsheet\Calculation\Calculation;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use Tests\TestCase;

class ExecutiveExcelTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    private function download(): Spreadsheet
    {
        $this->app['auth']->forgetGuards();
        $query = http_build_query(['from' => now()->subDays(60)->toDateString(), 'to' => now()->toDateString()]);
        $res = $this->withToken($this->issueToken('owner'))->get("/api/v1/executive/export.xlsx?{$query}");
        $res->assertOk()->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $path = tempnam(sys_get_temp_dir(), 'xlsx');
        file_put_contents($path, $res->streamedContent());
        $book = IOFactory::load($path);
        unlink($path);

        return $book;
    }

    public function test_excel_has_empty_production_cost_column_with_working_formulas(): void
    {
        $book = $this->download();
        $this->assertSame(['Ringkasan', 'Rincian & Modal', 'Rekap Pesanan'], $book->getSheetNames());

        $sheet = $book->getSheetByName('Rincian & Modal');
        $this->assertSame('Harga Jual / pcs', $sheet->getCell('J4')->getValue());
        $this->assertStringContainsString('Biaya Produksi', $sheet->getCell('L4')->getValue());

        // Harga jual terisi otomatis, biaya produksi kosong untuk diisi manual
        $this->assertGreaterThan(0, $sheet->getCell('J5')->getValue());
        $this->assertNull($sheet->getCell('L5')->getValue());
        $this->assertSame('', $sheet->getCell('N5')->getCalculatedValue());

        // Setelah diisi, total biaya & laba kotor dihitung rumus
        $qty = $sheet->getCell('I5')->getValue();
        $subtotal = $sheet->getCell('K5')->getValue();
        $sheet->setCellValue('L5', 50000);
        Calculation::getInstance($book)->clearCalculationCache();
        $this->assertEqualsWithDelta($qty * 50000, $sheet->getCell('M5')->getCalculatedValue(), 0.01);
        $this->assertEqualsWithDelta($subtotal - $qty * 50000, $sheet->getCell('N5')->getCalculatedValue(), 0.01);

        // Rincian memuat jenis lengan (seed ORD-2026-005 berisi lengan panjang)
        $sleeves = array_column($sheet->rangeToArray('G5:G'.$sheet->getHighestDataRow()), 0);
        $this->assertContains('Lengan Panjang', $sleeves);
        $this->assertContains('Lengan Pendek', $sleeves);

        // Ringkasan merujuk total laba dari sheet rincian
        $this->assertStringStartsWith("='Rincian & Modal'!N", $book->getSheetByName('Ringkasan')->getCell('B15')->getValue());
    }

    public function test_excel_export_is_owner_only(): void
    {
        $this->api('admin', 'GET', '/executive/export.xlsx')->assertForbidden();
    }
}
