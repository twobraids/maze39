# fx-maze

[![Build Status](https://travis-ci.org/lmorchard/fx-maze.svg?branch=master)](https://travis-ci.org/lmorchard/fx-maze)

this would like to be a-maze-ing

## hacking

Make sure you have Node.js v6

```
git clone https://github.com/lmorchard/fx-maze.git
npm install
npm run dev
open http://localhost:9000
```

## deployment

The main repo ([lmorchard/fx-maze](https://github.com/lmorchard/fx-maze/))
should automatically build & deploy via Travis-CI to [gh-pages](https://lmorchard.github.io/fx-maze/)
on pushes to the master branch.

Manual deployment to a local gh-pages branch looks like this:
```
gulp build
gulp deploy
```
