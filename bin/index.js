#!/usr/bin/env node

const path = require('path');
const fs = require('fs-extra');
const degit = require('degit');
const prompts = require('prompts');
const cac = require('cac');
const execa = require('execa');

/**
 * Slugify a project name for package.json name (simple)
 */
function slugify(name) {
    return name
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_\.]/g, '-')
        .replace(/-+/g, '-')
        .replace(/(^-|-$)/g, '');
}

async function detectInstaller() {
    try {
        await execa('pnpm', ['--version']);
        return 'pnpm';
    } catch {}
    try {
        await execa('yarn', ['--version']);
        return 'yarn';
    } catch {}
    return 'npm';
}

async function main() {
    const cli = cac('create-convexity-n-layer-template');

    cli
        .command('[project-name]', 'Scaffold a Convexity N-Layer Node backend project')
        .option(
            '--template <template>',
            'Template subdirectory or path within the repo (use "." for repo root)',
            {
                default: 'template',
            }
        )
        .option(
            '--repo <repo>',
            'Repository to use (degit spec). Examples: github:wrappedcbdc/convexity-n-layer-template OR wrappedcbdc/convexity-n-layer-template',
            {
                default: 'github:wrappedcbdc/convexity-n-layer-template',
            }
        )
        .option('--install', 'Run package manager install after scaffolding', {
            default: false,
        })
        .option('--no-git', 'Do not initialize a git repository', {
            default: false,
        })
        .action(async (projectName, options) => {
            try {
                // 1) Resolve project name (prompt if not provided)
                if (!projectName) {
                    const res = await prompts(
                        {
                            type: 'text',
                            name: 'name',
                            message: 'Project name:',
                            initial: 'my-convexity-app',
                            validate: (value) => (value && value.trim().length ? true : 'Please enter a project name'),
                        },
                        {
                            onCancel: () => {
                                console.log('Aborted.');
                                process.exit(1);
                            },
                        }
                    );
                    projectName = res.name.trim();
                }

                const targetDir = path.resolve(process.cwd(), projectName);

                // 2) If target directory exists, confirm overwrite
                if (await fs.pathExists(targetDir)) {
                    const files = await fs.readdir(targetDir);
                    if (files.length) {
                        const response = await prompts(
                            {
                                type: 'confirm',
                                name: 'overwrite',
                                message: `Directory ${projectName} already exists and is not empty. Overwrite?`,
                                initial: false,
                            },
                            {
                                onCancel: () => {
                                    console.log('Aborted.');
                                    process.exit(1);
                                },
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

                // 3) Prepare repo spec for degit
                // Accept forms:
                // - github:owner/repo
                // - owner/repo
                // - owner/repo#branch
                // Then append /templatePath (unless templatePath === '.')
                const templatePath = options.template || 'template';
                let repoBase = (options.repo || '').trim();

                // If user passed owner/repo without `github:` prefix, degit accepts it fine.
                // Ensure we remove trailing slashes.
                repoBase = repoBase.replace(/\/+$/, '');

                const repoSpec = templatePath === '.'
                    ? repoBase
                    : `${repoBase}/${templatePath.replace(/^\/+/, '')}`;

                // 4) Clone with degit
                let emitter;
                try {
                    emitter = degit(repoSpec, { cache: false, force: true, verbose: false });
                } catch (err) {
                    console.error('Failed to create degit emitter. Check your repo/template path.');
                    throw err;
                }

                try {
                    await emitter.clone(targetDir);
                } catch (err) {
                    console.error(`Failed to clone template from "${repoSpec}".`);
                    console.error('Make sure the repo and template path are correct and the repo is public (or accessible).');
                    throw err;
                }

                // 5) Replace placeholders (e.g., __PROJECT_NAME__, __PROJECT_SLUG__)
                const pkgPath = path.join(targetDir, 'package.json');
                if (await fs.pathExists(pkgPath)) {
                    let pkg = await fs.readFile(pkgPath, 'utf8');
                    const slug = slugify(projectName);
                    pkg = pkg.replace(/__PROJECT_NAME__/g, projectName);
                    pkg = pkg.replace(/__PROJECT_SLUG__/g, slug);
                    // also replace placeholder in README or other files if desired
                    await fs.writeFile(pkgPath, pkg, 'utf8');
                }

                // 6) Optionally install dependencies
                if (options.install) {
                    const installer = await detectInstaller();
                    const installArgs = installer === 'yarn' ? [] : ['install'];
                    console.log(`Installing dependencies with ${installer}...`);
                    try {
                        await execa(installer, installArgs, { cwd: targetDir, stdio: 'inherit' });
                        console.log('Dependencies installed.');
                    } catch (err) {
                        console.error('Package installation failed. You can run the installer manually inside the new project.');
                        throw err;
                    }
                } else {
                    console.log('Skipping dependency install.');
                }

                // 7) Initialize git unless disabled
                if (!options.noGit) {
                    try {
                        await execa('git', ['init'], { cwd: targetDir });
                        await execa('git', ['add', '.'], { cwd: targetDir });
                        // Try to commit; if git user is not configured it might fail but we continue gracefully
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
                console.log(`\nNext steps:\n  1) cd ${projectName}\n  2) ${options.install ? '' : 'npm install  (if you skipped installation)\n  '}3) npm run dev  (or your start script)\n`);
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
