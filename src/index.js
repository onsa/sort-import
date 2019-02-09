'use strict';

// use file system & path modules
var fs = require('fs');
var path = require('path');
// save project path
var projectPath = path.normalize(__dirname.split('node_modules')[0]);
// check for tslint.json
if (!fs.existsSync(projectPath + 'tslint.json')) {
	throw new Error('No tslint.json found at project root.');
}

// retrieve maximum line length from tslint.json
var maxLineLength = require(projectPath + 'tslint.json').rules['max-line-length'];

// retrieve indentation from tslint.json
var indent = getIndentation(projectPath);

// check quotemark
var quote = getQuote();

// retrieve base url
var baseUrl = require(projectPath + 'tsconfig.json').compilerOptions.baseUrl || 'src';

// import import separator comments
var comment = require('./comments');
// declare global end of line character & comments
var EOLChar;
var comments;
var sortOptions = {
	sensitivity: 'accent',
	ignorePuncutation: true,
	numeric: true
};

module.exports.run = main;

/**
 * check indentation configuration in tslint.json
 *
 * @param {projectPath} req
 * @return string
 */
function getIndentation(projectPath) {
	var indentationRule = require(projectPath + 'tslint.json').rules.indent;
	if (!indentationRule || !indentationRule.length) {
		throw new Error('No indentation rule found in tslint.json.');
	}
	var indent;
	if (indentationRule[1] === 'tabs') {
		indent = '\t';
	} else if (indentationRule[1] === 'spaces') {
		indent = ' '.repeat(indentationRule[2] || 2);
	}
	return indent;
}

/**
 * check quotemark configuration in tslint.json
 *
 * @return string
 */
function getQuote() {
	var quoteRule = require(projectPath + 'tslint.json').rules.quotemark;
	if (!quoteRule || !quoteRule[0]) {
		return;
	} else if (quoteRule[1] == 'single') {
		return "'";
	} else if (quoteRule[1] == 'double') {
		return '"';
	}
}

/**
 * recursively traverse directory structure and call processFile on each file
 *
 * @param {directory} req
 */
function main(directory) {
	directory = getRelativePath(directory);
  fs.readdir(directory, (err, files) => {
		var stats = fs.lstatSync(directory);
		if (stats.isDirectory()) {
			files.forEach(fileName => {
				var stats = fs.lstatSync(directory + path.sep + fileName);
				if (fileName, stats.isDirectory()) {
					main(directory + path.sep + fileName);
				} else {
					processFile(directory, fileName);
				}
			});
		} else {
			var parentDirectory = directory.substring(0, directory.lastIndexOf(path.sep));
			var fileName = directory.substring(directory.lastIndexOf(path.sep) + 1);
			processFile(parentDirectory, fileName);
		}
  });
}

/**
 * read .ts file contents, parse input and write return value if different
 *
 * @param {directory} req
 * @param {fileName} req
 */
function processFile(directory, fileName) {
	var splitFileName = fileName.split('.');
  var extension = splitFileName[splitFileName.length - 1];
  if (extension === 'ts') {
    fs.readFile(directory + path.sep + fileName, 'utf8', function(error, data) {
			if (error) {
				throw(error);
			}
      var fileContents = parseInput(data);
			if (data === fileContents) {
				console.log('Imports in ' + directory + path.sep + fileName + ' are ordered, no update necessary');
			} else {
	      fs.writeFile(directory + path.sep + fileName, fileContents, function(err) {
	        if (err) {
	            return console.log(err);
	        }
	        console.log('File ' + directory + path.sep + fileName + ' cleaned');
	      });
			}
    });
  }
}

/**
 * split file into comment lines, import lines and non-import lines
 *
 * @param {input} req
 * @return string
 */
function parseInput(input) {
	// initialise variables
  var importLines = [];
  var nonImportLines = [];
	comments = {};
	//	check and store EOL character
	EOLChar = getNewLine(input);
	// split imput and get last import line index
  var lines = input.split(EOLChar);
	var importEnd = getImportEnd(lines);
	// get comments, import lines and non-import lines
	getComments(lines, importEnd, comments);
	if (importEnd === -1) {
		return input;
	} else {
		importLines = pickImportLines(lines, importEnd, importLines).filter(function(importLine) {
			return !!importLine[0].length;
		});
		pickNonImportLines(lines, importEnd + 1, nonImportLines);
		// sort import lines and return concatenated file contents
		importLines = sortImportLines(importLines);
	  return importLines.concat(nonImportLines).join(EOLChar);
	}
}

/**
 * get index of last line that belongs to an import statement
 *
 * @param {lines} req
 * @return int
 */
function getImportEnd(lines) {
	var importEnd = -1;
	for (var i = 0; i < lines.length; i++) {
		// match 'import ' and 'from ...'
		if (lines[i].trim().replace(EOLChar, '').length &&
				(lines[i].trim().indexOf('import ') === 0 ||
				lines[i].trim().match(/}\s*from\s*[\'\"].*[\'\"];?$/))) {
			importEnd = i;
		// match PascalCased expression
		} else if (
			lines[i].trim().match(/^([A-Z]{1}[a-zA-Z_]*)*,?$/)
		) {
			// go back to last non-PascalCased line
			var j = i;
			while (!!lines[j] && lines[j].trim().match(/^([A-Z]{1}[a-zA-Z_]*)*,?$/)) {
				j--;
			}
			// if that matches 'import {', update import end
			if (lines[j].match(/import\s*{$/)) {
				importEnd = i;
			}
		}
	}
	return importEnd;
}

/**
 * loop over import lines and create a map between comments and their relative position
 *
 * @param {lines} req
 * @param {importEnd} req
 * @param {comments} req
 * @return obj
 */
function getComments(lines, importEnd, comments) {
	// loop over import lines and collect comments
	for (var i = 0; i < importEnd + 1; i++) {
		if (lines[i].trim().indexOf('//') === 0) {
			if (comment.angular !== lines[i].trim() &&
					comment.application !== lines[i].trim() &&
					comment.thirdParty !== lines[i].trim()) {
				comments[i + 1] = lines[i].trim();
			}
		} else if (
			lines[i].trim().indexOf('/*') === 0 &&
			lines[i].trim().indexOf('*/') === -1
		) {
			var commentUnit = [lines[i]];
			while (
				lines[i].trim().indexOf('*/') === -1 ||
				lines[i].trim().indexOf('/*') > -1) {
				i++;
				commentUnit.push(lines[i]);
			}
			comments[i + 1] = commentUnit.join(EOLChar);
		}
	}
	return comments;
}

/**
 * loop over import lines and return them together with their old position
 *
 * @param {lines} req
 * @param {importEnd} req
 * @param {importLines} req
 * @return array
 */
function pickImportLines(lines, importEnd, importLines) {
	// loop over import lines and collect them
	for (var i = 0; i < importEnd + 1; i++) {
		if (lines[i].trim().match(/import\s*{$/)) {
			var splitLine = [lines[i].trim()];
			var firstLineNumber = i;
			while (!lines[i].trim().match(/}\s*from\s*[\'\"].*[\'\"];?$/)) {
				i++;
				splitLine.push(lines[i].trim());
			}
			importLines.push([splitLine.join(' '), firstLineNumber]);
		} else if (lines[i].trim().indexOf('/*') === 0) {
			while (
				lines[i].trim().indexOf('*/') === -1 ||
				lines[i].trim().indexOf('/*') > -1
			) {
				i++;
			}
		} else if (lines[i].trim().indexOf('//') !== 0) {
			importLines.push([lines[i].trim(), i]);
		}
	}
	return importLines;
}

/**
 * loop over non-import lines and store them
 *
 * @param {lines} req
 * @param {importEnd} req
 * @param {nonImportLines} req
 */
function pickNonImportLines(lines, importEnd, nonImportLines) {
	for (var i = importEnd; i < lines.length; i++) {
		nonImportLines.push(lines[i]);
	}
	if (!!nonImportLines[0].trim().length) {
		nonImportLines.unshift(EOLChar);
	}
}

/**
 * Sort features within each import line, then sort lines themselves; and
 * return them prepended with comments
 *
 * @param {importLines} req
 * @return array
 */
function sortImportLines(importLines) {
	// initialise import groups
	var importGroups = {
		angular: [],
	  application: [],
	  thirdParty: []
	};
	// loop over import lines
  for (var i = 0; i < importLines.length; i++) {
		var localQuote;
		if (!!quote) {
			// fix quotation marks
			importLines[i][0] = importLines[i][0].replace(/["']/g, quote);
			localQuote = quote;
		} else {
			// find line-specific quotation mark
			localQuote = importLines[i][0].search('"') > -1 ? '"' : "'";
		}

		// sort features within and limit their length if necessary
		importLines[i][0] = sortFeatures(importLines[i][0]);
		importLines[i][0] = limitLine(importLines[i][0]);
		// sort them into three categories
		var match;
		var quoteSearch = new RegExp(localQuote + '.*' + localQuote);
		if (importLines[i][0].search(quoteSearch) > -1) {
			match = importLines[i][0].match(quoteSearch)[0].replace(/["']/g, "");
		}
		if (match.substring(0, 8) == '@angular') {
      importGroups.angular.push(importLines[i]);
    } else if (match.substring(0, 1) == '.' || checkApplicationPath(match)) {
      importGroups.application.push(importLines[i]);
    } else {
      importGroups.thirdParty.push(importLines[i]);
    }
  }
	// sort lines within categories and add category comment
	['angular', 'application', 'thirdParty'].forEach(function(groupName) {
		if (importGroups[groupName].length) {
			importGroups[groupName].sort(function(a,b) {
				// sort based on non-white-space version of strings & on globally defined sorting options
				return a[0].replace(/\s/g, '').localeCompare(b[0].replace(/\s/g, ''), undefined, sortOptions);
			});
			importGroups[groupName].unshift([comment[groupName], -1]);
		}
	});
	// get an array of import line indices
	var lineNumbers = getLineNumbers(importLines);
	// concatenate import groups with readded comments
  return importGroups.angular.map(function(line) {
		return readdComment(line, lineNumbers);
	})
	.concat(importGroups.application.map(function(line) {
		return readdComment(line, lineNumbers);
	}))
	.concat(importGroups.thirdParty.map(function(line) {
		return readdComment(line, lineNumbers)
	}));
}


/**
 * Check if import source is within the application
 *
 * @param {line} req
 * @return boolean
 */
function checkApplicationPath(url) {
	var directory = url.substring(0, url.lastIndexOf(path.sep));
	var pathArray;
	if (!directory || !directory.length) {
		pathArray = (projectPath + baseUrl + path.sep + directory + url + '.ts').split(path.sep);
	} else {
		pathArray = (projectPath + baseUrl + path.sep + directory).split(path.sep);
	}
	var cleanPathArray = [];
	pathArray.forEach(function(item, index) {
		if (item == '..') {
			cleanPathArray.pop();
		} else if(item != '.') {
			cleanPathArray.push(item);
		}
	});
	var pathToCheck = cleanPathArray.join(path.sep);
	return fs.existsSync(pathToCheck);
}

/**
 * Sort features in an import line
 *
 * @param {line} req
 * @return string
 */
function sortFeatures(line) {
	line = line.trim();
	if (line.indexOf('{') > -1 && line.indexOf('}') > -1) {
		var start = line.split('{')[0];
		var end = line.split('}')[line.split('}').length - 1];
		var features = line.split('{')[1].split('}')[0].split(',');
		for (var k in features) {
			features[k] = features[k].trim();
		}
		features = features.filter(function(feature) {
			return feature.trim().length > 0;
		}).sort(function(a,b) {return a.localeCompare(b, undefined, sortOptions)});
		line = start + '{ ' + features.join(', ') + ' }' + end;
	}
	return line;
}

/**
 * Loop over old import line indices between line and previous line;
 * prepend line with comments that were picked up from between the two; and
 * return prepended line
 *
 * @param {line} req
 * @param {lineNumbers} req
 * @return string
 */
function readdComment(line, lineNumbers) {
	// if not an import group comment
	if (line[1] !== -1) {
		// get old index of previous import line
		var lastImportLineNumber = lineNumbers[lineNumbers.indexOf(line[1]) - 1];
		for (var i = line[1]; i > lastImportLineNumber; i--) {
			// if comment exists between the two, prepend line with it
			if (!!comments[i]) {
				line[0] = comments[i] + EOLChar + line[0];
			}
		}
	}
	return line[0];
}

/**
 * Return a sorted array of old import line indices
 *
 * @param {importLines} req
 * @return array
 */
function getLineNumbers(importLines) {
	return importLines.map(function(line) {
		return line[1];
	}).sort(function(x, y) {
		return x - y;
	});
}

/**
 * Split line if longer than maximum defined in tslint.json
 *
 * @param {line} req
 * @return string
 */
function limitLine(line) {
	if (maxLineLength[0] && line.length > maxLineLength[1]) {
		line = line
			.replace(/{\s*/, '{' + EOLChar + indent)
			.replace(/\s*}/, EOLChar + '}')
			.replace(/,\s*/g, ',' + EOLChar + indent);
	}
	return line;
}

/**
 * return OS-specific path and trim project path from its beginning
 *
 * @param {directory} req
 * @return string
 */
function getRelativePath(directory) {
	directory = path.normalize(directory);
	if (path.normalize(directory).indexOf(projectPath) === 0) {
		directory = directory.split(projectPath)[1];
	}
	return directory;
}

/**
 * return OS-specific end of line character
 *
 * @param {fileContents} req
 * @return string
 */
function getNewLine(fileContents) {
	if (fileContents.indexOf('\r\n') > -1) { return '\r\n'; }
	else if (fileContents.indexOf('\n') > -1) { return '\n'; }
	else if (fileContents.indexOf('\r') > -1) { return '\r'; }
}
