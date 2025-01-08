# Mono processing pipeline

This is an example of narrowband pre-processing.

## Step 1

```bash
# Setup the context.
export POTO_ASIAIR_DUMP=/Users/jorislacance/deepsky/dump_astro_2024_08_10_veil-nebula
export POTO_BANK=/Users/jorislacance/deepsky/_bank
export POTO_PROJECT=/Users/jorislacance/deepsky/poto_2024_08_10_veil-nebula

# Prepare the project.
./poto.sh prepare -i $POTO_ASIAIR_DUMP -i $POTO_BANK $POTO_PROJECT
```

## Step 2

```bash
./poto.sh preprocess -t Mono_Preprocessing.ssf $POTO_PROJECT
```

## Step 3

For each light set:

1. Load the light sequence `${filter}/${light_set}_process/r_pp_light_.seq` in siril.
2. Open the frame list panel (<https://siril.readthedocs.io/en/stable/Sequences.html#frame-selector>).
3. Unselect bad lights, to avoid stacking them in the next step.

```bash
# Could also be opened with:
siril $POTO_PROJECT/S/Light_X_Y_Z_process/r_pp_light_.seq
```

## Step 4

```bash
./poto.sh preprocess -t Mono_Preprocessing_Stack_Filtered_Lights.ssf $POTO_PROJECT
```
