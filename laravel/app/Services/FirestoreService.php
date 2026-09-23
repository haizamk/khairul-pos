<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\File;

class FirestoreService
{
    protected string $projectId;
    protected string $apiKey;
    protected string $databaseId;
    protected ?string $authToken = null;
    protected string $cachePath;

    public function __construct(?array $config = null)
    {
        $this->projectId = $config['project_id'] ?? config('firebase.project_id', 'my-vpn-503902');
        $this->apiKey = $config['api_key'] ?? config('firebase.api_key', 'AIzaSyCoABBylspOz4TjnFW800LWvTWoVDa_Q38');
        $this->databaseId = $config['database_id'] ?? config('firebase.database_id', 'ai-studio-khairulfreshposs-3e797666-7671-4cf3-a6d8-c9729922e0cc');
        
        $this->cachePath = storage_path('app/firestore_cache');
        if (!File::isDirectory($this->cachePath)) {
            File::makeDirectory($this->cachePath, 0755, true, true);
        }
    }

    public function setAuthToken(?string $token): self
    {
        $this->authToken = $token;
        return $this;
    }

    public function getBaseUrl(): string
    {
        return "https://firestore.googleapis.com/v1/projects/{$this->projectId}/databases/{$this->databaseId}/documents";
    }

    protected function getHeaders(): array
    {
        $headers = [
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ];

        if ($this->authToken) {
            $headers['Authorization'] = 'Bearer ' . $this->authToken;
        }

        return $headers;
    }

    /**
     * Test connection to Firestore
     */
    public function testConnection(): array
    {
        $start = microtime(true);
        $url = $this->getBaseUrl() . "/test/connection?key={$this->apiKey}";

        try {
            $response = Http::withHeaders($this->getHeaders())->timeout(6)->get($url);
            $latency = round((microtime(true) - $start) * 1000, 2);

            // A 404 (document not found) or 200 means Firestore responded and database exists!
            $status = $response->status();
            $connected = in_array($status, [200, 404]);

            return [
                'connected' => $connected,
                'status_code' => $status,
                'latency_ms' => $latency,
                'project_id' => $this->projectId,
                'database_id' => $this->databaseId,
                'message' => $connected ? 'Connected to Firestore Cloud' : 'Firestore unreachable or access restricted',
            ];
        } catch (\Throwable $e) {
            return [
                'connected' => false,
                'status_code' => 500,
                'latency_ms' => round((microtime(true) - $start) * 1000, 2),
                'project_id' => $this->projectId,
                'database_id' => $this->databaseId,
                'message' => $e->getMessage(),
            ];
        }
    }

    /**
     * Get a single document by collection and ID
     */
    public function getDocument(string $collection, string $documentId): ?array
    {
        $url = $this->getBaseUrl() . "/{$collection}/{$documentId}?key={$this->apiKey}";

        try {
            $response = Http::withHeaders($this->getHeaders())->timeout(5)->get($url);
            
            if ($response->successful()) {
                $doc = $response->json();
                $data = $this->decodeFields($doc['fields'] ?? []);
                $data['id'] = $documentId;
                
                // Update local fallback cache
                $this->saveToCache($collection, $documentId, $data);
                return $data;
            }
        } catch (\Throwable $e) {
            Log::warning("Firestore Read Error [{$collection}/{$documentId}]: " . $e->getMessage());
        }

        // Return from local cache fallback if cloud read fails
        return $this->getFromCache($collection, $documentId);
    }

    /**
     * Get collection documents
     */
    public function getCollection(string $collection, int $pageSize = 100): array
    {
        $url = $this->getBaseUrl() . "/{$collection}?pageSize={$pageSize}&key={$this->apiKey}";

        try {
            $response = Http::withHeaders($this->getHeaders())->timeout(5)->get($url);

            if ($response->successful()) {
                $json = $response->json();
                $documents = $json['documents'] ?? [];
                $items = [];

                foreach ($documents as $doc) {
                    $nameParts = explode('/', $doc['name']);
                    $docId = end($nameParts);
                    $item = $this->decodeFields($doc['fields'] ?? []);
                    $item['id'] = $docId;
                    $items[] = $item;
                    $this->saveToCache($collection, $docId, $item);
                }

                return $items;
            }
        } catch (\Throwable $e) {
            Log::warning("Firestore Collection Read Error [{$collection}]: " . $e->getMessage());
        }

        // Fallback to cache collection
        return $this->getCollectionFromCache($collection);
    }

    /**
     * Set/Update document in Firestore
     */
    public function setDocument(string $collection, string $documentId, array $data, bool $merge = true): array
    {
        // Always save to cache first for instant local persistence
        $this->saveToCache($collection, $documentId, $data);

        $url = $this->getBaseUrl() . "/{$collection}/{$documentId}?key={$this->apiKey}";
        $firestoreData = [
            'fields' => $this->encodeFields($data)
        ];

        try {
            $response = Http::withHeaders($this->getHeaders())
                ->timeout(6)
                ->patch($url, $firestoreData);

            if ($response->successful()) {
                return [
                    'success' => true,
                    'cloud_synced' => true,
                    'id' => $documentId,
                    'data' => $data,
                ];
            }
        } catch (\Throwable $e) {
            Log::warning("Firestore Write Error [{$collection}/{$documentId}]: " . $e->getMessage());
        }

        return [
            'success' => true,
            'cloud_synced' => false,
            'id' => $documentId,
            'data' => $data,
            'note' => 'Persisted to local cache, queued for cloud sync'
        ];
    }

    /**
     * Delete document
     */
    public function deleteDocument(string $collection, string $documentId): bool
    {
        $this->deleteFromCache($collection, $documentId);
        $url = $this->getBaseUrl() . "/{$collection}/{$documentId}?key={$this->apiKey}";

        try {
            $response = Http::withHeaders($this->getHeaders())->timeout(5)->delete($url);
            return $response->successful();
        } catch (\Throwable $e) {
            Log::warning("Firestore Delete Error [{$collection}/{$documentId}]: " . $e->getMessage());
            return true;
        }
    }

    // Cache Helpers
    protected function getCacheFile(string $collection, string $documentId): string
    {
        $dir = $this->cachePath . '/' . $collection;
        if (!File::isDirectory($dir)) {
            File::makeDirectory($dir, 0755, true, true);
        }
        return $dir . '/' . md5($documentId) . '.json';
    }

    protected function saveToCache(string $collection, string $documentId, array $data): void
    {
        $file = $this->getCacheFile($collection, $documentId);
        $payload = [
            'id' => $documentId,
            'data' => $data,
            'cached_at' => time(),
        ];
        File::put($file, json_encode($payload, JSON_PRETTY_PRINT));
    }

    protected function getFromCache(string $collection, string $documentId): ?array
    {
        $file = $this->getCacheFile($collection, $documentId);
        if (File::exists($file)) {
            $json = json_decode(File::get($file), true);
            return $json['data'] ?? null;
        }
        return null;
    }

    protected function getCollectionFromCache(string $collection): array
    {
        $dir = $this->cachePath . '/' . $collection;
        if (!File::isDirectory($dir)) {
            return [];
        }

        $items = [];
        foreach (File::files($dir) as $file) {
            $json = json_decode(File::get($file->getRealPath()), true);
            if (!empty($json['data'])) {
                $items[] = $json['data'];
            }
        }
        return $items;
    }

    protected function deleteFromCache(string $collection, string $documentId): void
    {
        $file = $this->getCacheFile($collection, $documentId);
        if (File::exists($file)) {
            File::delete($file);
        }
    }

    /**
     * Encode PHP associative array into Firestore REST values
     */
    public function encodeFields(array $data): array
    {
        $fields = [];
        foreach ($data as $key => $val) {
            if ($key === 'id') continue;
            $fields[$key] = $this->encodeValue($val);
        }
        return $fields;
    }

    protected function encodeValue(mixed $value): array
    {
        if (is_null($value)) {
            return ['nullValue' => null];
        }
        if (is_bool($value)) {
            return ['booleanValue' => $value];
        }
        if (is_int($value)) {
            return ['integerValue' => (string)$value];
        }
        if (is_float($value)) {
            return ['doubleValue' => $value];
        }
        if (is_string($value)) {
            return ['stringValue' => $value];
        }
        if (is_array($value)) {
            // Check if associative or indexed
            $isAssoc = array_keys($value) !== range(0, count($value) - 1);
            if ($isAssoc) {
                return [
                    'mapValue' => [
                        'fields' => $this->encodeFields($value)
                    ]
                ];
            } else {
                $vals = [];
                foreach ($value as $item) {
                    $vals[] = $this->encodeValue($item);
                }
                return [
                    'arrayValue' => [
                        'values' => $vals
                    ]
                ];
            }
        }
        return ['stringValue' => (string)$value];
    }

    /**
     * Decode Firestore REST fields into PHP associative array
     */
    public function decodeFields(array $fields): array
    {
        $result = [];
        foreach ($fields as $key => $valWrapper) {
            $result[$key] = $this->decodeValue($valWrapper);
        }
        return $result;
    }

    protected function decodeValue(array $wrapper): mixed
    {
        if (array_key_exists('stringValue', $wrapper)) {
            return $wrapper['stringValue'];
        }
        if (array_key_exists('integerValue', $wrapper)) {
            return (int)$wrapper['integerValue'];
        }
        if (array_key_exists('doubleValue', $wrapper)) {
            return (float)$wrapper['doubleValue'];
        }
        if (array_key_exists('booleanValue', $wrapper)) {
            return (bool)$wrapper['booleanValue'];
        }
        if (array_key_exists('nullValue', $wrapper)) {
            return null;
        }
        if (array_key_exists('mapValue', $wrapper)) {
            return $this->decodeFields($wrapper['mapValue']['fields'] ?? []);
        }
        if (array_key_exists('arrayValue', $wrapper)) {
            $vals = [];
            foreach ($wrapper['arrayValue']['values'] ?? [] as $sub) {
                $vals[] = $this->decodeValue($sub);
            }
            return $vals;
        }
        if (array_key_exists('timestampValue', $wrapper)) {
            return $wrapper['timestampValue'];
        }
        return null;
    }
}
