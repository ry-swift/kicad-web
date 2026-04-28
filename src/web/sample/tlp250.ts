import tlp250Source from '../../../tlp250.kicad_sym?raw';
import { parseKicadSymbolLibrary, toSymbolLibraryIR } from '../../kicad/index.js';

export const tlp250Library = parseKicadSymbolLibrary(tlp250Source);
export const tlp250IR = toSymbolLibraryIR(tlp250Library);
