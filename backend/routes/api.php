<?php

use App\Http\Controllers\Api\AdminProfileChangeRequestController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClinicalOrderController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\EmailVerificationController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PasswordController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\ResourceController;
use App\Support\UserPresenter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'service' => 'SmartHôpital API',
    'status' => 'ok',
]));

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'SmartHôpital API',
]));

Route::get('/ready', function () {
    try {
        DB::select('select 1');
    } catch (Throwable) {
        return response()->json(['status' => 'unavailable'], 503);
    }

    return response()->json(['status' => 'ready']);
});

Route::get('/auth/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:verification.resend'])
    ->name('verification.verify');

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:auth.register');
    Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:auth.login');
    Route::post('/forgot-password', [PasswordController::class, 'forgot'])->middleware('throttle:password.forgot');
    Route::post('/reset-password', [PasswordController::class, 'reset'])->middleware('throttle:password.reset');
    Route::middleware(['auth:sanctum', 'active', 'locale'])->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/email/verification-notification', [EmailVerificationController::class, 'resend'])->middleware('throttle:verification.resend');
    });
});

Route::get('/user', function (Request $request) {
    return response()->json(['user' => UserPresenter::make(
        $request->user()->load(['role', 'doctor', 'patient'])
    )]);
})->middleware(['auth:sanctum', 'active', 'verified', 'locale']);

Route::middleware(['auth:sanctum', 'active', 'verified', 'locale'])->group(function () {
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::get('/profile/change-requests', [ProfileController::class, 'changeRequests']);
    Route::post('/profile/change-requests', [ProfileController::class, 'requestChange'])->middleware('throttle:10,1');

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
    Route::post('/doctors/{doctor}/reset-password', [ResourceController::class, 'resetDoctorPassword'])->middleware(['role:admin', 'throttle:admin.reset-link']);

    Route::get('/{model}', [ResourceController::class, 'index'])
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::post('/{model}', [ResourceController::class, 'store'])
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::get('/{model}/{id}', [ResourceController::class, 'show'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::patch('/{model}/{id}', [ResourceController::class, 'update'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::put('/{model}/{id}', [ResourceController::class, 'update'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
    Route::delete('/{model}/{id}', [ResourceController::class, 'destroy'])
        ->whereNumber('id')
        ->whereIn('model', ['departments', 'doctors', 'patients', 'appointments', 'medical-records', 'prescriptions']);
});
