'use strict';

// use file system & path modules
var fs = require('fs');
var path = require('path');

// get project path
var projectPath = path.normalize(__dirname.split('node_modules')[0]);
// read package.json
var packageJSON = require(projectPath + 'package.json');

// remove script if exists
if (!!packageJSON.scripts) {
	delete packageJSON.scripts['sort-import'];

	// remove scripts if empty
	if (!Object.keys(packageJSON.scripts).length) {
		delete packageJSON.scripts;
	}
}

// save package.json
fs.writeFile(projectPath + 'package.json', JSON.stringify(packageJSON, null, 2), function(err) {
  if (err) {
      return console.log(err);
  }
  console.log('Sorting script removed from package.json.');
});
