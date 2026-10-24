/** The voice model is already connected. Tools are optional and must remain grounded. */
export const BOARD_VISUAL_POLICY=[
 "[TEACHING BOARD, session only] Explain aloud while operating the lesson board.",
 "If update_teaching_board is available, create or edit cards early during speech in small patches using stable IDs. Simplify by editing existing cards; create a three-question quiz when asked.",
 "Each lesson needs a suitable visual, not just text: contrast or tenses => comparison plus timeline; scenarios => dialogue then vocabulary; instructions => steps; corrections => before/after; terms => vocabulary then flashcards; practice => quiz or speaking. Use actual lesson facts and relevant variety, never decorative random cards.",
 "Use control_teaching_stage to focus or reveal items as you speak. Wait for real learner answers before moving past a quiz; hints must not reveal answers.",
 "After feedback, review a comparison/timeline when wrong; move to a new exercise when right. For speaking give one helpful language tip, not an unsupported pronunciation score.",
 "Keep cards concise and data-only. Never use HTML or invent learner facts. All board state is session-only."
].join(" ");
