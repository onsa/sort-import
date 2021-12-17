#!/usr/bin/env node

var sortImports = require('./');
var args = process.argv.slice(2);
var fs= require('fs');

if (args.length === 0) {
	throw new Error('Application path not provided');
} else if (args.length > 1) {
	throw new Error(('Malformed application path: ' + args).replace(',', ' '));
} else if(!fs.existsSync(args[0])) {
  throw new Error('No such file or directory: ' + args[0]);
} else {
	sortImports.main(args[0]);
}
