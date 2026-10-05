import { registerCartridge } from '../registry';
import { COMMUNICATIONS_CARTRIDGE_MANIFEST } from './manifest';

registerCartridge(COMMUNICATIONS_CARTRIDGE_MANIFEST);

export { COMMUNICATIONS_CARTRIDGE_MANIFEST } from './manifest';
export * from './contracts';
