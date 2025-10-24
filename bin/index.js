#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const degit = require('degit');
const prompts = require('prompts');
const cac = require('cac');

/**
 * Slugify a project name for package.json name (simple)
 */
function slugify(name) {
    return name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function main() {
    const cli = cac('create-convexity-n-layer-template');

    cli
        .command('[project-name]', 'Scaffold a Convexity N-Layer Node backend project')
        .option(
            '--template <template>',
            'Template subdirectory or path within the repo (use "." for repo root)',
            { default: 'template' }
        )
        .option(
            '--repo <repo>',
            'Repository to use (degit spec). Examples: wrappedcbdc/convexity-n-layer-template OR github:wrappedcbdc/convexity-n-layer-template',
            { default: 'wrappedcbdc/convexity-n-layer-template' }
        )
        .option('--install', 'Run npm install after scaffolding', { default: false })
        .option('--no-git', 'Do not initialize a git repository', { default: false })
        .action(async (projectName, options) => {
            try {
                if (!projectName) {
                    const res = await prompts(
                        {
                            type: 'text',
                            name: 'name',
                            message: 'Project name:',
                            initial: 'my-convexity-app',
                            validate: (value) => (value && value.trim().length ? true : 'Please enter a project name')
                        },
                        {
                            onCancel: () => {
                                console.log('Aborted.');
                                process.exit(1);
                            }
                        }
                    );
                    projectName = res.name.trim();
                }

                const targetDir = path.resolve(process.cwd(), projectName);

                if (await fs.pathExists(targetDir)) {
                    const files = await fs.readdir(targetDir);
                    if (files.length) {
                        const response = await prompts(
                            {
                                type: 'confirm',
                                name: 'overwrite',
                                message: `Directory ${projectName} already exists and is not empty. Overwrite?`,
                                initial: false
                            },
                            {
                                onCancel: () => {
                                    console.log('Aborted.');
                                    process.exit(1);
                                }
                            }
                        );
                        if (!response.overwrite) {
                            console.log('Aborting.');
                            process.exit(1);
                        }
                        await fs.remove(targetDir);
                    }
                }

                console.log(`\nCreating project ${projectName}...\n`);

                const templatePath = (options.template || 'template').replace(/^\/+/, '');
                let repoBase = (options.repo || '').trim().replace(/\/+$/, '');
                const buildSpec = (base) =>
                    templatePath === '.' ? base : `${base}/${templatePath}`;

                let repoSpec = buildSpec(repoBase);

                async function tryClone(spec) {
                    const emitter = degit(spec, { cache: false, force: true, verbose: false });
                    await emitter.clone(targetDir);
                }

                try {
                    await tryClone(repoSpec);
                } catch (err) {
                    if (repoBase.startsWith('github:')) {
                        const fallbackBase = repoBase.replace(/^github:/, '');
                        const fallbackSpec = buildSpec(fallbackBase);
                        console.warn(`Failed to clone from "${repoSpec}". Retrying with "${fallbackSpec}"...`);
                        await tryClone(fallbackSpec);
                        repoSpec = fallbackSpec;
                    } else {
                        console.error(`Failed to clone template from "${repoSpec}".`);
                        console.error('Make sure the repo and template path are correct and the repo is public (or accessible).');
                        throw err;
                    }
                }

                const pkgPath = path.join(targetDir, 'package.json');
                if (await fs.pathExists(pkgPath)) {
                    let pkg = await fs.readFile(pkgPath, 'utf8');
                    const slug = slugify(projectName);
                    pkg = pkg.replace(/convexity-n-layer-template/g, projectName);
                    pkg = pkg.replace(/__PROJECT_SLUG__/g, slug);
                    await fs.writeFile(pkgPath, pkg, 'utf8');
                }

                if (options.install) {
                    const { execa } = await import('execa');
                    console.log('Installing dependencies with npm...');
                    try {
                        await execa('npm', ['install'], { cwd: targetDir, stdio: 'inherit' });
                        console.log('Dependencies installed.');
                    } catch (err) {
                        console.error('npm install failed. You can run it manually inside the new project.');
                        throw err;
                    }
                } else {
                    console.log('Skipping dependency install.');
                }

                if (!options.noGit) {
                    try {
                        const { execa } = await import('execa');
                        await execa('git', ['init'], { cwd: targetDir });
                        await execa('git', ['add', '.'], { cwd: targetDir });
                        try {
                            await execa('git', ['commit', '-m', 'chore: initial commit'], { cwd: targetDir });
                            console.log('Initialized git repository and made initial commit.');
                        } catch {
                            console.log('Initialized git repository (commit skipped — git user may not be configured).');
                        }
                    } catch {
                        console.log('Git init failed (git may be missing). Continuing without git.');
                    }
                } else {
                    console.log('Skipping git initialization (--no-git).');
                }

                console.log('\nDone!');
                console.log(
                    `\nNext steps:\n  1) cd ${projectName}\n  2) ${options.install ? '' : 'npm install  (if you skipped installation)\n  '}3) npm run dev  (or your start script)\n`
                );
            } catch (err) {
                console.error('Error:', err?.message || err);
                process.exit(1);
            }
        });

    cli.help();
    cli.version('1.0.0');
    cli.parse();
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});