<?php
/**
 * Money Collection 2K — Root Setup Entry Point
 * Directs to the backend/api/setup.php controller
 */
if (!defined('MCMS_SETUP')) {
    define('MCMS_SETUP', true);
}
require_once __DIR__ . '/backend/api/setup.php';

