# Sort import statements in Angular projects

This module sorts import and export statements alphabetically in your `.ts` files.

## Configuration

In `comments.json`, you can define groups, i.e. associations between custom comment strings and regular expressions to search for in the `from` part of your import statements. E.g.:

```json
{
    "definitions": ["TypeScript definitions", /\.d(\.ts)?$/],
    "group2": ["Some other comment inserted before another group of imports", /other regex that defines other group/i],
    ...
}
```

These pairs, together with two overridable default groups (`application` and `other` imports), are used to keep groups of import statements together.

Application paths are checked against the `baseUrl` and the `paths` definition specified in the `tsconfig`. If no base is provided, it defaults to `src`.

In order to format sorted imports properly, an `eslintrc` file at the project root is parsed for the `indent` rule.  If `eslint` specifies also the type of quotation marks, these are fixed during the sorting process.

## Run

Run `npm run sort-import [path/to/target]` from the application root.

The target can be either a file or all files in a directory. In the latter case, the parser will look for .ts files recursively under the specified path.

## Autorun

You can also bind `sort-import` to your code editor's save hook.

- For Atom, use [save-autorun](https://atom.io/packages/save-autorun).
Create or edit `.save.cson` at your application root and add the following line:

`"**/*.ts" : "npm run sort-import ${dir}/${file}"`  

- For Visual Studio Code, use [Save and Run](https://marketplace.visualstudio.com/items?itemName=wk-j.save-and-run).
Go to Preferences -> Open Settings (JSON) and add the following configuration in curly braces:

```javascript
"saveAndRun": {
    "commands": [
        {
            "match": "\\.ts$",
            "cmd": "npm run sort-import ${file}"
        }
    ]
}
```

## Note

Block comments starting/ending inline are currently not supported. Avoid the following code format with `sort-import`:

```javascript
import { A } from 'a-module'; /* here starts
the comment; and
it ends here */ import { B } from 'b-module';
```
