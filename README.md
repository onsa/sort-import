
# Sort import statements for Angular2+ projects

This module sorts import statements alphabetically.

## Configuration

Import statements are sorted into three categories (angular, application and thirs party) based on the source path. Application paths are checked against the `baseUrl` specified in the `tsconfig.json` found at the application root. If no base is provided, it defaults to `src/app`.

In order to format sorted imports properly, a `tslint.json` file at the project root is parsed for the `indent` rule. In case of `space` indentation, the default length is 2. This can be overridden by a third value in the rule array as described by [TSLint](https://palantir.github.io/tslint/rules/indent/).

## Run

- Run `npm run sort-import [path/to/target]` from the application root.

The target can be either a file or all files in a directory. In the latter case, the parser will look for .ts files recursively under the specified path.

## Autorun

You can also bind `sort-import` to your code editor's save hook.

- For Atom, use [save-autorun](https://atom.io/packages/save-autorun).
Create or edit `.save.cson` at your application root and add the following line:

`"**/*.ts" : "npm run sort-import ${dir}/${file}"`  

- For Visual Studio, see [Run on Save](https://marketplace.visualstudio.com/items?itemName=emeraldwalk.RunOnSave).

## Note

Block comments starting/ending inline are currently not supported. Avoid the following code format with `sort-import`:

```javascript
import { A } from 'a-module'; /* here starts
the comment; and
it ends here */ import { B } from 'b-module';
```
