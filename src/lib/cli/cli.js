#!/usr/bin/env node


import fs from 'node:fs'
import util from 'node:util'
import { enums } from './enums.js'
import { fileURLToPath } from 'node:url'
import { aceFetch } from '../ace/aceFetch.js'
import { getCliOptions } from './options.js'
import fsPromises from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { execSync, exec } from 'node:child_process'
import { createJWKs } from '../security/createJWKs.js'
import { CLIFalsyError } from '../objects/AceError.js'
import { tsConfig, typedefs, jsIndex, tsIndex } from './types.js'
import { decrypt, encrypt } from '../security/crypt.js'


(async function cli () {
  /**
   * @typedef { { nodes: { [nodeName: string]: any }, relationships: { [relationshipName: string]: any } } } AceSchema
   */


  try {
    const root = '../../../'
    const options = getCliOptions(process)
    const bashEntries = [...process.argv.entries()]
    const __dirname = dirname(fileURLToPath(import.meta.url))

    const files = {
      root: resolve(__dirname, root),
      cwd: resolve(process.cwd(), './ace'),
      dir: resolve(__dirname, root + '.ace'),
      tsc: resolve(__dirname, root + '.ace/tsc'),
      backups: resolve(process.cwd(), './ace/backups'),
      schemas: resolve(process.cwd(), './ace/schemas'),
      enums: resolve(__dirname, root + '.ace/enums.js'),
      jsIndex: resolve(__dirname, root + '.ace/index.js'),
      tsIndex: resolve(__dirname, root + '.ace/index.ts'),
      jsTypedefs: resolve(__dirname, root + '.ace/typedefs.js'),
      tsConfig: resolve(__dirname, root + '.ace/tsconfig.json'),
      packageDotJson: resolve(__dirname, root + 'package.json'),
    }

    if (!fs.existsSync(files.dir)) await fsPromises.mkdir(files.dir) // IF .ace directory does not exist, create it

    switch (bashEntries?.[2]?.[1]) {
      // ace dev
      case 'dev':
        execSync('wrangler dev', { stdio: 'inherit', cwd: files.root })
        break


      // ace version
      case 'version':
        console.log(await getVersion())
        break


      // ace jwks
      case 'jwks':
        const jwks = await createJWKs()
        console.log(`Creates JWKs
  1. A jwk is like a password and helps Ace do cryptography
  2. Use \`ACE_PRIVATE_JWK\` to create a hash, use \`ACE_PUBLIC_JWK\` to verify a hash and use \`ACE_CRYPT_JWK\` to encrypt and decrypt data.
  3. Ace recommends storing JWKs in your .env file as a string


ACE_PRIVATE_JWK='${ jwks.privateJWK }'

ACE_PUBLIC_JWK='${ jwks.publicJWK }'

ACE_CRYPT_JWK='${ jwks.cryptJWK }'`)
        break


      case 'types':
        let typesSchema = null

        const typesHost = options.get('-h') || options.get('--host')
        const typesFile = options.get('-f') || options.get('--file')

        if (typesHost) typesSchema = await getSchemaFromHost(typesHost)
        else if (typesFile) typesSchema = /** @type { AceSchema } */ (JSON.parse(await fsPromises.readFile(resolve(process.cwd(), `./ace/schemas/${ typesFile }`), { encoding: 'utf-8' })))

        await Promise.all([
          fsPromises.writeFile(files.enums, enums(typesSchema)), // write enums.js
          fsPromises.writeFile(files.jsTypedefs, typedefs(typesSchema)), // write typedefs.js
          fsPromises.writeFile(files.tsConfig, tsConfig()), // write tsconfig.json
        ])

        console.log('✨ enums ready!\n✨ typedefs ready!')
        await util.promisify(exec)(`tsc -p ${ files.tsConfig }`) // write tsc folder AND write .ts type files within folder

        await Promise.all([
          fsPromises.writeFile(files.jsIndex, jsIndex()), // write index.js
          fsPromises.writeFile(files.tsIndex, tsIndex()), // write index.ts
        ])
        console.log('✨ types ready!')
        break


      case 'schemaToFile':
        const stfHost = options.get('-h') || options.get('--host')
        const stfName = options.get('-n') || options.get('--name') || (new Date()).toISOString()

        if (!stfHost) throw CLIFalsyError('host', '-h', '--host')
        if (!fs.existsSync(files.cwd)) await fsPromises.mkdir(files.cwd)
        if (!fs.existsSync(files.schemas)) await fsPromises.mkdir(files.schemas)

        const stfSchema = await getSchemaFromHost(stfHost)
        const stfLocation = resolve(process.cwd(), `./ace/schemas/${ stfName }.json`)
        await fsPromises.writeFile(stfLocation, JSON.stringify(stfSchema, null, 2))
        console.log(`✨ schema saved to ${ stfLocation }`)
        break
      
      
      case 'graphToFile':
        const gtfHost = options.get('-h') || options.get('--host')
        if (!gtfHost) throw CLIFalsyError('host', '-h', '--host')

        const gtfJWK = options.get('-j') || options.get('--jwk')
        const gtfName = options.get('-n') || options.get('--name') || (new Date()).toISOString()
        const { backupFromSchema } = await aceFetch({ host: gtfHost, body: { request: { id: 'GetBackup', prop: 'backupFromSchema' } } })

        if (!fs.existsSync(files.cwd)) await fsPromises.mkdir(files.cwd)
        if (!fs.existsSync(files.backups)) await fsPromises.mkdir(files.backups)

        const gtfStrLocation = resolve(process.cwd(), `./ace/backups/${ gtfName }.json`)
        const gtfResponse = gtfJWK ? await encrypt(JSON.stringify(backupFromSchema), gtfJWK) : backupFromSchema

        await fsPromises.writeFile(gtfStrLocation, JSON.stringify(gtfResponse, null, 2)) // write 
        console.log(`✨ backup saved to ${ gtfStrLocation }`)
        break


      case 'fileToGraph':
        const file = options.get('-f') || options.get('--file')
        const ftgHost = options.get('-h') || options.get('--host')
        const ftgJWK = options.get('-j') || options.get('--jwk')

        if (!file) throw CLIFalsyError('file', '-f', '--file')
        if (!ftgHost) throw CLIFalsyError('host', '-h', '--host')

        const ftgFileText = await fsPromises.readFile(resolve(process.cwd(), `./ace/backups/${ file }`), { encoding: 'utf-8' })

        let ftgBackup

        if (!ftgJWK) ftgBackup = ftgFileText
        else {
          const json = JSON.parse(ftgFileText)
          ftgBackup = await decrypt(json.encrypted, json.iv, ftgJWK)
        }

        await aceFetch({ host: ftgHost, body: { request: { id: 'LoadBackup', x: { backup: ftgBackup } } } })
        console.log('✨ backup applied!')
        break


      case '-h':
      case '--help':
      case 'help':
      default:
        await help()
        break
    }


    /**
     * @param { string } host
     * @returns { Promise<AceSchema | null> }
     */
    async function getSchemaFromHost (host) {
      if (!host) return null
      else {
        const { schema } = await aceFetch({ host, body: { request: { id: 'GetSchema', prop: 'schema' } } })
        return schema || null
      }
    }


   async function help () {
     const version = await getVersion()
     console.log(`Ace Graph Database CLI v${ version }



ace
  Shows this message
  Options:
    -h      |  Optional  |  ace -h
    help    |  Optional  |  ace help
    --help  |  Optional  |  ace --help



ace version
   Prints your currently downloaded Ace Graph Database Version



ace jwks
  Creates 1 public jwk and 1 private jwk (that may be used together) and logs the jwks to the console
  Why: Send jwks to ace() whenever you would love to do cryptography
  JWKs:
    - JSON Web Keys
    - Cryptography keys
    - Like a password
      - A private jwk can encrypt and decrypt data
      - A private jwk can create a hash while a public jwk can validate a hash
      - We recomend storing jwks in your .env file



ace dev
  Start a local Ace Graph Database (Cloudflare Worker + Cloudflare Durable Object)



ace schemaToFile
  Get most recent schema from graph and then save schema to a file locally
  Location File: [ Current Directory ]/ace/schemas/[ File Name ].json
  File Name Default: Now Iso Datetime
  Options:
    -h      |  Host       |  Required  |  String
    --host  |  Host       |  Required  |  String
    -n      |  File Name  |  Optional  |  String
    --name  |  File Name  |  Optional  |  String
  Examples:
    ace schemaToFile -h=http://localhost:8787
    ace schemaToFile --host=http://localhost:8787
    ace schemaToFile -h=http://localhost:8787 -n=qa
    ace schemaToFile --host=http://localhost:8787 --name=qa



ace graphToFile
  Generate backup and then save backup to a file locally
  Location File: [ Current Directory ]/ace/backups/[ File Name ].json
  File Name Default: Now Iso Datetime
  Crypt JWK: If a \`Crypt JWK\` is provided, the backup will be encrypted
  Options:
    -h      |  Host       |  Required  |  String
    --host  |  Host       |  Required  |  String
    -n      |  File Name  |  Optional  |  String
    --name  |  File Name  |  Optional  |  String
    -j      |  Crypt JWK  |  Optional  |  String
    --jwk   |  Crypt JWK  |  Optional  |  String
  Examples:
    ace graphToFile -h=http://localhost:8787
    ace graphToFile --host=http://localhost:8787
    ace graphToFile -h=http://localhost:8787 -n=qa
    ace graphToFile --host=http://localhost:8787 --name=qa
    ace graphToFile -h=http://localhost:8787 -j='{ ... }'
    ace graphToFile --host=http://localhost:8787 --jwk='{ ... }'


ace fileToGraph
  Read backup from file and then save backup to graph
  File Location: [ Current Directory ]/ace/backups/[ File ]
  Crypt JWK: If a \`Crypt JWK\` is provided, the backup will be decrypted
  Skip Data Delete: When a backup is applied with "ace fileToGraph" an entire graph delete is done first, to avoid the delete and just apply the backup use this option
  Options:
    -f                |  File              |  Required  |  String
    -file             |  File              |  Required  |  String
    -h                |  Host              |  Required  |  String
    --host            |  Host              |  Required  |  String
    -j                |  Crypt JWK         |  Optional  |  String
    --jwk             |  Crypt JWK         |  Optional  |  String
    -s                |  Skip Data Delete  |  Optional  |  Boolean
    --skipDataDelete  |  Skip Data Delete  |  Optional  |  Boolean
  Examples:
    ace fileToGraph -f=qa.json -h=http://localhost:8787
    ace fileToGraph --file=qa.json --host=http://localhost:8787
    ace fileToGraph -f=qa.json -h=http://localhost:8787 -j='{ ... }'
    ace fileToGraph --file=qa.json --host=http://localhost:8787 --jwk='{ ... }'
    ace fileToGraph -f=backup.json -h=http://localhost:8787 -s=true
    ace fileToGraph --file=2024-03-24T19:44:36.492Z.json --host=http://localhost:8787 --skipDataDelete=true



ace types
  Create types (TS) and typedefs (JSDoc)
    - IF a host (Cloudflare Worker URL) is provided
      - Types take into consideration your schema by requesting it via the host
    - ELSE IF a (schema) file is provided [ Current Directory ]/ace/schemas/
      - Types take into consideration your schema by loading it locally from
    - ELSE
      - Types do not take into consideration your schema
  Options:
    -h      |  Host  |  Optional  |  String
    --host  |  Host  |  Optional  |  String
    -f      |  File  |  Optional  |  String
    --file  |  File  |  Optional  |  String
  Examples:
    ace types -h=http://localhost:8787
    ace types --host=http://localhost:8787
    ace types -f=qa.json
    ace types --file=2024-03-24T19:44:36.492Z.json
`)
   }

   /** @returns { Promise<string> } */
   async function getVersion () {
     const str = await fsPromises.readFile(files.packageDotJson, 'utf-8')
     const json = JSON.parse(str)
     return json.version
   }
  } catch (error) {
    console.log('error', error)
  }
})()
