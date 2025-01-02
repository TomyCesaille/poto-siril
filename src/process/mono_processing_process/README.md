# Mono processing process

This is an example of narrowband pre-processing process. The process is broken down into the following steps:

- A pre-manual verification of the darks, flats and biases data.
- A first script to batch the pre-processing, ending with lights aligned+pre-processed.
- From there, do the selection by hand in Siril and reject bad lights data.
- A second batch of script to stack the lights.

## Sheet cheat

```bash
export POTO_ASIAIR_DUMP=/Users/jorislacance/deepsky/dump_astro_2024_08_10_veil-nebula
export POTO_BANK=/Users/jorislacance/deepsky/_bank
export POTO_PROJECT=/Users/jorislacance/deepsky/poto_2024_08_10_veil-nebula

export POTO_SCRIPT_1=src/process/mono_processing_process/1_preprocessing.ssf
export POTO_SCRIPT_3=src/process/mono_processing_process/3_stack_lights.ssf

./poto.sh clean -a $POTO_ASIAIR_DUMP
./poto.sh dispatch -a $POTO_ASIAIR_DUMP -b $POTO_BANK -p $POTO_PROJECT
./poto.sh preprocess -p $POTO_PROJECT -s $POTO_SCRIPT_1

# For each light set, open the sequence and unselect bad lights before stacking lights.
siril $POTO_PROJECT/S/Light_60.0s_Bin1_S_gain100_process/r_pp_light_.seq

./poto.sh preprocess -p $POTO_PROJECT -s $POTO_SCRIPT_3
```
