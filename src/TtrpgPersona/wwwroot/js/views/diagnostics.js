import { escapeHtml as h, label, button, replaceContent } from '../dom.js';
import { formatNumber } from '../i18n.js';

export function createDiagnostics(node, app) {
    node.innerHTML = `<div class="workspace-intro"><p>${label('diagnosticsSubtitle')}</p></div><nav class="knowledge-tabs" data-label="diagnostics">${button('usageTab', 'data-diagnostic="usage"')}${button('connectionsTab', 'data-diagnostic="connections"')}</nav><div id="diagnostics-content"></div>`;
    return { update() {
        node.querySelectorAll('[data-diagnostic]').forEach(control => control.setAttribute('aria-pressed', String(control.dataset.diagnostic === app.state.diagnostics)));
        let content;
        if (app.state.diagnostics === 'connections') {
            content = `<p class="muted">${label('connectorsIntro')}</p><div class="connector-grid">${['stt', 'llm', 'tts'].map(kind => {
                const config = app.snapshot.connectors[kind];
                const fields = [['adapter', 'providerAdapter'], ['endpoint', 'apiEndpoint'], ['model', 'model'], ['project', 'projectOptional'], ...(kind === 'stt' ? [['language', 'recognitionLanguage']] : kind === 'tts' ? [['voice', 'voiceId']] : [])];
                return `<article class="panel connector-card"><div class="panel-head"><h3>${label(`connector_${kind}`)}</h3><span class="tag">${label(config?.connected ? 'connected' : 'notConnected')}</span></div><dl>${fields.map(([key, text]) => `<div class="connector-value"><dt>${label(text)}</dt><dd>${h(config?.[key] || null)}</dd></div>`).join('')}<div class="connector-value"><dt>${label('apiKey')}</dt><dd>${label(config?.credentialConfigured ? 'configured' : 'notConfigured')}</dd></div></dl><div class="connector-actions">${button('configure', `data-edit="connector:${kind}"`)}${button('testConnection', 'disabled')}</div></article>`;
            }).join('')}</div><p class="connector-note">${label('credentialUnavailable')}</p>`;
        } else {
            const d = app.snapshot.diagnostics;
            const money = value => formatNumber(app.state, value, { style: 'currency', currency: 'USD', maximumFractionDigits: 3 });
            const time = value => value == null ? '—' : `${formatNumber(app.state, value, { maximumFractionDigits: 1 })} ${app.t('seconds')}`;
            content = `<div class="diagnostic-metrics">${[['total', money(d?.total)], ['lastTurn', money(d?.lastTurn)], ['budgetLimit', money(d?.budget)], ['firstSpeech', time(d?.firstSpeech)]].map(([key, value]) => `<div class="metric"><span class="micro">${label(key)}</span><div class="value">${h(value)}</div></div>`).join('')}</div><p class="micro">${label(d?.estimated ? 'estimatedUsage' : 'unknownCosts')}</p><div class="grid-main"><section class="panel"><h3>${label('stageTiming')}</h3><div class="stage-bar">${d?.stages.map(seconds => `<span style="width:${100 * seconds / d.stages.reduce((sum, value) => sum + value, 0)}%"></span>`).join('') ?? ''}</div><div class="stage-key">${['finalizationStage', 'generationStage', 'speechStage'].map((key, i) => `<span>${label(key)} ${h(time(d?.stages[i]))}</span>`).join('')}</div></section><section class="panel soft"><h3>${label('usageBreakdown')}</h3><table class="spec-table"><thead><tr><th>${label('component')}</th><th>${label('cost')}</th></tr></thead><tbody>${['transcriptionCost', 'generationCost', 'speechCost', 'summaryCost'].map((key, i) => `<tr><td>${label(key)}</td><td>${h(money(d?.breakdown[i]))}</td></tr>`).join('')}</tbody></table></section></div><section class="panel"><h3>${label('requestHistory')}</h3><div class="table-wrap"><table class="spec-table"><thead><tr><th>${label('requestId')}</th><th>${label('provider')}</th><th>${label('duration')}</th><th>${label('cost')}</th></tr></thead><tbody>${(d?.requests ?? []).map(row => `<tr><td>${h(row.id)}</td><td>${h(row.adapter)}</td><td>${h(time(row.seconds))}</td><td>${h(money(row.cost))}</td></tr>`).join('')}</tbody></table></div></section>`;
        }
        replaceContent(node.querySelector('#diagnostics-content'), content);
    } };
}
