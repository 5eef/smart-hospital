<?php

namespace Tests\Feature;

use App\Events\UserNotificationCreated;
use App\Models\Appointment;
use App\Models\Department;
use App\Models\Doctor;
use App\Models\Notification;
use App\Models\Patient;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Lang;
use Tests\TestCase;

class BackendHardeningTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_is_public_and_api_root_not_found_is_expected(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->getJson('/api')->assertNotFound();
    }

    public function test_public_registration_can_only_create_a_patient_and_never_exposes_password(): void
    {
        $this->ensureRoles();

        $this->postJson('/api/auth/register', [
            'name' => 'Forbidden Admin',
            'email' => 'forbidden-admin@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'admin',
        ])->assertUnprocessable()->assertJsonValidationErrors('role');

        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Patient',
            'email' => 'new-patient@example.test',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'phone' => '+212600000000',
            'locale' => 'en',
        ])->assertCreated()
            ->assertJsonPath('user.role', 'patient')
            ->assertJsonPath('user.locale', 'en')
            ->assertJsonMissingPath('user.password')
            ->assertJsonStructure(['token']);

        $user = User::where('email', 'new-patient@example.test')->firstOrFail();
        $this->assertTrue(Hash::check('password123', $user->password));
        $this->assertNotNull($user->patient);
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_login_me_and_logout_revoke_the_current_token(): void
    {
        $user = $this->createUser('patient', 'login@example.test');
        Patient::create(['user_id' => $user->id]);

        $token = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'password123',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->json('token');

        $this->withToken($token)->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.email', $user->email);

        $this->withToken($token)->postJson('/api/auth/logout')
            ->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($token)->getJson('/api/auth/me')->assertUnauthorized();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_authentication_active_account_and_role_boundaries_are_enforced(): void
    {
        $this->getJson('/api/profile')->assertUnauthorized();
        $this->getJson('/api/notifications')->assertUnauthorized();
        $this->getJson('/api/admin/profile-change-requests')->assertUnauthorized();

        $inactive = $this->createUser('patient', 'inactive@example.test', false);
        Patient::create(['user_id' => $inactive->id]);
        $this->actingAs($inactive, 'sanctum')->getJson('/api/profile')->assertForbidden();
        $this->actingAs($inactive, 'sanctum')->getJson('/api/user')->assertForbidden();

        $patient = $this->createPatient('role-patient@example.test');
        $this->actingAs($patient->user, 'sanctum')->getJson('/api/admin/dashboard')->assertForbidden();
        $this->actingAs($patient->user, 'sanctum')->getJson('/api/admin/profile-change-requests')->assertForbidden();
    }

    public function test_each_role_can_open_its_existing_dashboard(): void
    {
        $admin = $this->createUser('admin', 'dashboard-admin@example.test');
        [, $doctor] = $this->createDoctor();
        $patient = $this->createPatient('dashboard-patient@example.test');

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/dashboard')->assertOk();
        $this->actingAs($doctor->user, 'sanctum')->getJson('/api/doctor/dashboard')->assertOk();
        $this->actingAs($patient->user, 'sanctum')->getJson('/api/patient/dashboard')->assertOk();
    }

    public function test_admin_department_crud_has_validation_search_pagination_and_permissions(): void
    {
        $admin = $this->createUser('admin', 'crud-admin@example.test');
        $patient = $this->createPatient('crud-patient@example.test');

        $departmentId = $this->actingAs($admin, 'sanctum')->postJson('/api/departments', [
            'name' => 'Cardiologie interventionnelle',
            'description' => 'Unité spécialisée',
            'is_active' => true,
        ])->assertCreated()->json('id');

        $this->actingAs($admin, 'sanctum')->postJson('/api/departments', [
            'name' => 'Cardiologie interventionnelle',
        ])->assertUnprocessable()->assertJsonValidationErrors('name');

        $this->actingAs($admin, 'sanctum')->getJson('/api/departments?search=interventionnelle&per_page=1')
            ->assertOk()
            ->assertJsonPath('total', 1)
            ->assertJsonPath('per_page', 1)
            ->assertJsonPath('data.0.id', $departmentId);

        $this->actingAs($admin, 'sanctum')->putJson("/api/departments/{$departmentId}", [
            'description' => 'Unité mise à jour',
        ])->assertOk()->assertJsonPath('description', 'Unité mise à jour');

        $this->actingAs($patient->user, 'sanctum')->deleteJson("/api/departments/{$departmentId}")
            ->assertForbidden();

        $this->actingAs($admin, 'sanctum')->deleteJson("/api/departments/{$departmentId}")
            ->assertOk();
        $this->assertDatabaseMissing('departments', ['id' => $departmentId]);
    }

    public function test_patient_profile_changes_are_pending_until_admin_approval(): void
    {
        $admin = $this->createUser('admin', 'profile-admin@example.test');
        $patient = $this->createPatient('profile-patient@example.test', ['address' => 'Ancienne adresse']);

        $this->actingAs($patient->user, 'sanctum')->getJson('/api/profile')
            ->assertOk()
            ->assertJsonPath('user.role', 'patient')
            ->assertJsonPath('profile.address', 'Ancienne adresse');

        $changeId = $this->actingAs($patient->user, 'sanctum')->postJson('/api/profile/change-requests', [
            'name' => 'Nom proposé',
            'phone' => '+212611111111',
            'address' => 'Nouvelle adresse',
            'locale' => 'en',
        ])->assertStatus(202)
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('user.name', $patient->user->name)
            ->json('change_request.id');

        $this->assertDatabaseHas('users', ['id' => $patient->user_id, 'name' => $patient->user->name]);
        $this->assertDatabaseHas('patients', ['id' => $patient->id, 'address' => 'Ancienne adresse']);
        $this->assertDatabaseHas('notifications', ['user_id' => $admin->id, 'type' => 'profile_change_requested']);

        $this->actingAs($patient->user, 'sanctum')->postJson('/api/profile/change-requests', ['name' => 'Autre nom'])
            ->assertUnprocessable()->assertJsonValidationErrors('profile');
        $this->actingAs($patient->user, 'sanctum')->getJson('/api/profile/change-requests')
            ->assertOk()->assertJsonPath('total', 1);

        $this->actingAs($admin, 'sanctum')->getJson('/api/admin/profile-change-requests?status=pending')
            ->assertOk()->assertJsonPath('total', 1);
        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profile-change-requests/{$changeId}/approve")
            ->assertOk()->assertJsonPath('change_request.status', 'approved');

        $this->assertDatabaseHas('users', [
            'id' => $patient->user_id,
            'name' => 'Nom proposé',
            'phone' => '+212611111111',
            'locale' => 'en',
        ]);
        $this->assertDatabaseHas('patients', ['id' => $patient->id, 'address' => 'Nouvelle adresse']);
        $this->assertDatabaseHas('notifications', ['user_id' => $patient->user_id, 'type' => 'profile_change_approved']);

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profile-change-requests/{$changeId}/approve")
            ->assertStatus(409);
    }

    public function test_rejected_profile_change_does_not_modify_profile_and_notifies_requester(): void
    {
        $admin = $this->createUser('admin', 'reject-admin@example.test');
        $patient = $this->createPatient('reject-patient@example.test');
        $originalName = $patient->user->name;

        $changeId = $this->actingAs($patient->user, 'sanctum')->putJson('/api/auth/profile', [
            'name' => 'Nom refusé',
        ])->assertStatus(202)->json('change_request.id');

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profile-change-requests/{$changeId}/reject")
            ->assertUnprocessable()
            ->assertJsonValidationErrors('rejection_reason');

        $this->actingAs($admin, 'sanctum')->patchJson("/api/admin/profile-change-requests/{$changeId}/reject", [
            'rejection_reason' => 'Justificatif requis.',
        ])->assertOk()->assertJsonPath('change_request.status', 'rejected');

        $this->assertDatabaseHas('users', ['id' => $patient->user_id, 'name' => $originalName]);
        $this->assertDatabaseHas('profile_change_requests', [
            'id' => $changeId,
            'status' => 'rejected',
            'reviewed_by' => $admin->id,
            'rejection_reason' => 'Justificatif requis.',
        ]);
        $this->assertDatabaseHas('notifications', ['user_id' => $patient->user_id, 'type' => 'profile_change_rejected']);
    }

    public function test_notifications_are_persistent_scoped_and_can_be_marked_read(): void
    {
        $first = $this->createPatient('notifications-one@example.test');
        $second = $this->createPatient('notifications-two@example.test');
        $mine = Notification::create([
            'user_id' => $first->user_id,
            'title' => 'Pour moi',
            'message' => 'Message privé',
            'type' => 'info',
        ]);
        $other = Notification::create([
            'user_id' => $second->user_id,
            'title' => 'Autre',
            'message' => 'Ne doit pas être visible',
            'type' => 'info',
        ]);

        $this->actingAs($first->user, 'sanctum')->getJson('/api/notifications')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $mine->id);
        $this->actingAs($first->user, 'sanctum')->getJson('/api/notifications/unread')
            ->assertOk()->assertJsonCount(1);
        $this->actingAs($first->user, 'sanctum')->patchJson("/api/notifications/{$other->id}/read")
            ->assertNotFound();
        $this->actingAs($first->user, 'sanctum')->patchJson("/api/notifications/{$mine->id}/read")
            ->assertOk()->assertJsonPath('notification.id', $mine->id);
        $this->assertNotNull($mine->fresh()->read_at);

        Notification::create([
            'user_id' => $first->user_id,
            'title' => 'Encore',
            'message' => 'Deuxième message',
            'type' => 'info',
        ]);
        $this->actingAs($first->user, 'sanctum')->patchJson('/api/notifications/read-all')
            ->assertOk()->assertJsonPath('updated', 1);
        $this->assertSame(0, $first->user->notifications()->unread()->count());
    }

    public function test_patient_and_doctor_cannot_cross_access_unrelated_records(): void
    {
        [, $doctor] = $this->createDoctor();
        $assigned = $this->createPatient('assigned@example.test');
        $unrelated = $this->createPatient('unrelated@example.test');
        Appointment::create([
            'patient_id' => $assigned->id,
            'doctor_id' => $doctor->id,
            'department_id' => $doctor->department_id,
            'scheduled_at' => now()->addDay(),
            'status' => 'confirmed',
        ]);

        $this->actingAs($assigned->user, 'sanctum')->getJson("/api/patients/{$unrelated->id}")
            ->assertNotFound();
        $this->actingAs($doctor->user, 'sanctum')->getJson("/api/patients/{$unrelated->id}")
            ->assertNotFound();
        $this->actingAs($doctor->user, 'sanctum')->postJson('/api/medical-records', [
            'patient_id' => $unrelated->id,
            'diagnosis' => 'Tentative non autorisée',
        ])->assertForbidden();
    }

    public function test_appointment_changes_create_scoped_notifications_and_broadcast_events(): void
    {
        Event::fake([UserNotificationCreated::class]);
        [$department, $doctor] = $this->createDoctor();
        $patient = $this->createPatient('appointment-patient@example.test');
        $other = $this->createPatient('appointment-other@example.test');

        $appointmentId = $this->actingAs($patient->user, 'sanctum')->postJson('/api/appointments', [
            'patient_id' => $other->id,
            'doctor_id' => $doctor->id,
            'department_id' => $department->id,
            'scheduled_at' => now()->addDays(2)->setTime(9, 30)->toDateTimeString(),
            'reason' => 'Contrôle',
        ])->assertCreated()
            ->assertJsonPath('patient_id', $patient->id)
            ->json('id');

        $this->assertDatabaseHas('notifications', ['user_id' => $doctor->user_id, 'type' => 'appointment_created']);
        Event::assertDispatched(UserNotificationCreated::class);

        $this->actingAs($doctor->user, 'sanctum')->putJson("/api/appointments/{$appointmentId}", [
            'status' => 'confirmed',
            'patient_id' => $other->id,
        ])->assertOk()
            ->assertJsonPath('status', 'confirmed')
            ->assertJsonPath('patient_id', $patient->id);
        $this->assertDatabaseHas('notifications', ['user_id' => $patient->user_id, 'type' => 'appointment_updated']);

        $this->actingAs($patient->user, 'sanctum')->putJson("/api/appointments/{$appointmentId}", [
            'status' => 'completed',
        ])->assertForbidden();
        $this->actingAs($other->user, 'sanctum')->getJson("/api/appointments/{$appointmentId}")
            ->assertNotFound();
    }

    public function test_private_broadcast_channel_only_authorizes_its_owner(): void
    {
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        Broadcast::purge();
        Broadcast::channel('user.{userId}', fn (User $user, int $userId) => $user->id === $userId && $user->is_active);

        $first = $this->createPatient('channel-one@example.test');
        $second = $this->createPatient('channel-two@example.test');
        $firstToken = $first->user->createToken('channel-test')->plainTextToken;
        $secondToken = $second->user->createToken('channel-test')->plainTextToken;

        $payload = ['socket_id' => '1234.5678', 'channel_name' => "private-user.{$first->user_id}"];
        $this->withToken($firstToken)->postJson('/broadcasting/auth', $payload)->assertOk();
        $this->app['auth']->forgetGuards();
        $this->withToken($secondToken)->postJson('/broadcasting/auth', $payload)->assertForbidden();
    }

    public function test_accept_language_and_saved_locale_select_translated_errors(): void
    {
        $this->ensureRoles();
        $this->withHeader('Accept-Language', 'en-US')->postJson('/api/auth/login', [
            'email' => 'missing@example.test',
            'password' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonPath('errors.email.0', Lang::get('api.invalid_credentials', [], 'en'));

        $arabicValidation = $this->withHeader('Accept-Language', 'ar')->postJson('/api/auth/register', [
            'name' => 'مريض',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable();
        $this->assertStringContainsString('مطلوب', $arabicValidation->json('errors.email.0'));

        $patient = $this->createPatient('locale-patient@example.test');
        $patient->user->update(['locale' => 'ar']);
        $savedLocaleResponse = $this->actingAs($patient->user->fresh(), 'sanctum')
            ->withHeader('Accept-Language', 'en')
            ->postJson('/api/profile/change-requests', [])
            ->assertUnprocessable();
        $this->assertSame(Lang::get('api.profile.no_changes', [], 'ar'), $savedLocaleResponse->json('errors.profile.0'));
    }

    private function ensureRoles(): void
    {
        foreach (['admin' => 'Administrateur', 'doctor' => 'Médecin', 'patient' => 'Patient'] as $name => $label) {
            Role::firstOrCreate(['name' => $name], ['label' => $label]);
        }
    }

    private function createDoctor(): array
    {
        $department = Department::create([
            'name' => 'Cardiologie '.fake()->unique()->numerify('###'),
            'is_active' => true,
        ]);
        $user = $this->createUser('doctor', fake()->unique()->safeEmail());
        $doctor = Doctor::create([
            'user_id' => $user->id,
            'department_id' => $department->id,
            'license_number' => fake()->unique()->bothify('DOC-#####'),
            'specialty' => 'Cardiologue',
            'status' => 'active',
        ]);

        return [$department, $doctor];
    }

    private function createPatient(string $email, array $attributes = []): Patient
    {
        return Patient::create(array_merge($attributes, [
            'user_id' => $this->createUser('patient', $email)->id,
        ]));
    }

    private function createUser(string $roleName, string $email, bool $active = true): User
    {
        $this->ensureRoles();

        return User::create([
            'name' => ucfirst(strtok($email, '@')),
            'email' => $email,
            'password' => 'password123',
            'role_id' => Role::where('name', $roleName)->value('id'),
            'locale' => 'fr',
            'is_active' => $active,
        ]);
    }
}
