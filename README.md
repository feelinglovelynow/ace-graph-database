# 🕉 @feelinglovelynow/ace-graph-database



## 🙏 JavaScipt's BEST Database!
* You just found, what we feel is the BEST database option, for JavaScript developers!


## What is Ace?
* Ace sits on top of a key value store
* Ace structures data in the key value store as a graph (nodes and relationships):
* Ace works with the JSON Schema that you provide
* Via the script, `pnpm ace types`, Ace will generate TypeScript types (TS) and JSDoc comments (JS)
* The Ace query language is a typesafe (JS/TS) function called `chat()`
* Users, Roles and Permissions (read, insert, update or delete) by node, relationship or property may be easily setup
* Backups are simple and free!



## How to create a Movie Graph?
Step 1: JavaScript
```ts
const core = { graphs: [ { workerUrl: 'http://localhost:8787' } ] }

const request = [
  { id: 'Start' },

  {
    id: 'SchemaAddition',
    x: {
      nodes: {
        Movie: {
          name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          actors: { id: 'ReverseRelationshipProp', x: { has: 'many', nodeName: 'Actor', relationshipName: 'actsInMovie' } },
        },
        Actor: {
          name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
          actsIn: { id: 'ForwardRelationshipProp', x: { has: 'many', nodeName: 'Movie', relationshipName: 'actsInMovie' } },
        }
      },
      relationships: {
        actsInMovie: {
          id: 'ManyToMany',
          x: {
            props: {
              _salary: { id: 'RelationshipProp', x: { dataType: 'number' } }
            }
          }
        },
      }
    }
  },

  { id: 'InsertNode', nodeName: 'Movie', x: { uid: '_:Matrix', name: 'The Matrix' } },
  { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Keanu', name: 'Keanu Reeves' } },
  { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Laurence', name: 'Laurence Fishburne' } },
  { id: 'InsertNode', nodeName: 'Actor', x: { uid: '_:Carrie', name: 'Carrie-Anne Moss' } },

  { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Keanu', b: '_:Matrix', _salary: 99.9 } },
  { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Carrie', b: '_:Matrix', _salary: 99 } },
  { id: 'InsertRelationship', relationshipName: 'actsInMovie', x: { a: '_:Laurence', b: '_:Matrix', _salary: 99 } },

  {
    id: 'Query',
    nodeName: 'Movie',
    property: 'movies',
    x: {
      uid: true,
      name: true,
      actors: {
        _uid : true, // relationship (actsInMovie) uid
        _salary: true, // relationship (actsInMovie) uid
        uid: true, // node (Actor) uid
        name: true, // node (Actor) uid
      }
    }
  }
]

const response = await chat(core, request)
```
Step 2: Bash
``` bash
ace types
```


## What options do I have to store my data?
* Cloudflare Durable Object
    * Their $5 a month pricing tier allows:
        * [50 GB of Storage](https://developers.cloudflare.com/durable-objects/platform/limits/)
        * [1 million monthly requests](https://developers.cloudflare.com/durable-objects/platform/pricing/)
        * [Websocket Connectivity](https://developers.cloudflare.com/durable-objects/api/websockets/)
* Browser - Local Storage (FREE)
* Node - File (Standard Server Cost)


## Version 1 Roadmap 
* From write to (inup / insert / update / delete)
* Finish errors updates
* Slug to Enum
* Lib folder
* Node or edge name may not start w/ [ Ace, Query, Mutate, Schema, CF ] and no triple underscores (DELIMETER) b/c we use them as delimeters
    * Don't allow uid or _uid to be a prop
* Objects folder, b/c JSDoc is not good @ classes
    * graph
    * transaction
    * passport
    * cache
    * log
        * Put [ Key, Original, Now, Request Item, API Token ]
        * Delete [ Key, API Token ]
    * error
* Manifest to cli
    * Data structures that allow 1 loop in cli function
    * `ace backup`
    * `ace enums`
    * `ace types` does `ace enums` first, b/c enums are used in types
    * `.ace` folder
        * Folders: (types, enums, backups)
* SCHEMA_KEY use app wide
* Move schema loops into schema data structures
* loopOptions > switch 
* Remove can't read something from putMap if in deleteSet
* Add can't put something in putMap that is in deleteSet
* Do not allow the forward and the reverse relationship propName to be the same propName
* `chat()`
    * Function to communicate with the graph
    * Insert w/ no uid allowed (node can't be used in relationships)
    * Insert w/ provdided uid allowed (node can be used in relationships)
    * Let 'Start' support property
    * Let 'Restart' support property
    * Let 'SchemaAddition' support property
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
* Transaction
    * IF mutation in chat() found and no transaction provided, create transaction w/ undefined holdCommit
    * Logs
    * createTransaction()
    * save()
    * clear() - putMap & deleteSet
    * rollback()
      * Rollback Options
        * Retry
        * Maintain data structures 
* Mutations that alter Schema and Data simultaneously (idsMutate)
* Function response types
* Node Typedefs (all optional props)
* Must relationship (storage fallback)
* Full Text Index, Mutation and Query
* Geojson support
    * Coordinates data type (Multidimensional array with longitude and latitude array)
* Timeseries data types
* Relationship prop indexes
* Test relationship props update + guidance
* App Worker > Ace Durable Object
* Browser > Ace > Local Storage
* Node > Ace > Text File (stoage que?)
* Batch requests to storage to stay within storage required Maximum count
* KV (request cache) Integration
* REPL (event, storage, share)
* Comments (param, returns, description, example usage, why) for all index functions
* Proofread all comments
* Independant Security Audit
* Independant Code Review
* Unit Tests
* Studio
    * (View / Edit) data from multiple graphs, simultaneously in the browser
    * Q&A - Show questions that makes sense to ask about the graph and the answers
* Lovely Unity 1.0
* Real project benchmarks
* Docs
    * Search
    * Ask Ai
    * Link to see / edit on GitHub
        * Doc Page
        * Functions Doc Page references


## Version 2 Roadmap 
* Store Vectors

* VMWare Private Ai
    * Ai ask questios about graph(s)
    * Ai chart generation
* Backup triggers (replica graph)
* Rag support
* Studio
    * Collaboration Tools


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
