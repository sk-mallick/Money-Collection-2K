import os

# 1. Update backend/auth/login.php
with open(r'backend/auth/login.php', 'r', encoding='utf-8') as f:
    login_code = f.read()

old_login = "$rateLimitStmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE ip_address = ? AND attempted_at > NOW() - INTERVAL 15 MINUTE');\n    $rateLimitStmt->execute([$ipAddress]);"
new_login = "$rateLimitStmt = $pdo->prepare('SELECT COUNT(*) FROM login_attempts WHERE (ip_address = ? OR username = ?) AND attempted_at > NOW() - INTERVAL 15 MINUTE');\n    $rateLimitStmt->execute([$ipAddress, $username]);"

if old_login in login_code:
    login_code = login_code.replace(old_login, new_login)
    with open(r'backend/auth/login.php', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(login_code)
    print('Updated backend/auth/login.php')
else:
    print('login.php already patched or snippet not found')

# 2. Update backend/api/settings.php
with open(r'backend/api/settings.php', 'r', encoding='utf-8') as f:
    settings_code = f.read()

old_settings = "function updateSettings(PDO $pdo): void {\n    $input = get_input();"
new_settings = "function updateSettings(PDO $pdo): void {\n    global $user;\n    $input = get_input();"

if old_settings in settings_code:
    settings_code = settings_code.replace(old_settings, new_settings)
    with open(r'backend/api/settings.php', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(settings_code)
    print('Updated backend/api/settings.php')
else:
    print('settings.php already patched or snippet not found')

# 3. Update .htaccess to block .zip, .bak, .tar, .gz
with open(r'.htaccess', 'r', encoding='utf-8') as f:
    htaccess_code = f.read()

old_htaccess = '<FilesMatch "\\.(env|htaccess|md|sql|log|example)$">'
new_htaccess = '<FilesMatch "\\.(env|htaccess|md|sql|log|example|zip|bak|tar|gz)$">'

if old_htaccess in htaccess_code:
    htaccess_code = htaccess_code.replace(old_htaccess, new_htaccess)
    with open(r'.htaccess', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(htaccess_code)
    print('Updated .htaccess')
else:
    print('.htaccess already patched or snippet not found')

# 4. Remove sensitive backup zip from public root if exists and archive to docs or scratch
dump_zip = r'if0_42017220_mcms.sql.zip'
if os.path.exists(dump_zip):
    dest = os.path.join(r'scratch', 'if0_42017220_mcms.sql.zip')
    if os.path.exists(dest):
        os.remove(dest)
    os.rename(dump_zip, dest)
    print('Moved if0_42017220_mcms.sql.zip out of public root into scratch/')

# Also protect raw SQL file if0_42017220_mcms.sql
dump_sql = r'if0_42017220_mcms.sql'
if os.path.exists(dump_sql):
    dest_sql = os.path.join(r'scratch', 'if0_42017220_mcms.sql')
    if os.path.exists(dest_sql):
        os.remove(dest_sql)
    os.rename(dump_sql, dest_sql)
    print('Moved if0_42017220_mcms.sql out of public root into scratch/')

# 5. Patch db.php to cache self-healing DDL checks so they do not execute on every single request
with open(r'backend/includes/db.php', 'r', encoding='utf-8') as f:
    db_code = f.read()

old_db_start = "    // Self-healing: ensure remaining_months column and composite index exist in receipts table\n    try {"
new_db_start = """    // Self-healing: cached check to avoid 10+ DDL queries and table locks on every request
    $schemaFlagFile = dirname(__DIR__) . '/data/.schema_verified';
    if (!file_exists($schemaFlagFile)) {
        // Self-healing: ensure remaining_months column and composite index exist in receipts table
        try {"""

old_db_end = """        $rcCheck = $pdo->query("SHOW TABLES LIKE 'receipts'");
        if ($stCheck->rowCount() > 0 && $rcCheck->rowCount() > 0) {
            $pdo->exec("UPDATE students SET admission_fee_paid = 1 WHERE admission_fee_paid = 0 AND id IN (SELECT DISTINCT student_id FROM receipts WHERE student_id IS NOT NULL)");
        }
    } catch (Throwable $afEx) {
        // Suppress
    }

    return $pdo;"""

new_db_end = """        $rcCheck = $pdo->query("SHOW TABLES LIKE 'receipts'");
        if ($stCheck->rowCount() > 0 && $rcCheck->rowCount() > 0) {
            $pdo->exec("UPDATE students SET admission_fee_paid = 1 WHERE admission_fee_paid = 0 AND id IN (SELECT DISTINCT student_id FROM receipts WHERE student_id IS NOT NULL)");
        }
    } catch (Throwable $afEx) {
        // Suppress
    }

        @file_put_contents($schemaFlagFile, (string)time());
    }

    return $pdo;"""

if old_db_start in db_code and old_db_end in db_code:
    db_code = db_code.replace(old_db_start, new_db_start, 1)
    db_code = db_code.replace(old_db_end, new_db_end, 1)
    with open(r'backend/includes/db.php', 'w', encoding='utf-8', newline='\r\n') as f:
        f.write(db_code)
    print('Updated backend/includes/db.php with schema verification caching')
else:
    print('db.php self-healing already patched or snippets not matched')

