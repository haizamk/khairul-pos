<?php

namespace App\Services;

class FirebaseService
{
    protected FirestoreService $firestore;

    public function __construct(FirestoreService $firestore)
    {
        $this->firestore = $firestore;
    }

    public function firestore(): FirestoreService
    {
        return $this->firestore;
    }

    public function getProjectId(): string
    {
        return config('firebase.project_id', 'my-vpn-503902');
    }

    public function getDatabaseId(): string
    {
        return config('firebase.database_id', 'ai-studio-khairulfreshposs-3e797666-7671-4cf3-a6d8-c9729922e0cc');
    }

    public function getApiKey(): string
    {
        return config('firebase.api_key', 'AIzaSyCoABBylspOz4TjnFW800LWvTWoVDa_Q38');
    }

    public function getStatus(): array
    {
        return $this->firestore->testConnection();
    }
}
