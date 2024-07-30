# poto siril

Tools to process deep sky data.

## Get started

```bash
npm i
```

### Clean Thumbnails from ASIAIR

// TODO. redo this

```bash
npx ts-node ./src/clean-thumbnails.ts /Users/jorislacance/_joris/outofsync/deepsky/dump_astro_July_2024_session_1
```

### Dispatch from ASIAIR

```bash
npx ts-node src/poto-siril.ts dispatch -p src/tests/data/project1 -a src/tests/data/asiair-dump1 -b src/tests/data/bank -m autorun
```
