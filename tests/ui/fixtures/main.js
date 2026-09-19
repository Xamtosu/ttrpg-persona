import { mount } from '/js/app.js';
import { fixtureSource } from './source.js';

const source = fixtureSource(text => { document.getElementById('fixture-status').textContent = text; });
const dispose = mount(document.getElementById('app'), source);
document.getElementById('scenario').addEventListener('change', event => source.scenario(event.target.value));
document.getElementById('command-mode').addEventListener('change', event => source.setMode(event.target.value));
document.getElementById('release').addEventListener('click', () => source.release());
document.getElementById('append').addEventListener('click', () => source.append());
document.getElementById('refresh-source').addEventListener('click', () => source.refreshNotes());
window.addEventListener('pagehide', dispose, { once: true });
