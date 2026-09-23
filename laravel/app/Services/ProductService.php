<?php

namespace App\Services;

class ProductService
{
    protected FirestoreService $firestore;
    protected string $collection = 'products';

    public function __construct(FirestoreService $firestore)
    {
        $this->firestore = $firestore;
    }

    public function getAllProducts(): array
    {
        $products = $this->firestore->getCollection($this->collection);
        if (empty($products)) {
            return $this->getDefaultProducts();
        }
        return $products;
    }

    public function getProductById(string $id): ?array
    {
        $doc = $this->firestore->getDocument($this->collection, $id);
        if ($doc) return $doc;

        foreach ($this->getDefaultProducts() as $p) {
            if ($p['id'] === $id) return $p;
        }
        return null;
    }

    public function saveProduct(array $data): array
    {
        $id = $data['id'] ?? ('p_' . time() . '_' . substr(md5(uniqid()), 0, 4));
        $data['id'] = $id;
        $data['name'] = (string)($data['name'] ?? 'Produk Baru');
        $data['defaultPrice'] = (float)($data['defaultPrice'] ?? 0.0);
        $data['defaultUnit'] = (string)($data['defaultUnit'] ?? 'kg');
        $data['isPopular'] = (bool)($data['isPopular'] ?? false);
        $data['color'] = (string)($data['color'] ?? 'emerald');

        $this->firestore->setDocument($this->collection, $id, $data);
        return $data;
    }

    public function deleteProduct(string $id): bool
    {
        return $this->firestore->deleteDocument($this->collection, $id);
    }

    public function getDefaultProducts(): array
    {
        return [
            [
                'id' => 'p1',
                'name' => 'Ayam Segar Standard',
                'defaultPrice' => 9.50,
                'defaultUnit' => 'kg',
                'color' => 'emerald',
                'isPopular' => true,
            ],
            [
                'id' => 'p2',
                'name' => 'Ayam Pencen',
                'defaultPrice' => 14.00,
                'defaultUnit' => 'ekor',
                'color' => 'amber',
                'isPopular' => true,
            ],
            [
                'id' => 'p3',
                'name' => 'Daging Batang Pinang',
                'defaultPrice' => 38.00,
                'defaultUnit' => 'kg',
                'color' => 'rose',
                'isPopular' => true,
            ],
            [
                'id' => 'p4',
                'name' => 'Tulang Lembu Sup',
                'defaultPrice' => 26.00,
                'defaultUnit' => 'kg',
                'color' => 'blue',
                'isPopular' => false,
            ],
            [
                'id' => 'p5',
                'name' => 'Hati Ayam & Pedal',
                'defaultPrice' => 8.00,
                'defaultUnit' => 'pkt',
                'color' => 'purple',
                'isPopular' => false,
            ],
            [
                'id' => 'p6',
                'name' => 'Ikan Kembung Segar',
                'defaultPrice' => 18.00,
                'defaultUnit' => 'kg',
                'color' => 'cyan',
                'isPopular' => true,
            ],
            [
                'id' => 'p7',
                'name' => 'Udang Harimau XL',
                'defaultPrice' => 48.00,
                'defaultUnit' => 'kg',
                'color' => 'teal',
                'isPopular' => false,
            ],
            [
                'id' => 'p8',
                'name' => 'Kambing Perap BBQ',
                'defaultPrice' => 25.00,
                'defaultUnit' => 'pkt',
                'color' => 'orange',
                'isPopular' => false,
            ],
        ];
    }
}
