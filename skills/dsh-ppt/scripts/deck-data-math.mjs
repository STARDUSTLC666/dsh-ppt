/** Shared Node/browser arithmetic. No eval, property access, assignments or I/O. */
export function createDataMath() {
  const functions = {
    min: values => Math.min(...values), max: values => Math.max(...values),
    sum: values => values.reduce((a, b) => a + b, 0), abs: values => Math.abs(values[0]),
    floor: values => Math.floor(values[0]), ceil: values => Math.ceil(values[0]),
    round: values => {
      const digits = values[1] ?? 0;
      if (!Number.isInteger(digits) || digits < 0 || digits > 6) throw new Error('round digits: 0–6');
      const scale = 10 ** digits; return Math.round((values[0] + Number.EPSILON) * scale) / scale;
    },
  };
  function finite(value) {
    if (!Number.isFinite(value) || Math.abs(value) > 1e15) throw new Error('Result must be finite and within ±1e15');
    return Object.is(value, -0) ? 0 : value;
  }
  function inspect(ast, known) {
    const dependencies = new Set(); let nodes = 0;
    function visit(node, depth = 0) {
      if (!node || ++nodes > 256 || depth > 32) throw new Error('Formula exceeds its complexity limit');
      if (node.type === 'Literal' && typeof node.value === 'number') { finite(node.value); return; }
      if (node.type === 'Identifier') {
        if (!known.has(node.name)) throw new Error('Unknown metric: ' + node.name);
        dependencies.add(node.name); return;
      }
      if (node.type === 'UnaryExpression' && ['+', '-'].includes(node.operator)) { visit(node.argument, depth + 1); return; }
      if (node.type === 'BinaryExpression' && ['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
        visit(node.left, depth + 1); visit(node.right, depth + 1); return;
      }
      if (node.type === 'CallExpression' && node.callee?.type === 'Identifier' && Object.hasOwn(functions, node.callee.name.toLowerCase())) {
        const name = node.callee.name.toLowerCase(), args = node.arguments;
        if (!Array.isArray(args) || args.length < 1 || args.length > 16 || ['abs', 'floor', 'ceil'].includes(name) && args.length !== 1 || name === 'round' && args.length > 2) throw new Error('Invalid function arguments');
        args.forEach(arg => visit(arg, depth + 1)); return;
      }
      throw new Error('Only arithmetic and min/max/sum/abs/floor/ceil/round are supported');
    }
    visit(ast); return [...dependencies];
  }
  function evaluate(ast, lookup) {
    function visit(node) {
      if (node.type === 'Literal') return finite(node.value);
      if (node.type === 'Identifier') return finite(lookup(node.name));
      if (node.type === 'UnaryExpression') return finite((node.operator === '-' ? -1 : 1) * visit(node.argument));
      if (node.type === 'CallExpression') return finite(functions[node.callee.name.toLowerCase()](node.arguments.map(visit)));
      const left = visit(node.left), right = visit(node.right);
      if (['/', '%'].includes(node.operator) && right === 0) throw new Error('Division by zero');
      return finite(({ '+': () => left + right, '-': () => left - right, '*': () => left * right,
        '/': () => left / right, '%': () => left % right, '**': () => left ** right })[node.operator]());
    }
    return visit(ast);
  }
  function inputValue(metric, value) {
    if (typeof value !== 'number') throw new Error('Input must be a number');
    finite(value);
    if (value < metric.min || value > metric.max || Math.abs((value - metric.min) / metric.step - Math.round((value - metric.min) / metric.step)) > 1e-6) throw new Error('Input outside range or step: ' + metric.id);
    return value;
  }
  function solve(metrics, overrides = {}) {
    const byId = new Map(metrics.map(m => [m.id, m])), values = new Map(), visiting = new Set();
    for (const key of Object.keys(overrides)) if (byId.get(key)?.kind !== 'input') throw new Error('Only declared assumptions can change: ' + key);
    function value(id) {
      if (values.has(id)) return values.get(id);
      const metric = byId.get(id); if (!metric) throw new Error('Unknown metric: ' + id);
      if (visiting.has(id) || visiting.size >= 40) throw new Error('Cyclic or excessively deep formula: ' + id);
      visiting.add(id);
      const result = metric.kind === 'formula' ? evaluate(metric.ast, value) : metric.kind === 'input' ? inputValue(metric, Object.hasOwn(overrides, id) ? overrides[id] : metric.value) : finite(metric.value);
      visiting.delete(id); values.set(id, result); return result;
    }
    metrics.forEach(m => value(m.id)); return Object.fromEntries(values);
  }
  function format(value, metric, language = 'zh') {
    const style = metric.format?.style || 'number', digits = metric.format?.digits ?? 2;
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'zh-CN', { style:style==='number'?'decimal':style, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value) + (metric.format?.unit || '');
  }
  return { inspect, solve, format, finite, inputValue };
}
