import esbuild from 'esbuild'


esbuild.build({ // // https://esbuild.github.io/api/
  logLevel: 'info', // Show warnings, errors, and an output file summary. 
  sourcemap: true, // Source maps can make it easier to debug your code. They encode the information necessary to translate from a line/column offset in a generated output file back to a line/column offset in the corresponding original input file. 
  minify: true, // When enabled, the generated code will be minified instead of pretty-printed. 
  outdir: './dist', // Sets the output directory for the build operation.
  entryPoints: [ // This is an array of files that each serve as an input to the bundling algorithm.
    './tsc/src/delete.js',
    './tsc/src/getDerivedNode',
    './tsc/src/getRelationshipNode',
    './tsc/src/index.js',
    './tsc/src/list.js',
    './tsc/src/mutate.js',
    './tsc/src/query.js',
    './tsc/src/queryWhere.js',
    './tsc/src/schema.js',
    './tsc/src/variables.js',
  ],
})
