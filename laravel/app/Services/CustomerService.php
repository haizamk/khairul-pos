<?php

namespace App\Services;

class CustomerService
{
    protected FirestoreService $firestore;
    protected string $collection = 'customers';

    public function __construct(FirestoreService $firestore)
    {
        $this->firestore = $firestore;
    }

    public function getAllCustomers(): array
    {
        $customers = $this->firestore->getCollection($this->collection);
        if (empty($customers)) {
            return $this->getDefaultCustomers();
        }
        return $customers;
    }

    public function getCustomerById(string $id): ?array
    {
        $doc = $this->firestore->getDocument($this->collection, $id);
        if ($doc) return $doc;

        foreach ($this->getDefaultCustomers() as $c) {
            if ($c['id'] === $id) return $c;
        }
        return null;
    }

    public function saveCustomer(array $data): array
    {
        $id = $data['id'] ?? ('c_' . time() . '_' . substr(md5(uniqid()), 0, 4));
        $data['id'] = $id;
        $data['name'] = (string)($data['name'] ?? 'Pelanggan Walk-In');
        $data['type'] = (string)($data['type'] ?? 'runcit');
        $data['phone'] = (string)($data['phone'] ?? '');
        $data['specialPriceEnabled'] = (bool)($data['specialPriceEnabled'] ?? false);

        $this->firestore->setDocument($this->collection, $id, $data);
        return $data;
    }

    public function deleteCustomer(string $id): bool
    {
        return $this->firestore->deleteDocument($this->collection, $id);
    }

    public function getDefaultCustomer(): array
    {
        $customers = $this->getAllCustomers();
        foreach ($customers as $c) {
            if (strcasecmp($c['name'] ?? '', 'Runcit') === 0 || stripos($c['name'] ?? '', 'Walk-In') !== false) {
                return $c;
            }
        }
        return [
            'id' => 'cust_runcit',
            'name' => 'Runcit',
            'type' => 'runcit',
            'phone' => '',
            'specialPriceEnabled' => false,
        ];
    }

    public function getDefaultCustomers(): array
    {
        return [
            [
                'id' => 'c1',
                'name' => 'Runcit',
                'type' => 'runcit',
                'phone' => '',
                'specialPriceEnabled' => false,
            ],
            [
                'id' => 'c2',
                'name' => 'Restoran Selera Kampung',
                'type' => 'restoran',
                'phone' => '012-3456789',
                'specialPriceEnabled' => true,
            ],
            [
                'id' => 'c3',
                'name' => 'Haji Manan (Pelanggan Tetap)',
                'type' => 'tetap',
                'phone' => '019-8765432',
                'specialPriceEnabled' => false,
            ],
            [
                'id' => 'c4',
                'name' => 'Katering Berkat Maju',
                'type' => 'pemborong',
                'phone' => '013-1122334',
                'specialPriceEnabled' => true,
            ],
        ];
    }
}
