<?php

declare(strict_types=1);

use PhpCsFixer\Fixer\Import\NoUnusedImportsFixer;
use Symplify\EasyCodingStandard\Config\ECSConfig;

return ECSConfig::configure()
    ->withPaths([
        __DIR__ . '/app',
        __DIR__ . '/bootstrap',
        __DIR__ . '/config',
        __DIR__ . '/public',
        __DIR__ . '/resources',
        __DIR__ . '/routes',
        __DIR__ . '/tests',
    ])

    // add a single rule
    ->withRules([
        NoUnusedImportsFixer::class,
    ])

    // add sets - group of rules, from easiest to more complex ones
    // uncomment one, apply one, commit, PR, merge and repeat
    ->withPreparedSets(
        psr12: true
    //      spaces: true,
    //      namespaces: true,
    //      docblocks: true,
    //      arrays: true,
    //      comments: true,
    )
    ;
