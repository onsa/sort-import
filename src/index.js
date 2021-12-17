'use strict';

// declare global variables
var fs;
var path;
var config;

/**
 * initialise sorter configuration
 * 
 * @param {targetPath} req
 */
function configure(targetPath) {
    // use file system & path modules
    fs = require('fs');
    path = require('path');

    config = {};

    // set target path
    config.targetPath = path.dirname(targetPath);

    // set project path
    config.projectPath = getProjectPath();

    // set eslint options
    var linterConfig = getLinterConfig();

    // set indentation from eslint
    config.indent = getIndentation(linterConfig);

    // set maximum line length
    config.maxLineLength = getMaxLineLength(linterConfig);

    // set quotemark from eslint
    config.quote = getQuote(linterConfig);

    // set tsconfig options
    config.ts = getTsConfig();

    // set import separator comment templates
    config.comments = getCommentTemplates();

    // set sort options
    config.sortOptions = {
        sensitivity: 'accent',
        ignorePuncutation: true,
        numeric: true
    };
}

/**
 * check project path
 *
 * @return string
 */
function getProjectPath() {
    var currentPath = config.targetPath;
    var projectPath;
    while (!projectPath && fs.existsSync(currentPath)) {
        if (fs.existsSync(currentPath + '/package.json')) {
            projectPath = currentPath;
        } else {
            var newPathArray = currentPath.split(path.sep);
            newPathArray.pop();
            currentPath = newPathArray.join(path.sep);
        }
    }
    if (!projectPath) { throw new Error('Node project not found.'); }
    return projectPath;
}

/**
 * check eslint
 *
 * @return obj
 */
function getLinterConfig() {
    var linterConfig;
    if (fs.existsSync(config.projectPath + '/.eslintrc.js')) {
        linterConfig = require(config.projectPath + '/.eslintrc.js');
    } else if (fs.existsSync(config.projectPath + '/.eslintrc.json')) {
        linterConfig = require(config.projectPath + '/.eslintrc.json');
    } else if (fs.existsSync(config.projectPath + '/.eslintrc.yml')) {
        let fileContents = fs.readFileSync(config.projectPath + '/.eslintrc.yml', 'utf8');
        var parser = require('js-yaml');
        linterConfig = parser.load(fileContents);
    } else {
        return {
            overrides: [
              {
                files: [
                    "*.ts"
                ],
                rules: {
                    'max-len': ["error", { "code": 140 }],
                    'indent': ['error', 4],
                    quotes: ['error', 'single']
                }
              }
            ]
        };
    }
    linterConfig = linterConfig.overrides.find(
        c => c.files.indexOf('*.ts') > -1
    )
    return linterConfig;
}

/**
 * check indentation configuration in eslint
 *
 * @param {linterConfig} req
 * @return string
 */
function getIndentation(linterConfig) {
    var indentationRule = linterConfig.rules['@typescript-eslint/indent'] || linterConfig.rules.indent;
    if (!indentationRule || !indentationRule.length) {
        throw new Error('No indentation rule found in eslintrc.js.');
    }
    var indent;
    if (typeof indentationRule === 'string') {
        indent = ' '.repeat(4);
    } else if (indentationRule[1] === 'tab') {
        indent = '\t';
    } else if (typeof indentationRule[1] === 'number') {
        indent = ' '.repeat(indentationRule[1]);
    }
    return indent;
}

/**
 * check maximum line length in eslint
 *
 * @param {linterConfig} req
 * @return string
 */
function getMaxLineLength(linterConfig) {
    return linterConfig.rules['max-len'] || 80;
}

/**
 * check quotemark configuration in eslint
 *
 * @param {linterConfig} req
 * @return string
 */
function getQuote(linterConfig) {
    var quoteRule = linterConfig.rules.quotes;
    if (!quoteRule || quoteRule[0] !== 'error') {
        return;
    } else if (quoteRule[1] == 'single') {
        return "'";
    } else if (quoteRule[1] == 'double') {
        return '"';
    }
}

/**
 * check tsconfig(.*).json
 *
 * @return obj
 */
function getTsConfig() {
    var currentPath = config.targetPath;
    var tsConfigs = [];
    while (!tsConfigs.length && currentPath.length >= config.projectPath.length && fs.existsSync(currentPath)) {
        if (fs.existsSync(currentPath + '/tsconfig.app.json')) {
            tsConfigs.push(require(currentPath + '/tsconfig.app.json').compilerOptions);
        } else if (fs.existsSync(currentPath + '/tsconfig.lib.json')) {
            tsConfigs.push(require(currentPath + '/tsconfig.lib.json').compilerOptions);
        } else if (fs.existsSync(currentPath + '/tsconfig.base.json')) {
            tsConfigs.push(require(currentPath + '/tsconfig.base.json').compilerOptions);
        } else if (fs.existsSync(currentPath + '/tsconfig.json')) {
            tsConfigs.push(require(currentPath + '/tsconfig.json').compilerOptions);
        } else {
            var newPathArray = currentPath.split(path.sep);
            newPathArray.pop();
            currentPath = newPathArray.join(path.sep);
        }
    }
    // error if tsconfig is missing
    if (!tsConfigs.length) { throw new Error('TS config not found.'); }
    // reverse order so inner config can override outer config
    var tsConfigs = tsConfigs.reverse();
    var tsConfig = {
        baseUrl: 'src',
        paths: {}
    };
    tsConfigs.forEach(
        _tsConfig => {
            if (!!_tsConfig) {
                if (!!_tsConfig.baseUrl) {
                    tsConfig.baseUrl = _tsConfig.baseUrl;
                }
                if (!!_tsConfig.paths) {
                    Object.assign(tsConfig.paths, _tsConfig.paths || {});
                }
            }
        }
    );
    return tsConfig;
}

/**
 * recursively traverse directory structure and call processFile on each file
 *
 * @return obj
 */
function getCommentTemplates() {
    var comments;
    if (fs.existsSync(config.projectPath + '/comments.json')) {
        comments = require(projectPath + '/comments.json');
    } else {
        comments = {
            angular: ['Angular imports', /@angular/]
        }
    }

    if (!comments.application) {
        comments.application = ['Application imports', /^\.\.?\//];
    }
    if (!comments.other) {
        comments.other = ['Other imports', null];
    }
    return comments;
}

/**
 * recursively traverse directory structure and call processFile on each file
 *
 * @param {directory} req
 */
function main(directory) {
    configure(directory);
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
    if (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) {
        fs.readFile(directory + path.sep + fileName, 'utf8', function (error, data) {
            if (!!error) {
                throw error;
            }
            var fileContents = parseInput(data);
            if (data === fileContents) {
                console.log('Imports in ' + directory + path.sep + fileName + ' are ordered, no update necessary');
            } else {
                fs.writeFile(directory + path.sep + fileName, fileContents, function (err) {
                    if (err) {
                        return console.log(err);
                    }
                    console.log('Import statements have been sorted in ' + directory + path.sep + fileName);
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
    //	check and store EOL character
    config.EOLChar = getNewLine(input);
    // split imput and get last import line index
    var lines = input.split(config.EOLChar);
    var importEnd = getImportEnd(lines);
    // get comments, import lines and non-import lines
    config.otherComments = getComments(lines, importEnd);
    if (importEnd === -1) {
        return input;
    } else {
        importLines = pickImportLines(lines, importEnd, importLines).filter(function (importLine) {
            return !!importLine[0].length;
        });
        pickNonImportLines(lines, importEnd + 1, nonImportLines);
        // sort import lines and return concatenated file contents
        importLines = sortImportLines(importLines);
        return importLines.concat(nonImportLines).join(config.EOLChar);
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
        var trimmedLine = lines[i].trim();
        if (trimmedLine.replace(config.EOLChar, '').length && (
            // match 'import '
            trimmedLine.indexOf('import ') === 0 ||
            // match 'export ' when it's not a new declaration
            (
                trimmedLine.indexOf('export ') === 0 &&
                trimmedLine.match(/export\s*([^{}]*\sfrom\s|{)/)
            ) ||
            // match 'from'
            trimmedLine.match(/}\s*from\s*[\'\"].*[\'\"];?$/))
        ) {
            importEnd = i;
            // match PascalCased expression
        } else if (
            trimmedLine.match(/^([A-Z]{1}[a-zA-Z_]*)*,?$/)
        ) {
            // go back to last non-PascalCased line
            var j = i;
            while (!!lines[j] && lines[j].trim().match(/^([A-Z]{1}[a-zA-Z_]*)*,?$/)) {
                j--;
            }
            // if that matches 'import {', update import end
            if (lines[j].match(/(im|ex)port\s*{$/)) {
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
 * @return obj
 */
function getComments(lines, importEnd) {
    var comments = {};
    // loop over import lines and collect comments
    for (var i = 0; i < importEnd + 1; i++) {
        if (lines[i].trim().indexOf('//') === 0) {
            if (
                !Object.keys(config.comments)
                    .map(group => config.comments[group])
                    .some(
                        comment => comment[0].indexOf(lines[i].substring(2).trim()) > -1
                    )
            ) {
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
            comments[i + 1] = commentUnit.join(config.EOLChar);
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
        if (lines[i].trim().match(/(im|ex)port\s*{$/)) {
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
    if (!!nonImportLines.length && !!nonImportLines[0].trim().length) {
        nonImportLines.unshift(config.EOLChar);
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
    var importGroups = {};
    Object.keys(config.comments).forEach(
        group => importGroups[group] = []
    );
    // loop over import lines
    for (var i = 0; i < importLines.length; i++) {
        var localQuote;
        if (!!config.quote) {
            // fix quotation marks
            importLines[i][0] = importLines[i][0].replace(/["']/g, config.quote);
            localQuote = config.quote;
        } else {
            // find line-specific quotation mark
            localQuote = importLines[i][0].search('"') > -1 ? '"' : "'";
        }

        // sort features within and limit their length if necessary
        importLines[i][0] = sortFeatures(importLines[i][0]);
        importLines[i][0] = limitLine(importLines[i][0]);
        // sort them into categories
        var module;
        var sorted = false;
        var quoteSearch = new RegExp(localQuote + '.*' + localQuote);
        if (importLines[i][0].search(quoteSearch) > -1) {
            module = importLines[i][0].match(quoteSearch)[0].replace(/["']/g, "");
        }
        Object.keys(config.comments).forEach(
            group => {
                if (!sorted && !!config.comments[group][1] && !!module.match(config.comments[group][1])) {
                    importGroups[group].push(importLines[i]);
                    sorted = true;
                }
            }
        );
        // if not matched with custom groups
        if (!sorted) {
            // sort into application imports
            if (
                Object.keys(config.ts.paths)
                    .map(p => p.replace('*', ''))
                    .some(p => p.indexOf(module.split(path.sep)[0]) > -1) ||
                checkApplicationPath(module)
            ) {
                importGroups.application.push(importLines[i]);
            // or other imports
            } else {
                importGroups.other.push(importLines[i]);
            }
        }
    }
    // sort lines within categories and add category comment
    Object.keys(config.comments).forEach(function (groupName) {
        if (importGroups[groupName].length) {
            importGroups[groupName].sort(function (a, b) {
                // sort based on non-white-space version of strings & on globally defined sorting options
                return a[0].replace(/\s/g, '').localeCompare(b[0].replace(/\s/g, ''), undefined, config.sortOptions);
            });
            importGroups[groupName].unshift([`//${config.indent}${config.comments[groupName][0]}`, -1]);
        }
    });
    // get an array of import line indices
    var lineNumbers = getLineNumbers(importLines);
    
    // concatenate import groups with readded comments
    var sortedImports = [];
    Object.keys(importGroups).forEach(
        group => sortedImports = [
            ...sortedImports,
            ...importGroups[group].map(function (line) { return readdComment(line, lineNumbers); })
        ]
    );
    return sortedImports;
}


/**
 * Check if import source is within the application
 *
 * @param {url} req
 * @return boolean
 */
function checkApplicationPath(url) {
    var directory = url.substring(0, url.lastIndexOf(path.sep));
    var pathArray;
    if (!directory || !directory.length) {
        pathArray = (config.projectPath + config.ts.baseUrl + path.sep + directory + url + '.ts').split(path.sep);
    } else {
        pathArray = (config.projectPath + config.ts.baseUrl + path.sep + directory).split(path.sep);
    }
    var cleanPathArray = [];
    pathArray.forEach(function (item, index) {
        if (item == '..') {
            cleanPathArray.pop();
        } else if (item != '.') {
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
        features = features.filter(function (feature) {
            return feature.trim().length > 0;
        }).sort(function (a, b) { return a.localeCompare(b, undefined, config.sortOptions) });
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
        var lastImportLineNumber = lineNumbers[lineNumbers.indexOf(line[1]) - 1] || 0;
        for (var i = line[1]; i > lastImportLineNumber; i--) {
            // if comment exists between the two, prepend line with it
            if (!!config.otherComments[i]) {
                line[0] = config.otherComments[i] + config.EOLChar + line[0];
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
    return importLines.map(function (line) {
        return line[1];
    }).sort(function (x, y) {
        return x - y;
    });
}

/**
 * Split line if longer than maximum defined in eslintrc.js
 *
 * @param {line} req
 * @return string
 */
function limitLine(line) {
    if (config.maxLineLength[0] === 'error' && line.length > config.maxLineLength[1].code) {
        line = line
            .replace(/{\s*/, '{' + config.EOLChar + config.indent)
            .replace(/\s*}/, config.EOLChar + '}')
            .replace(/,\s*/g, ',' + config.EOLChar + config.indent);
    }
    return line;
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

module.exports = {
    configure, main, parseInput
};
