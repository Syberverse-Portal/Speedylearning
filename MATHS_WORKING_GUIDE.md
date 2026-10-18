# SpeedyLearning: My Maths Working — school-method studio

## Purpose
Feedback from pupils: they want to show the method taught in their Maths lesson, not just enter a final answer. A child can pick a working layout, type their explanation, draw with a finger or stylus, and then submit the original answer normally.

## Classroom layouts
12 options: squared paper, number lines, ten frames, part–whole, place-value partitioning, column addition/subtraction/multiplication, grid multiplication, arrays, short division (bus stop), bar model, fraction strips and free-form written steps.

Some schools teach different methods or sequences, so the default is only a suggestion, not a mandate. The selected method is remembered per calculation category on the local device. No intermediate work is automatically graded or sent to servers. Saved drawings can be downloaded as PNG files; typed notes and template fields can be downloaded as TXT files.

## Integration
- Reception through Year 6 Maths, topic and mixed decks.
- My Own Sums and suitable SATs maths questions, including reasoning and arithmetic.
- Optional squared-paper working areas on printable Maths worksheets.
- Non-Maths content is unchanged. Timed questions stay timed.
- The final answer controls and existing marking/scoring remain unchanged.
- The Maths answer input no longer steals focus and jumps past the workpad on phones.

## Tests
Run: node --test tests/maths-methods.test.cjs tests/maths-workspace-smoke.test.cjs

Review sample problems: Reception 8 + 5 (ten frames), Year 1 15 - 7 (number line), Year 3 34 + 25 (partitioning), Year 4 302 - 187 (column exchange), Year 5 23 x 14 (grid/long multiplication), Year 6 846 / 3 (bus stop), and equivalent fractions 1/2 and 2/4. Test custom sums, worded problems, SATs reasoning, input focus, printing, finger drawing, keyboard typing and local exports.

Working strokes and text are in memory for the current deck and do not persist across a full browser reload. The chosen method and open/closed preference persist in browser local storage. Only the final submitted answer affects recorded scores.

Reference context: UK Department for Education primary maths guidance and NCETM representations. The drawing models are tools to expose mathematical structure; the app must not assert that one method is used by every school or that handwritten reasoning has been automatically assessed.