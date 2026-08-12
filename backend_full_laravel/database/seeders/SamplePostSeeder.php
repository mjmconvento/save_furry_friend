<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\PostTag;
use Illuminate\Database\Seeder;
use Illuminate\Http\File;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use RuntimeException;

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
     * Every line is about street animals - found, fed, trapped, treated, homed
     * or lost. This is a strays app, not a shelter noticeboard, so the neutral
     * feed carries colony and TNR logistics rather than opening hours.
     *
     * @return array<string, list<string>>
     */
    private function bodies(): array
    {
        return [
            PostTag::Happy->value => [
                'Found her under a parked car on Saturday, all ribs and no trust. Ten days later she sleeps on her back with her paws in the air.',
                'The three-legged tom from the market has let me touch him. Eleven months of sitting on that kerb with a tin of food.',
                'Bramble spent four winters behind the bus depot. This morning he went home with a family who drove four hours to collect him.',
                'The tabby from the petrol station forecourt has gained nine hundred grams and opinions about mealtimes.',
                'All five of the drain litter are out of quarantine and eating solids. Five kittens, five homes lined up, one very tired foster carer.',
                'He would not come out from behind the bins for a fortnight. Today he brought me a sock, unprompted.',
                'The scaffolding dog is chipped, vaccinated and asleep on a sofa in the next county.',
                'First walk on a lead without flinching at traffic. Small thing, enormous thing.',
                'The lurcher who lived on the industrial estate has a name now, and it is Biscuit, and he answers to it.',
                'Someone drove down from three counties away because they saw a photo of a dog on a roundabout and could not stop thinking about it.',
                'Two years of being fed at the same railway gate, and she walked into the carrier herself tonight.',
                'She has learned that the sound of a bag opening means dinner and not danger.',
                'The old boy who slept in the church porch went home on Tuesday to a house with a radiator he now owns.',
                'He came off the street terrified of hands. This morning he leaned into one.',
                'The pair from the allotments are staying together, which is what we hoped for and did not expect.',
                'Off the drip, eating unassisted, and extremely rude about the veterinary staff. All good signs for a cat who was a bag of bones on Monday.',
                'Twelve weeks of medication and a leg we were told to write off, and the beach dog is running.',
                'The greyhound from the lay-by has discovered sofas and will not be discussing the matter further.',
                'Reunited: he had been living rough for three months, four streets from a family who never stopped looking.',
                'Home visit passed. She leaves on Friday with the blanket she has slept on since we lifted her off the verge in March.',
                'The scrapyard tabby let me pick her up tonight. Eight months of sitting on an upturned crate talking to a cat.',
                'Both of the bridge dogs are neutered, vaccinated and back on the estate with a shelter and someone checking daily.',
                'The kitten from the engine bay is off the syringe and eating like a horse.',
                'He has been at the depot four winters. Tonight he is asleep in a kitchen in Cardiff.',
                'Ear-tipped number sixty for the year. The harbour colony has not grown since March.',
                'The one everyone said was feral has spent the evening on a lap, purring, being extremely feral.',
                'She came in with a wound down her flank and no interest in living. Look at her now.',
                'Six months of leaving food at the same spot and he followed me to the van by himself.',
            ],
            PostTag::Neutral->value => [
                'Tonight\'s round: eleven cats fed at the harbour, two new faces, one ear-tipped already.',
                'Traps go out behind the supermarket on Thursday. Please do not feed there Wednesday night or they will not go in.',
                'We are short on medium carriers for the market colony. If anyone has one gathering dust, we will collect.',
                'Free microchipping and flea treatment for anyone feeding strays, next Thursday, ten until two.',
                'The colony count at the depot is stable at nine. Six are ear-tipped, three still to go.',
                'Feeding-station rota for the estate is on the noticeboard. Two gaps on Sunday evenings.',
                'Blankets and towels always welcome for the winter shelters. Duvets unfortunately are not, they hold damp.',
                'Three of the dogs off the ring road are waiting on dental work before they can be listed.',
                'Our vet does TNR returns on Wednesday mornings now. Please plan drop-offs around that.',
                'Behavioural assessment for the street dogs is running about two weeks behind.',
                'New volunteers: read the handling section before your first round. Half of these cats have never been touched.',
                'Winter shelters go up this weekend. Bring a screwdriver if you have one.',
                'Please label medication clearly when returning a foster. Two bottles came back unmarked.',
                'The kennel block heating is serviced on Monday, so the intake dogs move to the annexe for the day.',
                'Reminder: a healthy ear-tipped cat outdoors is not lost. Photograph it, do not carry it off.',
                'Kitten milk replacer is running low with six bottle-feeders from the scrapyard litter in care.',
                'Lost-and-found board is now sorted by street rather than by date. Easier for the walkers.',
                'If you have reported a stray and not heard back, we are three days behind on the inbox rather than ignoring you.',
                'Colony count at the marina: fourteen, eleven ear-tipped. Two new toms this month.',
                'The trap-neuter-return van is out Tuesday and Thursday. Names on the board if you want to ride along.',
                'If you feed a stray regularly, please tell us where. Half our duplicate trapping comes from not knowing.',
                'Winter shelter build day Saturday: polystyrene boxes, straw, no blankets. Straw, not hay.',
                'Three of the estate cats are on eye ointment. Chart is on the shed door.',
                'We are looking for a garage or dry corner near the industrial estate for overnight traps.',
                'Reminder that a stray in a carrier is not a stray any more: log it before you drive off.',
                'Post-op checks moved to Sunday mornings while the vet is short-staffed.',
            ],
            PostTag::Heartbreaking->value => [
                'She waited by the same gate every evening for a family that was never coming back. Fourteen years old, and she died on that pavement.',
                'Picked up as a stray, but she was groomed, chipped to a disconnected number, and knew every command we tried.',
                'He was tied to the railings with a bag of his own food and no note. He watched the road for two days.',
                'The kittens from the culvert did not all make it. Two did, and we are concentrating on that.',
                'Dumped at the lay-by because the family were evicted and no rental in the area takes dogs.',
                'Nobody has asked about him in five months. He is eleven, he is wonderful, and he has spent most of his life outdoors.',
                'She flinches when anyone raises an arm. We are not going to find out why.',
                'The man who fed the harbour cats for nineteen years died in April. Nobody told us until they started starving.',
                'Hit on the bypass and left. Somebody stopped for her eventually - four hours later.',
                'Twelve dogs from one address, all born on that concrete. Nine are going to make it.',
                'She had been feeding four kittens on nothing behind the takeaway. She weighed less than any of them.',
                'Returned to the street twice by people who wanted a puppy and got a dog.',
                'Six weeks of feeding him at the gate and he still would not come. This morning we found out why: he had been guarding a litter under the shed.',
                'The council cleared the encampment and the cats with it. We have found four of nine.',
                'Her collar had grown into her neck. She had been on that street for years and nobody looked twice.',
                'Somebody dropped a box of kittens at the gate overnight, in January, with the lid taped shut.',
                'He is deaf, which is why he did not move for the car. Somebody chose to leave him.',
                'The vet found buckshot. Not a road, then.',
                'She is the last of the harbour colony. Nineteen at the start of the year, one tonight.',
                'Nobody claimed him and nobody will. He has been at the depot longer than any of us have been volunteering.',
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

        $plan = $this->plan($authors);
        $queue = $this->images();
        $slots = array_sum(array_column($plan, 'mediaCount'));

        // Loud rather than silently cycling: repeated photos across the corpus
        // is exactly the thing this queue exists to prevent, so a shortfall has
        // to be visible.
        if ($slots > count($queue)) {
            throw new RuntimeException(sprintf(
                'SamplePostSeeder needs %d unique photos for %d media slots, but %s holds %d. Add more images or lower the media distribution.',
                $slots,
                $slots,
                'database/seeders/samples',
                count($queue),
            ));
        }

        $documents = [];

        foreach ($plan as $entry) {
            $documents[] = [
                '_id' => (string) Str::uuid(),
                'authorId' => $entry['authorId'],
                'authorName' => $entry['authorName'],
                'content' => $entry['content'],
                'tags' => [$entry['tag']],
                'medias' => $this->uploadMedia($entry['authorId'], $entry['mediaCount'], $queue),
                'createdAt' => $entry['createdAt'],
                'updatedAt' => $entry['createdAt'],
                self::MARKER => true,
            ];
        }

        DB::connection('mongodb')->table('posts')->insert($documents);

        $this->note(sprintf(
            'SamplePostSeeder: created %d posts across %d authors, using %d of %d photos.',
            count($documents),
            count($authors),
            $slots,
            $slots + count($queue),
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
     * One object per post per image, matching what the API does on upload, and
     * one *source photo* per slot: the queue is consumed rather than cycled, so
     * no two posts in the corpus show the same picture.
     *
     * Sharing S3 objects between posts would be smaller but wrong for a second
     * reason: deleting one post deletes its keys, which would blank the images
     * on the others.
     *
     * @param  list<string>  $queue  consumed by reference
     * @return list<string>
     */
    private function uploadMedia(string $authorId, int $count, array &$queue): array
    {
        $keys = [];

        for ($i = 0; $i < $count; $i++) {
            $path = array_shift($queue);

            if ($path === null) {
                // Guarded before the run starts; reaching here would mean the
                // plan and the photo count disagree.
                break;
            }

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

            // Roughly 50% text-only, 35% one image, 15% a pair - still the spread
            // the feed layout has to cope with, but sized so the corpus fits the
            // committed photos: every slot spends a distinct one, and there are
            // 56 of them.
            $roll = mt_rand(1, 20);
            $mediaCount = match (true) {
                $roll <= 10 => 0,
                $roll <= 17 => 1,
                default => 2,
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
