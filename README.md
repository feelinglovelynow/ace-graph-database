# 🕉 @feelinglovelynow/ace-graph-database


## 🙏 JavaScipt's BEST Database!
* We feel Ace Graph Database is the BEST database option for JavaScript developers!


## 🤔 What is Ace?
* Ace syncs with key value stores
* Ace structures data in the key value store as a graph (nodes and relationships)
* Ace works with the JSON Schema that you provide
* Via the script, `ace types`, Ace will generate TypeScript types (TS) and JSDoc comments (JS)
* The Ace query language is a typesafe (JS/TS) function called `chat()`
* Users, Roles and Permissions (read, insert, update or delete) by node, relationship or property may be easily setup
* Backups via `ace backup` are free


## 🙌 How to create a Facebook Graph, in 3 steps?
****Step 1: Bash****
``` bash
pnpm add @feelinglovelynow/ace-graph-database # or npm or yarn
ace dev # start development server
```
****Step 2: JavaScript****
```ts
const response = await chat({
  graphs: [ { workerUrl: 'http://localhost:8787' } ],

  request: [
    { id: 'Start', property: 'start', }, // adds fundamental nodes, relationships & properties to graph

    {
      id: 'SchemaAddition', // add to schema
      property: 'schemaAddition',
      x: {
        nodes: {
          AceUser: { // AceUser is a node that is added to your schema during id: 'Start' above
            fbFriends: { id: 'BidirectionalRelationshipProp', x: { has: 'many', nodeName: 'User', relationshipName: 'friends' } }, // if adding props to default ace nodes like AceUser, we recommend beginning the prop name w/ prefix
          },
        },
        relationships: {
          friends: {
            id: 'ManyToMany', // other options are 'OneToMany' and 'OneToOne'
            x: {
              props: {
                _createdAt: { id: 'RelationshipProp', x: { dataType: 'isoString', mustBeDefined: true } } // starting relationship props with an underscore helps w/ queries as seen below
              }
            }
          }
        }
      }
    },

    { id: 'InsertNode', nodeName: 'AceUser', x: { uid: '_:Chris', name: 'Chris' } },
    { id: 'InsertNode', nodeName: 'AceUser', x: { uid: '_:Jenny', name: 'Jenny' } },
    { id: 'InsertNode', nodeName: 'AceUser', x: { uid: '_:Donna', name: 'Donna' } },

    { id: 'InsertRelationship', relationshipName: 'friends', x: { a: '_:Chris', b: '_:Jenny', _createdAt: 'now' } },
    { id: 'InsertRelationship', relationshipName: 'friends', x: { a: '_:Chris', b: '_:Donna', _createdAt: 'now' } },

    {
      id: 'Query',
      nodeName: 'AceUser',
      property: 'users',
      x: {
        uid: true,
        name: true,
        friends: {
          _uid : true, // relationship (friends)
          _createdAt: true, // relationship (friends)
          uid: true, // node (AceUser)
          name: true, // node (AceUser)
        }
      }
    },
  ]
})
```
****Step 3: Bash****
``` bash
ace types #generate types that align with above schema
```



## 🤓 Version 1 Roadmap 
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
* Deno
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
    * Link to see / edit on GitHub
        * Doc Page
        * Functions Doc Page references



## 🧚‍♀️ Version 2 Roadmap 
* Rust
    * Worker
    * Durable Object
    * Lib Folder
    * Cargo Package
    * JS (Call Rust code from JS) Support
        * Edge
        * Node
* Vector Data Type
* VMWare Private Ai
    * Teach Ai w/ data from graph(s)
    * Ask Ai questions about graph(s)
* Backup triggers (replica graph)
* Rag support
* Studio
    * Collaboration Tools
    * Ai chart generation
* Docs
    * Explain Version 2
    * Ask Ai



## 💎 What options do I have to store my data?
* Cloudflare Durable Object
    * Their $5 a month pricing tier allows:
        * [50 GB of Storage](https://developers.cloudflare.com/durable-objects/platform/limits/)
        * [1 million monthly requests](https://developers.cloudflare.com/durable-objects/platform/pricing/)
        * [Websocket Connectivity](https://developers.cloudflare.com/durable-objects/api/websockets/)
* Browser - Local Storage (FREE)
* Node - File (Standard Server Cost)


## 🎬 How to create a Movie Graph?
****Step 1: Bash****
``` bash
pnpm add @feelinglovelynow/ace-graph-database && ace dev
```
****Step 2: JavaScript****
```ts
const response = await chat({
  graphs: [ { workerUrl: 'http://localhost:8787' } ],
  request: [
    { id: 'Start', property: 'start', },

    {
      id: 'SchemaAddition',
      property: 'schemaAddition',
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
          _uid : true, // relationship (actsInMovie)
          _salary: true, // relationship (actsInMovie)
          uid: true, // node (Actor)
          name: true, // node (Actor)
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
