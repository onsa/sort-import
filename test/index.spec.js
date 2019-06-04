var fs = require('fs');
const expect = require('chai').expect;
const parseInput = require('../src/index.js').parseInput;

describe('Parsing', () => {
    it('should sort import lines properly', () => {
        var test = fs.readFileSync(__dirname + '/test-file.1.ts', 'utf8');
        var result = fs.readFileSync(__dirname + '/result-file.1.ts', 'utf8');
        expect(parseInput(test)).to.equal(result);
    });

    it('should sort export lines properly', () => {
        var test = fs.readFileSync(__dirname + '/test-file.2.ts', 'utf8');
        var result = fs.readFileSync(__dirname + '/result-file.2.ts', 'utf8');
        expect(parseInput(test)).to.equal(result);
    });
});
