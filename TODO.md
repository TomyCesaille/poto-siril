# TODO

A lot of false promises here.

## Smalls

- [ ] filter darks by temperature.
We should pick darks with the same temperature as the lights. More of less 3°C is probably a good window.
- [ ] create the Siril sequence with the pre-processed layers.
Would be creating a folder `composition`, with the `result_S.fit`, `result_H.fit`, `result_O.fit` etc... files and create the Siril sequence.
To think of that as part of a poto-siril process with a script template, so it's customizable (pre-register + align the images for instance...)
- [ ] improve lights - flats matching
Detect if there's multiple flats sequences (by looking at the files date and/or sequence number). If multiple, ask the user about the associations we should do. For Newton telescopes that can't stay collimated 2 consecutives nights ¯\\_(ツ)_/¯.
- [ ] option to dispatch using symbolic links.

## Epics

- [ ] A/B testing
We will bring an UI for this? A/B testing just from fit stats (e.g noise value).
- [ ] Console assistant that get you through the whole adventure
