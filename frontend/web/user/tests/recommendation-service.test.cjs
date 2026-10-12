const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual service/JSON mapper, replacing only the HTTP transport.
// No browser session or live API writes are used by these regression tests.
function serviceFor(payload) {
  const filename = path.resolve(__dirname, '../src/services/recommendation.service.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  });
  const module = { exports: {} };
  const response = async () => ({ data: { data: payload } });
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require(id) {
      if (id === './api.client') return { authenticatedApiClient: { get: response, post: response, put: response, delete: response } };
      if (id === 'axios') return require('axios');
      throw new Error(`Unexpected dependency: ${id}`);
    },
  }, { filename });
  return module.exports.default;
}

for (const phase of ['midterm_2w', 'final_2w', 'checkpoint', null, undefined]) {
  test(`keeps exam phase ${phase} through recommendation response normalization`, async () => {
    const service = serviceFor({
      recommendation_id: 44, status: 'pending', trigger_type: 'exam_submitted',
      exam_workflow_phase: phase,
      items: [{ primary_action: 'keep', difference_minutes: 0, changes_json: '[]' }],
    });
    for (const recommendation of [
      await service.getLatest(), await service.getDetail(44), await service.accept(44),
      await service.updateBlock(44, 1, {}),
    ]) {
      assert.equal(recommendation.exam_workflow_phase, phase ?? null);
      assert.equal(recommendation.items[0].primary_action, 'keep');
      assert.equal(recommendation.items[0].difference_minutes, 0);
      assert.equal(recommendation.items[0].changes_json.length, 0);
    }
  });
}

test('no latest recommendation remains null', async () => {
  assert.equal(await serviceFor(null).getLatest(), null);
});
