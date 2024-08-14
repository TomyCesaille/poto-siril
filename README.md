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

npx ts-node src/poto-siril.ts dispatch -p src/tests/data/project1 -a src/tests/data/asiair-dump1 -b /Users/jorislacance/_joris/outofsync/deepsky/_bank -m autorun


npx ts-node src/poto-siril.ts dispatch -p /Users/jorislacance/_joris/outofsync/deepsky/2024_08_10_veil-nebula -a /Users/jorislacance/_joris/outofsync/deepsky/dump_astro_2024_08_10_veil-nebula -b /Users/jorislacance/_joris/outofsync/deepsky/_bank -m autorun
```

### Preprocess

```bash
npx ts-node src/poto-siril.ts preprocess src/tests/data/project1
npx ts-node src/poto-siril.ts preprocess /Users/jorislacance/_joris/outofsync/deepsky/2024_08_10_veil-nebula
```

### Notes

Read <https://siril.org/docs/sirilic/>, some ideas here.
