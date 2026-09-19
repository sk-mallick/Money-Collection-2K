<?php
$h1 = '$2y$10$xinMjTkvwA551wxEzJhOHufqTAdcsfVKHAcWatOm80q44LNVFr/3m'; // original in dump
$h2 = '$2y$10$a0Wne4bNgeeQlc1yloEDDOn10j7IRM5Pcywjn536NEpFaFPZaFtvy'; // from migrate.sql
$h3 = password_hash('18102024', PASSWORD_BCRYPT); // direct 18102024

$candidates = ['18102024', '1810', 'admin', 'password', '123456', '18102024@', 'Chirinjibi', 'Chirinjibi@123', 'Chiranjibi', 'Sir@123'];

echo "Testing h1 (original dump):\n";
foreach ($candidates as $c) {
    if (password_verify($c, $h1)) echo "MATCH h1: $c\n";
}

echo "Testing h2 (migrate.sql):\n";
foreach ($candidates as $c) {
    if (password_verify($c, $h2)) echo "MATCH h2: $c\n";
}

// Let's generate a hash for '18102024'
echo "New hash for '18102024': " . password_hash('18102024', PASSWORD_BCRYPT) . "\n";
echo "New hash for '1': " . password_hash('1', PASSWORD_BCRYPT) . "\n";
