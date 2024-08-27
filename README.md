# poto-siril

Automatization around Siril (<https://siril.org/>) and ASIAIR for deep sky astrophotography.

## What is it?

Poto-siril is a CLI tool to automate the preprocessing of astrophotography images on top of Siril.

Poto-siril's primary goal is to overcome the repetitive work when preprocessing multiple layers before doing (L)RGB composition (e.g. narrowband filters with monochrome camera or color camera with dual-band filters). It is designed to work with images captured by a ZWO ASIAIR device (or with any `fit` files that follows the same naming convention and directory structure).

### In detail

- **Easy import lights and flats from ASIAIR and search for associated darks and biases in bank folder**
  Import from ASIAIR dump tree structure from one or several night sessions (lights and flats from `autorun` or `plan` mode) and automatically pick the darks and bias needed from the bank folder.
  A summary resumes the light sequence(s) and its calibration files associated.
- **Multi-layers project structure**
  The imported files ☝️ are organized by layers (filter) and light sets (bulb, gain & binning, if there's multiple combinations). Each light set will map to a light sequence in Siril that you preprocess separately.
  👉 You can easily work on a LRGB or LRGBHaOIIISII project.
- **Siril script execution**
  Generates and run a Siril script (`.ssl` file) for each light set to preprocess the images based on a ssl file template and can be customized.
- **A/B testing** (PLANNED)
  Run the (generated ☝️) Siril script with different parameters (e.g. rejection algo, sigma low/high thresholds) and compare the results.
  Or run several different preprocessing scripts and compare the results.

### What it is not doing

Poto-siril does not eliminate bad light images, and everything related to the final processing such as channel compositing, color calibration, background extraction, etc...

## Usage

### The bank folder

The bank folder is where you store your calibration files. Poto-siril searches for darks and biases there. The bank folder does not expect a specific structure as long as files are following the ASIAIR file naming convention. What I recommended is the following structure:

```text
bank
├── Bias_1.0ms_Bin1_gain100_-9.9C_2024
│   ├── Bias_1.0ms_Bin1_L_gain100_20240308-154935_-10.0C_0001.fit
│   ├── Bias_1.0ms_Bin1_L_gain100_20240308-154936_-9.9C_0002.fit
│   └── ...
├── Darks_300.0s_Bin1_gain100_-10C_2024
│   ├── Dark_300.0s_Bin1_L_gain100_20240308-172757_-10.0C_0001.fit
│   ├── Dark_300.0s_Bin1_L_gain100_20240308-160224_-10.0C_0002.fit
│   └── ...
└── ...
```

### First installation

Install [node](https://node.org) latest version and run:

```bash
npm i

# For Unix based systems
chmod +x ./poto.sh
```

Make sure to have `siril` registered in your PATH.

```bash
siril -v
# Should print `siril 1.2.3`.
```

### CLI commands

```bash
export POTO_ASIAIR_DUMP=/Users/jorislacance/_joris/outofsync/deepsky/dump_astro_2024_08_10_veil-nebula

# Drop thumbnails from the ASIAIR dump folder.
./poto.sh clean -a $POTO_ASIAIR_DUMP

# Import lights to project, grouped per filter, and then light sets (bulb, gain & binning) with the related calibration files (flats, darks and biases).
export POTO_BANK=/Users/jorislacance/_joris/outofsync/deepsky/_bank
export POTO_PROJECT=/Users/jorislacance/_joris/outofsync/deepsky/2024_08_10_veil-nebula
./poto.sh dispatch -a $POTO_ASIAIR_DUMP -b $POTO_BANK -p $POTO_PROJECT -m autorun

# Process each light set based on a Siril script template.
export POTO_SCRIPT_TEMPLATE=src/process/mono_processing_process/1_preprocessing.ssf
./poto.sh preprocess -p $POTO_PROJECT -s $POTO_SCRIPT_TEMPLATE
```

### Full preprocess example

See [src/process/mono_processing_process/README.md](src/process/mono_processing_process/README.md) for a full example of a preprocessing process.

### Create your own process

You can easily create your own process by following the example of the [mono_processing_process](src/process/mono_processing_process) process.

Compared to regular Siril, the script must be using absolute paths for the input files. The script template will be a `.ssf` file that can contains the following directory path variables, that are being replaced by the actual values during the runtime for each light set:

```text
# Variables:
#   biases: {{biases}}
#   flats: {{flats}}
#   darks: {{darks}}
#   lights: {{lights}}
#   process: {{process}}
#   masters: {{masters}}
```

## Documentation

### Dispatch

The ASIAIR directory structure is as follows:

```text
root directory of ASIAIR
├── Autorun
│   ├── Flat
|      ├── Flat_1.0ms_Bin1_B_gain100_20240511-094304_-10.5C_0001.fit
│      └── ...
│   ├── Light
|      ├── {target}
|         ├── Light_91 Piscium_10.0s_Bin1_L_gain360_20240320-203324_-10.0C_0001.fit
│         └── ...
└── ...
```

Poto project, once imported, will be broke down into the following directory structure:

```text
poto project root directory
├── S    👈 Directory for each filter.
│   ├── Light_FOV_10.0s_Bin1_S_gain100    👈 Sub directory for each BIN-GAIN-BULB combination.
|      ├── Light_FOV_10.0s_Bin1_S_gain100_20240320-203324_-10.0C_0001.fit
│      └── ...
│   ├── Flat_1.0ms_Bin1_S_gain100
|      ├── Flat_1.0ms_Bin1_S_gain100_20240320-233122_-10.5C_0001.fit
│      └── ...
├── H
├── O
├── ...
└── any    👈 Biases & darks falls here. lights & flats too if no filter.
```

S, H, O are the filters names from the ASIAIR > Filter Wheel settings.

## Side Notes

[Sirilic and Sirilot](https://siril.org/2018/11/sirilic-and-sirilot-two-very-useful-utilities-for-siril/) are two other tools that can be used to automate Siril. This project is another take that emphasize lazyness of manipulating files in the file system, the love of Siril Scripting and A/B testing.
