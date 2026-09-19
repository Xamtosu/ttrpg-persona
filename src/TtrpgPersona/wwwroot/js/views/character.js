import { escapeHtml as h, label, field, editButton, button, replaceContent } from '../dom.js';

export function createCharacter(node, app) {
    node.innerHTML = `<div class="workspace-intro"><p>${label('characterSubtitle')}</p>${button('editSection', 'data-edit="identity"')}</div><div class="grid-main character-layout"><div><section class="panel"><div class="panel-head"><h3>${label('identity')}</h3></div><div id="identity-fields" class="field-grid identity-fields"></div><div id="stats" class="stats"></div><div id="vitals" class="character-vitals"></div><p class="inline-validation" id="sheet-validation" role="status"></p>${button('discardDrafts', 'id="discard-sheet"', 'small')}</section><div class="sheet-lists"><section class="panel"><div class="panel-head"><h3>${label('skillsSaves')}</h3>${editButton('skills')}</div><div id="skills-content"></div></section><section class="panel"><div class="panel-head"><h3>${label('inventory')}</h3></div><ul id="inventory" class="inventory-list"></ul><button class="app-button inventory-add" data-edit="addItem">+ ${label('addItem')}</button></section></div><section class="panel spells-panel"><div class="panel-head"><h3>${label('spells')}</h3>${editButton('spells')}</div><div id="spells"></div></section></div><aside><section class="panel soft"><div class="panel-head"><h3>${label('currentState')}</h3>${editButton('resources')}</div><dl id="resources"></dl></section><section class="panel"><div class="panel-head"><h3>${label('features')}</h3>${editButton('features')}</div><p class="prose" id="features"></p></section></aside></div>`;
    node.querySelector('#identity-fields').innerHTML = `<div id="character-name" class="field"></div>${['className', 'level'].map(key => `<div class="field"><label class="field-label" for="sheet-${key}">${label(key === 'className' ? 'class' : key)}</label><input id="sheet-${key}" class="sheet-input" data-sheet="${key}" type="text" ${key === 'level' ? 'inputmode="numeric"' : ''}></div>`).join('')}<div id="origin" class="identity-origin"></div><div id="appearance" class="identity-appearance"></div>`;
    async function applyInline(input) {
        const key = input.dataset.sheet;
        const draft = app.state.drafts.get(key);
        if (!draft || !app.editable('editCharacter')) return;
        const value = draft.value.trim();
        draft.error = !value ? 'requiredText' : key === 'level' && (!/^\d+$/.test(value) || Number(value) < 1 || !Number.isSafeInteger(Number(value))) ? 'positiveLevel' : null;
        if (draft.error) { app.refresh(); return; }
        const result = await app.execute({ type: 'editCharacter', section: 'identity', values: { [key]: key === 'level' ? Number(value) : value } });
        if (app.state.drafts.get(key) === draft) {
            if (result.ok) app.state.drafts.delete(key);
            else draft.error = result.code;
        }
        app.refresh();
    }
    node.addEventListener('input', event => {
        if (!event.target.dataset.sheet) return;
        app.state.drafts.set(event.target.dataset.sheet, { value: event.target.value, error: null });
        app.refreshHeader();
    });
    node.addEventListener('focusout', event => { if (event.target.dataset.sheet) applyInline(event.target); });
    node.addEventListener('keydown', event => {
        if (!event.target.dataset.sheet) return;
        if (event.key === 'Enter') { event.preventDefault(); applyInline(event.target); }
        if (event.key === 'Escape' && !app.state.pending.has('editCharacter')) { app.state.drafts.delete(event.target.dataset.sheet); app.refresh(); }
    });
    node.querySelector('#discard-sheet').addEventListener('click', () => { app.state.drafts.clear(); app.refresh(); });
    node.addEventListener('click', event => {
        const control = event.target.closest('[data-inventory-action]');
        if (control && !control.disabled) app.execute({ type: 'changeInventory', id: control.dataset.item, action: control.dataset.inventoryAction });
    });
    return { update() {
        const c = app.snapshot.character;
        node.querySelector('#character-name').innerHTML = field('name', c?.name);
        for (const key of ['className', 'level']) {
            const input = node.querySelector(`[data-sheet="${key}"]`);
            const value = app.state.drafts.get(key)?.value ?? String(c?.[key] ?? '');
            if (input.value !== value) input.value = value;
            input.disabled = !app.editable('editCharacter');
            input.setAttribute('aria-invalid', String(!!app.state.drafts.get(key)?.error));
        }
        node.querySelector('#sheet-validation').textContent = [...app.state.drafts.values()].filter(draft => draft.error).map(draft => app.t(draft.error)).join(' ');
        node.querySelector('#discard-sheet').hidden = app.state.drafts.size === 0;
        node.querySelector('#discard-sheet').disabled = app.state.pending.has('editCharacter');
        node.querySelector('#origin').innerHTML = field('originAppearance', c?.origin);
        node.querySelector('#appearance').innerHTML = field('description', c?.appearance);
        node.querySelector('#stats').innerHTML = ['str', 'dex', 'con', 'int', 'wis', 'cha'].map((key, i) => `<div class="stat">${label(key)}<strong>${h(c?.stats[i])}</strong></div>`).join('');
        node.querySelector('#vitals').innerHTML = field('hp', c ? `${c.hp} / ${c.maxHp}` : null) + field('ac', c?.ac) + field('speed', c?.speed);
        node.querySelector('#skills-content').innerHTML = ['skills', 'saves'].map(key => `<h4 class="list-subtitle">${label(key === 'saves' ? 'savingThrows' : key)}</h4><ul class="skill-list">${(c?.[key] ?? ['—']).map(item => `<li>${h(item)}</li>`).join('')}</ul>`).join('');
        replaceContent(node.querySelector('#inventory'), (c?.inventory ?? []).map(item => `<li class="inventory-row" data-item-id="${h(item.id)}"><span class="inventory-name">${h(item.name)}</span><div class="quantity-stepper"><button data-focus="decrease-${h(item.id)}" data-inventory-action="decrease" data-item="${h(item.id)}" aria-label="${h(app.t('decreaseQuantity') + ' ' + item.name)}" ${app.editable('changeInventory') && item.quantity > 0 ? '' : 'disabled'}>−</button><output>${h(item.quantity)}</output><button data-focus="increase-${h(item.id)}" data-inventory-action="increase" data-item="${h(item.id)}" aria-label="${h(app.t('increaseQuantity') + ' ' + item.name)}" ${app.editable('changeInventory') ? '' : 'disabled'}>+</button></div><button class="item-remove" data-focus="remove-${h(item.id)}" data-inventory-action="remove" data-item="${h(item.id)}" ${app.editable('changeInventory') ? '' : 'disabled'}>${label('remove')}</button></li>`).join('') || `<li class="muted">${label('emptyInventory')}</li>`);
        node.querySelector('#spells').innerHTML = (c?.spellGroups ?? [{ level: 0, names: [] }, { level: 1, names: [] }]).map(group => `<section class="spell-level"><div class="spell-level-head"><h4>${label(group.level ? 'spellLevel' : 'cantrips')} ${group.level || ''}</h4><span class="badge">${group.level ? `${app.t('slots')} ${h(group.remaining)} / ${h(group.total)}` : app.t('noSlotRequired')}</span></div><ul class="spell-list">${group.names.length ? group.names.map(name => `<li>${h(name)}</li>`).join('') : `<li class="muted">${label(group.level ? 'noSpells' : 'noCantrips')}</li>`}</ul></section>`).join('');
        node.querySelector('#resources').innerHTML = ['resources', 'conditions', 'effects'].map(key => `<div class="definition-row"><dt>${label(key === 'effects' ? 'temporaryEffects' : key)}</dt><dd>${h(c?.[key])}</dd></div>`).join('');
        node.querySelector('#features').textContent = c?.features ?? '—';
    } };
}
