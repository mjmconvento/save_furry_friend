<?php

declare(strict_types=1);

use PhpCsFixer\Fixer\Import\NoUnusedImportsFixer;
use Symplify\EasyCodingStandard\Config\ECSConfig;

return ECSConfig::configure()
    ->withPaths([
        __DIR__ . '/app',
        __DIR__ . '/bootstrap',
        __DIR__ . '/config',
        __DIR__ . '/database',
        __DIR__ . '/public',
        __DIR__ . '/resources',
        __DIR__ . '/routes',
        __DIR__ . '/tests',
    ])
    ->withSkip([
        // fnmatch: `*` never crosses `/`, so the old `cache/**/*` pattern only
        // matched files in SUBdirectories and let the flat, generated
        // `cache/services.php` through - locally that file predates the check,
        // but CI regenerates it on every `composer install` and failed on it.
        __DIR__ . '/bootstrap/cache/*',
        __DIR__ . '/bootstrap/cache/**/*',
    ])
    ->withRules([
        NoUnusedImportsFixer::class,
    ])
    ->withPreparedSets(
        psr12: true,
        spaces: true,
        namespaces: true,
        arrays: true,
    );
