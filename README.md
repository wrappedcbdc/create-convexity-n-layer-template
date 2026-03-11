# create-convexity-n-layer-template

Scaffold a Convexity N-Layer Node backend project with a single command.

## Quick Start

```bash
npx create-convexity-n-layer-template
```

You will be prompted to enter a project name. Alternatively, specify the project name directly:

```bash
npx create-convexity-n-layer-template my-app
```

## Features

- Interactive CLI with prompts for easy project setup
- Automatic project scaffolding from GitHub template repository
- Smart project name handling with automatic slugification for package.json
- Optional dependency installation
- Optional Git repository initialization with initial commit
- Customizable template source and repository
- Handles existing directories with overwrite confirmation

## Usage

### Basic Usage

```bash
npx create-convexity-n-layer-template [project-name] [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--template <path>` | Template subdirectory or path within the repo (use "." for repo root) | `template` |
| `--install` | Run npm install after scaffolding | `false` |

### Examples

Create a project with default settings:
```bash
npx create-convexity-n-layer-template my-backend
```

Create a project and install dependencies:
```bash
npx create-convexity-n-layer-template my-backend --install
```

## What Happens During Scaffolding

1. **Project Name Validation**: Prompts for a project name if not provided
2. **Directory Check**: Checks if the target directory exists and prompts for overwrite confirmation if needed
3. **Template Cloning**: Uses degit to clone the template from the specified repository
4. **Project Customization**: Replaces template placeholders in package.json with your project name
5. **Dependency Installation** (optional): Runs `npm install` if `--install` flag is used
6. **Git Initialization** (optional): Initializes a git repository and creates an initial commit (default behavior, disable with `--no-git`)

## Next Steps

After scaffolding your project:

```bash
cd my-backend
npm install  # if you skipped --install
npm run dev  # or your configured start script
```

## Requirements

- Node.js >= 20
- npm or equivalent package manager
- Git (optional, for git initialization)

## Repository Structure

This tool clones from the [convexity-n-layer-template](https://github.com/wrappedcbdc/convexity-n-layer-template) repository, which provides a structured N-Layer architecture for Node.js backend applications.

## Project Name Handling

The tool automatically:
- Uses your provided project name as-is in most places
- Creates a slugified version for package.json `name` field:
  - Converts to lowercase
  - Replaces spaces with hyphens
  - Removes invalid characters
  - Ensures valid npm package naming

Example: `My Cool App` becomes `my-cool-app` in package.json

## Error Handling

The tool gracefully handles common errors:
- **Repository access issues**: Automatically retries with fallback repository formats
- **Existing directories**: Prompts for confirmation before overwriting
- **Failed npm install**: Reports error but allows manual installation
- **Git initialization failures**: Continues without git if git is unavailable or not configured

## License

MIT

## Contributing

Issues and pull requests are welcome at [https://github.com/wrappedcbdc/create-convexity-n-layer-template](https://github.com/wrappedcbdc/create-convexity-n-layer-template)

## Support

For issues or questions:
- Open an issue on the GitHub repository
- Check the [Convexity N-Layer Template](https://github.com/wrappedcbdc/convexity-n-layer-template) documentation
