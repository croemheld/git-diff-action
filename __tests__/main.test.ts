/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'
import * as diff from '../src/git'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance

describe('action', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // First: All main function functions thar are tested here from "@core"
    errorMock = jest.spyOn(core, 'error').mockImplementation()
    getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
    setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
  })

  it('Sets the action inputs correctly', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'base':
          return 'main'
        case 'comp':
          return 'comp'
        case 'glob':
          return 'file1'
        case 'type':
          return 'A|C|D|M|R|T|U|X|B'
        default:
          return ''
      }
    })

    const getNormalGitDiff = new Map<string, string>([
      ['file1', 'M'],
      ['file2', 'M']
    ])
    jest.spyOn(diff, 'runGitDiff').mockReturnValueOnce(getNormalGitDiff)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setOutputMock).toHaveBeenNthCalledWith(1, 'count', 1)
    expect(setOutputMock).toHaveBeenNthCalledWith(8, 'modified_count', 1)
    expect(setOutputMock).toHaveBeenNthCalledWith(9, 'modified_files', [
      'file1'
    ])
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('Sets an invalid filter character', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'base':
          return 'main'
        case 'comp':
          return 'comp'
        case 'glob':
          return 'file1'
        case 'type':
          return '?'
        default:
          return ''
      }
    })

    const getNormalGitDiff = new Map<string, string>([
      ['file1', 'M'],
      ['file2', 'M']
    ])
    jest.spyOn(diff, 'runGitDiff').mockReturnValueOnce(getNormalGitDiff)

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(1, 'Invalid type character')
    expect(errorMock).not.toHaveBeenCalled()
  })

  it('Returns an error during the diff', async () => {
    // Set the action's inputs as return values from core.getInput()
    getInputMock.mockImplementation((name: string): string => {
      switch (name) {
        case 'base':
          return 'main'
        case 'comp':
          return 'comp'
        case 'glob':
          return 'file1'
        case 'type':
          return 'M'
        default:
          return ''
      }
    })

    const getFailedGitDiff = 'The specified branch does not exist'
    jest.spyOn(diff, 'runGitDiff').mockImplementationOnce(() => {
      throw new Error(getFailedGitDiff)
    })

    await main.run()
    expect(runMock).toHaveReturned()

    // Verify that all of the core library functions were called correctly
    expect(setFailedMock).toHaveBeenNthCalledWith(
      1,
      'The specified branch does not exist'
    )
    expect(errorMock).not.toHaveBeenCalled()
  })
})
