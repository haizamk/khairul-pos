<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Services\FirestoreService;
use App\Services\FirebaseService;
use App\Services\ProductService;
use App\Services\CustomerService;
use App\Services\TransactionService;
use App\Services\SettingsService;

class FirebaseServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(FirestoreService::class, function ($app) {
            return new FirestoreService();
        });

        $this->app->singleton(FirebaseService::class, function ($app) {
            return new FirebaseService($app->make(FirestoreService::class));
        });

        $this->app->singleton(ProductService::class, function ($app) {
            return new ProductService($app->make(FirestoreService::class));
        });

        $this->app->singleton(CustomerService::class, function ($app) {
            return new CustomerService($app->make(FirestoreService::class));
        });

        $this->app->singleton(TransactionService::class, function ($app) {
            return new TransactionService($app->make(FirestoreService::class));
        });

        $this->app->singleton(SettingsService::class, function ($app) {
            return new SettingsService($app->make(FirestoreService::class));
        });
    }

    public function boot(): void
    {
        //
    }
}
