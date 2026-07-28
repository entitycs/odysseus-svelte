import { expect, test } from 'vitest';
import { extractThinkingBlocks } from '$lib/legacy/markdown';

test('extractThinkingBlocks', () => {
  let input = `
:::thinking
Here is some thinking text
:::
`;

  let result = extractThinkingBlocks(input);

  expect(result).toEqual({
    // type: 'thinking',
    content: `:::thinking
Here is some thinking text
:::`,
    thinkingBlocks: [],
    thinkingTime: null,
  });

  input =
    '<think time="24.5">\n' +
    "Here's a thinking process that leads to the desired summary:\n\n" +
    '6.  **Generate the Output.** (This matches the final provided response.)' +
    '</think>### Juxtaposition: Interweaving Cultural Norms in Lesson Design\n' +
    'The most effective lesson structure is created by deliberately juxtaposing.';
  result = extractThinkingBlocks(input);

  expect(result).toEqual({
    // type: 'thinking',
    content:
      '### Juxtaposition: Interweaving Cultural Norms in Lesson Design\n' +
      'The most effective lesson structure is created by deliberately juxtaposing.',
    thinkingBlocks: [
      `Here's a thinking process that leads to the desired summary:

6.  **Generate the Output.** (This matches the final provided response.)`,
    ],
    thinkingTime: '24.5',
  });
});
