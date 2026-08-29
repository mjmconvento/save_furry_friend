import { ToneKey } from '../config/tags';

/** Which animal a trivia is about; `both` covers facts that apply to either. */
export type TriviaSpecies = 'cat' | 'dog' | 'both';

/**
 * One row of the seeded trivia corpus, as `GET /api/trivia` serves it. `tone`
 * is a `ToneKey` - the same vocabulary the theme palette and the feed pages
 * use - so a trivia card colors itself exactly like the rest of the app.
 */
export interface Trivia {
  id: number;
  text: string;
  tone: ToneKey;
  species: TriviaSpecies;
}
