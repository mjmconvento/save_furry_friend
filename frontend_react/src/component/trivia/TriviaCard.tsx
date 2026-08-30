import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import { useAuth } from '../../AuthContext';
import { TONE_LABEL, ToneKey } from '../../config/tags';
import { Trivia, TriviaSpecies } from '../../interface/Trivia';
import { fetchTrivia } from '../../service/trivia/triviaApi';
import { errorSummary, isAbort } from '../../service/apiClient';
import ErrorList from '../template/ErrorList';

const SPECIES_LABEL: Record<TriviaSpecies, string> = {
  cat: 'Cat',
  dog: 'Dog',
  both: 'Cats & dogs',
};

/** Fisher-Yates over a copy, so every order is equally likely. */
const shuffle = <T,>(items: readonly T[]): T[] => {
  const deck = [...items];

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = deck[i];
    const b = deck[j];

    // Both indexes are in range, so the guard only narrows away the
    // `undefined` that noUncheckedIndexedAccess adds to every index read.
    if (a !== undefined && b !== undefined) {
      deck[i] = b;
      deck[j] = a;
    }
  }

  return deck;
};

interface TriviaCardProps {
  /**
   * The tones this surface may show: the dashboard passes happy and neutral,
   * each feed page passes its own. The heartbreaking page mounts this inside
   * its content warning, so nothing upsetting is even fetched before consent.
   */
  tones: ToneKey[];
}

/**
 * One cat-or-dog fact at a time, with a Next button. The whole corpus for the
 * requested tones arrives in one response and is shuffled once, so Next walks
 * a deck with no repeats until it is exhausted, then reshuffles - and every
 * click is instant, with no request behind it.
 */
const TriviaCard: React.FC<TriviaCardProps> = ({ tones }) => {
  const { token } = useAuth();
  const [deck, setDeck] = useState<Trivia[]>([]);
  const [index, setIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<string[]>([]);

  // Keyed by content, not identity: pages pass array literals, and a fresh
  // array on every parent render must not refetch.
  const tonesKey = tones.join(',');
  const wantedTones = useMemo(
    () => tonesKey.split(',') as ToneKey[],
    [tonesKey]
  );

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const items = await fetchTrivia(token, wantedTones, controller.signal);

        setDeck(shuffle(items));
        setIndex(0);
        setErrors([]);
      } catch (error) {
        if (isAbort(error)) return;

        setErrors(errorSummary(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [token, wantedTones]);

  const next = () => {
    if (index + 1 < deck.length) {
      setIndex(index + 1);
      return;
    }

    // Deck exhausted: reshuffle and start over. The first card of the new
    // deck may repeat the last one shown - harmless at 200 rows.
    setDeck(shuffle(deck));
    setIndex(0);
  };

  // Nothing seeded for these tones and nothing to report: no empty shell.
  if (!loading && errors.length === 0 && deck.length === 0) {
    return null;
  }

  const trivia: Trivia | undefined = deck[index];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
          {/* Eyebrow, not a heading - subtitle2 defaults to an h6 element. */}
          <Typography
            variant="subtitle2"
            component="p"
            color="text.muted"
            sx={{ flex: 1 }}
          >
            Did you know?
          </Typography>

          {trivia && (
            <>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  bgcolor: `tone.${trivia.tone}.main`,
                }}
              />
              <Typography variant="caption" color="text.muted">
                {TONE_LABEL[trivia.tone]}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  bgcolor: `tone.${trivia.tone}.soft`,
                  color: `tone.${trivia.tone}.main`,
                }}
              >
                {SPECIES_LABEL[trivia.species]}
              </Typography>
            </>
          )}
        </Stack>

        <ErrorList errors={errors} />

        {loading ? (
          <CircularProgress size={28} sx={{ my: '6px' }} />
        ) : (
          trivia && (
            <>
              {/* 60ch of Inter is ~75 real characters - the readable measure.
                  Uncapped, a fact ran the full 950px card. */}
              <Typography variant="body1" sx={{ mb: 1.5, maxWidth: '60ch' }}>
                {trivia.text}
              </Typography>

              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography
                  variant="caption"
                  color="text.muted"
                  sx={{ flex: 1 }}
                >
                  {index + 1} of {deck.length}
                </Typography>
                <Button size="small" onClick={next}>
                  Next
                </Button>
              </Stack>
            </>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default TriviaCard;
