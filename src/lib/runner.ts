import type { Language, Problem, RunResult } from "../types";
import { explainRuntimeError } from "./runtimeErrors";

// Learner code never runs in the app origin or on the Node server. The opaque
// sandbox frame owns a disposable worker with no app cookies, storage or tokens.
const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/";
const workerSource = `
const same = (a,b) => {
  if (a === b) return true;
  if (typeof a !== typeof b || a === null || b === null) return false;
  if (Array.isArray(a)) return Array.isArray(b) && a.length===b.length && a.every((v,i)=>same(v,b[i]));
  if (typeof a === 'object') { const ka=Object.keys(a).sort(), kb=Object.keys(b).sort(); return same(ka,kb)&&ka.every(k=>same(a[k],b[k])); }
  return false;
};
let pyodide;
self.onmessage = async ({data:m}) => {
  if(m.type!=='run')return;
  const start=performance.now();
  try {
    let results=[];
    if(m.language==='python') {
      if(!pyodide){
        self.postMessage({type:'loading',id:m.id});
        importScripts('${PYODIDE}pyodide.js');
        pyodide=await loadPyodide({indexURL:'${PYODIDE}',stdout:()=>{},stderr:()=>{}});
      }
      self.postMessage({type:'executing',id:m.id});
      pyodide.globals.set('_knot_payload',JSON.stringify(m));
      const raw=await pyodide.runPythonAsync(\`
import json as _knot_json
_knot_data = _knot_json.loads(_knot_payload)
_knot_env = {}
exec(_knot_data['code'], _knot_env)
_knot_fn = _knot_env.get(_knot_data['functionName'])
if not callable(_knot_fn):
    raise NameError('関数 ' + _knot_data['functionName'] + ' が見つかりません。名前を確認してください。')
_knot_results = []
for _knot_test in _knot_data['tests']:
    try:
        _knot_actual = _knot_fn(*_knot_test['input'])
        _knot_json.dumps(_knot_actual, allow_nan=False)
        _knot_results.append({'label':_knot_test['label'],'actual':_knot_actual,'expected':_knot_test['expected']})
    except Exception as _knot_error:
        _knot_results.append({'label':_knot_test['label'],'error':type(_knot_error).__name__ + ': ' + str(_knot_error)})
_knot_json.dumps(_knot_results, allow_nan=False)
\`);
      results=JSON.parse(raw).map((t,i)=>({...t,expected:m.tests[i].expected,passed:!t.error&&same(t.actual,m.tests[i].expected)}));
    } else {
      self.postMessage({type:'executing',id:m.id});
      const fn=new Function(m.code+'\\n;return typeof '+m.functionName+' === "function" ? '+m.functionName+' : null;')();
      if(!fn)throw new Error('関数 '+m.functionName+' が見つかりません。名前を確認してください。');
      for(const t of m.tests){
        try { const actual=fn(...structuredClone(t.input)); const safe=actual===undefined?'undefined':JSON.parse(JSON.stringify(actual)); results.push({label:t.label,actual:safe,expected:t.expected,passed:same(actual,t.expected)}); }
        catch(e){results.push({label:t.label,expected:t.expected,passed:false,error:String(e)});}
      }
    }
    self.postMessage({type:'result',id:m.id,result:{passed:results.every(t=>t.passed),tests:results,duration:Math.round(performance.now()-start)}});
  } catch(e){self.postMessage({type:'result',id:m.id,result:{passed:false,tests:[],error:String(e),duration:Math.round(performance.now()-start)}});}
};`;

let frame: HTMLIFrameElement | null = null;
let ready: Promise<void> | null = null;
let abortPrepare: (() => void) | null = null;
let sequence = 0;
let busyToken: number | null = null;
let activeCancel: (() => void) | null = null;
const CANCELED = "実行を中止しました。";
function reset() {
  const abort = abortPrepare;
  abortPrepare = null;
  frame?.remove();
  frame = null;
  ready = null;
  abort?.();
}

/** Cancel both runtime initialization and running learner code. Old async
 * completions never unlock or remove a newer run's worker. */
export function cancelRun(): void {
  const cancel = activeCancel;
  activeCancel = null;
  busyToken = null;
  reset();
  cancel?.();
}
function prepare() {
  if (ready) return ready;
  const sandbox = document.createElement("iframe");
  frame = sandbox;
  sandbox.setAttribute("sandbox", "allow-scripts");
  sandbox.setAttribute("aria-hidden", "true");
  sandbox.style.display = "none";
  const bootstrap = `const worker=new Worker(URL.createObjectURL(new Blob([${JSON.stringify(workerSource)}],{type:'text/javascript'}))); worker.onmessage=e=>parent.postMessage(e.data,'*'); worker.onerror=e=>parent.postMessage({type:'runtimeError',error:e.message},'*'); onmessage=e=>{if(e.source===parent)worker.postMessage(e.data)};parent.postMessage({type:'ready'},'*');`;
  sandbox.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob: https://cdn.jsdelivr.net; worker-src blob:; connect-src https://cdn.jsdelivr.net"><script>${bootstrap.replace(/<\/script/gi, "<\\/script")}<\/script>`;
  ready = new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reset();
      reject(
        new Error(
          "コード実行環境を起動できませんでした。ページを再読み込みしてください。",
        ),
      );
    }, 8000);
    const listener = (event: MessageEvent) => {
      if (
        event.source === sandbox.contentWindow &&
        event.data?.type === "ready"
      ) {
        cleanup();
        resolve();
      }
    };
    const abort = () => {
      cleanup();
      reject(new Error(CANCELED));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      window.removeEventListener("message", listener);
      if (abortPrepare === abort) abortPrepare = null;
    };
    abortPrepare = abort;
    window.addEventListener("message", listener);
    document.body.append(sandbox);
  });
  return ready;
}
const friendlyResult = (result: RunResult): RunResult => ({
  ...result,
  ...(result.error ? { error: explainRuntimeError(result.error) } : {}),
  tests: result.tests.map((test) =>
    test.error ? { ...test, error: explainRuntimeError(test.error) } : test,
  ),
});

export async function runCode(
  language: Language,
  problem: Problem,
  code: string,
): Promise<RunResult> {
  if (busyToken !== null)
    return {
      passed: false,
      tests: [],
      error: "別のコードを実行中です。少し待ってから試してください。",
      duration: 0,
    };
  if (code.length > 20000)
    return {
      passed: false,
      tests: [],
      error: "コードが長すぎます。20,000文字以内にしてください。",
      duration: 0,
    };
  const id = ++sequence;
  busyToken = id;
  const start = performance.now();
  const canceledResult = (): RunResult => ({
    passed: false,
    tests: [],
    error: CANCELED,
    duration: Math.round(performance.now() - start),
  });
  try {
    await prepare();
    if (busyToken !== id) return canceledResult();
    const sandbox = frame!;
    return await new Promise<RunResult>((resolve) => {
      let timeout: number;
      let finished = false;
      const cancel = () => finish(canceledResult());
      const finish = (result: RunResult, kill = false) => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        window.removeEventListener("message", listener);
        if (activeCancel === cancel) activeCancel = null;
        if (kill && busyToken === id) reset();
        resolve(friendlyResult(result));
      };
      const limit = (ms: number) => {
        clearTimeout(timeout);
        timeout = window.setTimeout(
          () =>
            finish(
              {
                passed: false,
                tests: [],
                error:
                  ms > 10000
                    ? "Pythonの読み込みに失敗しました。初回はインターネット接続が必要です。接続を確認して再実行してください。"
                    : "実行時間が長くなっています。繰り返しが終わる条件を確認してみましょう。",
                duration: Math.round(performance.now() - start),
              },
              true,
            ),
          ms,
        );
      };
      const listener = (event: MessageEvent) => {
        if (event.source !== sandbox.contentWindow || busyToken !== id) return;
        const data = event.data;
        if (data?.type === "runtimeError") {
          finish(
            {
              passed: false,
              tests: [],
              error:
                "実行環境を読み込めませんでした。ネットワーク接続を確認して再実行してください。",
              duration: Math.round(performance.now() - start),
            },
            true,
          );
          return;
        }
        if (data?.id !== id) return;
        if (data.type === "loading") limit(60000);
        if (data.type === "executing") limit(4000);
        if (data.type === "result") finish(data.result);
      };
      activeCancel = cancel;
      window.addEventListener("message", listener);
      limit(language === "python" ? 65000 : 5000);
      sandbox.contentWindow!.postMessage(
        {
          type: "run",
          id,
          language,
          code,
          functionName: problem.functionName,
          tests: problem.tests,
        },
        "*",
      );
    });
  } catch (error) {
    return {
      passed: false,
      tests: [],
      error: busyToken !== id ? CANCELED : explainRuntimeError(String(error)),
      duration: Math.round(performance.now() - start),
    };
  } finally {
    if (busyToken === id) busyToken = null;
  }
}
