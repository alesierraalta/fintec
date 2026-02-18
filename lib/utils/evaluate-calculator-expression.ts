const OPERATOR_PRECEDENCE: Record<string, number> = {
  '+': 1,
  '-': 1,
  '*': 2,
  '/': 2,
};

const OPERATOR_SET = new Set(Object.keys(OPERATOR_PRECEDENCE));
const TOKEN_REGEX = /\d*\.?\d+|[()+\-*/]/g;

function applyOperator(values: number[], operator: string): void {
  if (values.length < 2) {
    throw new Error('Invalid expression');
  }

  const right = values.pop()!;
  const left = values.pop()!;

  let result = 0;
  switch (operator) {
    case '+':
      result = left + right;
      break;
    case '-':
      result = left - right;
      break;
    case '*':
      result = left * right;
      break;
    case '/':
      if (right === 0) {
        throw new Error('Division by zero');
      }
      result = left / right;
      break;
    default:
      throw new Error('Invalid operator');
  }

  if (!Number.isFinite(result)) {
    throw new Error('Invalid operation');
  }

  values.push(result);
}

export function evaluateCalculatorExpression(expression: string): number {
  const normalized = expression.replace(/\s+/g, '');

  if (!normalized) {
    throw new Error('Empty expression');
  }

  if (/[^0-9()+\-*/.]/.test(normalized)) {
    throw new Error('Invalid characters');
  }

  const tokens = normalized.match(TOKEN_REGEX);
  if (!tokens || tokens.join('') !== normalized) {
    throw new Error('Invalid expression');
  }

  const values: number[] = [];
  const operators: string[] = [];
  let previousToken: string | null = null;

  for (const token of tokens) {
    if (token === '(') {
      operators.push(token);
      previousToken = token;
      continue;
    }

    if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        applyOperator(values, operators.pop()!);
      }

      if (operators.length === 0 || operators[operators.length - 1] !== '(') {
        throw new Error('Unbalanced parentheses');
      }

      operators.pop();
      previousToken = token;
      continue;
    }

    if (OPERATOR_SET.has(token)) {
      const isUnaryOperator =
        (token === '+' || token === '-') &&
        (previousToken === null ||
          previousToken === '(' ||
          OPERATOR_SET.has(previousToken));

      if (isUnaryOperator) {
        values.push(0);
      } else if (
        previousToken === null ||
        previousToken === '(' ||
        OPERATOR_SET.has(previousToken)
      ) {
        throw new Error('Invalid expression');
      }

      while (operators.length > 0) {
        const top = operators[operators.length - 1];
        if (top === '(') {
          break;
        }

        if (OPERATOR_PRECEDENCE[top] >= OPERATOR_PRECEDENCE[token]) {
          applyOperator(values, operators.pop()!);
        } else {
          break;
        }
      }

      operators.push(token);
      previousToken = token;
      continue;
    }

    const parsed = Number(token);
    if (!Number.isFinite(parsed)) {
      throw new Error('Invalid number');
    }

    values.push(parsed);
    previousToken = token;
  }

  if (previousToken && OPERATOR_SET.has(previousToken)) {
    throw new Error('Invalid expression');
  }

  while (operators.length > 0) {
    const operator = operators.pop()!;
    if (operator === '(') {
      throw new Error('Unbalanced parentheses');
    }
    applyOperator(values, operator);
  }

  if (values.length !== 1 || !Number.isFinite(values[0])) {
    throw new Error('Invalid expression');
  }

  return values[0];
}
