'use strict';

// use file system & path modules
var fs = require('fs');
var path = require('path');

// get project path
var projectPath = path.normalize(__dirname.split('node_modules')[0]);
// read package.json
var packageJSON = require(projectPath + 'package.json');

// add scripts property if missing
if (!packageJSON.scripts) {
	packageJSON.scripts = {};
}
// add script
packageJSON.scripts['sort-import'] = 'sort-import';

// save package.json
fs.writeFile(projectPath + 'package.json', JSON.stringify(packageJSON, null, 2), function(err) {
  if (err) {
      return console.log(err);
  }
  console.log('Sorting script added to package.json.');
});
