<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\FonnteService;

class WhatsAppReceiptController extends Controller
{
    protected FonnteService $fonnteService;

    public function __construct(FonnteService $fonnteService)
    {
        $this->fonnteService = $fonnteService;
    }

    /**
     * Handle POST /api/whatsapp/receipt
     */
    public function sendReceipt(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'message' => 'nullable|string',
            'pdfBase64' => 'nullable|string',
            'filename' => 'nullable|string',
            'transactionId' => 'nullable|string',
            'invoiceNo' => 'nullable|string',
        ]);

        $phone = $validated['phone'];
        $message = $validated['message'] ?? 'Resit Rasmi dari Khairul Fresh Food.';
        $pdfBase64 = $validated['pdfBase64'] ?? null;
        $filename = $validated['filename'] ?? ($validated['invoiceNo'] ? "Resit_{$validated['invoiceNo']}.pdf" : 'Resit.pdf');

        $result = $this->fonnteService->sendReceipt($phone, $message, $pdfBase64, $filename);

        return response()->json($result);
    }
}
