import { TRIVIA_ENDPOINT } from '../../config/api';
import { ToneKey } from '../../config/tags';
import { Trivia } from '../../interface/Trivia';
import { apiRequest } from '../apiClient';

/**
 * The whole corpus for the requested tones in one response - a couple of
 * hundred short rows - so the card's Next button can cycle client-side without
 * a round trip per click.
 */
export const fetchTrivia = async (
  bearerToken: string | null,
  tones: ToneKey[],
  signal?: AbortSignal
): Promise<Trivia[]> =>
  apiRequest<Trivia[]>(TRIVIA_ENDPOINT, {
    token: bearerToken,
    query: { tones },
    signal,
  });
