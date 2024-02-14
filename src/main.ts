import * as core from '@actions/core'
import * as minimatch from 'minimatch'
import { runGitDiff } from './git'

/**
 * The filter characters in a git diff output. The meaning are as follows:
 * Added, Copied, Deleted, Modified, Renamed, Type changed, Unmerged,
 * (X) unknown, Broken pairing.
 */
const charsMap: Map<string, string> = new Map([
  ['A', 'added'],
  ['C', 'copied'],
  ['D', 'deleted'],
  ['M', 'modified'],
  ['R', 'renamed'],
  ['T', 'type_changed'],
  ['U', 'unmerged'],
  ['X', 'unknown'],
  ['B', 'broken']
])

/**
 * Filter the map based on the glob string.
 * @param diffMap The map instance to filter.
 * @param globStr The string to match to the file names.
 */
function getGlobMap(
  diffMap: Map<string, string>,
  globStr: string
): Map<string, string> {
  const globMap = new Map<string, string>()
  const fileArr: string[] = [...diffMap.keys()]
  const globArr: string[] = fileArr.filter(
    minimatch.filter(globStr, { matchBase: true })
  )

  for (const value of globArr) {
    globMap.set(value, diffMap.get(value) || 'X')
  }

  return globMap
}

function getCharMap(diffMap: Map<string, string>): Map<string, string[]> {
  const charMap = new Map<string, string[]>()

  for (const [key, value] of diffMap) {
    let files = charMap.get(value)
    if (!files) {
      files = []
      charMap.set(value, files)
    }
    files.push(key)
  }

  return charMap
}

function getTypeMap(
  charMap: Map<string, string[]>,
  typeStr: string
): Map<string, string[]> {
  // Retrieve each type from the input argument and sanity check them
  const charSet: Set<string> = new Set(typeStr.split('|'))
  // Check if there are any types that are not allowed or specified
  if ([...charSet].filter((value: string) => !charsMap.has(value)).length > 0) {
    throw new Error('Invalid type character')
  } else {
    // Filter entries that don't contain the types we are looking for
    const diffArr: string[] = [...charsMap.values()].filter(
      (value: string) => !charSet.has(value)
    )
    for (const value of diffArr) {
      charMap.delete(value)
    }
    return charMap
  }
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    // Run git diff with the specified branches
    const baseStr = core.getInput('base')
    const compStr = core.getInput('comp')
    const diffMap = runGitDiff(baseStr, compStr)

    // Filter the variables based on the specified filter
    const globStr = core.getInput('glob')
    const globMap = getGlobMap(diffMap, globStr)

    // Create a map with type / filter characters as the keys
    const charMap = getCharMap(globMap)

    // Further filter the globMap for only the specified characters
    const typeStr = core.getInput('type')
    const typeMap = getTypeMap(charMap, typeStr)

    // Populate the output fields accordingly
    let totalCount = 0
    for (const entry of charsMap) {
      const value = typeMap.get(entry[0])
      if (value) {
        totalCount += value.length
        core.setOutput(`${entry[1]}_count`, value.length)
        core.setOutput(`${entry[1]}_files`, value)
        console.log(`Registered ${value.length} matches for ${entry[1]}_files:`)
        for (const file of value) {
          console.log(` -- ${file}`)
        }
      } else {
        core.setOutput(`${entry[1]}_count`, 0)
        core.setOutput(`${entry[1]}_files`, [])
      }
    }
    core.setOutput('count', totalCount)
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}
