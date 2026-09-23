<?php

namespace App\Services;

class TransactionService
{
    protected FirestoreService $firestore;
    protected string $collection = 'transactions';

    public function __construct(FirestoreService $firestore)
    {
        $this->firestore = $firestore;
    }

    public function getAllTransactions(): array
    {
        return $this->firestore->getCollection($this->collection);
    }

    public function getTransactionById(string $id): ?array
    {
        return $this->firestore->getDocument($this->collection, $id);
    }

    public function createTransaction(array $data): array
    {
        $id = $data['id'] ?? ('tx_' . time() . '_' . substr(md5(uniqid()), 0, 4));
        $data['id'] = $id;
        $data['timestamp'] = $data['timestamp'] ?? (time() * 1000);
        $data['date'] = $data['date'] ?? date('Y-m-d H:i:s');
        $data['invoiceNo'] = $data['invoiceNo'] ?? $this->getNextInvoiceNo();
        $data['status'] = $data['status'] ?? 'completed';
        
        $total = (float)($data['totalAmount'] ?? 0.0);
        $data['totalAmount'] = round($total, 2);
        $data['subtotal'] = round((float)($data['subtotal'] ?? $total), 2);
        $data['discountAmount'] = round((float)($data['discountAmount'] ?? 0.0), 2);
        
        $received = (float)($data['amountReceived'] ?? $data['receivedAmount'] ?? $total);
        $data['amountReceived'] = round($received, 2);
        $data['receivedAmount'] = $data['amountReceived'];
        
        $change = (float)($data['change'] ?? $data['changeAmount'] ?? max(0, $received - $total));
        $data['change'] = round($change, 2);
        $data['changeAmount'] = $data['change'];
        
        $paymentMethod = (string)($data['paymentMethod'] ?? 'cash');
        $data['paymentMethod'] = $paymentMethod;
        $data['paymentStatus'] = (string)($data['paymentStatus'] ?? ($paymentMethod === 'cash' ? 'paid' : 'pending'));

        $this->firestore->setDocument($this->collection, $id, $data);
        return $data;
    }

    public function voidTransaction(string $id, string $reason): bool
    {
        $tx = $this->getTransactionById($id);
        if (!$tx) return false;

        $tx['status'] = 'voided';
        $tx['voidReason'] = $reason;
        $tx['voidedAt'] = time() * 1000;

        $this->firestore->setDocument($this->collection, $id, $tx);
        return true;
    }

    public function getNextInvoiceNo(): string
    {
        $today = date('Ymd');
        $random = strtoupper(substr(uniqid(), -4));
        return "INV-{$today}-{$random}";
    }

    public function getHeldTickets(): array
    {
        return $this->firestore->getCollection('held_tickets');
    }

    public function holdTicket(array $ticketData): array
    {
        $id = $ticketData['id'] ?? ('held_' . time() . '_' . substr(md5(uniqid()), 0, 4));
        $ticketData['id'] = $id;
        $ticketData['createdAt'] = $ticketData['createdAt'] ?? (time() * 1000);
        $ticketData['ticketNumber'] = $ticketData['ticketNumber'] ?? (count($this->getHeldTickets()) + 1);

        $this->firestore->setDocument('held_tickets', $id, $ticketData);
        return $ticketData;
    }

    public function deleteHeldTicket(string $id): bool
    {
        return $this->firestore->deleteDocument('held_tickets', $id);
    }
}
