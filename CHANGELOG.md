# Changelog

All notable changes to NotebookAwesome are documented here.
This file is generated from [Conventional Commits](https://www.conventionalcommits.org/).

## [0.2.0](https://github.com/royayon/NoteBookAwesome/compare/v0.1.2...v0.2.0) (2026-07-27)


### Features

* add run-sequence data model (parse ranges, resolve hashes, persist in .ipynb) ([62eb4e8](https://github.com/royayon/NoteBookAwesome/commit/62eb4e829e393e9a5a84cec6d2bb6a090b21e5d3))
* run cells in a custom order from named sequences in the nav panel ([5872a48](https://github.com/royayon/NoteBookAwesome/commit/5872a48fe48ed8f421936ffdbfe5102f20dc7645))


### Bug Fixes

* don't show the running sweep for a bulk Clear All Outputs ([768bb4f](https://github.com/royayon/NoteBookAwesome/commit/768bb4f7948776cbf38b53cb7bca7e047bf3c4d2))

## [0.1.2](https://github.com/royayon/NoteBookAwesome/compare/v0.1.1...v0.1.2) (2026-07-27)


### Bug Fixes

* show a left-to-right sweep for every running cell ([ae7a791](https://github.com/royayon/NoteBookAwesome/commit/ae7a791cb4d7c4809b7a8009f21c2a9e8c679b9a))

## [0.1.1](https://github.com/royayon/NoteBookAwesome/compare/v0.1.0...v0.1.1) (2026-07-27)


### Bug Fixes

* derive exec-bar state from execution order, not just success flag ([aebd053](https://github.com/royayon/NoteBookAwesome/commit/aebd05319c04a221e3203489591f713fa9b0f454))

## 0.1.0 (2026-07-23)


### Features

* store cell names/colors in .ipynb metadata for full portability ([eea4b6a](https://github.com/royayon/NoteBookAwesome/commit/eea4b6a60186e9d58bdd7ef2beac2f5c35ffd06d))


### Reverts

* remove jump-to-output from nav panel ([6dbd968](https://github.com/royayon/NoteBookAwesome/commit/6dbd96816158015e24ca27f8b37cda408021ea0a)), closes [vscode#204961](https://github.com/royayon/vscode/issues/204961)
