'use strict';
// Testes do adaptador do Jev para o Claude Code, com API do Jev simulada
// (nenhuma chamada externa, nenhuma chave real).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { summarizeLastTurn } = require('./jev-claude-usage.cjs');

const HOOK = path.join(__dirname, 'jev-claude-hook.cjs');

function startMockJev() {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      calls.push({ url: req.url, auth: req.headers.authorization || '', body });
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({
        model: 'jev-mock',
        usage: { input_tokens: 700, output_tokens: 190 },
        answers: {
          especialista_tone: { type: 'choice', choice: 'kastiel_dev', confidence: 0.95, probabilities: { kastiel_dev: 0.95, ana_ui_ux: 0.05 } },
          tipo_tarefa: { type: 'choice', choice: 'bugfix_urgente', confidence: 0.9, probabilities: { bugfix_urgente: 0.9, nova_feature: 0.1 } },
          toca_producao: { type: 'noul', noul: 0.2 },
          requer_testes_reais: { type: 'noul', noul: 0.7 },
          severidade: { type: 'score', score: 1.1, confidence: 0.9, probabilities: { 0: 0.05, 1: 0.9, 2: 0.05 } },
        },
      }));
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => {
    resolve({ server, calls, baseUrl: `http://127.0.0.1:${server.address().port}` });
  }));
}

function runHook(stdin, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [HOOK], { env: { ...process.env, ...env }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (chunk) => { out += chunk; });
    child.on('close', (code) => resolve({ code, out: out.trim() }));
    child.stdin.end(stdin);
  });
}

function events(dir) {
  const file = path.join(dir, 'jev-hook-events.jsonl');
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse) : [];
}

test('adaptador do Claude Code: injeta a diretiva no formato oficial e registra', async () => {
  const mock = await startMockJev();
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jev-claude-'));
  const env = {
    TYPESAFE_API_KEY: 'chave-de-teste',
    JEV_API_BASE_URL: mock.baseUrl,
    JEV_TRANSPORT: 'rest',
    JEV_METRICS_DIR: dir,
    JEV_STATE_DIR: dir,
    JEV_SKIP_DOTENV: '1',
    JEV_CLAUDE_DISABLE: '',
  };
  try {
    const input = { session_id: 's1', prompt_id: 'p1', hook_event_name: 'UserPromptSubmit', user_input: 'corrigir a busca no celular' };
    const injected = await runHook(JSON.stringify(input), env);
    assert.equal(injected.code, 0);
    const output = JSON.parse(injected.out);
    assert.equal(output.hookSpecificOutput.hookEventName, 'UserPromptSubmit');
    assert.match(output.hookSpecificOutput.additionalContext, /Kastiel/);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].auth, 'Bearer chave-de-teste');

    // Variante com o campo "prompt"; mesmo texto em outro pedido volta a ser roteado.
    const again = await runHook(JSON.stringify({ ...input, prompt_id: 'p2', user_input: undefined, prompt: input.user_input }), env);
    assert.match(JSON.parse(again.out).hookSpecificOutput.additionalContext, /Kastiel/);
    assert.equal(mock.calls.length, 2);

    const disabled = await runHook(JSON.stringify({ ...input, prompt_id: 'p3' }), { ...env, JEV_CLAUDE_DISABLE: '1' });
    assert.equal(disabled.code, 0);
    assert.equal(disabled.out, '');
    assert.equal(mock.calls.length, 2);

    const noKey = await runHook(JSON.stringify({ ...input, prompt_id: 'p4' }), { ...env, TYPESAFE_API_KEY: '' });
    assert.equal(noKey.code, 0);
    assert.equal(noKey.out, '');

    const broken = await runHook('isto não é json', env);
    assert.equal(broken.code, 0);
    assert.equal(broken.out, '');

    const reasons = events(dir).filter((e) => e.client === 'claude-code').map((e) => e.reason);
    assert.deepEqual(reasons, ['injected', 'injected', 'disabled', 'missing_api_key', 'stdin_not_json']);
    const first = events(dir)[0];
    assert.equal(first.leader, 'kastiel_dev');
    assert.equal(first.inputTokens, 700);
    assert.equal(JSON.stringify(events(dir)).includes('corrigir a busca'), false, 'o texto do pedido não vai para o log');
  } finally {
    mock.server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('medição de tokens: soma só o último turno e não repete a mesma resposta', () => {
  const line = (obj) => JSON.stringify(obj);
  const lines = [
    line({ type: 'user', promptId: 'old', message: { role: 'user', content: 'pedido antigo' } }),
    line({ type: 'assistant', message: { id: 'm0', model: 'claude-x', usage: { input_tokens: 999, output_tokens: 999 } } }),
    line({ type: 'user', promptId: 'p9', message: { role: 'user', content: [{ type: 'text', text: 'pedido novo' }] } }),
    line({ type: 'assistant', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 10, cache_read_input_tokens: 100, cache_creation_input_tokens: 5, output_tokens: 20 } } }),
    line({ type: 'assistant', message: { id: 'm1', model: 'claude-x', usage: { input_tokens: 10, cache_read_input_tokens: 100, cache_creation_input_tokens: 5, output_tokens: 20 } } }),
    line({ type: 'user', promptId: 'p9', message: { role: 'user', content: [{ type: 'tool_result', content: 'ok' }] } }),
    line({ type: 'assistant', message: { id: 'm2', model: 'claude-x', usage: { input_tokens: 1, cache_read_input_tokens: 200, output_tokens: 30 } } }),
  ];
  assert.deepEqual(summarizeLastTurn(lines), {
    promptId: 'p9', model: 'claude-x', input: 11, cacheCreation: 5, cacheRead: 300, output: 50, apiCalls: 2,
  });
});
