angular-multimodule-cli will help you create and maintain multiple
npm modules in a single repository.

Why you should use this cli?

Based upon [@ngrx/platform](https://github.com/ngrx/platform) build system.

## Installation

```bash
$ npm i -g angular-multimodule-cli
```

## Get started

```bash
$ ng-multi new my-project
$ cd my-project
$ yarn
$ yarn bootstrap
```

This will create a new project, install all the dependencies and link all the
modules together

## Batteries

* [lerna](https://github.com/lerna/lerna) to manage multiple modules.
* [lint-staged](https://github.com/okonet/lint-staged) linting with tslint and stylelint on staged files.
* [prettier](https://github.com/prettier/prettier) code formatter.
* [jest](https://github.com/facebook/jest) unit test framework.
* [commitizen](https://commitizen.github.io/cz-cli/)  simple commit conventions for internet citizens.

### Angular modules

* Support for css/scss style inline
* Support for html templates inline

## TODO

* [] Choose package manager ( default is yarn )
* [] Create a playground ( maybe based on angularplayground )
* [] Improve README
* [] Ask for modules to create at the start
* [] Add command to create a module on already created project
* [] Add unit tests
* [] Ask for author
* [] Docs generation
