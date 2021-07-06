import * as path from 'path';
import { LocalStore } from '../../../src/store';

export const fixtureStore = new LocalStore(path.join(__dirname, '../../fixtures'));