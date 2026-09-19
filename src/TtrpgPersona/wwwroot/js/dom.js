export const escapeHtml = value => String(value ?? '—').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
})[char]);

export const label = key => `<span data-i="${key}"></span>`;
export const button = (key, attributes = '', classes = '') => `<button class="app-button ${classes}" ${attributes}>${label(key)}</button>`;
export const field = (key, value) => `<div class="field"><span class="field-label">${label(key)}</span><div class="field-box">${escapeHtml(value)}</div></div>`;
export const editButton = target => button('edit', `data-edit="${escapeHtml(target)}"`, 'small');

export function replaceContent(node, html) {
    const focused = node.contains(document.activeElement) ? document.activeElement : null;
    const identity = focused?.hasAttribute('data-focus') ? 'focus' : 'edit';
    const key = focused?.dataset[identity];
    const start = focused?.selectionStart;
    const end = focused?.selectionEnd;
    const top = node.scrollTop;
    node.innerHTML = html;
    if (key) {
        const replacement = [...node.querySelectorAll(`[data-${identity}]`)].find(item => item.dataset[identity] === key);
        if (replacement) {
            replacement.focus({ preventScroll: true });
            if (typeof start === 'number' && replacement.type !== 'number') replacement.setSelectionRange(start, end);
        }
    }
    node.scrollTop = top;
}
