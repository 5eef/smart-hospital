<?php

use App\Http\Controllers\Api\AdminProfileChangeRequestController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicalOrderController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ResourceController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'SmartHôpital API',
]));

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:5,1');
    Route::middleware(['auth:sanctum', 'active', 'locale'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/profile', [ProfileController::class, 'requestChange']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware(['auth:sanctum', 'active', 'locale']);

Route::middleware(['auth:sanctum', 'active', 'locale'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/profile/change-requests', [ProfileController::class, 'changeRequests']);
    Route::post('/profile/change-requests', [ProfileController::class, 'requestChange']);

    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread', [NotificationController::class, 'unread']);
    Route::patch('/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead'])->whereNumber('notification');

    Route::get('/clinical-orders', [ClinicalOrderController::class, 'index']);
    Route::post('/clinical-orders', [ClinicalOrderController::class, 'store']);
    Route::get('/clinical-orders/{clinicalOrder}', [ClinicalOrderController::class, 'show'])->whereNumber('clinicalOrder');
    Route::put('/clinical-orders/{clinicalOrder}', [ClinicalOrderController::class, 'update'])->whereNumber('clinicalOrder');

    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/profile-change-requests', [AdminProfileChangeRequestController::class, 'index']);
        Route::patch('/profile-change-requests/{profileChangeRequest}/approve', [AdminProfileChangeRequestController::class, 'approve']);
        Route::patch('/profile-change-requests/{profileChangeRequest}/reject', [AdminProfileChangeRequestController::class, 'reject']);
    });

    Route::get('/admin/dashboard', [DashboardController::class, 'admin'])->middleware('role:admin');
    Route::get('/doctor/dashboard', [DashboardController::class, 'doctor'])->middleware('role:doctor,admin');
    Route::get('/patient/dashboard', [DashboardController::class, 'patient'])->middleware('role:patient,admin');
    Route::post('/doctors/{doctor}/reset-password', [ResourceController::class, 'resetDoctorPassword'])->middleware('role:admin');

    Route::get('/{model}', [ResourceController::class, 'index'])
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::post('/{model}', [ResourceController::class, 'store'])
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::get('/{model}/{id}', [ResourceController::class, 'show'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::put('/{model}/{id}', [ResourceController::class, 'update'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::delete('/{model}/{id}', [ResourceController::class, 'destroy'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
});
