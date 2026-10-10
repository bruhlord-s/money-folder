# Changelog

## 0.1.0 (2026-10-10)


### Features

* add accounts with owners and tags ([39c5fac](https://github.com/bruhlord-s/money-folder/commit/39c5fac0ae185229a5b541a5418b297b556cc4fc))
* add expenses with receipt lines and products ([ec2399f](https://github.com/bruhlord-s/money-folder/commit/ec2399f98130daceb4e377f1322e0ea8ad6ed0e4))
* add income and transfer transactions with local dates ([96ea2cd](https://github.com/bruhlord-s/money-folder/commit/96ea2cd3ffb894c38f039b30e49e11b425796a4b))
* add logging with electron-log ([#10](https://github.com/bruhlord-s/money-folder/issues/10)) ([78e5e64](https://github.com/bruhlord-s/money-folder/commit/78e5e64280be699454ab1acce32e78d19e598819))
* add the app icon ([adbc0cc](https://github.com/bruhlord-s/money-folder/commit/adbc0cc8c63360945ed9dc9c6daeb43c1ebaab39))
* back up the database before pending migrations ([0ab50ef](https://github.com/bruhlord-s/money-folder/commit/0ab50ef120e3332edcd54afedeb319edeb2d827a))
* maximize the main window on start ([917a560](https://github.com/bruhlord-s/money-folder/commit/917a560430738b63b81904e357c98eb61cf9b93e))
* set up SQLite database with Drizzle ([#9](https://github.com/bruhlord-s/money-folder/issues/9)) ([5a94f61](https://github.com/bruhlord-s/money-folder/commit/5a94f611f31b18f2b1caab20fb406d3a91c92808))
* translate the main process's own strings ([b13b3c2](https://github.com/bruhlord-s/money-folder/commit/b13b3c2afbd18ad23a51ad8e00d6b6c1e3a4e74d))


### Bug Fixes

* harden account form inputs and list reloads ([d6118a6](https://github.com/bruhlord-s/money-folder/commit/d6118a60f647e6d04f0f25b450bb52163ad3e9f7))
* harden the renderer window and IPC ([ec4f933](https://github.com/bruhlord-s/money-folder/commit/ec4f933171cb95e46bcbf4a43a48cc05b54d8486))
* keep line quantity on edit and list lines without an id list ([027dc4d](https://github.com/bruhlord-s/money-folder/commit/027dc4dc32f7cbe14082da592deecb1c063c23c5))
* log and show the cause of startup errors ([175348a](https://github.com/bruhlord-s/money-folder/commit/175348acae5fd2587f16e725e3983a39b89f19b9))
* refuse new transactions on archived accounts ([f1e3763](https://github.com/bruhlord-s/money-folder/commit/f1e37632a66a712fd6f975928c9974a79342d40f))
