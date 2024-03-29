import semver from 'semver'
import { spawnSync } from 'child_process'

/**
 * Execute a git command and store its output in the appropriate variable
 * @return {string} The output of the shell command, or an error
 */
export function runGitCommand(args: string[]): string {
  const spawned = spawnSync('git', args, { shell: true })
  if (spawned.error) {
    throw new Error(spawned.error.message)
  } else if (spawned.stderr.length) {
    throw new Error(spawned.stderr.toString())
  } else {
    return spawned.stdout.toString()
  }
}

export function parseGitDiff(diffStr: string): Map<string, string> {
  const diffMap = new Map<string, string>()
  const changes: string[] = diffStr.split('\n').filter(Boolean)
  for (const change of changes) {
    const result = change.split('\t')
    diffMap.set(result[1], result[0])
  }
  return diffMap
}

/**
 * Return a map of filenames as the key and their filter character (A|C|D|M|R|T|U|X|B)
 * @param {string} baseStr The base branch to use in the diff
 * @param {string} compStr The branch to compare to the base branch
 * @return {Map<string, string>} A map of file and their statuses, or an error
 */
export function runGitDiff(
  baseStr: string,
  compStr: string
): Map<string, string> {
  const version = runGitCommand(['--version']).split(' ')[2]
  if (semver.gte(version, '2.39.0')) {
    baseStr = runGitCommand(
      `merge-base ${baseStr} ${compStr}`.split(' ')
    ).trim()
  }
  const args = `diff --name-status ${baseStr}..${compStr}`
  console.log(`Run git command with: ${args}...\n`)
  const diff = runGitCommand(args.split(' '))
  console.log(diff)
  return parseGitDiff(diff)
}
