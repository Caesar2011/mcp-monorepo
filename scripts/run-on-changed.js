/* eslint-disable use-logger-not-console/replace-console-with-logger,no-undef */
import { execSync } from 'child_process'

import { getChangedPackagesSinceRef } from '@changesets/git'

// --- ANSI Colors for better logging ---
const c = { reset: '\x1b[0m', yellow: '\x1b[33m', cyan: '\x1b[36m', red: '\x1b[31m' }

async function main() {
  console.log(`${c.cyan}Running tests for changed packages...${c.reset}`)

  const cwd = process.cwd()
  // Compare against HEAD to get staged changes
  const changedPackages = await getChangedPackagesSinceRef({ cwd, ref: 'HEAD' })

  const changedPackageNames = changedPackages
    .filter((pkg) => !pkg.packageJson.private)
    .map((pkg) => pkg.packageJson.name)

  if (changedPackageNames.length === 0) {
    console.log(`${c.yellow}No changed packages to test. Skipping.${c.reset}`)
    process.exit(0)
  }

  console.log('Found changes in:', changedPackageNames.join(', '))

  // Construct the npm command with --workspace flags for each changed package
  const workspaceFlags = changedPackageNames.map((name) => `--workspace=${name}`).join(' ')
  const command = `npm test ${workspaceFlags}`

  console.log(`Executing: ${c.cyan}${command}${c.reset}\n`)

  try {
    // Execute the command and inherit stdio to see test output in real-time
    execSync(command, { stdio: 'inherit' })
    console.log(`\n${c.cyan}✓ Tests passed for all changed packages.${c.reset}`)
  } catch (error) {
    console.error(`\n${c.red}✖ Tests failed. Commit aborted.${c.reset}`)
    // The error from execSync is enough, but we exit with 1 to be sure
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(`${c.red}Error during pre-commit test script:${c.reset}`, err)
  process.exit(1)
})
