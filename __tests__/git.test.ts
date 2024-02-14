/**
 * Unit tests for the action's git diff functionality, src/git.ts
 */

import * as diff from '../src/git'
import { SpawnSyncReturns } from 'child_process'
import { Buffer } from 'node:buffer'

// Mock the module's runGitDiff method
const gitMock = jest.spyOn(diff, 'runGitDiff')

// Mock the function executing the git diff command
let spawnSyncMock: jest.SpyInstance

// Implement the SpawnSyncReturns<T> interface for spawnSync
class SpawnSyncReturnsMock implements SpawnSyncReturns<Buffer> {
  pid = 0
  status = null
  signal = null
  output: Buffer[] = Array<Buffer>()
  stderr: Buffer = Buffer.from('')
  stdout: Buffer = Buffer.from('')
  error?: Error | undefined = undefined

  static asStdout(out: string): SpawnSyncReturnsMock {
    const ret = new SpawnSyncReturnsMock()
    ret.stdout = Buffer.from(out)
    return ret
  }

  static asStderr(err: string): SpawnSyncReturnsMock {
    const ret = new SpawnSyncReturnsMock()
    ret.stderr = Buffer.from(err)
    return ret
  }

  static asError(errorMessage: string): SpawnSyncReturnsMock {
    const ret = new SpawnSyncReturnsMock()
    ret.error = Error(errorMessage)
    return ret
  }
}

describe('git', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    spawnSyncMock = jest
      .spyOn(require('child_process'), 'spawnSync')
      .mockImplementation()
  })

  it('Get a diff of two branches', async () => {
    const getBaseCompDiff = ['M\tfile1', 'M\tfile2'].join('\n')
    const getBaseCompDiffMap = diff.parseGitDiff(getBaseCompDiff)

    spawnSyncMock
      .mockImplementationOnce((): SpawnSyncReturnsMock => {
        return SpawnSyncReturnsMock.asStdout('git version 2.43.0\n')
      })
      .mockImplementationOnce((): SpawnSyncReturnsMock => {
        return SpawnSyncReturnsMock.asStdout(
          '50m3c0mm17h45hv4lu3fr0mm3r63b453\n'
        )
      })
      .mockImplementationOnce((): SpawnSyncReturnsMock => {
        return SpawnSyncReturnsMock.asStdout(getBaseCompDiff)
      })

    diff.runGitDiff('base', 'comp')
    expect(gitMock).toHaveReturned()
    expect(gitMock).toHaveReturnedWith(getBaseCompDiffMap)
  })

  it('Throw error on stderr message', async () => {
    spawnSyncMock.mockImplementationOnce((): SpawnSyncReturnsMock => {
      return SpawnSyncReturnsMock.asStderr(
        "The branch 'feature' does not exist"
      )
    })

    expect(() => diff.runGitDiff('base', 'feature')).toThrow()
  })

  it('Throw error on spawnSync error', async () => {
    spawnSyncMock.mockImplementationOnce((): SpawnSyncReturnsMock => {
      return SpawnSyncReturnsMock.asError("'git' command not found'")
    })

    expect(() => diff.runGitDiff('base', 'comp')).toThrow()
  })
})
