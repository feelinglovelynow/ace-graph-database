#!/usr/bin/env node


import fs from 'node:fs'
import { getNow } from './variables.js'
import { aceFetch } from './aceFetch.js'
import fsPromises from 'node:fs/promises'
import { getBashMap } from './getBashMap.js'
import { AceError } from './objects/AceError.js'


(async function backup () {
  try {
    const dir = '.backups'
    const bashMap = getBashMap(process)

    switch (bashMap.get('type')) {
      case 'save':
        if (!bashMap.get('port')) throw AceError('backup__falsy-port', 'Please include a port that is truthy, for example `pnpm backup type=save port=8787`', { type: '', port:'' })

        const rQuery = await aceFetch({ url: `http://localhost:${ bashMap.get('port') }` }, '/query', { body: { request: { id: 'AceBackup', property: 'backup' } } })
        const exists = fs.existsSync(dir)

        if (!exists) await fsPromises.mkdir(dir)

        await fsPromises.writeFile(`${ dir }/${ getNow() }.json`, JSON.stringify(rQuery.backup, null, 2))
        break
      case 'load':
        if (!bashMap.get('filename')) throw AceError('backup__falsy-filename', 'Please include a filename that is truthy, for example `pnpm backup type=load filename=2024-03-24T19:44:36.492Z.json port=8787`', { type: bashMap.get('type'), port: bashMap.get('port') })
        if (!bashMap.get('port')) throw AceError('backup__falsy-port', 'Please include a port that is truthy, for example `pnpm backup type=load filename=2024-03-24T22:21:01.330Z.json port=8787`', { type: bashMap.get('type'), port: bashMap.get('port') })

        const backup = await fsPromises.readFile(`${ dir }/${ bashMap.get('filename') }`, { encoding: 'utf-8' })
        await aceFetch({ url: `http://localhost:${ bashMap.get('port') }` }, '/mutate', { body: { request: { id: 'AceBackup', x: { backup } } } })
        console.log('🌟 Backup Loaded!')
        break
      default:
        throw AceError('backup__invalid-type', 'Please include a type that is save or load, for example `pnpm backup type=save port=8787`', { type: '' })
    }
  } catch (error) {
    console.log('error', error)
  }
})()
