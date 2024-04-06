# 🕉 @feelinglovelynow/ace-graph-database


## 🙏 JavaScipt's BEST Database!
* We feel Ace Graph Database is the BEST database option for JavaScript developers!


## 🤔 What is Ace?
1. Ace structures data in key value stores as a graph (nodes, relationships and properties)
1. Nodes may have props, relationships may have props, and relationships may be one to one, one to many or many to many
1. Our cli scipt `ace types` creates TypeScript types (TS) and JSDoc comments (JS), based on the JSON Schema you provide
1. The Ace query language is a typesafe (JS/TS) function called `ace()` that allows queries and transactional mutations
1. Easily configure users, passwords, roles and permissions by node, relationship or property, for the actions read, insert, update, upsert or delete
1. Our cli scipt `ace backup` provides free graph backups and a simple way to load backups


## 🎬 How to create a Movie Graph?
****Step 1: Bash****
``` bash
pnpm add @feelinglovelynow/ace-graph-database && ace dev 8787
```
****Step 2: JavaScript****
```ts
const response = await ace({
  graphs: [ { workerUrl: 'http://localhost:8787' } ],

  request: [
    {
      id: 'SchemaAdd', // add to schema & place 'SchemaAdd' response items @ response.additionToSchema
      property: 'additionToSchema',
      x: {
        nodes: {
          Actor: {
            name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            actsIn: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'Movie', relationshipName: 'actsInMovie' } },
          },
          Movie: {
            name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            actors: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'Actor', relationshipName: 'actsInMovie' } },
          },
        },
        relationships: {
          actsInMovie: {
            id: 'ManyToMany',
            x: {
              props: {
                _salary: { id: 'RelationshipProp', x: { dataType: 'number' } } // relationship prop
              }
            }
          },
        }
      }
    },

    // add nodes and node props to graph
    { id: 'InsertNode', nodeName: 'Movie', x: { uid: '_:Matrix', name: 'The Matrix' } },
    { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Keanu', name: 'Keanu Reeves' } },
    { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Laurence', name: 'Laurence Fishburne' } },
    { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Carrie', name: 'Carrie-Anne Moss' } },

    // add relationships and relationship props to graph
    { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Keanu', b: '_:Matrix', _salary: 99.9 } },
    { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Carrie', b: '_:Matrix', _salary: 99 } },
    { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Laurence', b: '_:Matrix', _salary: 99 } },

    // query all movies and their actors & place this information @ response.movies
    {
      id: 'QueryNode',
      nodeName: 'Movie',
      property: 'movies',
      x: {
        uid: true,
        name: true,
        actors: {
          _uid : true, // relationship prop (actsInMovie)
          _salary: true, // relationship prop (actsInMovie)
          uid: true, // node prop (Actor)
          name: true, // node prop (Actor)
        }
      }
    }
  ]
})
```
****Step 3: Bash****
``` bash
ace types #generate types that align with above schema
```


## 🤓 Version 1 Roadmap 
1. backup > $node___uids___AceUser is empty
1. From write to (inup / insert / update / delete)
1. Start all types w/ Ace
1. Reader / Editor can't read AceSetting / AceRole / AcePermission
1. Finish errors updates
1. (Start / Init) to ApplyCore (anytime) (not fundamental to graph w/o it)
    * AceCore to AceOptions
    * AceFnRequestResponse to AceRequest and AceResponse
1. Slug to Enum
1. Lib folder
1. Node or edge name may not start w/ [ Ace, Query, Mutate, Schema, CF ] and no triple underscores (DELIMETER) b/c we use them as delimeters
    * Don't allow uid or _uid to be a prop
1. Objects folder, b/c JSDoc is not good @ classes
    * graph
    * transaction
    * passport
    * cache
    * log
        * Put [ Key, Original, Now, Request Item, API Token ]
        * Delete [ Key, API Token ]
    * error
1. Manifest to cli
    * Data structures that allow 1 loop in cli function
    * `ace backup`
    * `ace enums`
    * `ace types` does `ace enums` first, b/c enums are used in types
    * `.ace` folder
        * Folders: (types, enums, backups)
1. SCHEMA_KEY use app wide
1. Move schema loops into schema data structures 
1. loopOptions > switch 
1. Remove can't read something from putMap if in deleteSet
1. Add can't put something in putMap that is in deleteSet
1. Do not allow the forward and the reverse relationship propName to be the same propName
1. `ace()`
    * Function to communicate with the graph
    * $ace in response > [ newUids, deletedKeys ]
    * Insert w/ no uid allowed (node can't be used in relationships)
    * Insert w/ provdided uid allowed (node can be used in relationships)
    * Let 'Start' aka 'Init' aka 'Core' support property
    * 'Clear' (supports property)
    * Let 'SchemaAdd' support property
    * Delete `cascadePropNames` array
    * Upsert, won't throw an error if the item exists
    * Multiple Queries - Values from previous query available in current query
    * To handle accessing values from a previous mutation
        * Id: 'MutationLoop'
        * Id: 'ResponsePropNameValue'
    * throwIfMissingMustProps -> update / delete 
    * Properties:
      * Options:
          * Graphs
          * Transaction
          * Hold Commit
          * Prefix
      * Request:
          * Array of items formatted as `{ id: '', x: {}, graphs: [] }`
          * Request Item can support
1. Transaction
    * IF mutation in ace() found and no transaction provided, create transaction w/ undefined holdCommit
    * Logs
    * createTransaction()
    * save()
    * clear() - putMap & deleteSet
    * rollback()
      * Rollback Options
        * Retry
        * Maintain data structures 
1. Mutations that alter Schema and Data simultaneously (idsMutate)
1. Security
    * Access JWT + Refresh JWT
    * AceUser > email > passwordless
1. Function response types
1. Node Typedefs (all optional props)
1. Must relationship (storage fallback)
1. Full Text Index, Mutation and Query
1. Geojson support
    * Coordinates data type (Multidimensional array with longitude and latitude array)
1. Timeseries data types
1. Relationship prop indexes
1. Test relationship props update + guidance
1. App Worker > Ace Durable Object
1. Browser > Ace > Local Storage (stoage que?)
1. Batch requests to storage to stay within storage required Maximum count
1. KV (request cache) Integration
1. REPL (event, storage, share)
1. Comments (param, returns, description, example usage, why) for all index functions
1. Deno
1. Proofread all comments
1. Independant Security Audit
1. Independant Code Review
1. Unit Tests
1. Studio
    * (View / Edit) data from multiple graphs, simultaneously in the browser
    * Q&A - Show questions that makes sense to ask about the graph and the answers
1. Lovely Unity 1.0
1. Real project benchmarks
1. Docs
    * Search
    * Link to see / edit on GitHub
        * Doc Page
        * Functions Doc Page references


## 🌟 Version 2 Roadmap 
1. Contribution Documentation
1. ValKey Support
1. Amazon Dynamo DB Support
1. Rust
    * Worker
    * Durable Object
    * Lib Folder
    * Cargo Package
    * JS (Call Rust code from JS) Support
        * Edge
        * Node
        * Deno
1. Vector Data Type
1. VMWare Private Ai
    * Teach Ai w/ data from graph(s)
    * Ask Ai questions about graph(s)
1. Backup triggers (replica graph)
1. Rag support
1. Studio
    * Collaboration Tools
1. Docs
    * Explain Version 2
    * Ask Ai


## ✨ Version 3 Roadmap 
1. Ace Graph Database Foundation
    * Open Governance
    * Community Driven
    * Welcome to all users and contributors
1. (Node / Deno / Rust) > ace() > Save to file 
    * Look into Mongodb BSON
    * Ecomm (Multi Graph / EU) Suppport
1. Ace Graph Database Cloud LLC
    * Clean + Simple + Performant UX
    * Host (a graph / graphs)
        * Most hosting options in one place 
        * Select Hosting Provider
            * File: AWS / Google / Microsoft
            * KV: Cloudflare Durable Object / ValKey / Amazon Dynamo
            * Free Tier (for providers that allow this)
        * Simple hosting provider migration
        * Simple hosting provider cost breakdowns
            * Real time cost comparisons
        * Components added to Studio just for Cloud customers
            * Monitoring
            * Backups
            * Custom (Analytics / Alerts) via (Component / Email / Webhook / Slack)
            * Collaboration
        * Support
            * Blog
            * Forum
            * StackOverflow
            * Email
            * Chat
            * Phone
1. Studio
    * Report Builder
    * Report Scheduler
    * Ai chart generation
    * Ai Q&A generator
1. Docs
    * Explain Version 3


## 😍 What options do I have to store my data?
1. Cloudflare Durable Object
    * Server Side
    * Version 1
    * Their $5 a month pricing tier allows:
        * [50 GB of Storage](https://developers.cloudflare.com/durable-objects/platform/limits/)
        * [1 million monthly requests](https://developers.cloudflare.com/durable-objects/platform/pricing/)
        * [Websocket Connectivity](https://developers.cloudflare.com/durable-objects/api/websockets/)
1. Local Storage
    * Browser
    * Version 1
    * Free
1. ValKey
    * Server Side
    * Version 2
    * Open Source
1. Amazon Dynamo DB
    * Server Side
    * Version 2
1. (Node / Deno / Rust) - File
    * Server Side
    * Version 3
    * May look something like MongoDB w/ BSON


## 💎 Dictionary
### Ace
* Ace is a Graph Database
### Graph Database
* A database with nodes, relationships and properties
### Node
* A noun stored in the graph
### Relationship
* Explains how two nodes unite
### Properties
* Information about one node (eg: `AceUser` node, `name` prop) or one relationship (`actsInMovie` relationship, `_salary` prop)
* Relationship properties start with an underscore to help differentiate node props and relationship props during `ace()` queries


## 🎁 All Our Packages
1. @feelinglovelynow/ace-graph-database: [NPM](https://www.npmjs.com/package/@feelinglovelynow/ace-graph-database) ⋅ [Github](https://github.com/feelinglovelynow/ace-graph-database)
1. @feelinglovelynow/datetime-local: [NPM](https://www.npmjs.com/package/@feelinglovelynow/datetime-local) ⋅ [Github](https://github.com/feelinglovelynow/datetime-local)
1. @feelinglovelynow/dgraph: [NPM](https://www.npmjs.com/package/@feelinglovelynow/dgraph) ⋅ [Github](https://github.com/feelinglovelynow/dgraph)
1. @feelinglovelynow/env-write: [NPM](https://www.npmjs.com/package/@feelinglovelynow/env-write) ⋅ [Github](https://github.com/feelinglovelynow/env-write)
1. @feelinglovelynow/get-form-entries: [NPM](https://www.npmjs.com/package/@feelinglovelynow/get-form-entries) ⋅ [Github](https://github.com/feelinglovelynow/get-form-entries)
1. @feelinglovelynow/get-relative-time: [NPM](https://www.npmjs.com/package/@feelinglovelynow/get-relative-time) ⋅ [Github](https://github.com/feelinglovelynow/get-relative-time)
1. @feelinglovelynow/global-style: [NPM](https://www.npmjs.com/package/@feelinglovelynow/global-style) ⋅ [Github](https://github.com/feelinglovelynow/global-style)
1. @feelinglovelynow/jwt: [NPM](https://www.npmjs.com/package/@feelinglovelynow/jwt) ⋅ [Github](https://github.com/feelinglovelynow/jwt)
1. @feelinglovelynow/loop-backwards: [NPM](https://www.npmjs.com/package/@feelinglovelynow/loop-backwards) ⋅ [Github](https://github.com/feelinglovelynow/loop-backwards)
1. @feelinglovelynow/slug: [NPM](https://www.npmjs.com/package/@feelinglovelynow/slug) ⋅ [Github](https://github.com/feelinglovelynow/slug)
1. @feelinglovelynow/svelte-catch: [NPM](https://www.npmjs.com/package/@feelinglovelynow/svelte-catch) ⋅ [Github](https://github.com/feelinglovelynow/svelte-catch)
1. @feelinglovelynow/svelte-kv: [NPM](https://www.npmjs.com/package/@feelinglovelynow/svelte-kv) ⋅ [Github](https://github.com/feelinglovelynow/svelte-kv)
1. @feelinglovelynow/svelte-loading-anchor: [NPM](https://www.npmjs.com/package/@feelinglovelynow/svelte-loading-anchor) ⋅ [Github](https://github.com/feelinglovelynow/svelte-loading-anchor)
1. @feelinglovelynow/svelte-modal: [NPM](https://www.npmjs.com/package/@feelinglovelynow/svelte-modal) ⋅ [Github](https://github.com/feelinglovelynow/svelte-modal)
1. @feelinglovelynow/svelte-turnstile: [NPM](https://www.npmjs.com/package/@feelinglovelynow/svelte-turnstile) ⋅ [Github](https://github.com/feelinglovelynow/svelte-turnstile)
1. @feelinglovelynow/toast: [NPM](https://www.npmjs.com/package/@feelinglovelynow/toast) ⋅ [Github](https://github.com/feelinglovelynow/toast)
