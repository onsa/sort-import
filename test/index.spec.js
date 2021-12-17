var fs = require('fs');
var expect = require('chai').expect;
var configure = require('../src/index.js').configure;
var parseInput = require('../src/index.js').parseInput;

describe('Parsing', () => {
    it('should sort import lines properly', () => {
        configure(__dirname + '/test-file.1.ts', 'utf8');
        var test = fs.readFileSync(__dirname + '/test-file.1.ts', 'utf8');
        var result = fs.readFileSync(__dirname + '/result-file.1.ts', 'utf8');
        expect(parseInput(test)).to.equal(result);
    });

    it('should sort export lines properly', () => {
        configure(__dirname + '/test-file.1.ts', 'utf8');
        var test = fs.readFileSync(__dirname + '/test-file.2.ts', 'utf8');
        var result = fs.readFileSync(__dirname + '/result-file.2.ts', 'utf8');
        expect(parseInput(test)).to.equal(result);
    });
});
