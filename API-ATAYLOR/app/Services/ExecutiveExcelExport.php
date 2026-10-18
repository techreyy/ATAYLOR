<?php

namespace App\Services;

use App\Models\Order;
use Carbon\CarbonImmutable;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Cell\DataValidation;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

/**
 * Ekspor Excel Executive: ringkasan KPI, rincian item + kolom kosong biaya produksi (diisi manual
 * oleh Owner), dan rekap per pesanan. Laba kotor dihitung oleh rumus Excel dari kolom yang diisi.
 */
class ExecutiveExcelExport
{
    private const RUPIAH = '"Rp" #,##0';

    private const GOLD = 'F5B800';

    private const GOLD_SOFT = 'FFF5D1';

    private const INK = '1F1F1F';

    private const LINE = 'ECEAE3';

    /** Baris header tabel rincian; data mulai baris berikutnya. */
    private const DETAIL_HEADER_ROW = 4;

    private const STATUS_LABELS = [
        'brief_lengkap' => 'Brief Lengkap', 'desain_dikerjakan' => 'Desain Dikerjakan', 'menunggu_acc' => 'Menunggu ACC',
        'revisi' => 'Revisi Desain', 'acc_disetujui' => 'ACC Disetujui', 'menunggu_pembayaran' => 'Menunggu Pembayaran',
        'pembayaran_valid' => 'Pembayaran Valid', 'spk_terbit' => 'SPK Terbit', 'produksi' => 'Produksi',
        'menunggu_pelunasan' => 'Menunggu Pelunasan', 'selesai' => 'Selesai', 'dibatalkan' => 'Dibatalkan',
        'kedaluwarsa' => 'Kedaluwarsa', 'ditahan' => 'Ditahan',
    ];

    public function __construct(private ExecutiveService $executive)
    {
    }

    public function build(CarbonImmutable $from, CarbonImmutable $to): Spreadsheet
    {
        $orders = Order::with(['items.product', 'closer'])
            ->whereBetween('created_at', [$from->startOfDay(), $to->endOfDay()])
            ->where('status', '!=', 'dibatalkan')
            ->orderBy('created_at')
            ->get();

        $book = new Spreadsheet;
        $book->getProperties()->setCreator('A-Taylor')->setTitle('Rekap Penjualan & Biaya Produksi');

        $summary = $book->getActiveSheet()->setTitle('Ringkasan');
        $detail = $book->createSheet()->setTitle('Rincian & Modal');
        $recap = $book->createSheet()->setTitle('Rekap Pesanan');

        $lastDetailRow = $this->fillDetail($detail, $orders, $from, $to);
        $this->fillSummary($summary, $from, $to, $lastDetailRow);
        $this->fillRecap($recap, $orders);

        $book->setActiveSheetIndex(1); // langsung buka sheet yang perlu diisi

        return $book;
    }

    private function fillDetail(Worksheet $sheet, $orders, CarbonImmutable $from, CarbonImmutable $to): int
    {
        $sheet->setCellValue('A1', 'Rincian Penjualan & Biaya Produksi');
        $sheet->setCellValue('A2', "Periode {$from->toDateString()} s.d. {$to->toDateString()} · Isi kolom kuning \"Biaya Produksi / pcs\" — total biaya, laba kotor, dan margin terhitung otomatis.");
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A2')->getFont()->setItalic(true)->getColor()->setRGB('6C7383');

        $headers = [
            'Order Code', 'Tanggal', 'Pelanggan', 'Status', 'Produk', 'Warna', 'Jenis Lengan', 'Ukuran', 'Qty',
            'Harga Jual / pcs', 'Subtotal Jual', 'Biaya Produksi / pcs (isi manual)', 'Total Biaya Produksi', 'Laba Kotor', 'Margin',
        ];
        $h = self::DETAIL_HEADER_ROW;
        $sheet->fromArray($headers, null, "A{$h}");
        $this->styleHeader($sheet, "A{$h}:O{$h}");
        $sheet->getStyle("L{$h}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::GOLD_SOFT);
        $sheet->getStyle("L{$h}")->getFont()->getColor()->setRGB('9A6B00');

        $r = $h + 1;
        foreach ($orders as $order) {
            foreach ($order->items as $item) {
                $sheet->fromArray([
                    $order->order_code,
                    $order->created_at->toDateString(),
                    $order->customer_name,
                    self::STATUS_LABELS[$order->status] ?? $order->status,
                    $item->product?->name ?? '-',
                    $item->color,
                    ($item->sleeve_type ?? 'pendek') === 'panjang' ? 'Lengan Panjang' : 'Lengan Pendek',
                    $item->size,
                    $item->qty,
                    $item->unit_price,
                    $item->subtotal,
                ], null, "A{$r}", true);
                // L sengaja dikosongkan untuk input manual
                $sheet->setCellValue("M{$r}", "=IF(L{$r}=\"\",\"\",I{$r}*L{$r})");
                $sheet->setCellValue("N{$r}", "=IF(L{$r}=\"\",\"\",K{$r}-M{$r})");
                $sheet->setCellValue("O{$r}", "=IF(OR(L{$r}=\"\",K{$r}=0),\"\",N{$r}/K{$r})");
                $r++;
            }
        }

        $first = $h + 1;
        $last = max($first, $r - 1);
        if ($r === $first) {
            $sheet->setCellValue("A{$first}", 'Tidak ada pesanan pada periode ini.');
            $r++;
        }

        // Baris total
        $t = $r;
        $sheet->setCellValue("A{$t}", 'TOTAL');
        $sheet->setCellValue("I{$t}", "=SUM(I{$first}:I{$last})");
        $sheet->setCellValue("K{$t}", "=SUM(K{$first}:K{$last})");
        $sheet->setCellValue("M{$t}", "=SUM(M{$first}:M{$last})");
        $sheet->setCellValue("N{$t}", "=SUM(N{$first}:N{$last})");
        // margin hanya dari baris yang biaya produksinya sudah diisi
        $sheet->setCellValue("O{$t}", "=IFERROR(N{$t}/SUMIFS(K{$first}:K{$last},L{$first}:L{$last},\"<>\"),\"\")");
        $sheet->getStyle("A{$t}:O{$t}")->getFont()->setBold(true);
        $sheet->getStyle("A{$t}:O{$t}")->getBorders()->getTop()->setBorderStyle(Border::BORDER_MEDIUM);

        // Format & bantuan isi
        $sheet->getStyle("I{$first}:I{$t}")->getNumberFormat()->setFormatCode('#,##0');
        $sheet->getStyle("J{$first}:N{$t}")->getNumberFormat()->setFormatCode(self::RUPIAH);
        $sheet->getStyle("O{$first}:O{$t}")->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle("L{$first}:L{$last}")->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::GOLD_SOFT);
        $sheet->getStyle("A{$first}:O{$last}")->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);

        $validation = $sheet->getCell("L{$first}")->getDataValidation();
        $validation->setType(DataValidation::TYPE_DECIMAL)->setOperator(DataValidation::OPERATOR_GREATERTHANOREQUAL)
            ->setFormula1('0')->setAllowBlank(true)->setShowErrorMessage(true)->setShowInputMessage(true)
            ->setErrorTitle('Biaya tidak valid')->setError('Isi angka Rupiah ≥ 0 tanpa titik/teks.')
            ->setPromptTitle('Biaya produksi / pcs')->setPrompt('Isi modal per pcs (bahan + jahit + sablon/bordir).');
        $sheet->setDataValidation("L{$first}:L{$last}", $validation);

        $this->autoWidth($sheet, 'A', 'O');
        $sheet->getColumnDimension('L')->setAutoSize(false)->setWidth(22);
        $sheet->getStyle("L{$h}")->getAlignment()->setWrapText(true);
        $sheet->freezePane('B'.($h + 1));
        $sheet->setAutoFilter("A{$h}:O{$last}");

        return $t;
    }

    private function fillSummary(Worksheet $sheet, CarbonImmutable $from, CarbonImmutable $to, int $totalRow): void
    {
        $data = $this->executive->summary($from, $to);
        $kpi = $data['kpi'];
        $d = "'Rincian & Modal'!";

        $sheet->setCellValue('A1', 'Rekap Executive — A-Taylor');
        $sheet->setCellValue('A2', "Periode {$from->toDateString()} s.d. {$to->toDateString()} · dibuat ".now()->format('Y-m-d H:i'));
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A2')->getFont()->getColor()->setRGB('6C7383');

        $sheet->fromArray(['Indikator', 'Nilai', 'Keterangan'], null, 'A4');
        $this->styleHeader($sheet, 'A4:C4');
        $rows = [
            ['Omzet terkonfirmasi', $kpi['revenue'], $data['definitions']['revenue']],
            ['Kas masuk', $kpi['cashIn'], $data['definitions']['cashIn']],
            ['Piutang', $kpi['outstanding'], $data['definitions']['outstanding']],
            ['Total pesanan', $kpi['totalOrders'], 'Semua pesanan periode ini kecuali dibatalkan.'],
            ['Pesanan terkonfirmasi', $kpi['confirmedOrders'], 'DP sudah divalidasi.'],
        ];
        $sheet->fromArray($rows, null, 'A5', true);
        $sheet->getStyle('B5:B7')->getNumberFormat()->setFormatCode(self::RUPIAH);

        $sheet->setCellValue('A11', 'Estimasi Laba (dari sheet "Rincian & Modal")');
        $sheet->getStyle('A11')->getFont()->setBold(true);
        $sheet->fromArray(['Indikator', 'Nilai', 'Keterangan'], null, 'A12');
        $this->styleHeader($sheet, 'A12:C12');
        $sheet->fromArray([
            ['Total penjualan (semua item)', "={$d}K{$totalRow}", 'Termasuk pesanan yang belum DP.'],
            ['Total biaya produksi', "={$d}M{$totalRow}", 'Hanya baris yang biaya produksinya sudah diisi.'],
            ['Laba kotor', "={$d}N{$totalRow}", 'Penjualan − biaya produksi pada baris yang sudah diisi.'],
            ['Margin', "={$d}O{$totalRow}", 'Laba kotor ÷ penjualan baris yang sudah diisi.'],
        ], null, 'A13');
        $sheet->getStyle('B13:B15')->getNumberFormat()->setFormatCode(self::RUPIAH);
        $sheet->getStyle('B16')->getNumberFormat()->setFormatCode('0.0%');
        $sheet->getStyle('A5:C9')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);
        $sheet->getStyle('A13:C16')->getBorders()->getAllBorders()->setBorderStyle(Border::BORDER_THIN)->getColor()->setRGB(self::LINE);

        $sheet->getColumnDimension('A')->setWidth(32);
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(70);
        $sheet->getStyle('C5:C16')->getAlignment()->setWrapText(true);
    }

    private function fillRecap(Worksheet $sheet, $orders): void
    {
        $sheet->fromArray(['Order Code', 'Tanggal', 'Pelanggan', 'Kanal', 'Marketing Closer', 'Status', 'Tahap WIP', 'Total Qty', 'Total', 'Dibayar', 'Sisa', 'Tenggat'], null, 'A1');
        $this->styleHeader($sheet, 'A1:L1');

        $r = 2;
        foreach ($orders as $o) {
            $sheet->fromArray([
                $o->order_code, $o->created_at->toDateString(), $o->customer_name, $o->channel === 'online' ? 'Online' : 'Offline',
                $o->closer?->name ?? '-', self::STATUS_LABELS[$o->status] ?? $o->status, $o->wip_stage ?? '-',
                (int) $o->items->sum('qty'), $o->total_amount, $o->paid_amount, $o->remaining_balance, $o->due_date->toDateString(),
            ], null, "A{$r}", true);
            $r++;
        }
        $sheet->getStyle("I2:K{$r}")->getNumberFormat()->setFormatCode(self::RUPIAH);
        $this->autoWidth($sheet, 'A', 'L');
        $sheet->freezePane('A2');
        if ($r > 2) {
            $sheet->setAutoFilter('A1:L'.($r - 1));
        }
    }

    private function styleHeader(Worksheet $sheet, string $range): void
    {
        $style = $sheet->getStyle($range);
        $style->getFont()->setBold(true)->getColor()->setRGB(self::INK);
        $style->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB(self::GOLD);
        $style->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
    }

    private function autoWidth(Worksheet $sheet, string $fromCol, string $toCol): void
    {
        $end = Coordinate::columnIndexFromString($toCol);
        for ($i = Coordinate::columnIndexFromString($fromCol); $i <= $end; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setAutoSize(true);
        }
    }
}
