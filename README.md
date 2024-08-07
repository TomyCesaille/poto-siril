# poto siril

Tools to process deep sky data.

## Get started

```bash
npm i
```

### Clean Thumbnails from ASIAIR

// TODO. redo this

```bash
npx ts-node src/poto-siril.ts clean /Users/jorislacance/_joris/outofsync/deepsky/dump_astro_July_2024_session_2
```

### Dispatch from ASIAIR

```bash
npx ts-node src/poto-siril.ts dispatch -p src/tests/data/project1 -a src/tests/data/asiair-dump1 -b src/tests/data/bank -m autorun
```
