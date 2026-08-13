<?php

declare(strict_types=1);

use Rector\Config\RectorConfig;
use Rector\TypeDeclaration\Rector\StmtsAwareInterface\DeclareStrictTypesRector;

return RectorConfig::configure()
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
        // The directory, not `cache/**/*`: that glob needs at least one nested
        // level, so it missed `bootstrap/cache/services.php` - a generated
        // package-manifest file that reappears on every `composer require` and
        // failed the Rector check with a diff nobody should apply.
        __DIR__ . '/bootstrap/cache',
    ])
    ->withPhpSets(php82: true)
    // Turns a whole class of silent scalar coercions into TypeErrors.
    ->withRules([
        DeclareStrictTypesRector::class,
    ])
    ->withTypeCoverageLevel(5)
    ->withDeadCodeLevel(5)
    ->withCodeQualityLevel(5);
