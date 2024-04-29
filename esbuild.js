import esbuild from 'esbuild'


esbuild.build({ // // https://esbuild.github.io/api/
  logLevel: 'info', // Show warnings, errors, and an output file summary. 
  sourcemap: true, // Source maps can make it easier to debug your code. They encode the information necessary to translate from a line/column offset in a generated output file back to a line/column offset in the corresponding original input file. 
  minify: true, // When enabled, the generated code will be minified instead of pretty-printed. 
  outdir: './dist', // Sets the output directory for the build operation.
  entryPoints: [ // This is an array of files that each serve as an input to the bundling algorithm.
    "./tsc/src/lib/ace/plugins/core.js",
    './tsc/src/lib/ace/query/doQueryOptions.js',
    './tsc/src/lib/ace/query/getDerivedValue.js',
    './tsc/src/lib/ace/query/getRelationshipNode.js',
    './tsc/src/lib/ace/query/getXGenerated.js',
    './tsc/src/lib/ace/query/query.js',
    './tsc/src/lib/ace/query/queryWhere.js',
    './tsc/src/lib/ace/ace.js',
    './tsc/src/lib/ace/aceFetch.js',
    "./tsc/src/lib/ace/getUid.js",
    './tsc/src/lib/ace/mutate.js',
    './tsc/src/lib/ace/storage.js',
    './tsc/src/lib/ace/validateSchema.js',

    './tsc/src/lib/objects/AceError.js',
    './tsc/src/lib/objects/AcePassport.js',

    './tsc/src/lib/security/createJWKs.js',
    './tsc/src/lib/security/getAlgorithmOptions.js',
    './tsc/src/lib/security/hash.js',

    './tsc/src/lib/isObjPopulated.js',
    './tsc/src/lib/variables.js',

    './tsc/src/index.js',
  ],
})
