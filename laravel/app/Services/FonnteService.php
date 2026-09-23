<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FonnteService
{
    protected ?string $token;
    protected string $apiUrl = 'https://api.fonnte.com/send';

    public function __construct()
    {
        $this->token = config('services.fonnte.token') ?? env('FONNTE_TOKEN');
    }

    /**
     * Send message & PDF attachment to WhatsApp via Fonnte
     */
    public function sendReceipt(string $phone, string $message, ?string $pdfBase64 = null, ?string $filename = null): array
    {
        if (empty($this->token)) {
            return [
                'success' => false,
                'status' => 'failed',
                'message' => 'FONNTE_TOKEN belum dikonfigurasi pada persekitaran server.'
            ];
        }

        // Clean & Normalize phone for Malaysia (+60)
        $cleanPhone = preg_replace('/[^\d+]/', '', trim($phone));
        if (str_starts_with($cleanPhone, '+')) {
            $cleanPhone = substr($cleanPhone, 1);
        }
        if (str_starts_with($cleanPhone, '0')) {
            $cleanPhone = '60' . substr($cleanPhone, 1);
        }

        try {
            $request = Http::withHeaders([
                'Authorization' => trim($this->token),
            ]);

            if ($pdfBase64) {
                $decodedPdf = base64_decode($pdfBase64);
                $pdfName = $filename ?: 'Resit.pdf';

                $response = $request->asMultipart()->post($this->apiUrl, [
                    [
                        'name' => 'target',
                        'contents' => $cleanPhone
                    ],
                    [
                        'name' => 'message',
                        'contents' => $message
                    ],
                    [
                        'name' => 'countryCode',
                        'contents' => '60'
                    ],
                    [
                        'name' => 'file',
                        'contents' => $decodedPdf,
                        'filename' => $pdfName,
                        'headers' => ['Content-Type' => 'application/pdf']
                    ]
                ]);
            } else {
                $response = $request->asForm()->post($this->apiUrl, [
                    'target' => $cleanPhone,
                    'message' => $message,
                    'countryCode' => '60'
                ]);
            }

            $body = $response->json() ?? [];

            if ($response->successful() && (($body['status'] ?? false) === true || ($body['status'] ?? '') === 'true' || ($body['status'] ?? '') === 'success')) {
                return [
                    'success' => true,
                    'status' => 'sent',
                    'message' => 'Resit PDF berjaya dihantar ke WhatsApp pelanggan.',
                    'response' => $body
                ];
            }

            $reason = $body['reason'] ?? $body['message'] ?? $body['detail'] ?? 'Penghantaran Fonnte gagal.';
            return [
                'success' => false,
                'status' => 'failed',
                'message' => "Gagal menghantar WhatsApp: {$reason}",
                'error' => $body
            ];
        } catch (\Throwable $e) {
            Log::error('FonnteService error: ' . $e->getMessage());
            return [
                'success' => false,
                'status' => 'failed',
                'message' => 'Ralat komunikasi dengan pelayan Fonnte.'
            ];
        }
    }
}
