<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class TestUserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            'id' => (string) Str::uuid(),
            'first_name' => 'Test',
            'last_name' => 'User I',
            'email' => 'test@user.com',
            'password' => Hash::make('password112233'),
        ]);

        DB::table('users')->insert([
            'id' => (string) Str::uuid(),
            'first_name' => 'Test',
            'middle_name' => 'Test',
            'last_name' => 'User II',
            'email' => 'test2@user.com',
            'password' => Hash::make('password112233'),
        ]);
    }
}
