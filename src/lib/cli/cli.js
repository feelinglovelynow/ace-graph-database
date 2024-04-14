#!/usr/bin/env node


import fs from 'node:fs'
import util from 'node:util'
import { enums } from './enums.js'
import { fileURLToPath } from 'node:url'
import { aceFetch } from '../aceFetch.js'
import { getCliOptions } from './options.js'
import fsPromises from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execSync, exec } from 'node:child_process'
import { CLIFalsyError } from '../objects/AceError.js'
import { tsConfig, typedefs, jsIndex, tsIndex } from './types.js'


(async function cli () {
  try {
    const root = '../../../'
    const options = getCliOptions(process)
    const bashEntries = [...process.argv.entries()]
    const __dirname = dirname(fileURLToPath(import.meta.url))

    const files = {
      root: resolve(__dirname, root),
      dir: resolve(__dirname, root + '.ace'),
      tsc: resolve(__dirname, root + '.ace/tsc'),
      enums: resolve(__dirname, root + '.ace/enums.js'),
      backups: resolve(__dirname, root + '.ace/backups'),
      jsIndex: resolve(__dirname, root + '.ace/index.js'),
      tsIndex: resolve(__dirname, root + '.ace/index.d.ts'),
      jsTypedefs: resolve(__dirname, root + '.ace/typedefs.js'),
      tsConfig: resolve(__dirname, root + '.ace/tsconfig.json'),
    }

    if (!fs.existsSync(files.dir)) await fsPromises.mkdir(files.dir) // IF .ace directory does not exist, create it

    switch (bashEntries?.[2]?.[1]) {
      // ace dev
      case 'dev':
        execSync('wrangler dev', { stdio: 'inherit', cwd: files.root })
        break

      // ace types --worker=http://localhost:8787
      case 'types':
        const typesSchema = await schemaGet()

        await Promise.all([
          fsPromises.writeFile(files.enums, enums(typesSchema)), // write enums.js
          fsPromises.writeFile(files.jsTypedefs, typedefs(typesSchema)), // write typedefs.js
          fsPromises.writeFile(files.tsConfig, tsConfig()), // write tsconfig.json
        ])

        console.log('✨ enums ready!\n✨ typedefs ready!')
        await util.promisify(exec)(`tsc -p ${ files.tsConfig }`) // write tsc folder AND write .d.ts type files within folder

        await Promise.all([
          fsPromises.writeFile(files.jsIndex, jsIndex()), // write index.js
          fsPromises.writeFile(files.tsIndex, tsIndex()), // write index.ts
        ])
        console.log('✨ types ready!')
        break

      // ace graphToFile --worker=http://localhost:8787 --encrypt=true
      case 'graphToFile':
        const host = options.get('-w') || options.get('-worker')
        if (!host) throw CLIFalsyError('worker', '-w', '--worker')

        const { backupFromSchema } = await aceFetch({ url: host + '/ace', body: { request: { id: 'BackupGet', property: 'backupFromSchema' } } })
        if (!fs.existsSync(files.backups)) await fsPromises.mkdir(files.backups) // IF backups directory does not exist, create it

        await fsPromises.writeFile(resolve(__dirname, `${ root }.ace/backups/${ (new Date()).toISOString() }`), JSON.stringify(backupFromSchema, null, 2)) // write 
        break

      // ace fileToGraph --file=2024-03-24T19:44:36.492Z.json --worker=http://localhost:8787
      case 'fileToGraph':
        const file = options.get('-f') || options.get('--file')
        const worker = options.get('-w') || options.get('--worker')

        if (!file) throw CLIFalsyError('file', '-f', '--file')
        if (!worker) throw CLIFalsyError('url', '-w', '--worker')

        const backupFromFile = await fsPromises.readFile(resolve(__dirname, `${ root }.ace/backups/${ file }`), { encoding: 'utf-8' })
        await aceFetch({ url: worker + '/ace', body: { request: { id: 'BackupLoad', x: { backup: backupFromFile } } } })
        break

      case '-h':
      case '--help':
      case 'help':
      default:
        help()
        break
    }


    /** @returns { Promise<{ nodes: any, relationships: any } | null> } */
    async function schemaGet () {
      const host = options.get('-w') || options.get('--worker')

      if (!host) return null
      else {
        const response = await aceFetch({
          url: host + '/ace',
          body: { request: { id: 'SchemaGet', property: 'schema' } }
        })

        return response?.schema || null
      }
    }


   function help () {
     console.log('🤓 Show this message')
     bold('ace')
     bold('ace -h')
     bold('ace help')
     bold('ace --help')
     hr()


     console.log('🌟 Start local Ace Graph Database (Cloudflare worker and Cloudflare durable object)')
     bold('ace dev')
     hr()


     console.log('😅 Create types (TS) and typedefs (JSDoc) that will not take your schema into account')
     bold('ace types')
     hr()


     console.log('💪 Create types (TS) and typedefs (JSDoc) that will call the schema at the worker url (-w), and add this schema information to the types')
     bold('ace types -w=http://localhost:8787')
     bold('ace types --worker=http://localhost:8787')
     hr()


     console.log(`💾 Generate backup at worker (-w), recieve backup from worker and write backup to a json file here: ${files.backups}`)
     bold('ace graphToFile -w=http://localhost:8787')
     bold('ace graphToFile --worker=http://localhost:8787')
     hr()



     console.log(`🌥️  Load the backup to the worker url (-w), and get that backup from this file (-f) here: ${ files.backups }`)
     bold('ace fileToGraph -f=2024-03-24T19:44:36.492Z.json -w=http://localhost:8787')
     bold('ace fileToGraph --file=2024-03-24T19:44:36.492Z.json --worker=http://localhost:8787')
     hr()
   }



   /** @param { string } log */
   function bold (log) {
     console.log('\x1b[1m%s\x1b[0m', log)
   }


   function hr () {
     console.log('\n----------------------------------------------------\n')
   }
  } catch (error) {
    console.log('error', error)
  }
})()
