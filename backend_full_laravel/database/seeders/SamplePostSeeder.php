<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PostTag;
use Illuminate\Database\Seeder;
use Illuminate\Http\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Fills the three category feeds with a realistic corpus: 50 posts spread over
 * four authors, three tones and 90 days, with a mix of no-media, single-media
 * and multi-media posts.
 *
 * Every document it writes carries `sample: true`, which is how a re-run finds
 * and removes its own output - including the S3 objects - instead of stacking a
 * second 50 on top. Nothing else in the app reads or writes that field, and
 * posts created through the API never have it, so hand-made content survives
 * re-seeding untouched.
 */
class SamplePostSeeder extends Seeder
{
    /** Marks a document as this seeder's output. */
    private const MARKER = 'sample';

    /** Fixed so the sample corpus is identical on every machine and deploy. */
    private const RANDOM_SEED = 20260812;

    /**
     * How many of the 50 land inside today, so the home page summary has
     * something to count on a fresh install.
     */
    private const POSTS_TODAY = 6;

    /**
     * Content is grouped by tone rather than assigned randomly: a
     * "heartbreaking" post carrying cheerful copy reads as obviously fake and
     * makes the tone badges useless for judging the design.
     *
     * @return array<string, list<string>>
     */
    private function bodies(): array
    {
        return [
            PostTag::Happy->value => [
                'Found her under the porch on Saturday, all ribs and no trust. Ten days later she sleeps on her back with her paws in the air.',
                'Three weeks missing and he turned up two streets away, sitting on a stranger wall like nothing happened. The microchip did its job.',
                'Bramble went home this morning. Twelve years old, and the family drove four hours to collect him.',
                'The tabby from the petrol station forecourt has gained nine hundred grams and opinions about mealtimes.',
                'Adoption day for the whole litter. Five kittens, five homes, one very tired foster carer.',
                'He would not come out of the crate for a fortnight. Today he brought me a sock, unprompted.',
                'Reunited after eight months. The owner had never stopped checking the listings.',
                'First walk without flinching at traffic. Small thing, enormous thing.',
                'The lurcher with the broken tail has a name now, and it is Biscuit, and he answers to it.',
                'Someone drove down from three counties away because they saw her photo and could not stop thinking about it.',
                'Two years in and out of foster placements, and this one has stuck. Signed and collected.',
                'She has learned that the sound of the cupboard means dinner and not danger.',
                'The senior beagle nobody enquired about for four months went home on Tuesday to a house with a radiator he now owns.',
                'He came in terrified of hands. This morning he leaned into one.',
                'The pair are staying together, which is what we hoped for and did not expect.',
                'Off the drip, eating unassisted, and extremely rude about the veterinary staff. All good signs.',
                'Twelve weeks of medication and a leg we were told to write off, and she is running.',
                'The elderly greyhound has discovered sofas and will not be discussing the matter further.',
                'Back where he belongs, three days after the storm scattered half the neighbourhood pets.',
                'Home visit passed. She leaves on Friday with the blanket she has slept on since March.',
            ],
            PostTag::Neutral->value => [
                'Intake for the week: four cats, two dogs, one very indignant rabbit. All vaccinated, all chipped.',
                'Reminder that the Saturday clinic moves to the community hall while the roof is repaired.',
                'We are short on medium-sized crates. If anyone has one gathering dust, we will collect.',
                'Microchipping session next Thursday, ten until two, no appointment needed.',
                'The transport run to the coastal branch is now fortnightly rather than weekly.',
                'Foster applications are open again. The training evening is the first Tuesday of the month.',
                'Blankets and towels always welcome. Duvets unfortunately are not, for hygiene reasons.',
                'Three of this month intake are still waiting on dental work before they can be listed.',
                'Our vet has moved to Wednesday mornings. Please plan drop-offs around that.',
                'The waiting list for behavioural assessment is currently about two weeks.',
                'New volunteers: the induction pack is at reception, and please read the handling section first.',
                'Stocktake this weekend, so the shop will be closed Saturday and reopen Sunday.',
                'Please label medication clearly when returning a foster animal. Two bottles came back unmarked.',
                'The kennel block heating is being serviced on Monday; the dogs move to the annexe for the day.',
                'We have updated the adoption form. The old one is no longer accepted, sorry.',
                'Donations of kitten milk replacer are running low with six bottle-feeders currently in care.',
                'Reception hours change next month: nine to four on weekdays, closed bank holidays.',
                'If you have applied and not heard back, we are three days behind on the inbox rather than ignoring you.',
            ],
            PostTag::Heartbreaking->value => [
                'She waited by the gate every evening for a family that was never coming back. Fourteen years old.',
                'Brought in as a stray, but she was groomed, chipped to a disconnected number, and knew every command we tried.',
                'He was found tied to the railings outside with a bag of his own food and no note.',
                'The kittens did not all make it. Two did, and we are concentrating on that.',
                'Surrendered because the family were evicted and no rental in the area takes dogs.',
                'Nobody has enquired about him in five months. He is eleven, and he is wonderful, and that is the whole problem.',
                'She flinches when anyone raises an arm. We will not be asking what happened.',
                'The owner died and there was no plan for the animals. There rarely is.',
                'He came back to us after eight years because of an allergy that appeared in a new baby.',
                'Twelve dogs from one address. Nine are going to make it.',
                'She had been feeding four kittens on nothing. She weighed less than any of them.',
                'Returned twice for being too much, by people who wanted a puppy and got a dog.',
            ],
        ];
    }

    public function run(): void
    {
        $authors = $this->authors();

        if ($authors === []) {
            $this->note('SamplePostSeeder: no sample users found, run SampleUserSeeder first.');

            return;
        }

        $removed = $this->purgePreviousRun();

        if ($removed > 0) {
            $this->note(sprintf('SamplePostSeeder: removed %d posts from a previous run.', $removed));
        }

        $images = $this->images();
        $plan = $this->plan($authors);
        $documents = [];

        foreach ($plan as $index => $entry) {
            $documents[] = [
                '_id' => (string) Str::uuid(),
                'authorId' => $entry['authorId'],
                'authorName' => $entry['authorName'],
                'content' => $entry['content'],
                'tags' => [$entry['tag']],
                'medias' => $this->uploadMedia($entry['authorId'], $entry['mediaCount'], $images, $index),
                'createdAt' => $entry['createdAt'],
                'updatedAt' => $entry['createdAt'],
                self::MARKER => true,
            ];
        }

        DB::connection('mongodb')->table('posts')->insert($documents);

        $this->note(sprintf(
            'SamplePostSeeder: created %d posts across %d authors.',
            count($documents),
            count($authors),
        ));
    }

    /**
     * Progress matters here because a re-run silently replaces the previous
     * corpus, and "removed 50, created 50" is the only visible difference
     * between that and having doubled it.
     *
     * `$command` is set by `Seeder::call()` for anything reached through
     * `db:seed`, which is the only way these seeders run.
     */
    private function note(string $message): void
    {
        $this->command->info($message);
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    private function authors(): array
    {
        $emails = array_column(SampleUserSeeder::USERS, 'email');

        $rows = DB::table('users')
            ->whereIn('email', $emails)
            ->orderBy('email')
            ->get(['id', 'first_name', 'last_name']);

        $authors = [];

        foreach ($rows as $row) {
            $id = is_scalar($row->id) ? (string) $row->id : '';
            $first = is_scalar($row->first_name) ? (string) $row->first_name : '';
            $last = is_scalar($row->last_name) ? (string) $row->last_name : '';

            if ($id === '') {
                continue;
            }

            $authors[] = [
                'id' => $id,
                'name' => trim($first . ' ' . $last),
            ];
        }

        return $authors;
    }

    /**
     * Deletes this seeder's previous output, S3 objects included, so re-running
     * replaces the corpus rather than doubling it.
     */
    private function purgePreviousRun(): int
    {
        $table = DB::connection('mongodb')->table('posts');
        $previous = $table->where(self::MARKER, true)->get(['medias']);
        $keys = [];

        foreach ($previous as $document) {
            $medias = $document->medias ?? null;

            if (! is_array($medias)) {
                continue;
            }

            foreach ($medias as $key) {
                if (is_string($key) && $key !== '') {
                    $keys[] = $key;
                }
            }
        }

        if ($keys !== []) {
            Storage::disk('s3')->delete($keys);
        }

        return $table->where(self::MARKER, true)->delete();
    }

    /**
     * @return list<string>
     */
    private function images(): array
    {
        $paths = glob(__DIR__ . '/samples/*.jpg');

        return $paths === false ? [] : $paths;
    }

    /**
     * One object per post per image, matching what the API does on upload.
     * Sharing objects between posts would be smaller but wrong: deleting one
     * post deletes its keys, which would blank the images on the others.
     *
     * @param  list<string>  $images
     * @return list<string>
     */
    private function uploadMedia(string $authorId, int $count, array $images, int $index): array
    {
        if ($count === 0 || $images === []) {
            return [];
        }

        $keys = [];

        for ($i = 0; $i < $count; $i++) {
            $path = $images[($index + $i) % count($images)];
            $key = Storage::disk('s3')->putFile($authorId, new File($path));

            if (is_string($key)) {
                $keys[] = $key;
            }
        }

        return $keys;
    }

    /**
     * Builds the whole corpus up front so the shape is reviewable in one place:
     * which tone, which author, how many images, how long ago.
     *
     * @param  list<array{id: string, name: string}>  $authors
     * @return list<array{authorId: string, authorName: string, content: string, tag: string, mediaCount: int, createdAt: \Carbon\CarbonInterface}>
     */
    private function plan(array $authors): array
    {
        mt_srand(self::RANDOM_SEED);

        $entries = [];

        foreach ($this->bodies() as $tag => $bodies) {
            foreach ($bodies as $body) {
                $entries[] = [
                    'tag' => (string) $tag,
                    'content' => $body,
                ];
            }
        }

        // Tone order in `bodies()` would otherwise become chronological order:
        // every recent post happy, every old one heartbreaking, and the home
        // page's "today" counts all in one column. Shuffle before dating.
        for ($i = count($entries) - 1; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            [$entries[$i], $entries[$j]] = [$entries[$j], $entries[$i]];
        }

        $total = count($entries);
        $plan = [];

        // Minutes since midnight in the app timezone, which is the window the
        // daily summary counts. Seeding at 01:00 leaves an hour to place posts
        // in; seeding at 23:00 leaves a full day.
        $elapsedToday = (int) now()
            ->diffInMinutes(now()->copy()->startOfDay(), true);

        // A balanced bag rather than an independent draw per post: plain
        // mt_rand() clustered badly enough to give one author twice another's
        // output, which is not what "four authors" is meant to demonstrate.
        // Shuffling it keeps the order unpredictable while the counts stay even.
        $slots = [];

        for ($i = 0; $i < $total; $i++) {
            $slots[] = $i % count($authors);
        }

        for ($i = count($slots) - 1; $i > 0; $i--) {
            $j = mt_rand(0, $i);
            [$slots[$i], $slots[$j]] = [$slots[$j], $slots[$i]];
        }

        foreach ($entries as $position => $entry) {
            $author = $authors[$slots[$position]];

            // Roughly 40% text-only, 40% one image, 20% a small gallery - the
            // spread the feed layout has to cope with.
            $roll = mt_rand(1, 10);
            $mediaCount = match (true) {
                $roll <= 4 => 0,
                $roll <= 8 => 1,
                default => mt_rand(2, 4),
            };

            // The newest few are placed inside today deliberately: a fresh
            // install whose home page reads all zeros makes the summary look
            // broken rather than empty. The rest walk back over 90 days with
            // jitter, so the ordering is not suspiciously regular.
            $minutesAgo = $position < self::POSTS_TODAY
                ? (int) round($elapsedToday * ($position + 1) / (self::POSTS_TODAY + 1))
                : (int) round(24 * 60 + (($position - self::POSTS_TODAY) / max($total - self::POSTS_TODAY - 1, 1)) * 89 * 24 * 60)
                    + mt_rand(0, 240);

            $plan[] = [
                'authorId' => $author['id'],
                'authorName' => $author['name'],
                'content' => $entry['content'],
                'tag' => $entry['tag'],
                'mediaCount' => $mediaCount,
                'createdAt' => now()
                    ->subMinutes($minutesAgo),
            ];
        }

        return $plan;
    }
}
