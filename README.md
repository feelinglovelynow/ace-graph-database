# 🕉 Ace Graph Database


## 🙏 JavaScipt's BEST Database!
* Our mission is to create, maintain and enhance the Best database for JavaScript Developers!


## 🤔 What is Ace?
1. Ace structures data in encrypted key value stores as a graph (nodes, relationships and properties)
1. Nodes may have props, relationships may have props, and relationships may be one to one, one to many or many to many
1. Our cli scipt `ace types` creates TypeScript types (TS) and JSDoc comments (JS), based on the JSON Schema you provide


## 🙋‍♀️ Queries, Mutations and Data Management
1. The Ace query language is a typesafe (JS/TS) function called `ace()`, that provides expressive queries and transactional mutations
1. Roles and permissions by node, relationship or property, for the actions read, insert, update, upsert, or delete can be easily configured thanks to our `core` plugin
1. Our cli scipt provides a way to save encrypted backups locally to a file or to Cloudflare KV for free... & applying backups to a graph is simple with our cli too


## 🎬 Create a Movie Graph 
****Step 1: Bash****
``` bash
pnpm add @feelinglovelynow/ace-graph-database # or npm
ace dev # start local graph
```
****Step 2: JavaScript (The 1 transactional function call to `ace()` below will)****
1. Add nodes `Actor` and `Movie` and relationship `actsInMovie` to schema via `SchemaAdd`
1. Add `Avatar` and `The Matrix` nodes to graph via `InsertNode`
1. Add `Keanu`, `Laurence` and `Carrie` nodes to the graph and add their relationships to the `Matrix` to the graph, by using enums placed after `_:` (relationship inserts can also be done w/ uids) via `InsertRelationship`
1. Place a query into the response @ `response.movies` via `QueryNode`
1. Place a backup into the response @ `response.backup` via `BackupGet`
1. Place the schema into the response @ `response.schema` via `SchemaGet`
```ts
const response = await ace({
  host: 'http://localhost:8787',
  request: [
    {
      id: 'AddToSchema', // add to schema the nodes, relationships and properties here and place 'AddToSchema' response items @ response.addToSchema
      property: 'addToSchema',
      x: {
        schema: {
          nodes: {
            Actor: {
              name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
              actsIn: { id: 'ForwardRelationshipProp', x: { has: 'many', node: 'Movie', relationship: 'actsInMovie' } },
            },
            Movie: {
              name: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
              actors: { id: 'ReverseRelationshipProp', x: { has: 'many', node: 'Actor', relationship: 'actsInMovie' } },
            },
          },
          relationships: {
            actsInMovie: {
              id: 'ManyToMany',
              x: {
                props: {
                  _salary: { id: 'RelationshipProp', x: { dataType: 'number' } } // In queries relationship props starting w/ an underscore helps identify which props are node props and which props are relationship props
                }
              }
            }
          }
        }
      }
    },

    // A uid for this movie node will be generated by Ace and assigned to this node b/c a uid property was not specified
    { id: 'AddGraphNode', node: 'Movie', props: { name: 'Avatar' } },

    // uids generated by Ace here, are used in relationships below, thanks to enums placed after _:
    { id: 'AddGraphNode', node: 'Movie', props: { uid: '_:Matrix', name: 'The Matrix' } },
    { id: 'AddGraphNode', node: 'Actor', props: { uid: '_:Keanu', firstName: 'Keanu', lastName: 'Reeves' } },
    { id: 'AddGraphNode', node: 'Actor', props: { uid: '_:Laurence', firstName: 'Laurence', lastName: 'Fishburne' } },
    { id: 'AddGraphNode', node: 'Actor', props: { uid: '_:Carrie', firstName: 'Carrie-Anne', lastName: 'Moss' } },

    // The ordering (which uid is a and which uid is b) is important here b/c the relationship actsInMovie has a ForwardRelationshipProp and a ReverseRelationshipProp
    // If the relationship name was friends, and we only had 1 BidirectionalRelationshipProp called friends on a User node, the ordering would not matter b/c from each nodes perspective, the relationship has the same name, friends
    // With the actsInMovie relationship, from the forward perspective the relationship is actsIn and from the reverse perspective it's actors
    { id: 'AddGraphRelationship', relationship: 'actsInMovie', props: { a: '_:Keanu', b: '_:Matrix', _salary: 9001 } },
    { id: 'AddGraphRelationship', relationship: 'actsInMovie', props: { a: '_:Carrie', b: '_:Matrix', _salary: 420 } },
    { id: 'AddGraphRelationship', relationship: 'actsInMovie', props: { a: '_:Laurence', b: '_:Matrix', _salary: 369 } },


    // query all movies and their actors, only get the properties we request and place this information @ response.movies
    {
      id: 'QueryByNode',
      node: 'Movie',
      prop: 'movies',
      props: { // Movie props we wanna see in the response
        uid: true,
        name: true,
        actors: {
          // actors: options
          $a: {
            limit: { count: 2, skip: 1 }, // 3
            flow: [ 'filter', 'sort', 'limit' ],
            sort: { prop: 'salary', how: 'asc' }, // 2
            filter: [ { prop: 'salary' }, '>=', { avg: 'salary' } ], // 1
            newProps: {
              bonus: [ [ { prop: 'salary' }, '/', 12 ] '*' 0.7 ],
              fullName: [ { prop: 'firstName' }, '+', ' ', '+', { prop: 'lastName' } ],
            },
          },

          // actors: props
          uid: true, // node prop (Actor)
          _uid: true, // relationship prop (actsInMovie)
          _salary: { alias: 'salary' }, // alias property will be in response
        }
      }
    },

    // place a backup of the graph into the response @ response.backup
    { id: 'GetBackup', prop: 'backup' },

    // place the current graph schema into the response @ response.schema
    { id: 'GetSchema', prop: 'schema' },
  ]
})
```
****Step 3: Bash****
``` bash
ace types -w=http://localhost:8787 #generate types that align with above schema for intellisense during all future ace() calls
```


## 💪 Call `ace()` with cURL
* The Ace query language with cURL, is the same as above in `JS/TS`
* Thanks to `ace types`, above is easier, thanks to intellisense
* To format the JSON response, `npm i -g json` and then @ the end of a cURL add ` | json`
``` bash
curl --header "Content-Type: application/json" \
  --request POST \
  --data '{
    "request": [
      { "id": "AddNodeToGraph", "node": "Movie",  "x": { "name": "Hercules" } },

      {
        "id": "QueryByNode",
        "node": "Movie",
        "prop": "movies",
        "props": {
          "uid": true,
          "name": true
        }
      }
    ]
  }' \
  http://localhost:8787/ace
```

## 😎 CLI
* Clone this repo or pull `@feelinglovelynow/ace-graph-database` from npm to get access to our cli
* To show everything our cli can do, asking our cli for help... is helpful 🥁
* To do this, in bash just enter, `ace`, `ace -h`, `ace --help` or `ace help` and this is what shows up:
```bash
Ace Graph Database CLI v${ version }



ace
  Shows this message
  Options:
    -h      |  Optional  |  ace -h
    help    |  Optional  |  ace help
    --help  |  Optional  |  ace --help



ace version
   Prints your currently downloaded Ace Graph Database Version



ace jwks
  Creates public and private jwks and logs them to the console
  Why: Send jwks to ace() whenever you would love to do cryptography
  JWK: A cryptography key, like a password, we recomend storing jwks in your .env file



ace dev
  Start local Ace Graph Database (Cloudflare Worker + Cloudflare Durable Object)



ace types
  Create types (TS) and typedefs (JSDoc)
  Options:
    -u     |  URL  |  Optional  |  String
    --url  |  URL  |  Optional  |  String
  Examples:
    ace types -u=http://localhost:8787
    ace types --url=http://localhost:8787



ace schemaToFile
  Ask graph for most recent schema and then save schema to a file locally
  Location File: [current directory]/ace/schema.json
  Options:
    -u          |  URL       |  Required  |  String
    --url       |  URL       |  Required  |  String
  Examples:
    ace schemaToFile -u=http://localhost:8787
    ace schemaToFile --url=http://localhost:8787



ace graphToFile
  Generate backup and then save backup to a file locally
  Location File: [ Current Directory ]/ace/backups/[ File Name ].json
  Options:
    -u          |  URL        |  Required  |  String
    --url       |  URL        |  Required  |  String
    -n          |  File Name  |  Optional  |  String
    --name      |  File Name  |  Optional  |  String
  Examples:
    ace graphToFile -u=http://localhost:8787
    ace graphToFile --url=http://localhost:8787
    ace graphToFile -u=http://localhost:8787 -n=qa
    ace graphToFile --url=http://localhost:8787 --name=dev



ace fileToGraph
  Read backup from file and then save backup to graph
  File Location: [ Current Directory ]/ace/backups/[ File Name ].json
  Skip Data Delete: When a backup is applied with "ace fileToGraph" an entire graph delete is done first, to avoid the delete and just apply the backup use this option
  Options:
    -n                |  File Name         |  Required  |  String
    -name             |  File Name         |  Required  |  String
    -u                |  URL               |  Required  |  String
    --url             |  URL               |  Required  |  String
    -s                |  Skip Data Delete  |  Optional  |  Boolean
    --skipDataDelete  |  Skip Data Delete  |  Optional  |  Boolean
  Examples:
    ace fileToGraph -n=qa.json -u=http://localhost:8787
    ace fileToGraph --name=dev.json --url=http://localhost:8787
    ace fileToGraph -n=backup.json -u=http://localhost:8787 -s=true
    ace fileToGraph --name=2024-03-24T19:44:36.492Z.json --url=http://localhost:8787 --skipDataDelete=true
```


## 🤓 Version 1 Roadmap 
1. Response Types
1. How local db schema to prod db schema
    * Update prop column name
    * Based on the schema diff, we know what happened with the migration
        * Original Schema, Now Schema
            * Any (new/less) nodes
            * Any (new/less) relationships
            * Any (new/less) (node/relationship) props
            * Any props have different values
            * How do we know the difference between a rename and a removal and an addition
                * B/c on a rename we want to keep the previous data
                * first_name to firstName
                * Add firstName column is the first migration
                * CopyColumnData is the 2nd step
                * Remove first_name column is the last migration
                * https://planetscale.com/docs/learn/how-to-make-different-types-of-schema-changes
                * https://planetscale.com/blog/backward-compatible-databases-changes
        * Once we know the answer to the above questions we can craft the proper `ace()`
1. Refactor, to help w/:
    * Improve (typing / response) intellisense
    * Less typing required
    * Property to Prop
```js
const query = {
  id: 'QueryByNode',
  node: 'Movie',
  prop: 'matrix',
  how: {
    $a: { findByUid: 'matrix_uid' },
    uid: true,
    title: true,
    actors: {
      $a: {
        alias: 'stars',
        limit: { count: 9, skip: 9 }, // 3
        flow: [ 'filter', 'sort', 'limit' ],
        sort: { prop: 'salary', how: 'asc' }, // 2
        filter: [ { prop: 'salary' }, '>=', { avg: 'salary' } ], // 1
        resHide: { avgSalary: true },
        newProps: {
          bonus: [ [ { prop: 'salary' }, '/', 12 ] '*' 0.7 ],
          fullName: [ { prop: 'firstName' }, '+', ' ', '+', { prop: 'lastName' } ],
        },
      },
      uid: true,
      firstName: true,
      lastName: true,
      _uid: true,
      _salary: { alias: 'salary' },
      friends: {
        $a: {
          filter: { // filter parenthesis (groups)
            symbol: '&',
            items: [
              {
                symbol: '|',
                items: [
                  [ { prop: 'name' }, '=', 'chris' ],
                  [ { prop: 'avgSalary' }, '>', 9 ],
                ]
              },
              [ { prop: 'idk' }, '!=', 'hmm' ],
            ]
          }
        },
        lastName: true,
        firstName: true,
      }
    }
  }
}

const mutation = { id: 'AddGraphNode', node: 'Movie', props: { uid: '_:Matrix', name: 'The Matrix' } }

const relationship = { id: 'AddGraphRelationship', relationship: 'actsInMovie', props: { a: '_:Keanu', b: '_:Matrix', _salary: 9001 } }

const schema = {
  id: 'AddToSchema',
  prop: 'schemaAdd',
  x: {
    schema: {
      nodes: {
        Movie: {
          props: {
            title: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            actors: { id: 'ReverseRelationshipProp', x: { has: 'many', node: 'Actor', relationship: 'actsInMovie' } },
          }
        },
        Actor: {
          props: {
            firstName: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            lastName: { id: 'Prop', x: { dataType: 'string', mustBeDefined: true } },
            actsIn: { id: 'ForwardRelationshipProp', x: { has: 'many', node: 'Movie', relationship: 'actsInMovie' } },
          }
        }
      },
      relationships: {
        actsInMovie: {
          id: 'ManyToMany',
          props: {
            _salary: { id: 'RelationshipProp', x: { dataType: 'number' } }
          }
        },
      }
    }
  }
}
```
* firstOptions
    * alias, find, filter
* Do firstOptions
* flowOptions
* flowOrder <- options.flow || defaultFlow
* for key of flowOrder
    * IF flowOptions.has(key) -> do() AND flowOptions.delete(key)
* flowOptions.forEach()
    * do()
1. No uid or _uid in data values
1. Alphabetical Schema
1. Add enums to schema
1. (TS / JSDoc)
    * What
        * Run time validation support
        * Alter `ace()` response based on the request
    * How
        * Generics
        * Conditional Types
1. `ace()`
    * Function to communicate with the graph
    * fileToGraph Option: skipDataDelete: boolean
    * Sanitize / Validate Input
    * Delete `cascadePropNames` array
    * Must relationship (storage fallback)
    * Upsert, won't throw an error if the item exists
    * Multiple Queries - Values from previous query available in current query
    * Query Prop: `{ alias: 'hi', required: true }`
    * fileToGraph Option: Public JWK: boolean
    * BackupGet Option: Private JWK
    * BackupFile Option: Is Encrypted
    * BackupFile Option: Zip
    * Mutations that alter Schema and Data simultaneously (idsMutate)
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
1. On Error Flow
    * Retry: Count, MS Before Trying Again
    * Log to KV
    * Backup To KV
    * Email Log
    * Email Backup
    * Provide `ace()`, `request`  for how to get graph back to how it was before this error
1. Logs
    * Put [ Key, Original, Now, Request Item, API Token ]
    * Delete [ Key, API Token ]
1. Full Text Index, Mutation and Query
1. Relationship prop indexes
1. Security
    * 2FA + Authy Support
    * AceUser > email > passwordless
1. Test relationship props update + guidance
1. Prep loop called in deligate and _ace
1. App Worker > Ace Durable Object
1. Batch requests to storage to stay within storage required Maximum count
1. Comments (param, returns, description, example usage, why) for all index functions
1. Proofread all comments
1. loopOptions > switch 
1. Cli Loop schema once
1. Move schema loops into schema data structures 
1. Simulator
    * Speed up time to test things that take time
    * Replay
    * Loop
    * Auto Create GitHub Bug
1. Independant Security Audit
1. Independant Code Review
1. Unit Tests
1. Offline support > Response Allows Resume
1. Studio
    * (View / Edit) data from multiple graphs, simultaneously, locally in the browser
1. Lovely Unity 1.0
1. Real project benchmarks
1. Docs
    * Search
    * Link to see / edit on GitHub
        * Doc Page
        * Functions Doc Page references
1. Ace Database Foundation
    * Mission Statement
        * Create, maintain and enhance the Best Database for JavaScript Developers
    * Principles
        * Open Governance
        * Community Driven
        * Welcome to all users and contributors
    * Council
        * Those that align with our roadmap and have ideas how it may improve


## 🌟 Version 2 Roadmap 
1. Community Ideas
1. GitHub Issues
1. Foundation Ideas
1. X > AceFn > Cloudflare Worker > Cloudflare Durable Object
    * Bun Server
    * Deno Server
    * Deno Edge
    * Vercel Edge
1. Contribution Documentation
1. Query Planner
1. Optimize Queries
1. KV (request cache) Integration
1. Webhooks
1. Studio
    * Website (Not just local anymore) (sign in) (make data adjustments anywhere)
    * Report Builder
    * Report Scheduler
    * Q&A - Show questions that makes sense to ask about the graph and the answers
    * Analytics
1. Backup triggers (replica / sync graph)
1. On Error Flow
    * Slack
    * Custom
1. Geojson support
    * Coordinates data type (Multidimensional array with longitude and latitude array)
1. Timeseries data types
1. Docs
    * Explain Version 2
    * Ask Ai


## ✨ Version 3 Roadmap 
1. Community Ideas
1. GitHub Issues
1. Foundation Ideas
1. Self Hosting Ability
    * Durable Object functionality compiled to binary, built w/ Zig 1.x (of stable Zig)
        * Http Server
        * Store Key Value Data @ Memory
        * Store Key Value Data @ Disk
        * Encryption @ Rest via user provided jwk or Ace will create one
        * Websocket
        * Build Input / Output Gates
        * Optimize Queries & Sorting
        * Pass all JS Unit Tests
        * Create Zig Unit Tests
    * Call `ace()` Zig code from the following servers + edge environments:
        * Zig
        * Worker
        * Node
        * Deno
        * Bun
        * Vercel
1. REPL (event, storage, share)
    1. WASM (Zig DB In Browser on users machine)
1. Vector Data Type
1. VMWare Private Ai
    * Teach Ai w/ data from graph(s)
    * Ask Ai questions about graph(s)
1. Rag support
1. Ace Cloud
    * via Ace Graph Database Foundation
    * Clean + Simple + Performant UX
    * Deploy / Monitor / Maintain graphs:
        * @ Cloudflare
        * @ Ace Cloud
        * That are Self hosted
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
    * (Desktop / Android / Mobile) Applications 
        * Data Alerts (Notifications)
    * Ai chart generation
    * Ai Q&A generator
    * Collaboration Tools


## 😍 What options do I have to store my data?
1. Cloudflare Durable Object
    * Version 1
    * Their $5 a month pricing tier allows:
        * [50 GB of Storage](https://developers.cloudflare.com/durable-objects/platform/limits/)
        * [1 million monthly requests](https://developers.cloudflare.com/durable-objects/platform/pricing/)
        * [Websocket Connectivity](https://developers.cloudflare.com/durable-objects/api/websockets/)
        * [Encryption @ Rest](https://developers.cloudflare.com/durable-objects/reference/data-security/)
1. Self Hosting
    * Version 3
1. Ace Cloud
    * Version 3


## 🧐 Version Update Plan
1. 0.0.x (Prototype) to 0.1.0 (Beta)
    * When all 1.0 road map items are in testing
    * Will not include a migration script
1. 0.x.0 to 1.0
    * When all 1.0 road map items pass testing
    * Will not include a migration script
1. 1.x to 2.0
    * When all 2.0 road map items pass testing
    * Will include a 1.x to 2.0 migration script
1. 2.x to 3.0
    * When all 3.0 road map items pass testing
    * Will include a 2.x to 3.0 migration script


## 💎 Dictionary
### Ace
* Ace is a Graph Database
### Graph Database
* A database with nodes, relationships and properties
### Node
* A noun stored in a graph, has a name like `Movie`
* If storing a node it must align with a node name in your schema, defined in schema @ `const schema = { nodes }`
* Nodes may have properties
### Relationship
* Explains how two nodes unite, has a name like `actsInMovie`
* If storing a relationship it must align with a relationship name in your schema, defined in schema @ `const schema = { relationships }`
* Each relationship also comes with Node Properties that shows the relationship in both directions
    * One `ForwardRelationshipProp` may be combined with one `ReverseRelationshipProp` or one `BidirectionalRelationshipProp` may be used
* Relationships may have properties
### Properties
* Information about one node (eg: `Movie` node, `name` prop) or one relationship (`actsInMovie` relationship, `_salary` prop)
* Relationship properties start with an underscore to help differentiate node props and relationship props during `ace()` queries
### Property Data Types
* string
* number
* boolean
* hash
    1. Get public and private jwks from Ace by calling `ace()`, calling `createJWKs()` or with our cli `ace jwks`
    1. On a property that is the `hash` data type, do an `ace()` insert, and also send to `ace()` a private jwk
    1. Ace will hash the string and store the hash value in your graph
    1. When performing `ace()` queries, provide a public jwk to `Find` a node only if it matches a stored hash
* isoString
    * `(new Date()).toISOString()`
    * When doing a node or relationship mutation, provide a value of `'now'` to tell Ace to add the `isoString` now date as the value, example:
        * `{ id: 'AddNodeToGraph', node: 'Movie', props: { name: 'The Matrix', createdAt: 'now' } }`
### Schema
* Defines how your graph is structured, by defining the nodes, relationships and properties
* Is stored in your graph, at the key `$schema` to ease migrations
* Thanks to `ace schemaToFile`, your schema may also be easilly stored in a file in a JSON file, in your backend source control, like `Prisma`
### `ace()`
* Takes 1 parameter, an options object and this options object is the `Ace Query Language` or the `Ace Options`
* Supports / Default:
    * Responds with requested nodes, relationships and properties, similair to GraphQL but rather then string template queries and mutations, Typesafe intellisense via JSDoc Typedefs (comments) (not in build) and TypeScript types (not in build) (but super helpful during development)
    * To limit round trips, multiple sequential queries may be performed in the array request order
* Typically ORMs unite your databse with JavaScript, but now 1 function supports this!
* May also be called via HTTP at `[ host ]/ace`


## 🕰️ Origin Story
1. Java SQL Strings
1. PHP SQL Strings
1. Node SQL Strings
1. Mongoose
1. Dgraph
1. Prisma
1. Drizzle
1. Durable Objects
1. Ace


## 🎁 All Our Packages
1. @feelinglovelynow/ace-graph-database: [NPM](https://www.npmjs.com/package/@feelinglovelynow/ace-graph-database) ⋅ [Github](https://github.com/feelinglovelynow/ace-graph-database)
1. @feelinglovelynow/datetime-local: [NPM](https://www.npmjs.com/package/@feelinglovelynow/datetime-local) ⋅ [Github](https://github.com/feelinglovelynow/datetime-local)
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
