import { mount } from './app.js';
import { unavailableSource } from './session-source.js';

mount(document.getElementById('app'), unavailableSource());
